from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from backend.config import get_settings

settings = get_settings()

def get_llm_client() -> BaseChatModel:
    """
    Factory function to get an instance of the configured chat model.

    Reads the AI_PROVIDER from settings and instantiates either
    ChatOpenAI or ChatGoogleGenerativeAI accordingly, passing the
    respective API keys and model names from settings.

    Returns:
        BaseChatModel: An instance of the configured chat model.

    Raises:
        ValueError: If the configured AI_PROVIDER is not supported.
    """
    provider = settings.AI_PROVIDER.lower()
    
    if provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key is missing in the configuration.")
        return ChatOpenAI(
            api_key=settings.OPENAI_API_KEY, 
            model=settings.OPENAI_CHAT_MODEL
            # Add other parameters like temperature if needed
            # temperature=0.7 
        )
    elif provider == "gemini":
        if not settings.GOOGLE_API_KEY:
            raise ValueError("Google API key is missing in the configuration.")
        return ChatGoogleGenerativeAI(
            google_api_key=settings.GOOGLE_API_KEY,
            model=settings.GEMINI_CHAT_MODEL
            # Add other parameters like temperature if needed
            # temperature=0.7
            # convert_system_message_to_human=True # Might be needed depending on model/usage
        )
    else:
        raise ValueError(f"Unsupported AI provider configured: {settings.AI_PROVIDER}")

# Example usage (optional, for testing purposes)
# if __name__ == "__main__":
#     try:
#         llm = get_llm_client()
#         print(f"Successfully instantiated LLM client for provider: {settings.AI_PROVIDER}")
#         print(f"Model type: {type(llm)}")
#         # Example invocation (will cost credits!)
#         # from langchain_core.messages import HumanMessage
#         # response = llm.invoke([HumanMessage(content="Hello!")])
#         # print("LLM Response:", response.content)
#     except ValueError as e:
#         print(f"Error: {e}")
