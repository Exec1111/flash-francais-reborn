from sqlalchemy.orm import Session, selectinload
from models import Session, Objective, Resource
from models.association_tables import session_resource_association
from schemas.session import SessionCreate, SessionUpdate
from crud.objective import get_objective
from crud.resource import get_resource
from sqlalchemy import func
from typing import List

def get_session(db: Session, session_id: int):
    """Récupère une séance par son ID, en chargeant explicitement les relations."""
    # Utilisation de options(selectinload(...)) pour charger les relations nécessaires
    return db.query(Session).options(
        selectinload(Session.objectives),
        selectinload(Session.sequence),
        selectinload(Session.resources).selectinload(Resource.type), # Charger les ressources puis leur type
        selectinload(Session.resources).selectinload(Resource.sub_type) # Charger les ressources puis leur sous-type
    ).filter(Session.id == session_id).first()

def get_sessions(db: Session, skip: int = 0, limit: int = 100):
    """Récupère une liste de séances."""
    return db.query(Session).offset(skip).limit(limit).all()

def get_sessions_by_sequence(db: Session, sequence_id: int, user_id: int = None, skip: int = 0, limit: int = 100):
    """Récupère les séances appartenant à une séquence spécifique.
    
    Args:
        db (Session): La session de base de données
        sequence_id (int): ID de la séquence
        user_id (int, optional): ID de l'utilisateur pour filtrer les séances
        skip (int, optional): Nombre d'éléments à sauter. Defaults to 0.
        limit (int, optional): Nombre maximum d'éléments à retourner. Defaults to 100.
    """
    query = db.query(Session).filter(Session.sequence_id == sequence_id)
    if user_id is not None:
        query = query.filter(Session.user_id == user_id)
    # Charger les objectifs en même temps que les sessions pour éviter N+1 requêtes
    return query.options(selectinload(Session.objectives)).offset(skip).limit(limit).all()

def count_sessions(db: Session, user_id: int) -> int:
    """Compte le nombre total de sessions pour un utilisateur."""
    return db.query(Session).filter(Session.user_id == user_id).count()

def create_session(db: Session, session: SessionCreate):
    """Crée une nouvelle séance."""
    db_session = Session(**session.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def create_session_with_user(db: Session, session: SessionCreate, user_id: int):
    """Crée une nouvelle séance liée à un utilisateur et à ses ressources.
       Modifié pour lier aussi les objectifs.
    """
    session_data = session.model_dump()
    resource_ids = session_data.pop('resource_ids', []) # Extraire les IDs de ressources
    objective_ids = session_data.pop('objective_ids', []) # Extraire les IDs d'objectifs

    db_session = Session(**session_data, user_id=user_id)

    # Lier les ressources
    if resource_ids:
        resources = []
        for res_id in resource_ids:
            db_resource = get_resource(db, resource_id=res_id)
            if db_resource:
                resources.append(db_resource)
            else:
                # Gérer le cas où un ID de ressource fourni n'existe pas
                print(f"Warning: Resource with id {res_id} not found, skipping.")
        db_session.resources = resources

    # Lier les objectifs
    if objective_ids:
        objectives = []
        for obj_id in objective_ids:
            db_objective = get_objective(db, objective_id=obj_id)
            if db_objective:
                objectives.append(db_objective)
            else:
                # Gérer le cas où un ID d'objectif fourni n'existe pas
                print(f"Warning: Objective with id {obj_id} not found, skipping.")
        db_session.objectives = objectives

    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    # Recharger explicitement les relations pour qu'elles soient disponibles dans l'objet retourné
    db.refresh(db_session, attribute_names=['resources', 'objectives'])
    return db_session

def update_session(db: Session, session_id: int, session_update: SessionUpdate):
    """Met à jour une séance existante, y compris ses objectifs et ressources associés."""
    db_session = get_session(db, session_id=session_id)
    if db_session is None:
        return None

    update_data = session_update.model_dump(exclude_unset=True)
    new_objective_ids = update_data.pop('objective_ids', None) # Récupérer et retirer objective_ids
    new_resource_ids = update_data.pop('resource_ids', None) # Récupérer et retirer resource_ids

    # Gérer la mise à jour de la relation many-to-many avec les objectifs
    if new_objective_ids is not None: # Si une liste (même vide) est fournie
        # Récupérer les objets Objective correspondants aux IDs fournis
        new_objectives = []
        for obj_id in new_objective_ids:
            db_objective = get_objective(db, objective_id=obj_id)
            if db_objective:
                new_objectives.append(db_objective)
            else:
                # Gérer le cas où un ID d'objectif fourni n'existe pas
                # Option 1: Ignorer silencieusement
                # Option 2: Lever une exception (peut-être préférable)
                # raise ValueError(f"Objective with id {obj_id} not found")
                print(f"Warning: Objective with id {obj_id} not found, skipping.") # Option 1 pour le moment

        # Assigner la nouvelle liste d'objets Objective à la relation
        db_session.objectives = new_objectives

    # Gérer la mise à jour de la relation many-to-many avec les ressources
    if new_resource_ids is not None: # Si une liste (même vide) est fournie
        new_resources = []
        for res_id in new_resource_ids:
            db_resource = get_resource(db, resource_id=res_id)
            if db_resource:
                new_resources.append(db_resource)
            else:
                print(f"Warning: Resource with id {res_id} not found, skipping.")
        # Assigner la nouvelle liste d'objets Resource à la relation
        db_session.resources = new_resources

    # Mise à jour des autres champs fournis dans session_update via setattr
    for key, value in update_data.items(): # update_data ne contient plus objective_ids ni resource_ids
        setattr(db_session, key, value)

    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def delete_session(db: Session, session_id: int):
    """Supprime une séance par son ID."""
    db_session = get_session(db, session_id=session_id)
    if db_session is None:
        return None # Ou False
    db.delete(db_session)
    db.commit()
    return True # Confirme la suppression

def get_sessions_with_no_resources(db: Session, user_id: int) -> List[Session]:
    """Récupère les sessions d'un utilisateur qui n'ont aucune ressource associée."""
    # Utilise une jointure externe (outerjoin) avec la table d'association
    # et filtre les sessions pour lesquelles la jointure n'a pas trouvé de correspondance
    # (c'est-à-dire, aucune ressource liée)
    return (
        db.query(Session)
        .outerjoin(
            session_resource_association,
            Session.id == session_resource_association.c.session_id
        )
        .filter(Session.user_id == user_id)
        .group_by(Session.id)
        .having(func.count(session_resource_association.c.resource_id) == 0)
        .all()
    )
