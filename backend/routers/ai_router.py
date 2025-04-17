from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from backend.ai.schemas import ChatInput, ChatOutput
from backend.ai.schemas import AIResourceTypesResponse, AIResourceGenerationRequest, AIResourceGenerationResponse
from backend.ai import generation_service
from backend.ai import ai_resource_service
from backend.ai.ai_resource_service import generate_ai_resource_content, get_available_ai_resource_types, ResourceGenerationError
from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel
import logging

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
    prompt_class = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower()))
    if not prompt_class:
        raise HTTPException(
            status_code=404,
            detail=f"Type de ressource '{type_key}/{subtype_key}' non trouvé"
        )
    
    try:
        # Obtenir le modèle Pydantic associé aux variables
        variables_model = prompt_class.get_variables_model()
        
        # Extraire le schéma avec les métadonnées (descriptions, validations, etc.)
        schema = variables_model.model_json_schema()
        
        # Formater pour le frontend
        form_fields = []
        for field_name, field_properties in schema.get("properties", {}).items():
            field_type = "string"  # Type par défaut
            
            # Déterminer le type de champ
            if field_properties.get("type") == "integer":
                field_type = "number"
            
            # Ajouter les validations
            validations = {}
            if "minimum" in field_properties:
                validations["min"] = field_properties["minimum"]
            if "maximum" in field_properties:
                validations["max"] = field_properties["maximum"]
            
            form_fields.append({
                "name": field_name,
                "label": field_properties.get("title", field_name),
                "description": field_properties.get("description", ""),
                "type": field_type,
                "required": field_name in schema.get("required", []),
                "default": field_properties.get("default"),
                "validations": validations
            })
        
        return {"fields": form_fields}
        
    except NotImplementedError as e:
        logger.error(f"La classe de prompt {type_key}/{subtype_key} n'implémente pas get_variables_model(): {e}")
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Le schéma pour '{type_key}/{subtype_key}' n'est pas disponible: {e}"
        )
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du schéma pour {type_key}/{subtype_key}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur inattendue s'est produite: {e}"
        )
