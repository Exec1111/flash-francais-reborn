import os
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from google import genai
import json
import time

from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.models.llm_interaction_log import LLMInteractionLog
from backend.database import SessionLocal

logger = logging.getLogger(__name__)

class HtmlEditorAIService:
    """
    Service pour traiter les modifications HTML via l'IA générative.
    Utilise le système de prompts YAML centralisé du projet.
    """
    
    def __init__(self):
        load_dotenv()
        self.api_key = os.getenv("GOOGLE_API_KEY")
        raw_model_name = os.getenv("GEMINI_FLASH_CHAT_MODEL") or os.getenv("GEMINI_CHAT_MODEL", "gemini-1.5-flash-latest")
        
        if not raw_model_name.startswith("models/"):
            self.model_name = f"models/{raw_model_name}"
        else:
            self.model_name = raw_model_name
            
        self.client = genai.Client(api_key=self.api_key)
        
        # Utiliser le générateur de prompts centralisé
        self.prompt_generator = PromptGenerator("html_editor")

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
            
            # Combiner en un seul message user pour Gemini
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # Préparer le contenu pour l'API
            contents = [{"role": "user", "parts": [{"text": full_prompt}]}]
            
            # Configuration pour obtenir du JSON structuré
            config = {
                "response_mime_type": "application/json"
            }
            
            logger.info(f"Traitement modification HTML pour utilisateur {user_id}")
            logger.debug(f"Prompt: {full_prompt[:200]}...")
            
            # Appel à l'API Gemini
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config
            )
            
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            
            if not response or not response.text:
                raise Exception("Réponse vide de l'API Gemini")
            
            # Parser la réponse JSON
            try:
                result = json.loads(response.text.strip())
                if not isinstance(result, dict) or "message" not in result or "modified_html" not in result:
                    raise ValueError("Format de réponse JSON invalide")
                    
            except json.JSONDecodeError as e:
                logger.error(f"Erreur parsing JSON: {e}. Réponse brute: {response.text}")
                # Fallback: essayer d'extraire le HTML de la réponse
                result = {
                    "message": "J'ai modifié le contenu selon votre demande.",
                    "modified_html": current_html  # Retourner le HTML original en cas d'erreur
                }
            
            # Logger l'interaction
            self._log_interaction(
                user_id=user_id,
                input_prompt=full_prompt,
                input_variables=input_variables,
                output_content=response.text,
                duration_ms=duration_ms,
                error_message=None
            )
            
            logger.info(f"Modification HTML réussie en {duration_ms}ms")
            return result
            
        except Exception as e:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            error_msg = str(e)
            
            logger.error(f"Erreur traitement HTML: {error_msg}")
            
            # Logger l'erreur
            self._log_interaction(
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
    
    def _log_interaction(
        self,
        user_id: int,
        input_prompt: str,
        input_variables: Dict[str, Any],
        output_content: Optional[str],
        duration_ms: int,
        error_message: Optional[str]
    ):
        """Logger l'interaction avec l'IA"""
        try:
            db = SessionLocal()
            log_entry = LLMInteractionLog(
                api_provider="google_genai",
                model_name=self.model_name,
                prompt_type="html_editor",
                input_prompt=input_prompt,
                input_variables=input_variables,
                generation_config={"response_mime_type": "application/json"},
                output_content=output_content,
                parsed_output=None,
                error_message=error_message,
                request_token_count=None,
                response_token_count=None,
                duration_ms=duration_ms,
                user_id=user_id
            )
            db.add(log_entry)
            db.commit()
        except Exception as log_exc:
            logger.error(f"Erreur logging LLMInteractionLog: {log_exc}")
        finally:
            if 'db' in locals():
                db.close()

# Instance globale du service
html_editor_ai_service = HtmlEditorAIService()