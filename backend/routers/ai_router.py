from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form, Body, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
import os
import uuid
import json
import jsonschema
from config import get_settings
import time
import hashlib
import re
from urllib.parse import urlparse

settings = get_settings()

from backend.ai.schemas import ChatInput, ChatOutput
from backend.ai.schemas import AIResourceTypesListResponse, AIResourceGenerationRequest, AIResourceGenerationResponse
from backend.ai import generation_service
from backend.ai import ai_resource_service
from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.ai.services.registry import ResourceGenerationError, TEMPLATE_REGISTRY, DEFAULT_TEMPLATE_DIR
from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel
from backend.schemas.session import SessionCreate
from backend.schemas.ai_suggestion import AISuggestionResponse
from models import ResourceType, ResourceSubType
from backend.crud.resource import get_resources_by_session_and_type, get_resource
from backend.schemas.resource import ResourceRead
from backend.crud.sequence import get_sequence
from backend.crud.session import create_session_with_user, get_session_by_id
import logging
import os
import uuid
from pathlib import Path
from backend.ai.services.docling_service import extract_from_pdf_bytes, extract_from_pdf_path
from backend.schemas.docling import DoclingExtractResponse

# Configure logging (optional, if not handled globally)
# logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    # prefix="/ai", # Supprimé car géré dans app.py
    tags=["AI"], # Tag for Swagger UI grouping
)

@router.post(
    "/chat", 
    response_model=ChatOutput, 
    summary="Send a message to the AI chat assistant",
    description="Receives a user message and chat history, interacts with the configured LLM, and returns the AI's response."
)
async def handle_chat_message(input_data: ChatInput):
    """
    Endpoint to handle incoming chat messages.
    """
    logger.info(f"Received request on /ai/chat endpoint.")
    try:
        response = await generation_service.get_chat_response(input_data)
        logger.info(f"Successfully processed /ai/chat request.")
        return response
    except ValueError as ve:
        logger.error(f"Configuration error in /ai/chat: {ve}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail=f"AI service configuration error: {ve}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in /ai/chat: {e}", exc_info=True)
        # Consider more specific error handling based on potential exceptions
        # from the LLM client (e.g., API errors, rate limits)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"An unexpected error occurred while processing your request: {e}"
        )

@router.get(
    "/resource-types",
    response_model=AIResourceTypesListResponse,
    summary="Liste les types de ressources AI disponibles",
    description="Retourne les types et sous-types de ressources qui peuvent être générés par IA."
)
async def get_ai_resource_types(db: Session = Depends(get_db)):
    """
    Endpoint pour lister les types de ressources qui peuvent être générés par IA.
    """
    logger.info("Récupération des types de ressources IA disponibles")
    try:
        types = ai_resource_service.get_available_ai_resource_types(db=db)
        return {"types": types}
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des types de ressources IA: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur inattendue s'est produite: {e}"
        )

