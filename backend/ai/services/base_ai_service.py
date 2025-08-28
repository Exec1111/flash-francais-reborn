from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import time
import logging

logger = logging.getLogger(__name__)

class BaseAIService(ABC):
    """
    Service abstrait pour les interactions avec différents modèles d'IA.
    Permet de basculer facilement entre différents fournisseurs (OpenAI, Google, etc.)
    """
    
    def __init__(self, model_name: str, api_key: str):
        self.model_name = model_name
        self.api_key = api_key
        self.client = None
    
    @abstractmethod
    async def generate_content(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: List[Dict[str, str]] = None,
        response_format: str = "json"
    ) -> Dict[str, Any]:
        """
        Génère du contenu via l'IA
        
        Args:
            system_prompt: Prompt système
            user_prompt: Prompt utilisateur
            conversation_history: Historique de conversation optionnel
            response_format: Format de réponse attendu ("json", "text")
            
        Returns:
            Dict contenant la réponse de l'IA
        """
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Retourne le nom du fournisseur d'IA"""
        pass
    
    def log_interaction(
        self,
        user_id: int,
        input_prompt: str,
        input_variables: Dict[str, Any],
        output_content: Optional[str],
        duration_ms: int,
        error_message: Optional[str] = None
    ):
        """Logger l'interaction avec l'IA"""
        try:
            from backend.models.llm_interaction_log import LLMInteractionLog
            from backend.database import SessionLocal
            
            db = SessionLocal()
            log_entry = LLMInteractionLog(
                api_provider=self.get_provider_name(),
                model_name=self.model_name,
                prompt_type="html_editor",
                input_prompt=input_prompt,
                input_variables=input_variables,
                generation_config={"response_format": "json"},
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
