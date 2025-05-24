from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
import os
import uuid
import json
from config import get_settings

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
        response = await ai_resource_service.generation_service.get_chat_response(input_data)
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
    prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower()))
    if not prompt_name:
        raise HTTPException(status_code=404, detail=f"Type de ressource '{type_key}/{subtype_key}' non trouvé")
    try:
        # Utiliser le générateur config-driven
        generator = PromptGenerator(prompt_name)
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
        return {"html_url": html_url, "html_path": html_path}
    except Exception as e:
        logger.error(f"[Fusion][ERREUR] Exception lors de la fusion de ressource: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur fusion ressource: {e}")

# Création de nouveaux schémas pour la génération de séances
class AISessionGenerationRequest(BaseModel):
    sequence_id: int
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
                "title": objective.title
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
            niveau=request.niveau,
            nombre_seances=request.nombre_seances,
            inclure_ressources=request.inclure_ressources,
            ressources_disponibles=ressources_disponibles,
            objectifs=objectifs,
            study_objects=formatted_study_objects,
            instructions_supplementaires=request.instructions_supplementaires
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

    # 2. Récupérer les objectifs de la session
    session_objectives_titles = [obj.title for obj in session.objectives if obj.title]

    # 3. Récupérer les objets d'étude de la séquence parente
    sequence_study_objects_titles = []
    if session.sequence_id:
        sequence = get_sequence(db, sequence_id=session.sequence_id)
        if sequence and sequence.study_objects:
            sequence_study_objects_titles = [so.title for so in sequence.study_objects if so.title]
            
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
                    file_path = support_resource.file_path
                    if file_path:
                        upload_dir = settings.UPLOADS_BASE_DIR
                        absolute_path = os.path.join(upload_dir, file_path)
                        if os.path.exists(absolute_path):
                            with open(absolute_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            logger.info(f"Fichier lu avec succès : {absolute_path}")
                        else:
                            logger.warning(f"Le fichier n'existe pas : {absolute_path}")
                    else:
                        logger.warning(f"Chemin de fichier non spécifié pour la ressource ID {support_resource.id}")
                except Exception as e:
                    logger.error(f"Erreur lors de la lecture du fichier : {e}")
                
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
