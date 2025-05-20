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
from backend.ai.services.numeric_converter import convert_numeric_string_values

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
        # Normaliser les clés en minuscules pour éviter les problèmes de casse
        type_key_lower = type_key.lower() if type_key else type_key
        subtype_key_lower = subtype_key.lower() if subtype_key else subtype_key
        
        # Récupérer le nom de prompt depuis le registre
        prompt_name = PROMPT_REGISTRY.get((type_key_lower, subtype_key_lower))
        if not prompt_name:
            # Essayer aussi avec les clés originales pour la rétrocompatibilité
            prompt_name = PROMPT_REGISTRY.get((type_key, subtype_key))
            
        if not prompt_name:
            logger.error(f"Aucun prompt trouvé pour {type_key}/{subtype_key} (normalisé: {type_key_lower}/{subtype_key_lower})")
            raise ResourceGenerationError(f"Aucun prompt trouvé pour {type_key}/{subtype_key}")
        # Générateur générique basé sur YAML/Jinja
        generator = PromptGenerator(prompt_name)
        system, user = generator.build(**input_variables)
        
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-pro-preview-05-06")
        
        # Configuration du client Google GenAI
        client = genai.Client(api_key=api_key)
        
        # Fusionner instructions système et contenu utilisateur en un seul message user
        prompt_text = f"{system}\n\n{user}"
        contents = [{"role": "user", "parts": [{"text": prompt_text}]}]
        
        # Construire et nettoyer le schéma dynamique si présent
        current_schema_from_generator = generator.schema
        
        # Utiliser le schéma pour tous les prompts
        effective_schema_for_api = current_schema_from_generator
        
        # Si le schéma est présent, logger l'information plus détaillée
        if effective_schema_for_api and prompt_name == "session_exercise_suggester":
            try:
                logger.info(f"Utilisation du schéma JSON pour contraindre la structure de la réponse pour {prompt_name}")
                logger.debug(f"Structure du schéma: {json.dumps(effective_schema_for_api)[:500]}...")
            except Exception as e:
                logger.error(f"Erreur lors de l'affichage du schéma: {str(e)}")
        
        # Activer la trace pour voir ce qui se passe avec Gemini
        logger.info("Début de la préparation de l'appel à l'API Gemini")

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
        


        # Mesure de la durée si non fournie
        start_time = time.perf_counter() if duration_ms is None else None
        logger.info("Juste avant l'appel GEMINI")
        logger.info(f"Modèle: {model_name}")
        logger.info(f"Prompt pour génération: {prompt_text[:200]}...")
        logger.info(f"Configuration de génération: {config}")
        
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
            logger.info("Juste APRES l'appel GEMINI")
            logger.info(f"Réponse GEMINI réussie, longueur du texte: {len(response.text) if response and hasattr(response, 'text') else 'N/A'}")
        except Exception as gemini_error:
            logger.error(f"ERREUR lors de l'appel GEMINI: {str(gemini_error)}")
            # Ré-lever l'exception pour le traitement en amont
            raise ResourceGenerationError(f"Erreur lors de l'appel à l'API Gemini: {str(gemini_error)}")
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

        # Essai de parsing direct du JSON retourné
        try:
            parsed_content = json.loads(response_content)
            
            # Log de la structure de la réponse pour débogage
            if isinstance(parsed_content, dict):
                logger.debug(f"Structure de la réponse JSON: {list(parsed_content.keys())}")
        except json.JSONDecodeError as json_err:
            logger.error(f"Erreur de parsing JSON: {json_err}")
            logger.debug(f"JSON problématique: {response_content}")
            
            # Tentative de correction du JSON
            logger.info("Tentative de nettoyage et correction du JSON...")
            # 1. Remplacer les échappements incorrects
            cleaned_content = response_content.replace('\\', '\\\\')
            
            # 2. Essayer d'extraire un JSON valide à l'aide d'expressions régulières
            import re
            json_pattern = r'\{[\s\S]*\}|\[[\s\S]*\]'
            matches = re.findall(json_pattern, cleaned_content)
            
            if matches:
                # Essayer chaque correspondance possible
                for potential_json in matches:
                    try:
                        parsed_content = json.loads(potential_json)
                        logger.info("Correction JSON réussie avec extraction regex")
                        break
                    except json.JSONDecodeError:
                        continue
            
            # Si aucune correction n'a fonctionné, essayer une approche plus agressive
            if 'parsed_content' not in locals():
                # Utiliser un service externe pour corriger le JSON (si disponible)
                try:
                    from json.decoder import JSONDecodeError
                    import re
                    
                    # Nettoyer les délimiteurs les plus couramment problématiques
                    fixed_content = response_content
                    # Corriger les virgules manquantes entre objets (ligne 54, col 3 dans l'erreur signalée)
                    fixed_content = re.sub(r'}\s*{', '},{', fixed_content)
                    # Corriger les virgules manquantes entre les éléments de tableau
                    fixed_content = re.sub(r'}\s*]', '}]', fixed_content)
                    # Corriger les virgules superflues à la fin des objets
                    fixed_content = re.sub(r',\s*}', '}', fixed_content)
                    # Corriger les virgules superflues à la fin des tableaux
                    fixed_content = re.sub(r',\s*]', ']', fixed_content)
                    
                    try:
                        parsed_content = json.loads(fixed_content)
                        logger.info("Correction JSON réussie avec nettoyage des délimiteurs")
                    except JSONDecodeError:
                        # Dernière tentative: forcer l'encapsulation dans un format approprié
                        if prompt_name == "session_exercise_suggester":
                            # Créer un JSON minimal valide pour éviter l'échec complet
                            logger.warning("Création d'un JSON suggester minimal de secours")
                            parsed_content = {"suggestions": []}
                        else:
                            # Échec - impossible de corriger le JSON
                            raise ResourceGenerationError(f"JSON invalide généré par l'IA. Détails: {json_err}")
                except Exception as correction_err:
                    logger.error(f"Échec de correction JSON: {correction_err}")
                    raise ResourceGenerationError(f"JSON invalide généré par l'IA. Détails: {json_err}")

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
            except Exception as ve:
                logger.warning(f"La réponse brute de l'IA ÉCHOUE à la validation locale du schéma pour {prompt_name}: {ve}")
        else:
            logger.info(f"Aucun schéma local à valider pour {prompt_name}.")
        
        # Post-traitement des valeurs numériques pour les suggestions d'exercices
        if prompt_name == "session_exercise_suggester":
            try:
                logger.info(f"Post-traitement des valeurs numériques pour {prompt_name}")
                content_before = json.dumps(parsed_content)[:100] + "..." if isinstance(parsed_content, dict) else str(type(parsed_content))
                logger.info(f"Contenu avant conversion: {content_before}")
                
                parsed_content = convert_numeric_string_values(parsed_content)
                
                content_after = json.dumps(parsed_content)[:100] + "..." if isinstance(parsed_content, dict) else str(type(parsed_content))
                logger.info(f"Contenu après conversion: {content_after}")
            except Exception as conv_err:
                logger.error(f"Erreur lors du post-traitement numérique: {str(conv_err)}")
                # Continuer avec le contenu non converti en cas d'erreur
            
        return parsed_content
    except ResourceGenerationError as re:
        # Transmettre directement les erreurs ResourceGenerationError
        logger.error(f"Erreur spécifique lors de la génération: {re}", exc_info=True)
        raise
    except json.JSONDecodeError as je:
        # Gérer spécifiquement les erreurs JSON
        logger.error(f"Erreur de décodage JSON lors de la génération: {je}", exc_info=True)
        raise ResourceGenerationError(f"Erreur de format JSON dans la réponse: {str(je)}")
    except Exception as e:
        # Gérer toutes les autres erreurs
        logger.error(f"Erreur lors de la génération de contenu IA: {e}", exc_info=True)
        raise ResourceGenerationError(f"Erreur de génération: {str(e)}")
