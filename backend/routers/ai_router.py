from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from backend.ai.schemas import ChatInput, ChatOutput
from backend.ai.schemas import AIResourceTypesResponse, AIResourceGenerationRequest, AIResourceGenerationResponse
from backend.ai import generation_service
from backend.ai import ai_resource_service
from backend.ai.ai_resource_service import generate_ai_resource_content, get_available_ai_resource_types, ResourceGenerationError, merge_ai_resource_content
from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel
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
        types = get_available_ai_resource_types()
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
        # Générer le contenu
        content = await generate_ai_resource_content(
            type_key=request.type_key,
            subtype_key=request.subtype_key,
            input_variables=request.variables
        )
        
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
    logger.info(f"Fusion ressource IA {type_key}/{subtype_key} demandée par {current_user.email}")
    logger.info(f"[Fusion][TRACE] Paramètres POST reçus : type_key={type_key}, subtype_key={subtype_key}, model_file={model_file.filename if model_file else None}, model_name={model_name}, data_json={data_json[:200]}...")
    if not type_key or not subtype_key:
        logger.error(f"[Fusion][ERREUR] type_key ou subtype_key manquant dans la requête : type_key={type_key}, subtype_key={subtype_key}")
        raise HTTPException(status_code=400, detail="type_key et subtype_key sont obligatoires.")
    logger.info(f"[Fusion][TRACE] Entrée dans merge_resource pour type_key={type_key}, subtype_key={subtype_key}")
    try:
        # Traces détaillées pour le diagnostic du choix du modèle HTML
        logger.info(f"[Fusion][TRACE] type_key reçu : {type_key} | subtype_key reçu : {subtype_key}")
        if model_file:
            logger.info(f"[Fusion][TRACE] Modèle uploadé reçu : {model_file.filename}")
            model_path = f"/tmp/uploaded_models/{uuid.uuid4()}_{model_file.filename}"
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            with open(model_path, "wb") as f:
                f.write(await model_file.read())
        elif model_name:
            logger.info(f"[Fusion][TRACE] Modèle nommé explicitement demandé : {model_name}")
            model_path = os.path.join("backend", "templates", "qcm_models", model_name)
            if not os.path.exists(model_path):
                raise HTTPException(status_code=404, detail=f"Modèle {model_name} introuvable")
        else:
            logger.info(f"[Fusion][TRACE] Sélection du modèle HTML par défaut pour type={type_key}, sous-type={subtype_key}")
            # Sélection du modèle HTML selon type/sous-type
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if type_key.lower() == "oeuvre" and subtype_key.lower() == "extrait":
                model_dir = os.path.join(BASE_DIR, "templates", "oeuvre_models")
            elif type_key.lower() == "exercice" and subtype_key.lower() == "qcm":
                model_dir = os.path.join(BASE_DIR, "templates", "qcm_models")
            elif type_key.lower() == "oeuvre" and subtype_key.lower() == "oeuvrecomp":
                model_dir = os.path.join(BASE_DIR, "templates", "oeuvre_models")
            else:
                logger.warning(f"Aucun modèle HTML disponible pour type={type_key}, sous-type={subtype_key}.")
                raise HTTPException(status_code=404, detail=f"Modèle par défaut pour {type_key}/{subtype_key} introuvable")
            logger.info(f"[Fusion][TRACE] Dossier modèle sélectionné : {model_dir}")
            model_path = os.path.join(model_dir, f"default_{type_key.lower()}_{subtype_key.lower()}.html")
            logger.info(f"[Fusion][TRACE] Chemin du modèle HTML sélectionné : {model_path}")
            if not os.path.exists(model_path):
                logger.warning(f"Fichier modèle HTML introuvable : {model_path}")
                raise HTTPException(status_code=404, detail=f"Modèle par défaut pour {type_key}/{subtype_key} introuvable")

        # Appel service de fusion (à implémenter)
        html_path, html_url = await merge_ai_resource_content(
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
