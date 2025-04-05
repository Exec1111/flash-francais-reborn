from fastapi import APIRouter, HTTPException, status, Depends
from backend.ai.schemas import ChatInput, ChatOutput
from backend.ai import generation_service
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
