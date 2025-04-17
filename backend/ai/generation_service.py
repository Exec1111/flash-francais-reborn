import logging
from backend.ai.schemas import ChatInput, ChatOutput, ChatMessage
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_chat_response(input_data: ChatInput) -> ChatOutput:
    """
    Obtient une réponse du LLM Gemini via l'API Google Generative AI, à partir du message utilisateur et de l'historique.
    """
    try:
        # Concatène l'historique et le message utilisateur pour le prompt
        history_text = "\n".join([f"{msg.role}: {msg.content}" for msg in input_data.history])
        prompt = f"{history_text}\nuser: {input_data.message}"
        import google.generativeai as genai
        from dotenv import load_dotenv
        import os
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-pro-preview-03-25")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content([prompt])
        response_content = response.text
        logger.info(f"LLM invocation successful. Response length: {len(response_content)}")
        return ChatOutput(response=response_content)
    except Exception as e:
        logger.error(f"Error during LLM invocation: {e}", exc_info=True)
        raise e
