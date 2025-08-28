import os
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import json
import time

from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.ai.services.ai_service_factory import AIServiceFactory

logger = logging.getLogger(__name__)

class HtmlEditorAIService:
    """
    Service pour traiter les modifications HTML via l'IA générative.
    Utilise le système de prompts YAML centralisé du projet et le factory pattern
    pour basculer entre différents fournisseurs IA.
    """
    
    def __init__(self):
        load_dotenv()
        
        # Utiliser le générateur de prompts centralisé
        self.prompt_generator = PromptGenerator("html_editor")
        
        # Créer le service IA via la factory (OpenAI par défaut pour html_editor)
        self.ai_service = AIServiceFactory.create_service("html_editor")

    async def process_html_modification(
        self,
        user_message: str,
        current_html: str,
        conversation_history: List[Dict[str, str]],
        user_id: int
    ) -> Dict[str, str]:
        """
        Traiter une demande de modification HTML via l'IA
        
        Args:
            user_message: Message de l'utilisateur décrivant la modification souhaitée
            current_html: Contenu HTML actuel
            conversation_history: Historique des messages précédents
            user_id: ID de l'utilisateur pour le logging
            
        Returns:
            Dict contenant 'message' et 'modified_html'
        """
        start_time = time.perf_counter()
        
        try:
            # Préparer les variables pour le générateur de prompts
            input_variables = {
                "user_message": user_message,
                "current_html": current_html,
                "conversation_history": conversation_history[-5:] if conversation_history else []  # Garder seulement les 5 derniers
            }
            
            # Générer les prompts via le système centralisé
            system_prompt, user_prompt = self.prompt_generator.build(**input_variables)
            
            logger.info(f"Traitement modification HTML pour utilisateur {user_id} avec {self.ai_service.get_provider_name()}")
            logger.debug(f"System prompt: {system_prompt[:200]}...")
            logger.debug(f"User prompt: {user_prompt[:200]}...")
            
            # Appel au service IA via la factory
            ai_response = await self.ai_service.generate_content(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                conversation_history=conversation_history,
                response_format="json"
            )
            
            duration_ms = ai_response["duration_ms"]
            
            if not ai_response["success"]:
                raise Exception(ai_response["error"])
            
            result = ai_response["result"]
            
            # Vérifier que le résultat contient les champs requis
            if not isinstance(result, dict) or "message" not in result or "modified_html" not in result:
                logger.warning(f"Format de réponse invalide: {result}")
                result = {
                    "message": "J'ai modifié le contenu selon votre demande.",
                    "modified_html": current_html
                }
            
            # Si modified_html est vide, utiliser le HTML original
            if not result.get("modified_html"):
                result["modified_html"] = current_html
            
            # Logger l'interaction via le service IA
            self.ai_service.log_interaction(
                user_id=user_id,
                input_prompt=f"{system_prompt}\n\n{user_prompt}",
                input_variables=input_variables,
                output_content=ai_response.get("raw_response"),
                duration_ms=duration_ms,
                error_message=None
            )
            
            logger.info(f"Modification HTML réussie en {duration_ms}ms avec {self.ai_service.get_provider_name()}")
            return result
            
        except Exception as e:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            error_msg = str(e)
            
            logger.error(f"Erreur traitement HTML: {error_msg}")
            
            # Logger l'erreur via le service IA
            self.ai_service.log_interaction(
                user_id=user_id,
                input_prompt=f"Erreur: {user_message}",
                input_variables={"user_message": user_message},
                output_content=None,
                duration_ms=duration_ms,
                error_message=error_msg
            )
            
            # Retourner une réponse d'erreur mais fonctionnelle
            return {
                "message": f"Désolé, je n'ai pas pu traiter votre demande: {error_msg}",
                "modified_html": current_html
            }
    

# Instance globale du service
html_editor_ai_service = HtmlEditorAIService()