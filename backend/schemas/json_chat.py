from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class JsonChatMessage(BaseModel):
    """Schéma pour un message de chat JSON éphémère"""
    role: str = Field(..., description="Rôle du message (user ou assistant)")
    content: str = Field(..., description="Contenu textuel du message")
    timestamp: Optional[str] = Field(None, description="Timestamp du message")

class ModelConfig(BaseModel):
    """Configuration du modèle IA"""
    provider: str = Field(..., description="Fournisseur IA (openai ou google)")
    model: str = Field(..., description="Nom du modèle à utiliser")

class JsonChatRequest(BaseModel):
    """Schéma pour une requête de chat JSON avec modification"""
    message: str = Field(..., description="Message de l'utilisateur")
    current_data: Dict[str, Any] = Field(..., description="Données JSON actuelles de la ressource")
    resource_type: str = Field(..., description="Type de ressource (exercice, lecon, etc.)")
    resource_subtype: str = Field(..., description="Sous-type de ressource (champlex, champlex2, qcm, etc.)")
    conversation_history: List[JsonChatMessage] = Field(
        default=[], 
        description="Historique des messages précédents (géré côté frontend)"
    )
    ai_model_config: Optional[ModelConfig] = Field(
        None, 
        description="Configuration du modèle IA à utiliser"
    )
    
    class Config:
        # Permettre l'utilisation d'alias pour la compatibilité
        populate_by_name = True

class JsonChatResponse(BaseModel):
    """Schéma pour la réponse du chat JSON"""
    message: str = Field(..., description="Réponse de l'assistant")
    modified_data: Dict[str, Any] = Field(..., description="Données JSON modifiées")
    conversation_message: JsonChatMessage = Field(..., description="Message ajouté à l'historique")
