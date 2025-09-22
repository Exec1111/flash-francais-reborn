from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
import logging
from datetime import datetime

from backend.dependencies import get_current_active_user
from models.user import User as UserModel
from backend.schemas.json_chat import (
    JsonChatRequest,
    JsonChatResponse,
    JsonChatMessage
)
from backend.ai.services.json_editor_ai_service import json_editor_ai_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/json-chat",
    tags=["JSON Chat"],
)

@router.post(
    "/process",
    response_model=JsonChatResponse,
    summary="Traiter une demande de modification JSON via IA",
    description="Traite une demande de l'utilisateur pour modifier des données JSON structurées. Le contexte conversationnel est géré côté frontend."
)
async def process_json_modification(
    request: JsonChatRequest,
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Traiter une demande de modification de données JSON via l'IA générative.
    Chat éphémère sans persistance en base de données.
    """
    try:
        # Logs de debug pour diagnostiquer l'erreur 422
        logger.info(f"[JSON-CHAT][DEBUG] Requête reçue pour utilisateur {current_user.id}")
        logger.info(f"[JSON-CHAT][DEBUG] Message: {request.message[:100]}...")
        logger.info(f"[JSON-CHAT][DEBUG] Type/Sous-type: {request.resource_type}/{request.resource_subtype}")
        logger.info(f"[JSON-CHAT][DEBUG] Données actuelles: {str(request.current_data)[:200]}...")
        logger.info(f"[JSON-CHAT][DEBUG] Historique: {len(request.conversation_history)} messages")
        logger.info(f"[JSON-CHAT][DEBUG] Config modèle: {request.ai_model_config}")
        # Convertir l'historique en format pour l'IA
        conversation_history = []
        for msg in request.conversation_history:
            conversation_history.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Traiter la modification via l'IA
        logger.info(f"[JSON-CHAT][DEBUG] Appel du service IA...")
        ai_result = await json_editor_ai_service.process_json_modification(
            user_message=request.message,
            current_data=request.current_data,
            resource_type=request.resource_type,
            resource_subtype=request.resource_subtype,
            conversation_history=conversation_history,
            user_id=current_user.id,
            model_config=request.ai_model_config
        )
        logger.info(f"[JSON-CHAT][DEBUG] Service IA terminé, résultat: {ai_result.keys() if isinstance(ai_result, dict) else type(ai_result)}")
        
        # Créer le message de réponse pour l'historique
        response_message = JsonChatMessage(
            role="assistant",
            content=ai_result["message"],
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Modification JSON traitée avec succès pour utilisateur {current_user.id} - {request.resource_type}/{request.resource_subtype}")
        
        return JsonChatResponse(
            message=ai_result["message"],
            modified_data=ai_result["modified_data"],
            conversation_message=response_message
        )
        
    except ValueError as ve:
        logger.error(f"[JSON-CHAT][ERREUR] Erreur de validation: {ve}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Erreur de validation: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"[JSON-CHAT][ERREUR] Erreur lors du traitement JSON: {e}", exc_info=True)
        
        # Si c'est une erreur de validation, la re-lancer telle quelle
        if isinstance(e, HTTPException):
            raise e
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du traitement: {str(e)}"
        )
