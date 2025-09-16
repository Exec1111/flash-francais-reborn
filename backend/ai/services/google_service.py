import os
import logging
from typing import List, Dict, Any, Optional
import json
import time
from google import genai

from .base_ai_service import BaseAIService

logger = logging.getLogger(__name__)

class GoogleService(BaseAIService):
    """
    Service pour les interactions avec l'API Google Gemini
    """
    
    def __init__(self, model_name: str = None, api_key: str = None):
        # Utiliser les variables d'environnement si non spécifiées
        if not api_key:
            api_key = os.getenv("GOOGLE_API_KEY")
        if not model_name:
            raw_model_name = os.getenv("GEMINI_FLASH_CHAT_MODEL") or os.getenv("GEMINI_CHAT_MODEL", "gemini-1.5-flash-latest")
            model_name = f"models/{raw_model_name}" if not raw_model_name.startswith("models/") else raw_model_name
        else:
            # Si un modèle spécifique est fourni, s'assurer qu'il a le préfixe models/
            if not model_name.startswith("models/"):
                model_name = f"models/{model_name}"
            
        super().__init__(model_name, api_key)
        
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY doit être définie dans les variables d'environnement")
            
        self.client = genai.Client(api_key=self.api_key)
    
    async def generate_content(
        self,
        system_prompt: str,
        user_prompt: str,
        conversation_history: List[Dict[str, str]] = None,
        response_format: str = "json"
    ) -> Dict[str, Any]:
        """
        Génère du contenu via l'API Google Gemini
        """
        start_time = time.perf_counter()
        
        try:
            # Combiner les prompts pour Gemini
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # Ajouter l'historique si présent
            if conversation_history:
                history_text = "\n".join([
                    f"{msg.get('role', 'user')}: {msg.get('content', '')}"
                    for msg in conversation_history[-5:]
                ])
                full_prompt = f"{system_prompt}\n\nHistorique:\n{history_text}\n\n{user_prompt}"
            
            # Préparer le contenu pour l'API
            contents = [{"role": "user", "parts": [{"text": full_prompt}]}]
            
            # Configuration pour obtenir du JSON structuré
            config = {}
            if response_format == "json":
                config["response_mime_type"] = "application/json"
            
            logger.info(f"Appel Google Gemini avec modèle {self.model_name}")
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
            
            content = response.text.strip()
            
            # Parser la réponse si JSON demandé
            if response_format == "json":
                try:
                    result = json.loads(content)
                    if not isinstance(result, dict):
                        raise ValueError("La réponse JSON n'est pas un objet")
                except json.JSONDecodeError as e:
                    logger.error(f"Erreur parsing JSON Gemini: {e}. Réponse: {content}")
                    # Fallback avec message générique
                    result = {
                        "message": "J'ai modifié le contenu selon votre demande.",
                        "modified_html": ""  # Sera remplacé par le HTML original
                    }
            else:
                result = {"content": content}
            
            logger.info(f"Génération Gemini réussie en {duration_ms}ms")
            return {
                "success": True,
                "result": result,
                "duration_ms": duration_ms,
                "raw_response": content
            }
            
        except Exception as e:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            error_msg = str(e)
            
            logger.error(f"Erreur Gemini: {error_msg}")
            
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
        return "google_genai"
