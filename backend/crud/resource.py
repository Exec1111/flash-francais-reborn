from typing import Optional, List, Dict
from sqlalchemy.orm import Session, joinedload
from models import Resource, Session as SessionModel, User, ResourceType, ResourceSubType, Objective, StudyObject
from schemas.resource import ResourceCreate, ResourceUpdate, ResourceFileUpload
from crud.objective import get_objective
from sqlalchemy import or_
import logging
import os
from pathlib import Path
from config import get_settings
settings = get_settings()
logger = logging.getLogger(__name__)

def get_upload_path(user_id: int, file_name: str) -> str:
    # Crée le chemin RELATIF pour la BDD (ex: uploads/19/mon_fichier.html)
    user_folder = Path("uploads") / str(user_id)
    return str(user_folder / file_name)

def get_resource(db: Session, resource_id: int):
    resource = db.query(Resource).options(
        joinedload(Resource.type),
        joinedload(Resource.sub_type),
        joinedload(Resource.sessions),
        joinedload(Resource.objectives), # Charger aussi les objectifs associés
        joinedload(Resource.study_objects) # Charger aussi les objets d'étude associés
    ).filter(Resource.id == resource_id).first()
    return resource

def get_resources(db: Session, user_id: int, skip: int = 0, limit: int = 100,
                  search_term: Optional[str] = None,
                  type_id: Optional[int] = None,
                  sub_type_id: Optional[int] = None) -> Dict:
    logger.info(f"Recherche des ressources pour l'utilisateur {user_id} avec critères: terme='{search_term}', type={type_id}, subtype={sub_type_id}")
    query = db.query(Resource).options(
        joinedload(Resource.sessions),
        joinedload(Resource.type),
        joinedload(Resource.sub_type),
        joinedload(Resource.objectives) # Charger aussi les objectifs
    ).filter(Resource.user_id == user_id)

    if search_term:
        search_filter = or_(
            Resource.title.ilike(f"%{search_term}%"),
            Resource.description.ilike(f"%{search_term}%"),
            # Vous pouvez ajouter d'autres champs pour la recherche textuelle ici
        )
        query = query.filter(search_filter)

    if type_id is not None:
        query = query.filter(Resource.type_id == type_id)

    if sub_type_id is not None:
        # Assurez-vous que le sous-type est pertinent pour le type sélectionné si nécessaire
        query = query.filter(Resource.sub_type_id == sub_type_id)

    # Compter le total AVANT la pagination
    total = query.count()

    # Appliquer la pagination
    resources = query.order_by(Resource.title).offset(skip).limit(limit).all()
    logger.info(f"Nombre total de ressources correspondantes: {total}. Retourne {len(resources)} ressources.")

    return {"items": resources, "total": total}

def get_resource_types(db: Session) -> List[ResourceType]:
    """Récupère tous les types de ressources disponibles."""
    return db.query(ResourceType).order_by(ResourceType.value).all()

def get_resource_sub_types(db: Session, type_id: Optional[int] = None) -> List[ResourceSubType]:
    """Récupère les sous-types de ressources, filtrés optionnellement par type_id."""
    query = db.query(ResourceSubType)
    if type_id is not None:
        # Assurez-vous que le modèle ResourceSubType a une relation ou un champ type_id
        # Si ResourceSubType a une relation 'type' (ForeignKey vers ResourceType)
        # query = query.join(ResourceType).filter(ResourceType.id == type_id)
        # Ou si ResourceSubType a un champ type_id directement:
        query = query.filter(ResourceSubType.type_id == type_id)
    return query.order_by(ResourceSubType.value).all()

def count_resources(db: Session, user_id: int) -> int:
    """Compte le nombre total de ressources pour un utilisateur."""
    return db.query(Resource).filter(Resource.user_id == user_id).count()

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

def create_resource(db: Session, resource: ResourceCreate, user_id: int, file_upload: Optional[ResourceFileUpload] = None):
    """Crée une nouvelle ressource et gère les associations initiales."""
    resource_data = resource.model_dump()
    session_ids = resource_data.pop('session_ids', [])
    objective_ids = resource_data.pop('objective_ids', []) # Extraire les objective_ids
    resource_data.pop('user_id', None) # Retirer user_id du dict car il est passé explicitement
    
    # Récupérer et retirer source_type, définir par défaut 'ai' si absent
    source_type_value = resource_data.get('source_type') or 'ai'
    resource_data.pop('source_type', None)
    
    if file_upload:
        file_path_relative = get_upload_path(user_id, file_upload.file_name)
        db_resource = Resource(
            **resource_data,
            user_id=user_id,
            file_path=file_path_relative,
            file_name=file_upload.file_name,
            file_size=file_upload.file_size,
            file_type=file_upload.file_type,
            source_type='file' # Défini comme 'file' si upload
        )
    else:
        # Ressource IA : on définit toujours source_type à 'ai'
        db_resource = Resource(
            **resource_data,
            user_id=user_id,
            source_type=source_type_value
        )

    # Lier les sessions initiales
    if session_ids:
        sessions = db.query(SessionModel).filter(SessionModel.id.in_(session_ids)).all()
        db_resource.sessions = sessions

    # Lier les objectifs initiaux
    if objective_ids:
        objectives = []
        for obj_id in objective_ids:
            db_objective = get_objective(db, objective_id=obj_id)
            if db_objective:
                objectives.append(db_objective)
            else:
                logger.warning(f"Objective with id {obj_id} not found during resource creation, skipping.")
        db_resource.objectives = objectives

    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    db.refresh(db_resource, attribute_names=['sessions', 'objectives']) # Recharger les relations
    return db_resource

