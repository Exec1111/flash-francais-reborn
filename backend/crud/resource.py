from sqlalchemy.orm import Session, joinedload
from models import Resource, Session, User # Import Resource model, Session for checking session_id and User for checking user_id
from schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse # Import schemas
from sqlalchemy import or_
import logging
logger = logging.getLogger(__name__)

def get_resource(db: Session, resource_id: int, as_model=False):
    """Récupère une ressource par son ID.
    
    Args:
        db (Session): Session de base de données
        resource_id (int): ID de la ressource à récupérer
        as_model (bool, optional): Si True, renvoie l'instance du modèle Resource au lieu d'une réponse formatée. Par défaut False.
    
    Returns:
        Resource ou dict: Instance du modèle Resource ou dictionnaire formaté
    """
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    
    if not resource:
        return None
        
    if as_model:
        return resource
    
    # Utiliser le schéma ResourceResponse pour formater la réponse
    from schemas.resource import ResourceResponse
    return ResourceResponse.from_resource(resource, db)

def get_resources(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    """Récupère une liste des ressources appartenant à un utilisateur spécifique."""
    logger.info(f"Recherche des ressources pour l'utilisateur {user_id}")
    # Récupérer les ressources avec les sessions associées, filtrées par user_id
    resources = db.query(Resource).options(
        joinedload(Resource.sessions),
        joinedload(Resource.type),
        joinedload(Resource.sub_type)
    ).filter(Resource.user_id == user_id).offset(skip).limit(limit).all()
    logger.info(f"Nombre de ressources trouvées pour l'utilisateur {user_id}: {len(resources)}")
    
    # Retourner directement les objets SQLAlchemy
    return resources

def get_resources_by_session(db: Session, session_id: int, user_id: int, skip: int = 0, limit: int = 100):
    """Récupère les ressources appartenant à une session spécifique et à un utilisateur donné."""
    from models.resource import Resource
    from models.association_tables import session_resource_association
    
    try:
        logger.info(f"Recherche des ressources pour la session {session_id} et l'utilisateur {user_id}")
        
        # Récupérer d'abord les IDs des ressources liées à la session
        resource_ids_query = db.query(session_resource_association.c.resource_id).\
            filter(session_resource_association.c.session_id == session_id)
            
        # Appliquer skip et limit sur les IDs pour la pagination correcte
        resource_ids = [id[0] for id in resource_ids_query.offset(skip).limit(limit).all()]
        
        if not resource_ids:
             logger.info(f"Aucun ID de ressource trouvé pour la session {session_id} avec skip={skip}, limit={limit}")
             return [] # Retourner une liste vide si aucun ID trouvé après pagination
        
        # Récupérer les ressources avec leurs relations (type, sub_type, sessions)
        # Utiliser options pour charger explicitement les relations nécessaires
        from sqlalchemy.orm import joinedload
        resources = db.query(Resource).options(
                joinedload(Resource.type),
                joinedload(Resource.sub_type),
                joinedload(Resource.sessions)
            ).filter(
                Resource.id.in_(resource_ids),
                Resource.user_id == user_id  # Filtrer par user_id
            ).all()
        
        logger.info(f"Trouvé {len(resources)} ressources pour l'utilisateur {user_id} dans la session {session_id}")
        
        # Convertir les objets SQLAlchemy en utilisant la méthode de classe du schéma
        resources_data = [ResourceResponse.from_resource(resource, db) for resource in resources]
        
        return resources_data
        
    except Exception as e:
        logger.error(f"Erreur lors de la recherche des ressources pour la session {session_id}: {str(e)}")
        raise # Relever l'exception pour que FastAPI retourne une erreur 500

def get_resources_standalone(db: Session, skip: int = 0, limit: int = 100):
    """Récupère les ressources qui ne sont liées à aucune session."""
    return db.query(Resource).filter(Resource.session_id == None).offset(skip).limit(limit).all()

def create_resource(db: Session, resource: ResourceCreate):
    """Crée une nouvelle ressource."""
    # Vérifier si l'utilisateur existe
    if resource.user_id is not None:
        db_user = db.query(User).filter(User.id == resource.user_id).first()
        if not db_user:
            raise ValueError(f"User with id {resource.user_id} not found")

    # Vérifier si les sessions existent (si spécifiées)
    db_sessions = []
    if resource.session_ids and len(resource.session_ids) > 0:
        # Filtrer les IDs de session qui ne sont pas None ou 0
        valid_session_ids = [sid for sid in resource.session_ids if sid is not None and sid != 0]
        if valid_session_ids:
            db_sessions = db.query(Session).filter(Session.id.in_(valid_session_ids)).all()
            if len(db_sessions) != len(valid_session_ids):
                raise ValueError("One or more sessions not found")

    # Créer la ressource
    db_resource = Resource(
        title=resource.title,
        description=resource.description,
        type_id=resource.type_id,
        sub_type_id=resource.sub_type_id,
        content=resource.content,
        user_id=resource.user_id
    )
    
    # Ajouter la ressource à la base de données
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    
    # Ajouter les relations avec les sessions (si spécifiées)
    if db_sessions:
        for session in db_sessions:
            db_resource.sessions.append(session)
        db.commit()
        db.refresh(db_resource)
    
    # Utiliser le schéma ResourceResponse pour formater la réponse
    from schemas.resource import ResourceResponse
    return ResourceResponse.from_resource(db_resource, db)

def update_resource(db: Session, resource_id: int, resource_update: ResourceUpdate):
    """Met à jour une ressource existante."""
    # Récupérer l'objet Resource directement depuis la base de données
    db_resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if db_resource is None:
        return None

    update_data = resource_update.model_dump(exclude_unset=True)

    # Mettre à jour les sessions si spécifiées
    if "session_ids" in update_data and update_data["session_ids"] is not None:
        # Supprimer toutes les associations existantes
        db_resource.sessions = []
        
        # Filtrer les IDs de session qui ne sont pas None ou 0
        valid_session_ids = [sid for sid in update_data["session_ids"] if sid is not None and sid != 0]
        
        if valid_session_ids:
            # Vérifier que toutes les sessions existent
            db_sessions = db.query(Session).filter(Session.id.in_(valid_session_ids)).all()
            if len(db_sessions) != len(valid_session_ids):
                raise ValueError("One or more sessions not found")
                
            # Ajouter les nouvelles associations
            for session in db_sessions:
                db_resource.sessions.append(session)
        
        # Supprimer session_ids de update_data pour éviter les conflits
        del update_data["session_ids"]

    # Mettre à jour les autres champs
    for key, value in update_data.items():
        setattr(db_resource, key, value)

    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)

    # Utiliser le schéma ResourceResponse pour formater la réponse
    from schemas.resource import ResourceResponse
    return ResourceResponse.from_resource(db_resource, db)

def delete_resource(db: Session, resource_id: int):
    """Supprime une ressource par son ID."""
    # Récupérer directement l'instance du modèle Resource
    db_resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if db_resource is None:
        return None # Ou False
    db.delete(db_resource)
    db.commit()
    return True # Confirme la suppression
