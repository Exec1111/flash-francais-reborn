from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from backend.models.html_chat_conversation import HtmlChatConversation, HtmlChatMessage
from backend.schemas.html_chat import (
    HtmlChatConversationCreate, 
    HtmlChatMessageCreate,
    HtmlChatConversationRead,
    HtmlChatMessageRead
)

def create_conversation(
    db: Session, 
    conversation: HtmlChatConversationCreate, 
    user_id: int
) -> HtmlChatConversation:
    """Créer une nouvelle conversation de chat HTML"""
    db_conversation = HtmlChatConversation(
        resource_id=conversation.resource_id,
        user_id=user_id,
        title=conversation.title,
        is_active=conversation.is_active
    )
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation

def get_conversation(
    db: Session, 
    conversation_id: int, 
    user_id: int
) -> Optional[HtmlChatConversation]:
    """Récupérer une conversation par ID pour un utilisateur donné"""
    return db.query(HtmlChatConversation).filter(
        and_(
            HtmlChatConversation.id == conversation_id,
            HtmlChatConversation.user_id == user_id,
            HtmlChatConversation.is_active == True
        )
    ).first()

def get_conversations_by_resource(
    db: Session, 
    resource_id: int, 
    user_id: int
) -> List[HtmlChatConversation]:
    """Récupérer toutes les conversations pour une ressource et un utilisateur"""
    return db.query(HtmlChatConversation).filter(
        and_(
            HtmlChatConversation.resource_id == resource_id,
            HtmlChatConversation.user_id == user_id,
            HtmlChatConversation.is_active == True
        )
    ).order_by(desc(HtmlChatConversation.updated_at)).all()

def create_message(
    db: Session, 
    conversation_id: int, 
    message: HtmlChatMessageCreate
) -> HtmlChatMessage:
    """Créer un nouveau message dans une conversation"""
    db_message = HtmlChatMessage(
        conversation_id=conversation_id,
        role=message.role,
        content=message.content,
        html_content_before=message.html_content_before,
        html_content_after=message.html_content_after
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Mettre à jour le timestamp de la conversation
    conversation = db.query(HtmlChatConversation).filter(
        HtmlChatConversation.id == conversation_id
    ).first()
    if conversation:
        db.commit()  # Le trigger onupdate va mettre à jour updated_at
    
    return db_message

def get_conversation_messages(
    db: Session, 
    conversation_id: int, 
    user_id: int
) -> List[HtmlChatMessage]:
    """Récupérer tous les messages d'une conversation pour un utilisateur"""
    conversation = get_conversation(db, conversation_id, user_id)
    if not conversation:
        return []
    
    return db.query(HtmlChatMessage).filter(
        HtmlChatMessage.conversation_id == conversation_id
    ).order_by(HtmlChatMessage.timestamp).all()

def deactivate_conversation(
    db: Session, 
    conversation_id: int, 
    user_id: int
) -> bool:
    """Désactiver une conversation (soft delete)"""
    conversation = get_conversation(db, conversation_id, user_id)
    if not conversation:
        return False
    
    conversation.is_active = False
    db.commit()
    return True

def update_conversation_title(
    db: Session, 
    conversation_id: int, 
    user_id: int, 
    title: str
) -> Optional[HtmlChatConversation]:
    """Mettre à jour le titre d'une conversation"""
    conversation = get_conversation(db, conversation_id, user_id)
    if not conversation:
        return None
    
    conversation.title = title
    db.commit()
    db.refresh(conversation)
    return conversation