from backend.ai.llm_interface import get_llm_client
from backend.ai.schemas import ChatInput, ChatOutput, ChatMessage
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from typing import List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _convert_to_langchain_messages(history: List[ChatMessage], new_user_message: str) -> List[BaseMessage]:
    """Converts chat history and the new message to LangChain's message format."""
    messages: List[BaseMessage] = []
    for msg in history:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            messages.append(AIMessage(content=msg.content))
        elif msg.role == "system":
             # Handle system messages if your chosen model supports them well
            # or adapt as needed (e.g., prepend to the first user message)
            messages.append(SystemMessage(content=msg.content)) 
            
    # Add the latest user message
    messages.append(HumanMessage(content=new_user_message))
    return messages

async def get_chat_response(input_data: ChatInput) -> ChatOutput:
    """
    Gets a response from the configured LLM based on the input message and history.

    Args:
        input_data: The chat input containing the new message and history.

    Returns:
        ChatOutput: The chat output containing the AI's response.
        
    Raises:
        Exception: If there is an error during LLM invocation.
    """
    logger.info(f"Received chat request. History length: {len(input_data.history)}, Provider: {get_llm_client()._llm_type}")
    
    try:
        llm = get_llm_client()
        
        # Convert history and new message to LangChain format
        langchain_messages = _convert_to_langchain_messages(input_data.history, input_data.message)
        
        logger.debug(f"Invoking LLM with messages: {langchain_messages}")
        
        # Invoke the LLM
        ai_response: BaseMessage = await llm.ainvoke(langchain_messages)
        
        response_content = ""
        if isinstance(ai_response, AIMessage):
            response_content = ai_response.content
        else:
            # Handle unexpected response types if necessary
            logger.warning(f"Received unexpected response type from LLM: {type(ai_response)}")
            # Attempt to convert to string or handle appropriately
            response_content = str(ai_response) 

        logger.info(f"LLM invocation successful. Response length: {len(response_content)}")
        return ChatOutput(response=response_content)

    except Exception as e:
        logger.error(f"Error during LLM invocation: {e}", exc_info=True)
        # Re-raise the exception to be handled by FastAPI's error handling
        # Or return a specific error response
        # return ChatOutput(response=f"An error occurred: {e}") 
        raise e