@router.post(
    "/generate-resource",
    response_model=AIResourceGenerationResponse,
    summary="Génère une ressource avec l'IA",
    description="Génère le contenu d'une ressource en utilisant un LLM avec le prompt approprié au type/sous-type spécifié."
)
async def generate_resource(
    request: AIResourceGenerationRequest,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint pour générer une ressource avec l'IA.
    """
    logger.info(f"Génération de ressource IA de type {request.type_key}/{request.subtype_key} demandée par l'utilisateur {current_user.email}")
    
    # Log détaillé des variables envoyées à l'IA
    logger.info(f"Variables de requête pour {request.type_key}/{request.subtype_key}: {request.variables}")
    
    try:
        # Logs détaillés avant la génération
        logger.info(f"Détails de la requête de génération:")
        logger.info(f"Type: {request.type_key}")
        logger.info(f"Sous-type: {request.subtype_key}")
        logger.info(f"Utilisateur ID: {current_user.id}, Email: {current_user.email}")
        
        # Analyser spécifiquement les variables
        if 'parameters' in request.variables:
            logger.info(f"Paramètres: {request.variables['parameters']}")
            
        if isinstance(request.variables, dict):
            for key, value in request.variables.items():
                logger.info(f"Variable '{key}': {value}")
        
        # Injecter le contenu du support si nécessaire (priorité au Markdown Docling)
        try:
            support_id = None
            # 1) support_id explicite dans variables
            if isinstance(request.variables, dict) and 'support_id' in request.variables:
                support_id = request.variables.get('support_id')
                logger.info(f"[Gen] support_id détecté dans variables: {support_id}")
            # 2) ou bien 'support': {'id': ...} sans contenu
            elif isinstance(request.variables, dict) and 'support' in request.variables:
                support_block = request.variables.get('support') or {}
                if isinstance(support_block, dict):
                    if not support_block.get('content') and support_block.get('id'):
                        support_id = support_block.get('id')
                        logger.info(f"[Gen] Bloc support sans contenu détecté, id={support_id}")

            if support_id:
                support_resource = get_resource(db, resource_id=int(support_id))
                if support_resource:
                    upload_dir = settings.UPLOADS_BASE_DIR
                    content = ""
                    try:
                        # Tenter d'abord le Markdown Docling
                        md_rel = getattr(support_resource, 'docling_md_path', None)
                        if md_rel:
                            md_abs = os.path.join(upload_dir, md_rel)
                            if os.path.exists(md_abs):
                                with open(md_abs, 'r', encoding='utf-8') as f:
                                    content = f.read()
                                logger.info(f"[Gen] Support: utilisation du Markdown Docling: {md_abs}")
                            else:
                                logger.warning(f"[Gen] Docling MD introuvable: {md_abs}. Repli sur le fichier original.")

                        # Fallback: fichier original
                        if not content:
                            file_rel = support_resource.file_path
                            if file_rel:
                                file_abs = os.path.join(upload_dir, file_rel)
                                if os.path.exists(file_abs):
                                    with open(file_abs, 'r', encoding='utf-8') as f:
                                        content = f.read()
                                    logger.info(f"[Gen] Support: utilisation du fichier original: {file_abs}")
                                else:
                                    logger.warning(f"[Gen] Fichier original introuvable: {file_abs}")
                            else:
                                logger.warning(f"[Gen] file_path non spécifié pour la ressource ID {support_resource.id}")
                    except Exception as read_err:
                        logger.error(f"[Gen] Erreur lors de la lecture du support: {read_err}")

                    # Injecter dans variables pour le générateur
                    if isinstance(request.variables, dict):
                        request.variables['support'] = {
                            'id': support_resource.id,
                            'title': support_resource.title,
                            'content': content
                        }
                        logger.info(f"[Gen] Bloc support injecté (extrait contenu): {(content[:100] + '...') if content else 'Vide'}")
                        logger.info(
                            f"[Gen] Docling status: status={getattr(support_resource, 'docling_status', None)}, "
                            f"md_path={getattr(support_resource, 'docling_md_path', None)}, "
                            f"chars={getattr(support_resource, 'docling_chars', None)}"
                        )
                else:
                    logger.warning(f"[Gen] support_id={support_id} non trouvé. Pas d'injection de contenu.")
        except Exception as inj_err:
            logger.error(f"[Gen] Erreur lors de l'injection du support: {inj_err}")

        import time
        start_time = time.perf_counter()
        
        logger.info("Début de l'appel au service de génération d'IA...")
        content = await ai_resource_service.generate_ai_resource_content(
            type_key=request.type_key,
            subtype_key=request.subtype_key,
            input_variables=request.variables,
            user_id=current_user.id,
            duration_ms=None  # Sera mesuré dans la fonction si non fourni
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(f"Appel au service de génération d'IA terminé en {duration_ms}ms")
        
        # Vérifier si le contenu est None
        if content is None:
            logger.error("Contenu généré est None")
            raise ResourceGenerationError("Aucun contenu généré par l'IA")
        
        # Log détaillé du contenu généré
        logger.info(f"Contenu généré avec succès pour {request.type_key}/{request.subtype_key} en {duration_ms}ms")
        logger.info(f"Réponse du service IA: {content}")
        
        # Vérification de la validité du contenu généré
        if not content or (isinstance(content, dict) and len(content) == 0):
            logger.error(f"Contenu généré vide ou invalide pour {request.type_key}/{request.subtype_key}")
            raise ResourceGenerationError(f"Contenu généré vide ou invalide pour {request.type_key}/{request.subtype_key}")
            
        return {"content": content}
        
    except ResourceGenerationError as e:
        logger.error(f"Erreur de génération de ressource: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValueError as e:
        logger.error(f"Erreur de validation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la génération de ressource: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur inattendue s'est produite: {e}"
        )

@router.get(
    "/resource-types/{type_key}/{subtype_key}/schema", 
    response_model=Dict[str, Any],
    summary="Récupère le schéma des variables pour un type de ressource AI",
    description="Renvoie les métadonnées des champs de formulaire pour un type de ressource AI spécifique."
)
async def get_resource_type_schema(
    type_key: str,
    subtype_key: str,
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Endpoint pour obtenir le schéma des variables nécessaires à la génération d'un type de ressource AI.
    Permet au frontend de construire des formulaires dynamiques.
    """
    logger.info(f"Récupération du schéma pour {type_key}/{subtype_key} demandée par l'utilisateur {current_user.email}")
    
    # Vérifier que le type et sous-type existent
    logger.info(f"Recherche du prompt pour les clés : {type_key.lower()}/{subtype_key.lower()}")
    logger.info(f"Clés disponibles dans PROMPT_REGISTRY : {list(ai_resource_service.PROMPT_REGISTRY.keys())}")
    prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower()))
    if not prompt_name:
        # Tentative avec d'autres variations de la clé
        if subtype_key.lower().replace('-', '_') != subtype_key.lower():
            prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower().replace('-', '_')))
            logger.info(f"Tentative avec tiret remplacé par underscore : {subtype_key.lower().replace('-', '_')}")
        elif subtype_key.lower().replace('_', '-') != subtype_key.lower():
            prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower().replace('_', '-')))
            logger.info(f"Tentative avec underscore remplacé par tiret : {subtype_key.lower().replace('_', '-')}")
            
        if not prompt_name:
            raise HTTPException(status_code=404, detail=f"Type de ressource '{type_key}/{subtype_key}' non trouvé")
        else:
            logger.info(f"Prompt trouvé après normalisation : {prompt_name}")
    else:
        logger.info(f"Prompt trouvé directement : {prompt_name}")
    try:
        # Utiliser le générateur config-driven
        # Supporte le format dict du registre: {"config": "<nom_fichier_yaml>"}
        prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
        generator = PromptGenerator(prompt_config)
        form_fields = []
        for p in generator.parameters:
            # Déterminer type de champ
            field_type = "number" if str(p.get("type")).lower() in ("int", "integer") else "string"
            # Validations et valeurs par défaut
            validations = {}
            default = p.get("default")  # Définir default AVANT de l'utiliser
            # Champ requis si pas de default
            required = default is None
            
            if "enum" in p:
                validations["enum"] = p["enum"]
                # Ajouter aussi directement l'énumération comme attribut du champ
                # pour faciliter l'accès dans le frontend
                form_fields.append({
                    "name": p["name"],
                    "label": p.get("label", p["name"]),
                    "description": p.get("description", ""),
                    "type": field_type,
                    "required": required,
                    "default": default,
                    "validations": validations,
                    "enum": p["enum"]  # Ajouter directement l'énumération ici
                })
                continue  # Passer à l'itération suivante
            # default et required sont déjà définis plus haut, pas besoin de les redéfinir ici
            form_fields.append({
                "name": p["name"],
                "label": p.get("label", p["name"]),
                "description": p.get("description", ""),
                "type": field_type,
                "required": required,
                "default": default,
                "validations": validations
            })
        return {"fields": form_fields}
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du schéma pour {type_key}/{subtype_key}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur inattendue s'est produite: {e}"
        )

