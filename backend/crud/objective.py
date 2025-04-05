from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models import Objective, Sequence, Session # Import models
from schemas.objective import ObjectiveCreate, ObjectiveUpdate # Import schemas

def get_objective(db: Session, objective_id: int):
    """Récupère un objectif par son ID."""
    return db.query(Objective).filter(Objective.id == objective_id).first()

def get_objective_by_title(db: Session, title: str):
    """Récupère un objectif par son titre (qui est unique)."""
    return db.query(Objective).filter(Objective.title == title).first()

def get_objectives(db: Session, skip: int = 0, limit: int = 100):
    """Récupère une liste d'objectifs."""
    return db.query(Objective).offset(skip).limit(limit).all()

def create_objective(db: Session, objective: ObjectiveCreate):
    """Crée un nouvel objectif."""
    db_objective = Objective(**objective.model_dump())
    db.add(db_objective)
    try:
        db.commit()
    except IntegrityError:
        db.rollback() # Important en cas d'échec (ex: titre dupliqué)
        raise ValueError(f"Objective with title '{objective.title}' already exists.")
    db.refresh(db_objective)
    return db_objective

def update_objective(db: Session, objective_id: int, objective_update: ObjectiveUpdate):
    """Met à jour un objectif existant."""
    db_objective = get_objective(db, objective_id=objective_id)
    if db_objective is None:
        return None
    update_data = objective_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_objective, key, value)
    db.add(db_objective)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Gérer le cas où le nouveau titre existe déjà
        raise ValueError(f"Update failed: Objective title '{update_data.get('title')}' might already exist.")
    db.refresh(db_objective)
    return db_objective

def delete_objective(db: Session, objective_id: int):
    """Supprime un objectif par son ID.
    Attention: Cela ne gère pas automatiquement les relations dans les tables d'association.
    Il faudrait idéalement les supprimer aussi ou mettre en place des cascades côté DB.
    """
    db_objective = get_objective(db, objective_id=objective_id)
    if db_objective is None:
        return False # Ou None
    # Optionnel: Nettoyer les associations avant de supprimer
    # db_objective.sequences.clear()
    # db_objective.sessions.clear()
    db.delete(db_objective)
    db.commit()
    return True

# --- Fonctions pour gérer les relations Many-to-Many --- #

def add_objective_to_sequence(db: Session, sequence_id: int, objective_id: int):
    db_sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    db_objective = get_objective(db, objective_id)
    if not db_sequence or not db_objective:
        raise ValueError("Sequence or Objective not found")
    if db_objective not in db_sequence.objectives:
        db_sequence.objectives.append(db_objective)
        db.commit()
    return db_sequence

def remove_objective_from_sequence(db: Session, sequence_id: int, objective_id: int):
    db_sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    db_objective = get_objective(db, objective_id)
    if not db_sequence or not db_objective:
        raise ValueError("Sequence or Objective not found")
    if db_objective in db_sequence.objectives:
        db_sequence.objectives.remove(db_objective)
        db.commit()
    return db_sequence

def add_objective_to_session(db: Session, session_id: int, objective_id: int):
    db_session = db.query(Session).filter(Session.id == session_id).first()
    db_objective = get_objective(db, objective_id)
    if not db_session or not db_objective:
        raise ValueError("Session or Objective not found")
    if db_objective not in db_session.objectives:
        db_session.objectives.append(db_objective)
        db.commit()
    return db_session

def remove_objective_from_session(db: Session, session_id: int, objective_id: int):
    db_session = db.query(Session).filter(Session.id == session_id).first()
    db_objective = get_objective(db, objective_id)
    if not db_session or not db_objective:
        raise ValueError("Session or Objective not found")
    if db_objective in db_session.objectives:
        db_session.objectives.remove(db_objective)
        db.commit()
    return db_session

def get_objectives_by_sequence(db: Session, sequence_id: int):
    db_sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    if not db_sequence:
        raise ValueError("Sequence not found")
    return db_sequence.objectives

def get_objectives_by_session(db: Session, session_id: int):
    db_session = db.query(Session).filter(Session.id == session_id).first()
    if not db_session:
        raise ValueError("Session not found")
    return db_session.objectives

def get_sequences_by_objective(db: Session, objective_id: int):
    db_objective = get_objective(db, objective_id)
    if not db_objective:
        raise ValueError("Objective not found")
    return db_objective.sequences

def get_sessions_by_objective(db: Session, objective_id: int):
    db_objective = get_objective(db, objective_id)
    if not db_objective:
        raise ValueError("Objective not found")
    return db_objective.sessions