def update_resource(db: Session, resource_id: int, resource_update: ResourceUpdate, file_upload: Optional[ResourceFileUpload] = None):
    """Met à jour une ressource existante, gère le remplacement de fichier et les associations."""
    db_resource = db.query(Resource).get(resource_id)
    if not db_resource:
        return None

    update_data = resource_update.model_dump(exclude_unset=True)
    new_session_ids_provided = 'session_ids' in update_data
    new_objective_ids_provided = 'objective_ids' in update_data # Vérifier si la clé est présente
    new_study_object_ids_provided = 'study_object_ids' in update_data

    new_session_ids = update_data.pop('session_ids', None) if new_session_ids_provided else None
    new_objective_ids = update_data.pop('objective_ids', None) if new_objective_ids_provided else None # Pop seulement si présente
    new_study_object_ids = update_data.pop('study_object_ids', None) if new_study_object_ids_provided else None

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
        
    if new_session_ids_provided:
        if new_session_ids is None or not new_session_ids: # Liste vide ou None
            db_resource.sessions = [] # Dissocier toutes les sessions
            logger.info(f"Toutes les sessions dissociées de la ressource {resource_id}")
        else:
            db_sessions = db.query(SessionModel).filter(SessionModel.id.in_(new_session_ids)).all()
            found_ids = {s.id for s in db_sessions}
            if found_ids != set(new_session_ids):
                missing_ids = set(new_session_ids) - found_ids
                raise ValueError(f"Session(s) not found for update: {missing_ids}")
            
            db_resource.sessions = db_sessions
            logger.info(f"Sessions mises à jour pour la ressource {resource_id}: {new_session_ids}")

    # Gérer la mise à jour de la relation many-to-many avec les objectifs
    if new_objective_ids_provided: # Agir seulement si la clé 'objective_ids' a été fournie
        if new_objective_ids is None or not new_objective_ids: # Liste vide ou None
            db_resource.objectives = [] # Dissocier tous les objectifs
            logger.info(f"Tous les objectifs dissociés de la ressource {resource_id}")
        else:
            # Récupérer les objets Objective correspondants aux IDs fournis
            new_objectives = []
            valid_objective_ids = set() # Pour la comparaison
            for obj_id in new_objective_ids:
                if obj_id is not None and obj_id != 0:
                    db_objective = get_objective(db, objective_id=obj_id)
                    if db_objective:
                        new_objectives.append(db_objective)
                        valid_objective_ids.add(obj_id)
                    else:
                        logger.warning(f"Objective with id {obj_id} not found during resource update, skipping.")
            
            input_ids_set = set(oid for oid in new_objective_ids if oid is not None and oid != 0)
            if valid_objective_ids != input_ids_set:
                 missing_ids = input_ids_set - valid_objective_ids
                 # Lever une exception ou logger une erreur plus sévère?
                 logger.error(f"Objective(s) not found for update: {missing_ids}")
                 # Peut-être retourner une erreur ici ? Pour l'instant on continue avec les objectifs trouvés.

            # Assigner la nouvelle liste d'objets Objective à la relation
            db_resource.objectives = new_objectives
            logger.info(f"Objectifs mis à jour pour la ressource {resource_id}: {valid_objective_ids}")

    # Gestion des objets d'étude associés
    if new_study_object_ids_provided:
        from models.study_object import StudyObject
        if new_study_object_ids is not None:
            db_resource.study_objects = db.query(StudyObject).filter(StudyObject.id.in_(new_study_object_ids)).all()
        else:
            db_resource.study_objects = []
        logger.info(f"Objets d'étude mis à jour pour la ressource {resource_id}: {new_study_object_ids}")

    db.add(db_resource) 
    db.commit()
    db.refresh(db_resource)
    db.refresh(db_resource, attribute_names=['sessions', 'objectives', 'study_objects']) # Recharger les relations

    # Recharger explicitement après refresh pour être sûr d'avoir l'état à jour
    # db_resource_loaded = get_resource(db, db_resource.id)
    # return db_resource_loaded 
    return db_resource # Retourner l'objet rafraîchi directement

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
