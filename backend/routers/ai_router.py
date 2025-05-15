from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from pydantic import BaseModel
import logging
import os
import uuid

from backend.ai.schemas import ChatInput, ChatOutput
from backend.ai.schemas import AIResourceTypesResponse, AIResourceGenerationRequest, AIResourceGenerationResponse
from backend.ai import generation_service
from backend.ai import ai_resource_service
from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.ai.services.registry import ResourceGenerationError
from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel
from backend.schemas.session import SessionCreate
from backend.schemas.ai_suggestion import AISuggestionResponse
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
    response_model=AIResourceTypesResponse,
    summary="Liste les types de ressources AI disponibles",
    description="Retourne les types et sous-types de ressources qui peuvent être générés par IA."
)
async def get_ai_resource_types():
    """
    Endpoint pour lister les types de ressources qui peuvent être générés par IA.
    """
    logger.info("Récupération des types de ressources IA disponibles")
    try:
        types = ai_resource_service.get_available_ai_resource_types()
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
    
    try:
        import time
        start_time = time.perf_counter()
        content = await ai_resource_service.generate_ai_resource_content(
            type_key=request.type_key,
            subtype_key=request.subtype_key,
            input_variables=request.variables,
            user_id=current_user.id,
            duration_ms=None  # Sera mesuré dans la fonction si non fourni
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        # Optionnel : vous pouvez logger duration_ms ici si besoin
        
        logger.info(f"Contenu généré avec succès pour {request.type_key}/{request.subtype_key}")
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
            if "enum" in p:
                validations["enum"] = p["enum"]
            default = p.get("default")
            # Champ requis si pas de default
            required = default is None
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
            # Sélection du modèle HTML selon type/sous-type
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if type_key.lower() == "oeuvre" and subtype_key.lower() == "extrait":
                model_dir = os.path.join(BASE_DIR, "ai", "template", "oeuvre_models")
            elif type_key.lower() == "exercice" and subtype_key.lower() == "qcm":
                model_dir = os.path.join(BASE_DIR, "ai", "template", "qcm_models")
            elif type_key.lower() == "oeuvre" and subtype_key.lower() == "oeuvrecomp":
                model_dir = os.path.join(BASE_DIR, "ai", "template", "oeuvre_models")
            elif type_key.lower() == "exercice" and subtype_key.lower() == "vocabulaire":
                model_dir = os.path.join(BASE_DIR, "ai", "template", "vocabulaire_models")
            elif type_key.lower() == "exercice" and subtype_key.lower() == "champlex":
                model_dir = os.path.join(BASE_DIR, "ai", "template", "champlex_models")
            elif type_key.lower() == "exercice" and subtype_key.lower() == "champlex2":
                model_dir = os.path.join(BASE_DIR, "ai", "template", "champlex_models")
            else:
                logger.warning(f"Aucun modèle HTML disponible pour type={type_key}, sous-type={subtype_key}.")
                raise HTTPException(status_code=404, detail=f"Modèle par défaut pour {type_key}/{subtype_key} introuvable")
            model_path = os.path.join(model_dir, f"default_{type_key.lower()}_{subtype_key.lower()}.html")
            if not os.path.exists(model_path):
                logger.warning(f"Fichier modèle HTML introuvable : {model_path}")
                raise HTTPException(status_code=404, detail=f"Modèle par défaut pour {type_key}/{subtype_key} introuvable")

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
        if request.inclure_ressources and sequence and sequence.study_objects:
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

@router.post(
    "/sessions/{session_id}/suggest-exercises",
    response_model=AISuggestionResponse,
    summary="Suggère des types d'exercices pour une session donnée",
    description="Analyse une session et suggère des types d'exercices pertinents à générer par IA."
)
async def suggest_exercises_for_session_endpoint(
    session_id: int,
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
            
    # 5. Appeler le service de suggestion
    try:
        suggestions_data = await ai_resource_service.suggest_exercise_types_for_session(
            session_title=session.title or "Session sans titre",
            session_description=session.description or "",
            session_objectives=session_objectives_titles,
            sequence_study_objects=sequence_study_objects_titles,
            existing_resources_summary=existing_resources_summary
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
