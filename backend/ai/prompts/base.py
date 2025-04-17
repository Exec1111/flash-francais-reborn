"""
Module contenant la classe de base pour les prompts d'IA.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import json
import logging

logger = logging.getLogger(__name__)

class BasePrompt(ABC):
    """
    Classe abstraite de base pour tous les prompts utilisés dans l'application.
    
    Cette classe définit l'interface commune pour tous les prompts et 
    fournit les fonctionnalités de base pour le formatage et la validation.
    """
    
    def __init__(self, system_prompt: str, user_prompt_template: str):
        """
        Initialise un prompt avec un message système et un template pour le message utilisateur.
        
        Args:
            system_prompt: Instructions système pour le LLM
            user_prompt_template: Template du prompt utilisateur avec variables à remplacer
        """
        self.system_prompt = system_prompt
        self.user_prompt_template = user_prompt_template
        
    def format_user_prompt(self, variables: Dict[str, Any]) -> str:
        """
        Formate le template de prompt utilisateur en remplaçant les variables.
        
        Args:
            variables: Dictionnaire contenant les valeurs à injecter dans le prompt
            
        Returns:
            Le prompt formaté prêt à être envoyé au LLM
        """
        try:
            return self.user_prompt_template.format(**variables)
        except KeyError as e:
            logger.error(f"Variable manquante dans le prompt: {e}")
            raise ValueError(f"Variable manquante dans le prompt: {e}")
    
    def get_messages(self, variables: Dict[str, Any]) -> list:
        """
        Génère la liste des messages à envoyer au LLM.
        
        Args:
            variables: Variables à injecter dans le prompt utilisateur
            
        Returns:
            Liste de messages au format attendu par l'API LLM
        """
        return [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self.format_user_prompt(variables)}
        ]
    
    @abstractmethod
    def parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse la réponse du LLM en structure de données utilisable.
        
        Args:
            response: Réponse brute du LLM
            
        Returns:
            Données structurées extraites de la réponse
        """
        pass
        
    @classmethod
    def get_variables_model(cls):
        """
        Renvoie le modèle Pydantic pour les variables de ce prompt.
        
        Cette méthode doit être implémentée par les classes dérivées pour exposer
        leur schéma de variables au frontend.
        
        Returns:
            Type[BaseModel]: La classe du modèle Pydantic pour les variables
        """
        raise NotImplementedError("Les classes dérivées doivent implémenter cette méthode")
