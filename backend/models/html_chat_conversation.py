from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base

class HtmlChatConversation(Base):
    """
    Modèle pour stocker les conversations du chatbot d'édition HTML.
    Chaque conversation est liée à une ressource spécifique et conserve l'historique
    des échanges entre l'utilisateur et l'IA pour maintenir le contexte.
    """
    __tablename__ = "html_chat_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=True)  # Titre optionnel de la conversation
    is_active = Column(Boolean, default=True)  # Pour archiver/désactiver des conversations
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    resource = relationship("Resource", back_populates="html_chat_conversations")
    user = relationship("User", back_populates="html_chat_conversations") 
    messages = relationship("HtmlChatMessage", back_populates="conversation", cascade="all, delete-orphan")

class HtmlChatMessage(Base):
    """
    Modèle pour stocker les messages individuels dans une conversation de chatbot HTML.
    Conserve l'historique complet des échanges pour maintenir le contexte conversationnel.
    """
    __tablename__ = "html_chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("html_chat_conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" ou "assistant"
    content = Column(Text, nullable=False)  # Le message texte
    html_content_before = Column(Text, nullable=True)  # HTML avant la modification (pour les messages assistant)
    html_content_after = Column(Text, nullable=True)  # HTML après la modification (pour les messages assistant)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    conversation = relationship("HtmlChatConversation", back_populates="messages")