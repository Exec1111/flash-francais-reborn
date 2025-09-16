from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
import logging
from datetime import datetime

from backend.dependencies import get_current_active_user
from models.user import User as UserModel
from backend.schemas.html_chat import (
    HtmlChatRequest,
    HtmlChatResponse,
    HtmlChatMessage
)
from backend.ai.services.html_editor_ai_service import html_editor_ai_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/html-chat",
    tags=["HTML Chat"],
)

@router.post(
    "/process",
    response_model=HtmlChatResponse,
    summary="Traiter une demande de modification HTML via IA",
    description="Traite une demande de l'utilisateur pour modifier du contenu HTML. Le contexte conversationnel est géré côté frontend."
)
async def process_html_modification(
    request: HtmlChatRequest,
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Traiter une demande de modification HTML via l'IA générative.
    Chat éphémère sans persistance en base de données.
    """
    try:
        # Convertir l'historique en format pour l'IA
        conversation_history = []
        for msg in request.conversation_history:
            conversation_history.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Traiter la modification via l'IA
        ai_result = await html_editor_ai_service.process_html_modification(
            user_message=request.message,
            current_html=request.current_html,
            conversation_history=conversation_history,
            user_id=current_user.id,
            model_config=request.ai_model_config
        )
        
        # Créer le message de réponse pour l'historique
        response_message = HtmlChatMessage(
            role="assistant",
            content=ai_result["message"],
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Modification HTML traitée avec succès pour utilisateur {current_user.id}")
        
        return HtmlChatResponse(
            message=ai_result["message"],
            modified_html=ai_result["modified_html"],
            conversation_message=response_message
        )
        
    except Exception as e:
        logger.error(f"Erreur lors du traitement HTML: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du traitement: {str(e)}"
        )