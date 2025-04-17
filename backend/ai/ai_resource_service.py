"""
Service pour la génération de ressources IA à partir de prompts.
"""
from typing import Dict, Any, Optional, Type
import logging
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.language_models.chat_models import BaseChatModel

from backend.ai.llm_interface import get_llm_client
from backend.ai.prompts.base import BasePrompt
from backend.ai.prompts.exercises.qcm import QCMPrompt
from backend.models import ResourceType, ResourceSubType

logger = logging.getLogger(__name__)

# Registre des prompts associés aux types/sous-types de ressources
PROMPT_REGISTRY = {
    # Format: (type_key, subtype_key): PromptClass
    ("exercice", "qcm"): QCMPrompt,
    # Ajouter d'autres mappings ici au fur et à mesure
}

class ResourceGenerationError(Exception):
    """Exception levée lors d'une erreur de génération de ressource IA."""
    pass

async def generate_ai_resource_content(
    type_key: str, 
    subtype_key: str, 
    input_variables: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Génère le contenu d'une ressource IA en utilisant le prompt approprié.
    
    Args:
        type_key: Clé du type de ressource (ex: 'exercice')
        subtype_key: Clé du sous-type de ressource (ex: 'qcm')
        input_variables: Variables à injecter dans le prompt
        
    Returns:
        Contenu structuré généré par l'IA
        
    Raises:
        ResourceGenerationError: Si le type/sous-type n'a pas de prompt associé ou autres erreurs
    """
    try:
        # Récupérer la classe de prompt appropriée
        prompt_class = PROMPT_REGISTRY.get((type_key, subtype_key))
        if not prompt_class:
            raise ResourceGenerationError(f"Pas de prompt défini pour le type '{type_key}' et sous-type '{subtype_key}'")
        
        # Instantier le prompt
        prompt_instance = prompt_class()
        
        # Log des variables reçues pour la génération
        logger.info(f"Variables reçues pour génération : {input_variables}")

        # Générer le prompt utilisateur effectivement envoyé au LLM
        user_prompt = prompt_instance.format_user_prompt(input_variables)
        logger.info(f"Prompt utilisateur envoyé au LLM : {user_prompt}")

        # Préparer les messages pour le LLM
        messages = prompt_instance.get_messages(input_variables)
        langchain_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                langchain_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))
        
        logger.info(f"Génération de contenu pour ressource de type '{type_key}/{subtype_key}'")
        
        # Appeler le LLM
        ai_response: BaseMessage = await get_llm_client().ainvoke(langchain_messages)
        
        # Extraire le contenu de la réponse
        response_content = ""
        if isinstance(ai_response, AIMessage):
            response_content = ai_response.content
        else:
            response_content = str(ai_response)
        
        # Log de la réponse brute du LLM
        logger.info(f"Réponse brute du LLM : {response_content}")

        # Parser la réponse
        parsed_content = prompt_instance.parse_response(response_content)
        
        return parsed_content
        
    except Exception as e:
        logger.error(f"Erreur lors de la génération de contenu IA: {e}", exc_info=True)
        raise ResourceGenerationError(f"Erreur de génération: {str(e)}")

def get_available_ai_resource_types() -> Dict[str, Dict[str, list]]:
    """
    Retourne la liste des types/sous-types de ressources AI disponibles.
    
    Returns:
        Dictionnaire des types et leurs sous-types associés pour lesquels 
        des prompts de génération sont disponibles
    """
    result = {}
    
    for (type_key, subtype_key) in PROMPT_REGISTRY.keys():
        if type_key not in result:
            result[type_key] = {"subtypes": []}
        
        result[type_key]["subtypes"].append(subtype_key)
    
    return result
