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
    Supporte maintenant l'intégration de contenu de ressources via resource_ids.
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
        # Supporte le format dict du registre: {"config": "<nom_fichier_yaml>"}
        prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
        # Générateur générique basé sur YAML/Jinja
        generator = PromptGenerator(prompt_config)

        # NOUVELLE LOGIQUE: Récupération du contenu des ressources si resource_ids est fourni
        if 'resource_ids' in input_variables and input_variables['resource_ids']:
            resource_ids = input_variables['resource_ids']
            logger.info(f"[RESOURCE_CONTENT] Récupération du contenu pour {len(resource_ids)} ressource(s): {resource_ids}")
            logger.info(f"[RESOURCE_CONTENT] Type de resource_ids: {type(resource_ids)}")
            logger.info(f"[RESOURCE_CONTENT] Contenu de resource_ids: {resource_ids}")

            try:
                from crud.resource import get_resource
                from database import SessionLocal

                db = SessionLocal()
                resource_content = []

                for resource_id in resource_ids:
                    logger.info(f"[RESOURCE_CONTENT] Traitement de la ressource ID: {resource_id} (type: {type(resource_id)})")

                    try:
                        # Convertir en int si nécessaire
                        if isinstance(resource_id, str):
                            resource_id = int(resource_id)
                        elif not isinstance(resource_id, int):
                            logger.error(f"[RESOURCE_CONTENT] ID de ressource invalide: {resource_id} (type: {type(resource_id)})")
                            continue

                        resource = get_resource(db, resource_id=resource_id)
                        logger.info(f"[RESOURCE_CONTENT] Ressource trouvée en base: {resource is not None}")

                        if resource:
                            logger.info(f"[RESOURCE_CONTENT] Détails ressource: ID={resource.id}, Title='{resource.title}', Type={getattr(resource, 'type', None)}")

                            content = ""
                            # Utiliser le même répertoire que dans les autres parties du code
                            upload_dir = os.getenv("UPLOADS_BASE_DIR", "backend/local_uploads")
                            logger.info(f"[RESOURCE_CONTENT] Répertoire uploads: {upload_dir}")

                            # S'assurer que le chemin est absolu
                            if not os.path.isabs(upload_dir):
                                upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", upload_dir)
                                upload_dir = os.path.abspath(upload_dir)
                            logger.info(f"[RESOURCE_CONTENT] Répertoire uploads absolu: {upload_dir}")

                            # 1) Essayer d'abord le Markdown Docling
                            docling_md_path = getattr(resource, 'docling_md_path', None)
                            logger.info(f"[RESOURCE_CONTENT] Chemin Docling MD: {docling_md_path}")

                            if docling_md_path:
                                md_abs_path = os.path.join(upload_dir, docling_md_path)
                                logger.info(f"[RESOURCE_CONTENT] Chemin absolu Docling: {md_abs_path}")
                                logger.info(f"[RESOURCE_CONTENT] Fichier Docling existe: {os.path.exists(md_abs_path)}")

                                if os.path.exists(md_abs_path):
                                    with open(md_abs_path, 'r', encoding='utf-8') as f:
                                        content = f.read()
                                    logger.info(f"[RESOURCE_CONTENT] Contenu récupéré depuis Docling MD: {len(content)} caractères")
                                    logger.info(f"[RESOURCE_CONTENT] Extrait du contenu: {content[:200]}...")

                            # 2) Fallback: fichier original
                            if not content:
                                file_path = resource.file_path
                                logger.info(f"[RESOURCE_CONTENT] Fichier original: {file_path}")

                                if file_path:
                                    file_abs_path = os.path.join(upload_dir, file_path)
                                    logger.info(f"[RESOURCE_CONTENT] Chemin absolu fichier: {file_abs_path}")
                                    logger.info(f"[RESOURCE_CONTENT] Fichier original existe: {os.path.exists(file_abs_path)}")

                                    if os.path.exists(file_abs_path):
                                        try:
                                            with open(file_abs_path, 'r', encoding='utf-8') as f:
                                                content = f.read()
                                            logger.info(f"[RESOURCE_CONTENT] Contenu récupéré depuis fichier original: {len(content)} caractères")
                                            logger.info(f"[RESOURCE_CONTENT] Extrait du contenu: {content[:200]}...")
                                        except Exception as e:
                                            logger.warning(f"[RESOURCE_CONTENT] Impossible de lire le fichier original: {e}")

                            if content:
                                resource_data = {
                                    'id': resource.id,
                                    'title': resource.title,
                                    'content': content
                                }
                                resource_content.append(resource_data)
                                logger.info(f"[RESOURCE_CONTENT] Contenu ajouté pour ressource {resource.id}: {len(content)} caractères")
                            else:
                                logger.warning(f"[RESOURCE_CONTENT] Aucun contenu trouvé pour la ressource {resource.id}")
                        else:
                            logger.warning(f"[RESOURCE_CONTENT] Ressource {resource_id} non trouvée")

                    except Exception as e:
                        logger.error(f"[RESOURCE_CONTENT] Erreur lors de la récupération de la ressource {resource_id}: {e}")

                db.close()

                logger.info(f"[RESOURCE_CONTENT] Nombre de ressources avec contenu: {len(resource_content)}")

                if resource_content:
                    input_variables['resource_content'] = resource_content
                    logger.info(f"[RESOURCE_CONTENT] Contenu de {len(resource_content)} ressource(s) ajouté aux variables d'entrée")
                    logger.info(f"[RESOURCE_CONTENT] Structure resource_content: {list(resource_content[0].keys()) if resource_content else 'Vide'}")
                else:
                    logger.warning("[RESOURCE_CONTENT] Aucun contenu de ressource n'a pu être récupéré")

            except Exception as e:
                logger.error(f"[RESOURCE_CONTENT] Erreur lors de la récupération du contenu des ressources: {e}")
                # Continuer sans le contenu des ressources
        
        # Afficher les variables d'entrée pour débogage
        logger.info(f"[DEBUG_PROMPT] Variables d'entrée pour {type_key}/{subtype_key}:")
        logger.info(f"[DEBUG_PROMPT] Clés disponibles: {list(input_variables.keys())}")

        if 'resource_content' in input_variables:
            logger.info(f"[DEBUG_PROMPT] resource_content trouvé avec {len(input_variables['resource_content'])} ressources")
            for i, res in enumerate(input_variables['resource_content']):
                logger.info(f"[DEBUG_PROMPT] Ressource {i}: ID={res.get('id')}, Title='{res.get('title')}', Content_length={len(res.get('content', ''))}")
        else:
            logger.warning("[DEBUG_PROMPT] resource_content NON trouvé dans les variables d'entrée")

        if 'resource_ids' in input_variables:
            logger.info(f"[DEBUG_PROMPT] resource_ids: {input_variables['resource_ids']}")
        else:
            logger.warning("[DEBUG_PROMPT] resource_ids NON trouvé dans les variables d'entrée")

        if 'support' in input_variables:
            logger.info(f"[DEBUG_PROMPT] Support présent dans les variables d'entrée: {input_variables['support'].get('title', 'Titre manquant')}")
            logger.info(f"[DEBUG_PROMPT] Contenu du support (extrait): {input_variables['support'].get('content', '')[:100]}...")
        else:
            logger.info("[DEBUG_PROMPT] Aucun support dans les variables d'entrée")

        system, user = generator.build(**input_variables)

        # Vérifier si le block support est présent dans le prompt généré
        if "IMPORTANT - SUPPORT DE TRAVAIL" in user:
            logger.info("[DEBUG_PROMPT] Le bloc de support est présent dans le prompt généré")
        else:
            logger.info("[DEBUG_PROMPT] Le bloc de support est ABSENT du prompt généré")

        # Vérifier si resource_content est présent dans le prompt généré
        if "Contenu des ressources de référence" in user:
            logger.info("[DEBUG_PROMPT] Le bloc resource_content est présent dans le prompt généré")
            # Extraire et logger la section resource_content
            start = user.find("## Contenu des ressources de référence")
            if start != -1:
                end = user.find("Utilise ces ressources", start)
                if end != -1:
                    resource_section = user[start:end].strip()
                    logger.info(f"[DEBUG_PROMPT] Section resource_content: {resource_section}")
        else:
            logger.warning("[DEBUG_PROMPT] Le bloc resource_content est ABSENT du prompt généré")
        
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        # Sélection dynamique du modèle (flash/pro) selon PROMPT_REGISTRY
        preferred_model = None
        if isinstance(prompt_name, dict):
            try:
                preferred_model = (prompt_name.get("gemini_model") or "").strip().lower()
            except Exception:
                preferred_model = None

        raw_model_name = None
        if preferred_model == "pro":
            raw_model_name = os.getenv("GEMINI_PRO_CHAT_MODEL") or os.getenv("GEMINI_FLASH_CHAT_MODEL") or os.getenv("GEMINI_CHAT_MODEL") or "gemini-1.5-flash-latest"
        elif preferred_model == "flash":
            raw_model_name = os.getenv("GEMINI_FLASH_CHAT_MODEL") or os.getenv("GEMINI_PRO_CHAT_MODEL") or os.getenv("GEMINI_CHAT_MODEL") or "gemini-1.5-flash-latest"
        else:
            # défaut: privilégier Flash si dispo
            raw_model_name = os.getenv("GEMINI_FLASH_CHAT_MODEL") or os.getenv("GEMINI_PRO_CHAT_MODEL") or os.getenv("GEMINI_CHAT_MODEL") or "gemini-1.5-flash-latest"

        if not raw_model_name.startswith("models/"):
            model_name = f"models/{raw_model_name}"
        else:
            model_name = raw_model_name
        logger.info(f"Modèle Gemini sélectionné: {model_name} (préférence: {preferred_model or 'default'})")
        
        # Initialisation du client google-genai
        client = genai.Client(api_key=api_key)
        
        # Fusionner instructions système et contenu utilisateur en un seul message user
        prompt_text = f"{system}\n\n{user}"
        contents = [{"role": "user", "parts": [{"text": prompt_text}]}]

        # Construire et nettoyer le schéma dynamique si présent
        current_schema_from_generator = generator.schema

        # Utiliser le schéma pour tous les prompts
        effective_schema_for_api = current_schema_from_generator

        # Si le schéma est présent, logger l'information plus détaillée
        if effective_schema_for_api and prompt_config == "session_exercise_suggester":
            try:
                logger.info(f"Utilisation du schéma JSON pour contraindre la structure de la réponse pour {prompt_config}")
                logger.debug(f"Structure du schéma: {json.dumps(effective_schema_for_api)[:500]}...")
            except Exception as e:
                logger.error(f"Erreur lors de l'affichage du schéma: {str(e)}")

        generation_config_params = {}
        if effective_schema_for_api:
            # Copier le schéma pour éviter de modifier l'original en cache par le PromptGenerator
            schema_to_send = copy.deepcopy(effective_schema_for_api)

            # Nettoyer et aplatir le schéma
            clean_schema(schema_to_send)
            flatten_schema(schema_to_send)

            generation_config_params = {
                "response_mime_type": "application/json",
                "response_schema": schema_to_send
            }
        else:
            generation_config_params = {
                "response_mime_type": "application/json" # Toujours demander du JSON
            }

        # Utiliser directement le dictionnaire pour generation_config
        config = generation_config_params

        # LOGGING EN BASE du prompt AVANT l'appel à l'API (pour capturer même les échecs)
        log_id = None
        try:
            from backend.database import SessionLocal
            db = SessionLocal()
            log_entry = LLMInteractionLog(
                api_provider="google_genai",
                model_name=model_name,
                prompt_type=prompt_config,
                input_prompt=prompt_text,
                input_variables=input_variables,
                generation_config=config if isinstance(config, dict) else None,
                output_content=None,  # Sera mis à jour après la réponse
                parsed_output=None,
                error_message=None,  # Sera mis à jour en cas d'erreur
                request_token_count=None,
                response_token_count=None,
                duration_ms=None,  # Sera mis à jour avec la durée réelle
                user_id=user_id
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)  # Pour obtenir l'ID généré
            log_id = log_entry.id
            logger.info(f"Log entry created with ID: {log_id}")
        except Exception as log_exc:
            logger.error(f"Erreur lors du logging initial LLMInteractionLog : {log_exc}")
            log_id = None
        finally:
            if 'db' in locals():
                db.close()

        # Activer la trace pour voir ce qui se passe avec Gemini
        logger.info("Début de la préparation de l'appel à l'API Gemini")

        # Mesure de la durée si non fournie
        start_time = time.perf_counter() if duration_ms is None else None
        logger.info("Juste avant l'appel GEMINI")
        logger.info(f"Modèle: {model_name}")
        logger.info(f"Prompt pour génération: {prompt_text[:500]}...")
        logger.info(f"Configuration de génération: {config}")

        # Vérifier spécifiquement si resource_content est dans le prompt
        if "resource_content" in prompt_text:
            logger.info("[DEBUG_PROMPT] resource_content trouvé dans le prompt final")
            # Trouver la section resource_content
            start = prompt_text.find("## Contenu des ressources de référence")
            if start != -1:
                end = prompt_text.find("Utilise ces ressources", start)
                if end != -1:
                    resource_section = prompt_text[start:end].strip()
                    logger.info(f"[DEBUG_PROMPT] Section resource_content dans prompt: {resource_section}")
        else:
            logger.warning("[DEBUG_PROMPT] resource_content NON trouvé dans le prompt final")

        response_content = None
        error_message = None

        try:
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=config  # Changé de generation_config à config
            )
            logger.info("Juste APRES l'appel GEMINI")
            logger.info(f"Réponse GEMINI réussie, longueur du texte: {len(response.text) if response and hasattr(response, 'text') else 'N/A'}")
            response_content = response.text.strip() if response and response.text else None
        except Exception as gemini_error:
            logger.error(f"ERREUR lors de l'appel GEMINI: {str(gemini_error)}")
            error_message = str(gemini_error)
            # Ré-lever l'exception pour le traitement en amont
            raise ResourceGenerationError(f"Erreur lors de l'appel à l'API Gemini: {str(gemini_error)}")
        finally:
            # METTRE À JOUR LE LOG avec la réponse ou l'erreur
            elapsed_ms = None
            if start_time is not None:
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            duration_to_log = duration_ms if duration_ms is not None else elapsed_ms

            try:
                from backend.database import SessionLocal
                db = SessionLocal()
                if log_id:
                    # Récupérer et mettre à jour le log existant
                    existing_log = db.query(LLMInteractionLog).filter(LLMInteractionLog.id == log_id).first()
                    if existing_log:
                        existing_log.output_content = response_content
                        existing_log.error_message = error_message
                        existing_log.duration_ms = duration_to_log
                        db.commit()
                        logger.info(f"Log entry {log_id} updated with response/error")
                else:
                    # Créer un nouveau log si l'ID n'était pas disponible
                    log_entry = LLMInteractionLog(
                        api_provider="google_genai",
                        model_name=model_name,
                        prompt_type=prompt_config,
                        input_prompt=prompt_text,
                        input_variables=input_variables,
                        generation_config=config if isinstance(config, dict) else None,
                        output_content=response_content,
                        parsed_output=None,
                        error_message=error_message,
                        request_token_count=None,
                        response_token_count=None,
                        duration_ms=duration_to_log,
                        user_id=user_id
                    )
                    db.add(log_entry)
                    db.commit()
                    logger.info("New log entry created with response/error")
            except Exception as log_exc:
                logger.error(f"Erreur lors de la mise à jour du logging LLMInteractionLog : {log_exc}")
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
                        if prompt_config == "session_exercise_suggester":
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
        if prompt_config == "session_exercise_suggester" and effective_schema_for_api is None:
            if isinstance(parsed_content, list):
                logger.info(f"Sortie brute de l'IA pour {prompt_config} (sans schéma API) est une liste. Transformation en cours...")
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
                logger.warning(f"Sortie brute de l'IA pour {prompt_config} est un dict sans clé 'suggestions'. Tentative d'encapsulation.")
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
                    logger.error(f"Structure inattendue du dict de l'IA pour {prompt_config}: {parsed_content}")
            # Si parsed_content est déjà un dict avec "suggestions", aucune transformation n'est nécessaire ici.

        # Valider localement selon le schéma du prompt (si un schéma est défini dans le PromptGenerator)
        # Ceci est utile même si le schéma n'a pas été envoyé à l'API, pour voir si la sortie brute est conforme.
        if current_schema_from_generator:
            try:
                generator.validate(parsed_content) # Valide contre le schéma original du prompt
            except Exception as ve:
                logger.warning(f"La réponse brute de l'IA ÉCHOUE à la validation locale du schéma pour {prompt_config}: {ve}")
        else:
            logger.info(f"Aucun schéma local à valider pour {prompt_config}.")
        
        # Post-traitement des valeurs numériques pour les suggestions d'exercices
        if prompt_config == "session_exercise_suggester":
            try:
                logger.info(f"Post-traitement des valeurs numériques pour {prompt_config}")
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
