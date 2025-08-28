import os
import logging
from typing import List, Dict, Any, Optional
import json
import time
from openai import AsyncOpenAI

from .base_ai_service import BaseAIService

logger = logging.getLogger(__name__)

class OpenAIService(BaseAIService):
    """
    Service pour les interactions avec l'API OpenAI (GPT-4o mini, etc.)
    """
    
    def __init__(self, model_name: str = None, api_key: str = None):
        # Utiliser les variables d'environnement si non spécifiées
        if not api_key:
            api_key = os.getenv("OPENAI_API_KEY")
        if not model_name:
            model_name = os.getenv("OPENAI_CHAT_MODEL", "gpt-5-mini")
            
        super().__init__(model_name, api_key)
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY doit être définie dans les variables d'environnement")
            
        self.client = AsyncOpenAI(api_key=self.api_key)
    
    async def generate_content(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: List[Dict[str, str]] = None,
        response_format: str = "json"
    ) -> Dict[str, Any]:
        """
        Génère du contenu via l'API Responses OpenAI (GPT-5)
        """
        start_time = time.perf_counter()
        
        try:
            # Construire l'input pour l'API Responses
            input_messages = []
            
            # Ajouter le prompt système comme developer message
            if system_prompt:
                input_messages.append({"role": "developer", "content": system_prompt})
            
            # Ajouter l'historique de conversation
            if conversation_history:
                for msg in conversation_history[-5:]:  # Garder seulement les 5 derniers
                    input_messages.append({
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", "")
                    })
            
            # Ajouter le prompt utilisateur
            input_messages.append({"role": "user", "content": user_prompt})
            
            # Configuration de la requête pour l'API Responses
            request_params = {
                "model": self.model_name,
                "input": input_messages
            }
            
            # Ajouter la configuration text avec verbosity et response_format
            text_config = {
                "verbosity": "low"  # Réponses concises pour l'éditeur HTML
            }
            
            # Ajouter le format de réponse si JSON demandé (dans text.format)
            if response_format == "json":
                text_config["format"] = {"type": "json_object"}
                # S'assurer que le prompt demande du JSON
                if "json" not in user_prompt.lower():
                    input_messages[-1]["content"] += "\n\nVeuillez répondre au format JSON."
            
            request_params["text"] = text_config
            
            logger.info(f"Appel OpenAI Responses API avec modèle {self.model_name}")
            logger.debug(f"Input messages: {input_messages}")
            logger.debug(f"Request params: {request_params}")
            
            # Appel à l'API Responses OpenAI
            response = await self.client.responses.create(**request_params)
            
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            
            # Debug : afficher la structure de la réponse
            logger.debug(f"Response type: {type(response)}")
            logger.debug(f"Response attributes: {dir(response)}")
            if hasattr(response, 'output'):
                logger.debug(f"Response.output: {response.output}")
                logger.debug(f"Response.output type: {type(response.output)}")
            else:
                logger.debug("Response n'a pas d'attribut 'output'")
            
            # Extraire le contenu de la réponse
            output_text = ""
            if response.output and hasattr(response, 'output') and response.output is not None:
                for item in response.output:
                    if hasattr(item, "content") and item.content is not None:
                        for content in item.content:
                            if hasattr(content, "text") and content.text is not None:
                                output_text += content.text
            
            # Fallback : essayer d'accéder directement au contenu si la structure est différente
            if not output_text and hasattr(response, 'choices') and response.choices:
                # Structure similaire à Chat Completions
                if hasattr(response.choices[0], 'message') and hasattr(response.choices[0].message, 'content'):
                    output_text = response.choices[0].message.content
            
            # Autre fallback : vérifier si response a un attribut 'content' direct
            if not output_text and hasattr(response, 'content') and response.content:
                output_text = str(response.content)
            
            if not output_text:
                raise Exception("Réponse vide de l'API OpenAI Responses")
            
            content = output_text.strip()
            
            # Parser la réponse si JSON demandé
            if response_format == "json":
                try:
                    result = json.loads(content)
                    if not isinstance(result, dict):
                        raise ValueError("La réponse JSON n'est pas un objet")
                except json.JSONDecodeError as e:
                    logger.error(f"Erreur parsing JSON OpenAI: {e}. Réponse: {content}")
                    # Fallback avec message générique
                    result = {
                        "message": "J'ai modifié le contenu selon votre demande.",
                        "modified_html": ""  # Sera remplacé par le HTML original
                    }
            else:
                result = {"content": content}
            
            logger.info(f"Génération OpenAI Responses réussie en {duration_ms}ms")
            return {
                "success": True,
                "result": result,
                "duration_ms": duration_ms,
                "raw_response": content
            }
            
        except Exception as e:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            error_msg = str(e)
            
            logger.error(f"Erreur OpenAI Responses: {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "duration_ms": duration_ms,
                "result": {
                    "message": f"Erreur lors du traitement: {error_msg}",
                    "modified_html": ""
                }
            }
    
    def get_provider_name(self) -> str:
        return "openai"