@router.post(
    "/merge-resource",
    summary="Fusionne un contenu JSON avec un modèle HTML (uploadé ou par défaut) pour générer un document HTML final via LLM.",
    description="Fusionne un contenu JSON édité avec un modèle HTML (uploadé ou par défaut), génère un HTML via Gemini, sauvegarde le fichier temporaire et retourne l'URL du HTML généré."
)
async def merge_resource(
    request: Request,
    type_key: str = Form(...),
    subtype_key: str = Form(...),
    data_json: str = Form(...),
    model_file: UploadFile = File(None),
    model_name: str = Form(None),
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Endpoint pour fusionner un contenu JSON édité avec un modèle HTML (uploadé ou par défaut).
    """
    # Logs détaillés pour diagnostiquer l'erreur 422
    logger.info(f"[Fusion][DEBUG] Reçu requête pour type={type_key}, subtype={subtype_key}")
    logger.info(f"[Fusion][DEBUG] model_file présent: {model_file is not None}")
    logger.info(f"[Fusion][DEBUG] model_name: {model_name}")
    try:
        # Logs du contenu JSON (première partie seulement pour ne pas surcharger les logs)
        json_str = data_json[:200] + "..." if len(data_json) > 200 else data_json
        logger.info(f"[Fusion][DEBUG] data_json reçu: {json_str}")
        # Vérifier que le JSON est valide
        json_data = json.loads(data_json)
        logger.info(f"[Fusion][DEBUG] JSON valide, structure: {list(json_data.keys()) if isinstance(json_data, dict) else 'liste ou autre type'}") 
    except json.JSONDecodeError as e:
        logger.error(f"[Fusion][ERREUR] JSON invalide: {e}")
        raise HTTPException(status_code=422, detail=f"Format JSON invalide: {str(e)}")
        
    if not type_key or not subtype_key:
        logger.error(f"[Fusion][ERREUR] type_key ou subtype_key manquant dans la requête : type_key={type_key}, subtype_key={subtype_key}")
        raise HTTPException(status_code=400, detail="type_key et subtype_key sont obligatoires.")
    
    # Validation JSON via JSON Schema du sous-type s'il est défini
    try:
        prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower()))
        if not prompt_name:
            # Tentatives de normalisation '-' <-> '_'
            if '-' in subtype_key:
                prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower().replace('-', '_')))
            elif '_' in subtype_key:
                prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower().replace('_', '-')))
        if prompt_name:
            # Supporte le format dict du registre: {"config": "<nom_fichier_yaml>"}
            prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
            generator = PromptGenerator(prompt_config)
            if getattr(generator, "schema", None):
                generator.validate(json_data)
                logger.info(f"[Fusion][DEBUG] JSON conforme au schéma pour {type_key}/{subtype_key}")
        else:
            logger.warning(f"[Fusion][DEBUG] Aucun prompt_name trouvé pour {type_key}/{subtype_key} lors de la validation du schéma. Validation sautée.")
    except jsonschema.ValidationError as ve:
        logger.error(f"[Fusion][ERREUR] JSON non conforme au schéma: {ve.message}")
        raise HTTPException(status_code=422, detail=f"JSON non conforme au schéma: {ve.message}")
    try:
        # Traces détaillées pour le diagnostic du choix du modèle HTML
        if model_file:
            model_path = f"/tmp/uploaded_models/{uuid.uuid4()}_{model_file.filename}"
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            with open(model_path, "wb") as f:
                f.write(await model_file.read())
        elif model_name:
            model_path = os.path.join("backend", "templates", "qcm_models", model_name)
            if not os.path.exists(model_path):
                raise HTTPException(status_code=404, detail=f"Modèle {model_name} introuvable")
        else:
            # Sélection du modèle HTML par défaut via TEMPLATE_REGISTRY
            normalized_type_key = type_key.lower()
            normalized_subtype_key = subtype_key.lower()
            template_key = (normalized_type_key, normalized_subtype_key)

            default_model_filename = TEMPLATE_REGISTRY.get(template_key)
            
            if not default_model_filename:
                logger.warning(f"Aucun modèle HTML par défaut trouvé dans TEMPLATE_REGISTRY pour type={type_key}, sous-type={subtype_key}.")
                raise HTTPException(status_code=404, detail=f"Modèle par défaut pour {type_key}/{subtype_key} introuvable dans le registre.")
            
            model_path = os.path.join(DEFAULT_TEMPLATE_DIR, default_model_filename)
            logger.info(f"Utilisation du modèle HTML par défaut: {model_path}")

            if not os.path.exists(model_path):
                logger.error(f"Fichier modèle HTML par défaut configuré mais introuvable sur le disque : {model_path}")
                # Cette erreur indique un problème de configuration ou de déploiement, car le fichier listé dans le registre n'existe pas.
                raise HTTPException(status_code=500, detail=f"Erreur interne: Fichier modèle {default_model_filename} introuvable pour {type_key}/{subtype_key}.")

        # Appel service de fusion (à implémenter)
        html_path, html_url = await ai_resource_service.merge_ai_resource_content(
            type_key=type_key,
            subtype_key=subtype_key,
            data_json=data_json,
            model_path=model_path,
            user_id=current_user.id
        )
        logger.info(f"[Fusion][TRACE] Fusion IA terminée pour type_key={type_key}, subtype_key={subtype_key}, html_path={html_path}, html_url={html_url}")
        # Préférer retourner une URL relative si le service la fournit déjà (simplifie le frontend)
        try:
            if isinstance(html_url, str) and html_url.startswith("/"):
                fixed_html_url = html_url
            else:
                # Reconstruire une URL absolue fiable basée sur la requête et X-Forwarded-*
                base = str(request.base_url).rstrip("/")
                xf_host = request.headers.get("x-forwarded-host")
                xf_proto = request.headers.get("x-forwarded-proto")
                if xf_host:
                    proto = xf_proto or ("https" if request.url.scheme == "https" else "http")
                    base = f"{proto}://{xf_host}".rstrip("/")
                parsed = urlparse(html_url) if html_url else None
                path = parsed.path if parsed else None
                if path:
                    fixed_html_url = f"{base}{path}"
                else:
                    fixed_html_url = html_url
        except Exception:
            fixed_html_url = html_url
        logger.info(f"[Fusion][TRACE] URL d'aperçu renvoyée au frontend: {fixed_html_url}")
        return {"html_url": fixed_html_url, "html_path": html_path}
    except Exception as e:
        logger.error(f"[Fusion][ERREUR] Exception lors de la fusion de ressource: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur fusion ressource: {e}")

# Création de nouveaux schémas pour la génération de séances
class AISessionGenerationRequest(BaseModel):
    sequence_id: int
    description_sequence: str | None = None
    nombre_seances: str  # nombre numérique ou "auto"
    inclure_ressources: bool = False
    instructions_supplementaires: str = ""
    niveau: str = "B1"  # Niveau par défaut

class AISessionGenerationResponse(BaseModel):
    sessions: List[SessionCreate]

@router.post(
    "/generate-sessions",
    response_model=AISessionGenerationResponse,
    summary="Génère des séances pour une séquence avec l'IA",
    description="Génère des séances (sessions) adaptées à une séquence pédagogique en utilisant l'IA."
)
async def generate_sessions(
    request: AISessionGenerationRequest,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint pour générer des séances avec l'IA pour une séquence donnée.
    """
    logger.info(f"Génération de séances pour la séquence {request.sequence_id} demandée par l'utilisateur {current_user.email}")
    
    try:
        # Vérifier que la séquence existe et appartient à l'utilisateur
        sequence = get_sequence(db, sequence_id=request.sequence_id)
        if not sequence:
            logger.warning(f"Séquence {request.sequence_id} non trouvée")
            raise HTTPException(status_code=404, detail="Séquence non trouvée")
        
        if sequence.user_id != current_user.id:
            logger.warning(f"Accès non autorisé à la séquence {request.sequence_id} par l'utilisateur {current_user.id}")
            raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette séquence")
        
        # Récupérer les ressources associées aux objets d'étude de la séquence
        ressources_disponibles = []
        if sequence and hasattr(sequence, 'study_objects') and sequence.study_objects:
            # Pour chaque objet d'étude, récupérer ses ressources associées
            for study_obj in sequence.study_objects:
                if hasattr(study_obj, 'resources') and study_obj.resources:
                    for resource in study_obj.resources:
                        # Formaté selon la structure attendue dans le template
                        ressources_disponibles.append({
                            "id": resource.id,
                            "title": resource.title,
                            "type": resource.type.value if hasattr(resource.type, 'value') else (resource.type.name if hasattr(resource.type, 'name') else "inconnu")
                        })
            
            # Log des ressources trouvées
            logger.info(f"Ressources récupérées pour la génération : {ressources_disponibles}")
        
        # Debug : afficher les objectifs liés à la séquence de manière lisible
        objectives_info = [f"ID: {obj.id}, Titre: {obj.title}" for obj in getattr(sequence, 'objectives', [])]
        logger.info(f"sequence.objectives = {objectives_info}")
        objectifs = []
        sequence_objectives = sequence.objectives if sequence else []
        for objective in sequence_objectives:
            objectifs.append({
                "id": objective.id,
                "title": objective.title,
                "description": getattr(objective, "description", None) or ""
            })
        
        # Récupérer les objets d'étude de la séquence et les logger pour débogage
        sequence_study_objects_titles = []
        if sequence and sequence.study_objects:
            # S'assurer que les titres sont correctement extraits
            sequence_study_objects_titles = []
            for so in sequence.study_objects:
                if hasattr(so, 'title') and so.title:
                    if callable(so.title):
                        # Si c'est une méthode, l'appeler
                        title = so.title()
                    else:
                        # Sinon, c'est une propriété
                        title = so.title
                    sequence_study_objects_titles.append(title)
            
            # Log pour déboguer
            study_objects_info = [f"Titre: {title}" for title in sequence_study_objects_titles]
            logger.info(f"sequence.study_objects = {study_objects_info}")
            
        # Pas de ressources directement accessibles depuis la séquence
        existing_resources_summary = []
            
        # Génération des séances
        # Créer des objets d'étude avec la structure attendue par le template
        formatted_study_objects = []
        for i, title in enumerate(sequence_study_objects_titles):
            formatted_study_objects.append({
                "id": "",  # Pas d'ID disponible ici
                "title": title
            })
            
        logger.info(f"Objets d'étude formatés pour le prompt : {formatted_study_objects}")
            
        generation_result = await ai_resource_service.generate_ai_sessions(
            sequence_id=request.sequence_id,
            sequence_title=sequence.title,
            description_sequence=request.description_sequence or sequence.description or "",
            niveau=request.niveau,
            nombre_seances=request.nombre_seances,
            inclure_ressources=request.inclure_ressources,
            ressources_disponibles=ressources_disponibles,
            objectifs=objectifs,
            study_objects=formatted_study_objects,
            instructions_supplementaires=request.instructions_supplementaires,
            user_id=current_user.id
        )
        
        # Vérifier que nous avons bien les séances dans la réponse
        if "sessions" not in generation_result or not generation_result["sessions"]:
            logger.warning("Aucune séance n'a été générée dans la réponse de l'IA")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Aucune séance n'a été générée. Veuillez réessayer."
            )
        
        return {"sessions": generation_result["sessions"]}
        
    except ai_resource_service.ResourceGenerationError as e:
        logger.error(f"Erreur lors de la génération de séances: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur de génération : {str(e)}"
        )
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la génération de séances: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur inattendue s'est produite: {str(e)}"
        )

