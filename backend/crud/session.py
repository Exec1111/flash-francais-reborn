from sqlalchemy.orm import Session, selectinload
from models import Session, Objective
from schemas.session import SessionCreate, SessionUpdate
from crud.objective import get_objective

def get_session(db: Session, session_id: int):
    """Récupère une séance par son ID, en chargeant explicitement les objectifs liés."""
    # Utilisation de options(selectinload(...)) pour charger la relation objectives
    return db.query(Session).options(selectinload(Session.objectives)).filter(Session.id == session_id).first()

def get_sessions(db: Session, skip: int = 0, limit: int = 100):
    """Récupère une liste de séances."""
    return db.query(Session).offset(skip).limit(limit).all()

def get_sessions_by_sequence(db: Session, sequence_id: int, skip: int = 0, limit: int = 100):
    """Récupère les séances appartenant à une séquence spécifique."""
    return db.query(Session).filter(Session.sequence_id == sequence_id).offset(skip).limit(limit).all()

def create_session(db: Session, session: SessionCreate):
    """Crée une nouvelle séance."""
    db_session = Session(**session.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def update_session(db: Session, session_id: int, session_update: SessionUpdate):
    """Met à jour une séance existante, y compris ses objectifs associés."""
    db_session = get_session(db, session_id=session_id)
    if db_session is None:
        return None

    update_data = session_update.model_dump(exclude_unset=True)
    new_objective_ids = update_data.pop('objective_ids', None) # Récupérer et retirer objective_ids

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

    # Mise à jour des autres champs fournis dans session_update via setattr
    for key, value in update_data.items(): # update_data ne contient plus objective_ids
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
