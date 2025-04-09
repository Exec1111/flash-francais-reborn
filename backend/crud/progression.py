from sqlalchemy.orm import Session
from models import Progression, Sequence
from schemas.progression import ProgressionCreate, ProgressionUpdate
from sqlalchemy import func
from typing import List

def get_progression(db: Session, progression_id: int, user_id: int = None):
    query = db.query(Progression).filter(Progression.id == progression_id)
    if user_id:
        query = query.filter(Progression.user_id == user_id)
    return query.first()

def get_progressions(db: Session, skip: int = 0, limit: int = 100, user_id: int = None):
    query = db.query(Progression)
    if user_id:
        query = query.filter(Progression.user_id == user_id)
    return query.offset(skip).limit(limit).all()

def count_progressions(db: Session, user_id: int) -> int:
    """Compte le nombre total de progressions pour un utilisateur."""
    return db.query(Progression).filter(Progression.user_id == user_id).count()

def create_progression(db: Session, progression: ProgressionCreate):
    db_progression = Progression(**progression.model_dump())
    db.add(db_progression)
    db.commit()
    db.refresh(db_progression)
    return db_progression

def update_progression(db: Session, progression_id: int, progression_update: ProgressionUpdate):
    db_progression = get_progression(db, progression_id=progression_id)
    if db_progression is None:
        return None
    for key, value in progression_update.model_dump(exclude_unset=True).items():
        setattr(db_progression, key, value)
    db.add(db_progression)
    db.commit()
    db.refresh(db_progression)
    return db_progression

def delete_progression(db: Session, progression_id: int):
    db_progression = get_progression(db, progression_id=progression_id)
    if db_progression is None:
        return None
    db.delete(db_progression)
    db.commit()
    return True

def get_progressions_with_no_sequences(db: Session, user_id: int) -> List[Progression]:
    """Récupère les progressions d'un utilisateur qui n'ont aucune séquence associée."""
    return (
        db.query(Progression)
        .outerjoin(Sequence, Progression.id == Sequence.progression_id)
        .filter(Progression.user_id == user_id)
        .group_by(Progression.id)
        .having(func.count(Sequence.id) == 0)
        .all()
    )
