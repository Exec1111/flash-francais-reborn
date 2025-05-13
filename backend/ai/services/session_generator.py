"""
Service pour la génération de séances pédagogiques via l'IA.
"""
from typing import Dict, Any, List
import logging
import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.ai.services.registry import ResourceGenerationError
from backend.ai.services.schema_utils import get_session_json_schema, clean_schema, flatten_schema, remove_defaults_from_schema

logger = logging.getLogger(__name__)

import time
from backend.models.llm_interaction_log import LLMInteractionLog
from backend.database import SessionLocal

async def generate_ai_sessions(
    sequence_id: int,
    sequence_title: str,
    niveau: str,
    nombre_seances: str,
    inclure_ressources: bool,
    ressources_disponibles: List[Dict[str, Any]],
    objectifs: List[Dict[str, Any]],
    study_objects: List[Dict[str, Any]],
    instructions_supplementaires: str = "",
    user_id: int = None
) -> Dict[str, Any]:
    """
    Génère des séances (sessions) pour une séquence à l'aide de l'IA.
    
    Args:
        sequence_id: ID de la séquence pour laquelle générer des séances
        sequence_title: Titre de la séquence
        niveau: Niveau des apprenants (A1-C2)
        nombre_seances: Nombre de séances à générer ou "auto"
        inclure_ressources: Si True, inclure des ressources dans les séances
        ressources_disponibles: Liste des ressources disponibles pour les séances
        objectifs: Liste des objectifs pédagogiques de la séquence
        study_objects: Liste des objets d'étude pour la séquence
        instructions_supplementaires: Instructions supplémentaires pour la génération
    
    Returns:
        Dictionnaire contenant la liste des séances générées
    """
    try:
        # Préparer les variables d'entrée pour le prompt
        input_variables = {
            "nombre_seances": nombre_seances,
            "titre_sequence": sequence_title,
            "niveau": niveau,
            "inclure_ressources": inclure_ressources,
            "ressources_disponibles": ressources_disponibles,
            "objectifs": objectifs,
            "study_objects": study_objects,
            "instructions_supplementaires": instructions_supplementaires
        }
        
        # Générer le contenu en utilisant le prompt "session_generator"
        prompt_name = "session_generator"
        generator = PromptGenerator(prompt_name)
        system, user = generator.build(**input_variables)
        
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash-preview-04-17")
        
        # Configuration du client Google GenAI
        client = genai.Client(api_key=api_key)
        
        # Fusionner instructions système et contenu utilisateur en un seul message user
        prompt_text = f"{system}\n\n{user}"
        contents = [{"role": "user", "parts": [{"text": prompt_text}]}]
        
        # Obtenir le schéma dynamique pour les séances
        schema = get_session_json_schema()
        
        # Nettoyer et préparer le schéma pour l'API Gemini
        clean_schema(schema)
        flatten_schema(schema)
        remove_defaults_from_schema(schema)
        
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema
        )
        
        prompt_context = {
            "titre_sequence": sequence_title,
            "niveau": niveau,
            "nombre_seances": nombre_seances,
            "objectifs": objectifs,
            "study_objects": study_objects,
            "instructions_supplementaires": instructions_supplementaires,
        }
        logger.info(f"Contexte du prompt : {prompt_context}")
        
        # Appel API en JSON
        logger.info(f"Génération de séances - Modèle : {model_name}")
        logger.info(f"Génération de séances - Prompt : {prompt_text}...")
        logger.info(f"Génération de séances - Schema : {schema}")
        
        start_time = time.perf_counter()
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(f"Réponse brute du modèle (tronquée) : {response.text[:500]}...")
        response_content = response.text.strip()
        # Logging LLMInteractionLog
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
                parsed_output=None,
                error_message=None,
                request_token_count=None,
                response_token_count=None,
                duration_ms=duration_ms,
                user_id=user_id
            )
            db.add(log_entry)
            db.commit()
        except Exception as log_exc:
            logger.error(f"Erreur lors du logging LLMInteractionLog : {log_exc}")
        finally:
            if 'db' in locals():
                db.close()
        # Parsing du JSON retourné
        parsed_content = json.loads(response_content)
        # Ajouter l'ID de séquence à chaque séance générée
        for session in parsed_content.get("sessions", []):
            session["sequence_id"] = sequence_id
        return parsed_content
    except Exception as e:
        logger.error(f"Erreur lors de la génération de séances: {e}", exc_info=True)
        raise ResourceGenerationError(f"Erreur de génération de séances: {str(e)}")
