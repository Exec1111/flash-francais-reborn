"""
Service pour la génération de ressources IA à partir de prompts.
"""
from typing import Dict, Any
import logging
import os
import json
import copy
from google import genai
from google.genai import types
from dotenv import load_dotenv

from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.ai.services.registry import PROMPT_REGISTRY, ResourceGenerationError
from backend.ai.services.schema_utils import clean_schema, flatten_schema

logger = logging.getLogger(__name__)

from backend.models.llm_interaction_log import LLMInteractionLog
from backend.database import SessionLocal

import time

async def generate_ai_resource_content(
    type_key: str,
    subtype_key: str,
    input_variables: Dict[str, Any],
    user_id: int = None,
    duration_ms: int = None
) -> Dict[str, Any]:
    """
    Génère le contenu d'une ressource IA en utilisant le prompt approprié.
    """
    try:
        # Récupérer le nom de prompt depuis le registre
        prompt_name = PROMPT_REGISTRY.get((type_key, subtype_key))
        if not prompt_name:
            raise ResourceGenerationError(f"Aucun prompt trouvé pour {type_key}/{subtype_key}")
        # Générateur générique basé sur YAML/Jinja
        generator = PromptGenerator(prompt_name)
        system, user = generator.build(**input_variables)
        
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash-preview-04-17")
        
        # Configuration du client Google GenAI
        client = genai.Client(api_key=api_key)
        
        # Fusionner instructions système et contenu utilisateur en un seul message user
        prompt_text = f"{system}\n\n{user}"
        logger.info(f"Prompt généré (après rendu Jinja) : {prompt_text}")
        contents = [{"role": "user", "parts": [{"text": prompt_text}]}]
        
        # Construire et nettoyer le schéma dynamique si présent
        current_schema_from_generator = generator.schema
        
        # Condition pour désactiver le schéma pour un prompt spécifique
        if prompt_name == "session_exercise_suggester":
            logger.info(f"Temporairement désactivation de response_schema pour le prompt: {prompt_name}")
            effective_schema_for_api = None
        else:
            effective_schema_for_api = current_schema_from_generator

        if effective_schema_for_api:
            # Copier le schéma pour éviter de modifier l'original en cache par le PromptGenerator
            schema_to_send = copy.deepcopy(effective_schema_for_api)
            
            # Nettoyer et aplatir le schéma
            clean_schema(schema_to_send)
            flatten_schema(schema_to_send)
            
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema_to_send
            )
        else:
            config = types.GenerateContentConfig(
                response_mime_type="application/json" # Toujours demander du JSON
            )
        
        # Appel API en JSON
        logger.info(f"Modèle : {model_name}")
        logger.info(f"contents : {contents}")
        logger.info(f"config : {config}")

        # Mesure de la durée si non fournie
        start_time = time.perf_counter() if duration_ms is None else None
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config
        )
        elapsed_ms = None
        if start_time is not None:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        duration_to_log = duration_ms if duration_ms is not None else elapsed_ms

        # Extraire le JSON
        response_content = response.text.strip()

        # LOGGING EN BASE du prompt et de la réponse Gemini
        try:
            db = SessionLocal()
            log_entry = LLMInteractionLog(
                api_provider="google_genai",
                model_name=model_name,
                prompt_type=prompt_name,
                input_prompt=prompt_text,
                input_variables=input_variables,
                generation_config=config.to_dict() if hasattr(config, 'to_dict') else None,
                output_content=response_content,
                parsed_output=None,  # Peut être rempli après json.loads si souhaité
                error_message=None,  # À remplir en cas d'exception
                request_token_count=None,  # Peut être extrait de response si dispo
                response_token_count=None,
                duration_ms=duration_to_log,
                user_id=user_id
            )
            db.add(log_entry)
            db.commit()
        except Exception as log_exc:
            logger.error(f"Erreur lors du logging LLMInteractionLog : {log_exc}")
        finally:
            if 'db' in locals():
                db.close()

        # Parsing direct du JSON retourné
        parsed_content = json.loads(response_content)

        # Si c'était session_exercise_suggester et que le schéma n'a pas été envoyé à l'API,
        # il est possible que l'IA retourne une liste directement au lieu d'un objet {"suggestions": [...]}
        # et utilise des noms de clés légèrement différents.
        if prompt_name == "session_exercise_suggester" and effective_schema_for_api is None:
            if isinstance(parsed_content, list):
                logger.info(f"Sortie brute de l'IA pour {prompt_name} (sans schéma API) est une liste. Transformation en cours...")
                transformed_suggestions = []
                for item_from_ai in parsed_content:
                    type_key_from_ai = item_from_ai.get("type_key")
                    subtype_key_from_ai = item_from_ai.get("subtype_key")
                    justification_from_ai = item_from_ai.get("justification")
                    parameters_from_ai = item_from_ai.get("parameters", [])

                    transformed_item = {
                        "type_key": type_key_from_ai,
                        "subtype_key": subtype_key_from_ai,
                        "justification": justification_from_ai,
                        "parameters": parameters_from_ai
                    }
                    transformed_suggestions.append(transformed_item)
                parsed_content = {"suggestions": transformed_suggestions}
                logger.info(f"Contenu transformé pour {prompt_name}: {json.dumps(parsed_content, indent=2, ensure_ascii=False)}")
            elif isinstance(parsed_content, dict) and "suggestions" not in parsed_content:
                # Gérer le cas où l'IA renvoie un objet mais sans la clé 'suggestions' attendue
                # Ceci est moins probable que la liste directe, mais c'est une sécurité.
                logger.warning(f"Sortie brute de l'IA pour {prompt_name} est un dict sans clé 'suggestions'. Tentative d'encapsulation.")
                # Heuristique : si c'est un dictionnaire et qu'il a type/subtype, c'est probablement une suggestion unique non encapsulée
                if "type" in parsed_content and "subtype" in parsed_content:
                     transformed_item = {
                        "type_key": parsed_content.get("type"),
                        "subtype_key": parsed_content.get("subtype"),
                        "justification": parsed_content.get("justification") or parsed_content.get("explanation"),
                        "parameters": parsed_content.get("parameters", [])
                    }
                     parsed_content = {"suggestions": [transformed_item]}
                else:
                    logger.error(f"Structure inattendue du dict de l'IA pour {prompt_name}: {parsed_content}")
            # Si parsed_content est déjà un dict avec "suggestions", aucune transformation n'est nécessaire ici.

        # Valider localement selon le schéma du prompt (si un schéma est défini dans le PromptGenerator)
        # Ceci est utile même si le schéma n'a pas été envoyé à l'API, pour voir si la sortie brute est conforme.
        if current_schema_from_generator:
            try:
                generator.validate(parsed_content) # Valide contre le schéma original du prompt
                logger.info(f"La réponse brute de l'IA PASSE la validation locale du schéma pour {prompt_name}.")
            except Exception as ve:
                logger.warning(f"La réponse brute de l'IA ÉCHOUE à la validation locale du schéma pour {prompt_name}: {ve}")
        else:
            logger.info(f"Aucun schéma local à valider pour {prompt_name}.")
        
        return parsed_content
    except Exception as e:
        logger.error(f"Erreur lors de la génération de contenu IA: {e}", exc_info=True)
        raise ResourceGenerationError(f"Erreur de génération: {str(e)}")
