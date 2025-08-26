from pydantic import BaseModel, Field
from typing import List, Optional

class HtmlChatMessage(BaseModel):
    """Schéma pour un message de chat HTML éphémère"""
    role: str = Field(..., description="Rôle du message (user ou assistant)")
    content: str = Field(..., description="Contenu textuel du message")
    timestamp: Optional[str] = Field(None, description="Timestamp du message")

class HtmlChatRequest(BaseModel):
    """Schéma pour une requête de chat HTML avec modification"""
    message: str = Field(..., description="Message de l'utilisateur")
    current_html: str = Field(..., description="Contenu HTML actuel")
    conversation_history: List[HtmlChatMessage] = Field(
        default=[], 
        description="Historique des messages précédents (géré côté frontend)"
    )

class HtmlChatResponse(BaseModel):
    """Schéma pour la réponse du chat HTML"""
    message: str = Field(..., description="Réponse de l'assistant")
    modified_html: str = Field(..., description="HTML modifié")
    conversation_message: HtmlChatMessage = Field(..., description="Message ajouté à l'historique")