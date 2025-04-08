from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from models import Resource, Session as SessionModel, User 
from schemas.resource import ResourceCreate, ResourceUpdate, ResourceFileUpload 
from sqlalchemy import or_
import logging
import os
from pathlib import Path
from config import get_settings
settings = get_settings()
logger = logging.getLogger(__name__)

def get_upload_path(user_id: int, file_name: str) -> str:
    # Crée le chemin RELATIF pour la BDD (ex: uploads/19/fichier.pdf)
    # La création du dossier physique est maintenant gérée par le routeur au bon endroit (static/uploads/...)
    user_folder = Path("uploads") / str(user_id) 
    return str(user_folder / file_name)

def get_resource(db: Session, resource_id: int):
    resource = db.query(Resource).options(
        joinedload(Resource.type),
        joinedload(Resource.sub_type),
        joinedload(Resource.sessions) 
    ).filter(Resource.id == resource_id).first()
    return resource

def get_resources(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    logger.info(f"Recherche des ressources pour l'utilisateur {user_id}")
    resources = db.query(Resource).options(
        joinedload(Resource.sessions),
        joinedload(Resource.type),
        joinedload(Resource.sub_type)
    ).filter(Resource.user_id == user_id).offset(skip).limit(limit).all()
    logger.info(f"Nombre de ressources trouvées pour l'utilisateur {user_id}: {len(resources)}")
    return resources

def get_resources_by_session(db: Session, session_id: int, user_id: int, skip: int = 0, limit: int = 100):
    from models.association_tables import session_resource_association
    
    try:
        logger.info(f"Recherche des ressources pour la session {session_id} et l'utilisateur {user_id}")
        
        resource_ids_query = db.query(session_resource_association.c.resource_id).\
            filter(session_resource_association.c.session_id == session_id)
            
        resource_ids = [id[0] for id in resource_ids_query.offset(skip).limit(limit).all()]
        
        if not resource_ids:
             logger.info(f"Aucun ID de ressource trouvé pour la session {session_id} avec skip={skip}, limit={limit}")
             return [] 
        
        resources = db.query(Resource).options(
                joinedload(Resource.type),
                joinedload(Resource.sub_type),
                joinedload(Resource.sessions)
            ).filter(
                Resource.id.in_(resource_ids),
                Resource.user_id == user_id  
            ).all()
        
        logger.info(f"Trouvé {len(resources)} ressources pour l'utilisateur {user_id} dans la session {session_id}")
        
        return resources
        
    except Exception as e:
        logger.error(f"Erreur lors de la recherche des ressources pour la session {session_id}: {str(e)}")
        raise 

def get_resources_standalone(db: Session, skip: int = 0, limit: int = 100):
    """Récupère les ressources qui ne sont liées à aucune session."""
    # Attention: Cette fonction ne filtre pas par user_id actuellement.
    # Elle retourne toutes les ressources sans session.
    from models.association_tables import session_resource_association
    subquery = db.query(session_resource_association.c.resource_id).subquery()
    return (
        db.query(Resource)
        .outerjoin(subquery, Resource.id == subquery.c.resource_id)
        .filter(subquery.c.resource_id == None)
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_resource(db: Session, resource: ResourceCreate, file_upload: Optional[ResourceFileUpload] = None) -> Resource:
    if resource.user_id is not None:
        db_user = db.query(User).filter(User.id == resource.user_id).first()
        if not db_user:
            raise ValueError(f"User with id {resource.user_id} not found")
    else:
        raise ValueError("user_id is required to create a resource")

    db_sessions = []
    if resource.session_ids and len(resource.session_ids) > 0:
        valid_session_ids = [sid for sid in resource.session_ids if sid is not None and sid != 0]
        if valid_session_ids:
            db_sessions = db.query(SessionModel).filter(SessionModel.id.in_(valid_session_ids)).all()
            if len(db_sessions) != len(valid_session_ids):
                found_ids = {s.id for s in db_sessions}
                missing_ids = set(valid_session_ids) - found_ids
                raise ValueError(f"Session(s) not found: {missing_ids}")

    db_resource = Resource(
        title=resource.title,
        description=resource.description,
        type_id=resource.type_id,
        sub_type_id=resource.sub_type_id,
        user_id=resource.user_id,
        source_type=resource.source_type 
    )
    
    if resource.source_type == 'file':
        if not file_upload:
            raise ValueError("File information is required when source_type is 'file'")
        db_resource.file_name = file_upload.file_name
        db_resource.file_type = file_upload.file_type
        db_resource.file_size = file_upload.file_size
        db_resource.file_path = get_upload_path(resource.user_id, file_upload.file_name)
    elif file_upload:
        logger.warning("File information provided but source_type is not 'file'. File info will be ignored.")

    db.add(db_resource)
    db.commit()
    db.refresh(db_resource) 
    
    if db_sessions:
        db_resource.sessions = db_sessions
        db.commit() 
        db.refresh(db_resource) 
    
    db_resource_loaded = get_resource(db, db_resource.id) 

    return db_resource_loaded 

def update_resource(db: Session, resource_id: int, resource_update: ResourceUpdate, file_upload: Optional[ResourceFileUpload] = None) -> Optional[Resource]:
    db_resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not db_resource:
        return None

    update_data = resource_update.model_dump(exclude_unset=True) 
    
    new_file_provided = file_upload is not None

    old_file_path_relative = db_resource.file_path # Stocker l'ancien chemin relatif
    old_user_id = db_resource.user_id # Nécessaire pour construire l'ancien chemin absolu

    for key, value in update_data.items():
        if key not in ['session_ids', 'source_type']:
            setattr(db_resource, key, value)

    if new_file_provided:
        logger.info(f"Nouveau fichier fourni pour la ressource {resource_id}: {file_upload.file_name}")
        # 1. Préparer les nouvelles informations du fichier
        db_resource.file_name = file_upload.file_name
        db_resource.file_type = file_upload.file_type
        db_resource.file_size = file_upload.file_size
        db_resource.file_path = get_upload_path(db_resource.user_id, file_upload.file_name)
        # S'assurer que le type est 'file'
        db_resource.source_type = 'file'
        # Potentiellement nullifier les champs conflictuels (url, ai_content)
        db_resource.url = None
        db_resource.ai_generated_content = None
        logger.info(f"Informations BDD mises à jour pour le fichier de la ressource {resource_id}")

        # 2. Supprimer l'ancien fichier PHYSIQUE (si existant)
        if db_resource.source_type == 'file' and old_file_path_relative:
            # Extraire le nom de fichier du chemin relatif stocké
            old_filename = Path(old_file_path_relative).name
            # Construire le chemin ABSOLU correct de l'ancien fichier
            absolute_old_file_path = settings.UPLOADS_BASE_DIR / str(old_user_id) / old_filename
 
            if absolute_old_file_path.exists():
                try:
                    absolute_old_file_path.unlink() # Utiliser unlink() de Path
                    logger.info(f"Ancien fichier supprimé physiquement : {absolute_old_file_path}")
                except OSError as e:
                    # Log l'erreur mais continuer, la màj BDD est prioritaire
                    logger.error(f"Erreur lors de la suppression de l'ancien fichier {absolute_old_file_path}: {e}")
            else:
                logger.warning(f"Ancien fichier non trouvé pour suppression: {absolute_old_file_path}")
        
    if "session_ids" in update_data and update_data["session_ids"] is not None:
        new_session_ids = set(sid for sid in update_data["session_ids"] if sid is not None and sid != 0)
        
        if not new_session_ids:
            db_resource.sessions = []
            logger.info(f"Toutes les sessions dissociées de la ressource {resource_id}")
        else:
            db_sessions = db.query(SessionModel).filter(SessionModel.id.in_(new_session_ids)).all()
            found_ids = {s.id for s in db_sessions}
            if found_ids != new_session_ids:
                missing_ids = new_session_ids - found_ids
                raise ValueError(f"Session(s) not found for update: {missing_ids}")
            
            db_resource.sessions = db_sessions
            logger.info(f"Sessions mises à jour pour la ressource {resource_id}: {new_session_ids}")
    
    db.add(db_resource) 
    db.commit()
    db.refresh(db_resource) 

    db_resource_loaded = get_resource(db, db_resource.id)
    return db_resource_loaded 

def delete_resource(db: Session, resource_id: int) -> bool:
    db_resource = db.query(Resource).get(resource_id)
    
    if db_resource:
        if db_resource.source_type == 'file' and db_resource.file_path and os.path.exists(db_resource.file_path):
            try:
                os.remove(db_resource.file_path)
                logger.info(f"Fichier associé supprimé : {db_resource.file_path}")
            except OSError as e:
                logger.error(f"Erreur lors de la suppression du fichier {db_resource.file_path}: {e}")
            
        db.delete(db_resource)
        db.commit()
        logger.info(f"Ressource {resource_id} supprimée de la base de données.")
        return True
        
    logger.warning(f"Tentative de suppression de la ressource {resource_id} non trouvée.")
    return False