@router.get(
    "/sessions/{session_id}/available-supports",
    response_model=List[ResourceRead],
    summary="Récupère les œuvres disponibles dans une session comme supports potentiels",
    description="Retourne la liste des ressources de type 'oeuvre' associées à la session spécifiée."
)
async def get_available_supports(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Récupère les ressources de type 'oeuvre' disponibles dans une session pour servir de support à la génération d'exercices.
    """
    logger.info(f"[TRACE] API GET /ai/sessions/{session_id}/available-supports appelé par user_id={current_user.id} email={current_user.email}")
    
    try:
        # Récupérer les ressources de type 'OEUVRE' pour cette session (clé en majuscules dans la BDD)
        resources = get_resources_by_session_and_type(db, session_id=session_id, type_key="OEUVRE")
        
        if not resources:
            logger.info(f"Aucune ressource de type 'oeuvre' trouvée pour la session {session_id}")
            return []
        
        # Convertir en schéma Pydantic pour la réponse
        return [ResourceRead.model_validate(resource) for resource in resources]
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des supports pour la session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur est survenue lors de la récupération des supports disponibles: {str(e)}"
        )

# Définition du modèle pour les paramètres de configuration des exercices
class ExerciseConfigParams(BaseModel):
    niveau_classe: Optional[str] = None
    nombre_ressources: Optional[int] = None
    type_resources: Optional[List[Dict[str, str]]] = None  # Liste des types/sous-types de ressources à inclure
    support_id: Optional[int] = None  # ID de la ressource de type 'oeuvre' à utiliser comme support

@router.post(
    "/sessions/{session_id}/suggest-exercises",
    response_model=AISuggestionResponse,
    summary="Suggère des types d'exercices pour une session donnée",
    description="Analyse une session et suggère des types d'exercices pertinents à générer par IA."
)

async def suggest_exercises_for_session_endpoint(
    session_id: int,
    config_params: ExerciseConfigParams = Body(default=None),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user) # Authentification
):
    logger.info(f"[TRACE] API POST /ai/sessions/{session_id}/suggest-exercises appelé par user_id={getattr(current_user, 'id', '?')} email={getattr(current_user, 'email', '?')}")

    # 1. Récupérer les détails de la session
    session = get_session_by_id(db, session_id=session_id)
    if not session:
        logger.error(f"Session ID {session_id} non trouvée.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session non trouvée")

    # 2. Récupérer les objectifs de la session (titre + description si disponible)
    session_objectives_titles = []
    for obj in session.objectives:
        if obj and obj.title:
            if getattr(obj, 'description', None):
                session_objectives_titles.append(f"{obj.title} — {obj.description}")
            else:
                session_objectives_titles.append(obj.title)

    # 3. Récupérer les objets d'étude de la séquence parente
    sequence_study_objects_titles = []
    if session.sequence_id:
        sequence = get_sequence(db, sequence_id=session.sequence_id)
        if sequence and sequence.study_objects:
            # Inclure la description des objets d'étude si disponible
            for so in sequence.study_objects:
                if so and so.title:
                    if getattr(so, 'description', None):
                        sequence_study_objects_titles.append(f"{so.title} — {so.description}")
                    else:
                        sequence_study_objects_titles.append(so.title)
            
    # 4. Récupérer un résumé des ressources existantes pour la session
    existing_resources_summary = []
    if session.resources:
        for res in session.resources:
            # Utiliser value ou key au lieu de name qui n'existe pas dans ResourceSubType/ResourceType
            summary = f"{res.sub_type.value if res.sub_type else res.type.value}: '{res.title}'"
            if res.source_type == "ai":
                summary += " (IA)"
            existing_resources_summary.append(summary)
            
    # 5. Préparation des paramètres de configuration pour le prompt IA
    config_dict = {}
    if config_params:
        if config_params.niveau_classe:
            config_dict['niveau_classe'] = config_params.niveau_classe
        if config_params.nombre_ressources:
            config_dict['nombre_ressources'] = config_params.nombre_ressources
        if config_params.type_resources:
            config_dict['type_resources'] = config_params.type_resources
            logger.info(f"Types de ressources spécifiés: {config_params.type_resources}")
        
        # Récupération du support si spécifié
        if config_params.support_id:
            logger.info(f"DEBUG: Support ID reçu: {config_params.support_id}")
            support_resource = get_resource(db, resource_id=config_params.support_id)
            if not support_resource:
                logger.warning(f"Support ID {config_params.support_id} non trouvé")
            else:
                # Afficher le type de support à titre informatif
                logger.info(f"Type de support: {support_resource.type.key if support_resource.type else 'inconnu'}, subtype: {support_resource.sub_type.key if support_resource.sub_type else 'inconnu'}")
                # Accepter tous les types de supports
                # Ajouter l'information du support à la configuration
                # Lire le contenu du fichier à partir du chemin file_path
                content = ""
                try:
                    upload_dir = settings.UPLOADS_BASE_DIR
                    # 1) Tenter la lecture du Markdown Docling si disponible
                    docling_md_path = getattr(support_resource, 'docling_md_path', None)
                    chosen_path = None
                    if docling_md_path:
                        md_abs_path = os.path.join(upload_dir, docling_md_path)
                        if os.path.exists(md_abs_path):
                            with open(md_abs_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            chosen_path = md_abs_path
                            logger.info(f"Support: utilisation du Markdown Docling: {md_abs_path}")
                        else:
                            logger.warning(f"Docling MD introuvable: {md_abs_path}. Tentative de déduction via docling_tables_path.")

                    # 1b) Si tables HTML Docling existent, deviner un .md voisin
                    if not content:
                        tables_rel = getattr(support_resource, 'docling_tables_path', None)
                        if tables_rel:
                            try:
                                tables_abs = os.path.join(upload_dir, tables_rel)
                                base_dir = os.path.dirname(tables_abs)
                                base_name = os.path.basename(tables_abs)
                                md_candidates = []
                                if base_name.endswith('_tables.html'):
                                    md_candidates.append(os.path.join(base_dir, base_name.replace('_tables.html', '.md')))
                                if base_name.endswith('.html'):
                                    md_candidates.append(os.path.join(base_dir, base_name[:-5] + '.md'))
                                # Essayer les candidats
                                for cand in md_candidates:
                                    if os.path.exists(cand):
                                        with open(cand, 'r', encoding='utf-8') as f:
                                            content = f.read()
                                        chosen_path = cand
                                        logger.info(f"Support: utilisation du Markdown Docling deviné: {cand}")
                                        break
                                # Sinon chercher n'importe quel .md dans le dossier
                                if not content and os.path.isdir(base_dir):
                                    for name in os.listdir(base_dir):
                                        if name.lower().endswith('.md'):
                                            cand = os.path.join(base_dir, name)
                                            with open(cand, 'r', encoding='utf-8') as f:
                                                content = f.read()
                                            chosen_path = cand
                                            logger.info(f"Support: utilisation du Markdown Docling trouvé dans le dossier: {cand}")
                                            break
                            except Exception as e_md_guess:
                                logger.warning(f"Echec de déduction du Markdown via docling_tables_path: {e_md_guess}")

                    # 2) Repli: fichier original (peut être PDF, donc possiblement illisible en texte)
                    if not content:
                        file_path = support_resource.file_path
                        if file_path:
                            absolute_path = os.path.join(upload_dir, file_path)
                            if os.path.exists(absolute_path):
                                try:
                                    with open(absolute_path, 'r', encoding='utf-8') as f:
                                        content = f.read()
                                    chosen_path = absolute_path
                                    logger.info(f"Support: utilisation du fichier original (texte): {absolute_path}")
                                except Exception as e_txt:
                                    logger.warning(f"Lecture texte du fichier original échouée ({absolute_path}): {e_txt}")
                            else:
                                logger.warning(f"Le fichier original n'existe pas : {absolute_path}")
                        else:
                            logger.warning(f"Chemin de fichier non spécifié pour la ressource ID {support_resource.id}")

                    # 3) Dernier recours: utiliser le HTML des tables Docling si présent
                    if not content:
                        tables_rel = getattr(support_resource, 'docling_tables_path', None)
                        if tables_rel:
                            tables_abs = os.path.join(upload_dir, tables_rel)
                            if os.path.exists(tables_abs):
                                try:
                                    with open(tables_abs, 'r', encoding='utf-8') as f:
                                        content = f.read()
                                    chosen_path = tables_abs
                                    logger.info(f"Support: utilisation du HTML des tables Docling (fallback): {tables_abs}")
                                except Exception as e_html:
                                    logger.warning(f"Lecture HTML des tables échouée ({tables_abs}): {e_html}")

                    # Log de statut Docling pour diagnostic
                    logger.info(
                        f"Docling status pour support ID {support_resource.id}: "
                        f"status={getattr(support_resource, 'docling_status', None)}, "
                        f"md_path={getattr(support_resource, 'docling_md_path', None)}, "
                        f"tables_path={getattr(support_resource, 'docling_tables_path', None)}, "
                        f"chars={getattr(support_resource, 'docling_chars', None)}, "
                        f"chosen={chosen_path}"
                    )
                except Exception as e:
                    logger.error(f"Erreur lors de la lecture du support: {e}")
                
                config_dict['support'] = {
                    'id': support_resource.id,
                    'title': support_resource.title,
                    'content': content
                }
                logger.info(f"DEBUG: Support ajouté à config_dict avec titre: {support_resource.title}")
                logger.info(f"DEBUG: Contenu du support (extrait): {content[:100] if content else 'Vide'}...")
                logger.info(f"Support utilisé pour la génération: {support_resource.title} (ID: {support_resource.id})")
        else:
            logger.info("DEBUG: Aucun support_id reçu dans config_params")


    logger.info(f"Configuration pour suggestion d'exercices: {config_dict}")
            
    # 6. Appeler le service de suggestion avec les nouveaux paramètres
    try:
        suggestions_data = await ai_resource_service.suggest_exercise_types_for_session(
            session_title=session.title or "Session sans titre",
            session_description=session.notes or "",
            session_objectives=session_objectives_titles,
            sequence_study_objects=sequence_study_objects_titles,
            existing_resources_summary=existing_resources_summary,
            **config_dict
        )
        
        # Transformation de la réponse de l'IA pour correspondre au schéma attendu
        if "suggested_exercises" in suggestions_data and "suggestions" not in suggestions_data:
            # L'IA a renvoyé la clé 'suggested_exercises' au lieu de 'suggestions'
            logger.info("Transformation de 'suggested_exercises' en 'suggestions' pour correspondre au schéma")
            suggestions_data = {"suggestions": suggestions_data["suggested_exercises"]}
        
        # Vérification que la structure est correcte avant de créer l'objet Pydantic
        if "suggestions" not in suggestions_data:
            logger.error(f"La réponse de l'IA ne contient ni 'suggestions' ni 'suggested_exercises': {suggestions_data}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Format de réponse IA incorrect pour les suggestions d'exercices"
            )
            
        return AISuggestionResponse(**suggestions_data)

    except ai_resource_service.ResourceGenerationError as e:
        logger.error(f"Erreur de génération IA lors de la suggestion d'exercices pour session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la suggestion d'exercices pour session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Une erreur interne est survenue.")

class AnalyseTexteFromPDFResponse(BaseModel):
    content: Dict[str, Any]
    extraction: DoclingExtractResponse

@router.post(
    "/analyse-texte-from-pdf",
    response_model=AnalyseTexteFromPDFResponse,
    summary="Analyse de texte à partir d'un PDF (Docling -> IA)",
    description=(
        "Orchestre l'extraction de texte depuis un PDF (via Docling) puis génère une fiche d'analyse de texte "
        "(type 'exercice/analyse_texte') avec l'IA. Accepte soit un resource_id (PDF déjà stocké), soit un upload de PDF."
    ),
)
async def analyse_texte_from_pdf(
    *,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    resource_id: Optional[int] = Form(None),
    ocr: bool = Form(False),
    force_reextract: bool = Form(False),
    file: Optional[UploadFile] = File(None),
    niveau: str = Form("5ème"),
    nombre_questions: int = Form(6),
    instructions_personnalisees: Optional[str] = Form(None),
):
    """
    Endpoint orchestrateur : PDF -> Docling (extraction Markdown) -> IA (analyse_texte).
    """
    logger.info("[Orchestrateur] POST /ai/analyse-texte-from-pdf")
    # Logs de diagnostic des paramètres reçus
    try:
        logger.info(
            "[Orchestrateur] Params reçus: resource_id=%s, ocr=%s, niveau=%s, nombre_questions=%s, has_file=%s",
            resource_id,
            ocr,
            niveau,
            nombre_questions,
            file is not None,
        )
        if file is not None:
            logger.info(
                "[Orchestrateur] Upload metadata: filename=%s, content_type=%s",
                getattr(file, "filename", None),
                getattr(file, "content_type", None),
            )
    except Exception:
        logger.warning("[Orchestrateur] Impossible de logger les paramètres reçus.")

    # Exclusivité resource_id vs file
    if (resource_id is None and file is None) or (resource_id is not None and file is not None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fournir soit resource_id, soit file (exclusif).",
        )

    # 1) Extraction Docling
    try:
        logger.info("[Orchestrateur] Étape 1) Extraction Docling - sélection de la branche")
        if resource_id is not None:
            # Vérifier la ressource et l'appartenance
            db_res = get_resource(db=db, resource_id=resource_id)
            if db_res is None:
                raise HTTPException(status_code=404, detail="Resource not found")
            if db_res.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to access this resource")
            if not db_res.file_path:
                raise HTTPException(status_code=400, detail="La ressource n'est pas un PDF valide (aucun chemin de fichier)")
            # Assouplir la validation: accepter si l'extension est .pdf OU si le MIME est application/pdf
            try:
                file_path_str = str(db_res.file_path)
                file_type_str = (db_res.file_type or "").lower()
                is_pdf_ext = file_path_str.lower().endswith(".pdf")
                is_pdf_mime = file_type_str == "application/pdf" or file_type_str.endswith("/pdf")
                if not (is_pdf_ext or is_pdf_mime):
                    logger.warning(
                        "[Orchestrateur] Ressource %s suspecte: file_type=%s, file_path=%s",
                        db_res.id, db_res.file_type, db_res.file_path,
                    )
                    raise HTTPException(status_code=400, detail="La ressource n'est pas un PDF valide (type/extension)")
            except Exception:
                # En cas d'erreur de contrôle, refuser prudemment
                raise HTTPException(status_code=400, detail="La ressource n'est pas un PDF valide (erreur de validation)")

            # Construire le chemin absolu
            rel = str(db_res.file_path).lstrip("/")
            pdf_path = Path(settings.UPLOADS_BASE_DIR) / rel
            if not pdf_path.exists():
                raise HTTPException(status_code=404, detail="Fichier PDF introuvable sur le disque")

            # Utiliser le cache Docling si prêt et non forcé à ré-extraire (et OCR compatible)
            use_cache = False
            try:
                status_ready = (getattr(db_res, "docling_status", None) == "ready")
                md_rel = getattr(db_res, "docling_md_path", None)
                tables_rel = getattr(db_res, "docling_tables_path", None)
                ocr_compatible = (not ocr) or bool(getattr(db_res, "ocr_used", False))
                if (not force_reextract) and status_ready and md_rel and ocr_compatible:
                    md_abs = Path(settings.UPLOADS_BASE_DIR) / str(md_rel).lstrip("/")
                    tables_abs = Path(settings.UPLOADS_BASE_DIR) / str(tables_rel or "").lstrip("/")
                    if md_abs.exists():
                        logger.info("[Orchestrateur][Docling] Cache détecté pour resource_id=%s (md=%s)", db_res.id, md_abs)
                        try:
                            md_text = md_abs.read_text(encoding="utf-8")
                        except Exception:
                            md_text = ""

                        tables_list = []
                        try:
                            if tables_abs.exists():
                                combined = tables_abs.read_text(encoding="utf-8")
                                # Parse très léger basé sur notre format: <h3>Table {idx}</h3> ... \n<hr/> ...
                                parts = [p.strip() for p in re.split(r"\n?<hr\s*/?>\n?", combined, flags=re.I) if p.strip()]
                                for part in parts:
                                    m = re.search(r"<h3>\s*Table\s*(\d+)\s*</h3>\s*(.*)", part, flags=re.I | re.S)
                                    if not m:
                                        continue
                                    idx = int(m.group(1))
                                    html_tbl = m.group(2).strip()
                                    tables_list.append({"index": idx, "html": html_tbl})
                        except Exception:
                            tables_list = []

                        docling_data = {
                            "document_markdown": md_text or "",
                            "tables": tables_list,
                        }
                        use_cache = True
            except Exception:
                use_cache = False

            if not use_cache:
                # Logs Docling (extraction directe si pas de cache exploitable)
                logger.info("[Orchestrateur][Docling] START extract_from_pdf_path path=%s ocr=%s", str(pdf_path), ocr)
                _t0 = time.perf_counter()
                docling_data = extract_from_pdf_path(pdf_path, do_ocr=ocr)
                _dur_ms = int((time.perf_counter() - _t0) * 1000)
                try:
                    _keys = list(docling_data.keys()) if isinstance(docling_data, dict) else str(type(docling_data))
                except Exception:
                    _keys = "<inconnu>"
                logger.info("[Orchestrateur][Docling] DONE extract_from_pdf_path duration_ms=%s keys=%s", _dur_ms, _keys)
        else:
            # Upload direct
            assert file is not None
            # Assouplir la validation MIME pour tenir compte des navigateurs/proxys (Render) qui envoient octet-stream
            ct = (getattr(file, "content_type", None) or "").lower()
            fn = (getattr(file, "filename", None) or "").lower()
            is_pdf_ct = (ct == "application/pdf") or ct.endswith("/pdf") or ("pdf" in ct)
            is_pdf_by_name = fn.endswith(".pdf")
            if not (is_pdf_ct or (ct in ("", "application/octet-stream") and is_pdf_by_name)):
                logger.warning("[Orchestrateur] Upload rejeté: content_type=%s, filename=%s", ct, fn)
                raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés (type/extension)")
            logger.info("[Orchestrateur] Branche upload direct sélectionnée: filename=%s content_type=%s", fn, ct)
            try:
                content_bytes = await file.read()
            finally:
                await file.close()

            max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
            try:
                logger.info("[Orchestrateur] Taille du fichier reçu (bytes)=%s (max autorisé=%s)", len(content_bytes or b""), max_bytes)
            except Exception:
                logger.info("[Orchestrateur] Impossible de déterminer la taille du fichier reçu.")

            if not content_bytes or len(content_bytes) == 0:
                raise HTTPException(status_code=400, detail="Le fichier PDF est vide")

            if len(content_bytes) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Le fichier est trop volumineux. La taille maximale est de {settings.MAX_UPLOAD_SIZE_MB} Mo.",
                )

            # Empreinte/métadonnées du fichier pour diagnostic
            try:
                _md5 = hashlib.md5(content_bytes).hexdigest()
                _first = (content_bytes[:16] or b"").hex()
                logger.info("[Orchestrateur] Fichier reçu: md5=%s first16hex=%s", _md5, _first)
            except Exception:
                logger.info("[Orchestrateur] Impossible de calculer l'empreinte MD5 des bytes reçus")

            # Logs Docling (branche upload)
            logger.info("[Orchestrateur][Docling] START extract_from_pdf_bytes ocr=%s", ocr)
            _t0 = time.perf_counter()
            docling_data = extract_from_pdf_bytes(content_bytes, do_ocr=ocr)
            _dur_ms = int((time.perf_counter() - _t0) * 1000)
            try:
                _keys = list(docling_data.keys()) if isinstance(docling_data, dict) else str(type(docling_data))
            except Exception:
                _keys = "<inconnu>"
            logger.info("[Orchestrateur][Docling] DONE extract_from_pdf_bytes duration_ms=%s keys=%s", _dur_ms, _keys)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Orchestrateur] Échec extraction Docling: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'extraction Docling")

    document_markdown = (docling_data or {}).get("document_markdown", "")
    try:
        _len_doc = len(document_markdown or "")
        _tables_count = len(((docling_data or {}).get("tables") or []))
        logger.info(
            "[Orchestrateur] Longueur document_markdown extrait=%s | tables_extraites=%s",
            _len_doc,
            _tables_count,
        )
    except Exception:
        logger.info("[Orchestrateur] Impossible de mesurer la longueur du document extrait et/ou le nombre de tables.")
    if not isinstance(document_markdown, str) or not document_markdown.strip():
        raise HTTPException(status_code=400, detail="Aucun texte exploitable extrait du PDF")

    # Option: limiter la taille du texte transmis à l'IA
    try:
        max_chars = int(os.getenv("DOC_PDF_MAX_CHARS", "35000"))
    except Exception:
        max_chars = 15000
    texte_source = document_markdown[:max_chars]
    try:
        _len_src = len(texte_source or "")
        logger.info(
            "[Orchestrateur] Longueur texte_source transmis à l'IA (après troncature)=%s (max_chars=%s)",
            _len_src,
            max_chars,
        )
        if _len_doc is not None and _len_doc > max_chars:
            logger.warning(
                "[Orchestrateur] ATTENTION: document tronqué avant IA de %s caractères (len_doc=%s > max_chars=%s)",
                (_len_doc - max_chars),
                _len_doc,
                max_chars,
            )
    except Exception:
        logger.info("[Orchestrateur] Impossible de mesurer la longueur du texte transmis à l'IA et/ou la troncature.")

    # 2) Appel IA pour 'exercice/analyse_texte'
    try:
        logger.info("[Orchestrateur] Appel IA generate_ai_resource_content(exercice/analyse_texte)")
        content = await ai_resource_service.generate_ai_resource_content(
            type_key="exercice",
            subtype_key="analyse_texte",
            input_variables={
                "texte_source": texte_source,
                "niveau": niveau,
                "nombre_questions": nombre_questions,
                "instructions_personnalisees": instructions_personnalisees or "",
            },
            user_id=current_user.id,
            duration_ms=None,
        )
        if not content or (isinstance(content, dict) and len(content) == 0):
            raise ResourceGenerationError("Contenu généré vide ou invalide pour exercice/analyse_texte")
    except ResourceGenerationError as e:
        logger.error(f"[Orchestrateur] Erreur génération IA: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[Orchestrateur] Erreur inattendue génération IA: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de la génération IA")

    # Réponse combinée
    return {
        "content": content,
        "extraction": docling_data,
    }
