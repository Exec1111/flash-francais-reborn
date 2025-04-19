import logging
from backend.ai.schemas import ChatInput, ChatOutput, ChatMessage
from typing import List
import os
import logging
from google import genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_chat_response(input_data: ChatInput) -> ChatOutput:
    """
    Obtient une réponse du LLM Gemini via l'API Google Generative AI, à partir du message utilisateur et de l'historique.
    """
    try:
        from dotenv import load_dotenv
        
        # Chargement des variables d'environnement
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-pro-preview-03-25")
        
        # Configuration de l'API google-genai
        client = genai.Client(api_key=api_key)
        
        # Formater l'historique pour le chat
        messages = []
        for msg in input_data.history:
            role = "user" if msg.role.lower() == "user" else "model"
            messages.append({"role": role, "parts": [{"text": msg.content}]})
        
        # Ajouter le message actuel
        messages.append({"role": "user", "parts": [{"text": input_data.message}]})
        
        # Générer la réponse avec l'API (paramètres simplifiés)
        response = client.models.generate_content(
            model=model_name,
            contents=messages
        )
        
        response_content = response.text
        logger.info(f"LLM invocation successful. Response length: {len(response_content)}")
        return ChatOutput(response=response_content)
    except Exception as e:
        logger.error(f"Error during LLM invocation: {e}", exc_info=True)
        raise e
