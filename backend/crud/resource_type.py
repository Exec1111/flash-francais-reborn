from sqlalchemy.orm import Session
from models.resource import ResourceType, ResourceSubType
from typing import List, Optional

def get_resource_types(db: Session, skip: int = 0, limit: int = 100) -> List[ResourceType]:
    """
    Récupère tous les types de ressources.
    
    Args:
        db: Session de base de données
        skip: Nombre d'éléments à sauter (pour la pagination)
        limit: Nombre maximum d'éléments à retourner
        
    Returns:
        Liste des types de ressources
    """
    return db.query(ResourceType).offset(skip).limit(limit).all()

def get_resource_type(db: Session, type_id: int) -> Optional[ResourceType]:
    """
    Récupère un type de ressource par son ID.
    
    Args:
        db: Session de base de données
        type_id: ID du type de ressource
        
    Returns:
        Le type de ressource ou None s'il n'existe pas
    """
    return db.query(ResourceType).filter(ResourceType.id == type_id).first()

def get_resource_type_by_key(db: Session, key: str) -> Optional[ResourceType]:
    """
    Récupère un type de ressource par sa clé.
    
    Args:
        db: Session de base de données
        key: Clé du type de ressource
        
    Returns:
        Le type de ressource ou None s'il n'existe pas
    """
    return db.query(ResourceType).filter(ResourceType.key == key).first()

def get_resource_subtypes(db: Session, type_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[ResourceSubType]:
    """
    Récupère les sous-types de ressources, optionnellement filtrés par type_id.
    
    Args:
        db: Session de base de données
        type_id: ID du type parent (optionnel)
        skip: Nombre d'éléments à sauter (pour la pagination)
        limit: Nombre maximum d'éléments à retourner
        
    Returns:
        Liste des sous-types de ressources
    """
    query = db.query(ResourceSubType)
    if type_id is not None:
        query = query.filter(ResourceSubType.type_id == type_id)
    return query.offset(skip).limit(limit).all()

def get_resource_subtype(db: Session, subtype_id: int) -> Optional[ResourceSubType]:
    """
    Récupère un sous-type de ressource par son ID.
    
    Args:
        db: Session de base de données
        subtype_id: ID du sous-type de ressource
        
    Returns:
        Le sous-type de ressource ou None s'il n'existe pas
    """
    return db.query(ResourceSubType).filter(ResourceSubType.id == subtype_id).first()

def get_resource_subtype_by_key(db: Session, key: str) -> Optional[ResourceSubType]:
    """
    Récupère un sous-type de ressource par sa clé.
    
    Args:
        db: Session de base de données
        key: Clé du sous-type de ressource
        
    Returns:
        Le sous-type de ressource ou None s'il n'existe pas
    """
    return db.query(ResourceSubType).filter(ResourceSubType.key == key).first()
