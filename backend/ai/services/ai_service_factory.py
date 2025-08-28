import os
import logging
from typing import Dict, Type
from dotenv import load_dotenv

from .base_ai_service import BaseAIService
from .openai_service import OpenAIService
from .google_service import GoogleService

logger = logging.getLogger(__name__)

class AIServiceFactory:
    """
    Factory pour créer les services IA selon la configuration.
    Permet de basculer facilement entre différents fournisseurs par prompt.
    """
    
    # Mapping des fournisseurs vers leurs classes
    _services: Dict[str, Type[BaseAIService]] = {
        "openai": OpenAIService,
        "gemini": GoogleService,
        "google_genai": GoogleService  # Alias pour compatibilité
    }
    
    # Configuration par défaut des modèles par prompt
    _prompt_model_config = {
        "html_editor": {
            "provider": "openai",  # Utiliser OpenAI pour l'éditeur HTML
            "model": None  # Utiliser le modèle par défaut du .env
        },
        "ai_resource_generation": {
            "provider": "gemini",  # Garder Gemini pour la génération de ressources
            "model": None
        },
        "ai_resource_merge": {
            "provider": "gemini",  # Garder Gemini pour la fusion de ressources
            "model": None
        },
        "default": {
            "provider": "gemini",  # Par défaut, utiliser Gemini
            "model": None
        }
    }
    
    @classmethod
    def create_service(cls, prompt_type: str = "default") -> BaseAIService:
        """
        Créer un service IA selon le type de prompt
        
        Args:
            prompt_type: Type de prompt (ex: "html_editor", "ai_resource_generation")
            
        Returns:
            Instance du service IA approprié
        """
        load_dotenv()
        
        # Récupérer la configuration pour ce type de prompt
        config = cls._prompt_model_config.get(prompt_type, cls._prompt_model_config["default"])
        provider = config["provider"]
        model = config["model"]
        
        # Permettre l'override via variables d'environnement
        env_provider = os.getenv(f"{prompt_type.upper()}_AI_PROVIDER")
        if env_provider:
            provider = env_provider.lower()
        
        env_model = os.getenv(f"{prompt_type.upper()}_AI_MODEL")
        if env_model:
            model = env_model
        
        # Créer le service
        if provider not in cls._services:
            logger.warning(f"Fournisseur IA inconnu '{provider}', utilisation de 'gemini' par défaut")
            provider = "gemini"
        
        service_class = cls._services[provider]
        
        try:
            service = service_class(model_name=model)
            logger.info(f"Service IA créé: {provider} (modèle: {service.model_name}) pour prompt_type: {prompt_type}")
            return service
        except Exception as e:
            logger.error(f"Erreur création service {provider}: {e}")
            # Fallback vers Gemini
            if provider != "gemini":
                logger.info("Fallback vers Gemini")
                return cls._services["gemini"](model_name=None)
            raise e
    
    @classmethod
    def update_prompt_config(cls, prompt_type: str, provider: str, model: str = None):
        """
        Mettre à jour la configuration d'un type de prompt
        
        Args:
            prompt_type: Type de prompt
            provider: Fournisseur IA ("openai", "gemini")
            model: Nom du modèle (optionnel)
        """
        cls._prompt_model_config[prompt_type] = {
            "provider": provider,
            "model": model
        }
        logger.info(f"Configuration mise à jour pour {prompt_type}: {provider} / {model}")
    
    @classmethod
    def get_available_providers(cls) -> list:
        """Retourner la liste des fournisseurs disponibles"""
        return list(cls._services.keys())
    
    @classmethod
    def get_prompt_config(cls, prompt_type: str) -> dict:
        """Retourner la configuration d'un type de prompt"""
        return cls._prompt_model_config.get(prompt_type, cls._prompt_model_config["default"])
