from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload
from models import Progression, Sequence, User
from schemas.progression import ProgressionCreate, ProgressionUpdate
from sqlalchemy import func
from typing import List, Optional

def get_progression(db: Session, progression_id: int, user_id: int):
    print(f"[TRACE] Appel get_progression: progression_id={progression_id}, user_id={user_id}")
    query = db.query(Progression).filter(Progression.id == progression_id)
    print(f"[TRACE] Query initialisée: {query}")
    query = query.options(selectinload(Progression.sequences))
    print("[TRACE] selectinload(Progression.sequences) appliqué")
    query = query.options(selectinload(Progression.study_objects))
    print("[TRACE] selectinload(Progression.study_objects) appliqué")
    if user_id:
        query = query.filter(Progression.user_id == user_id)
        print(f"[TRACE] Filtre user_id appliqué: {user_id}")
    result = query.first()
    print(f"[TRACE] Résultat ORM: {result}")
    if result:
        print(f"[TRACE] study_objects liés: {[obj.id for obj in getattr(result, 'study_objects', [])]}")
    return result

def get_progressions(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    query = db.query(Progression)
    if user_id:
        query = query.filter(Progression.user_id == user_id)
    query = query.options(selectinload(Progression.sequences))
    query = query.options(selectinload(Progression.study_objects))
    progressions = query.offset(skip).limit(limit).all()
    # Traces debug
    for prog in progressions:
        print(f"[TRACE] Progression id={prog.id}, study_objects={[obj.id for obj in getattr(prog, 'study_objects', [])]}")
    return progressions

def count_progressions(db: Session, user_id: int) -> int:
    """Compte le nombre total de progressions pour un utilisateur."""
    return db.query(Progression).filter(Progression.user_id == user_id).count()

def create_progression(db: Session, progression: ProgressionCreate, user_id: int):
    db_progression = Progression(
        title=progression.title,
        description=progression.description,
        user_id=user_id # Assigner l'ID de l'utilisateur
    )
    db.add(db_progression)
    db.commit()
    db.refresh(db_progression)
    return db_progression

def update_progression(db: Session, progression_id: int, progression_update: ProgressionUpdate, user_id: int):
    db_progression = get_progression(db, progression_id=progression_id, user_id=user_id)
    if db_progression is None:
        return None
    update_data = progression_update.model_dump(exclude_unset=True)
    study_object_ids = update_data.pop('study_object_ids', None)
    if study_object_ids is not None:
        from models.study_object import StudyObject
        db_progression.study_objects = db.query(StudyObject).filter(StudyObject.id.in_(study_object_ids)).all()
    for key, value in update_data.items():
        setattr(db_progression, key, value)
    db.add(db_progression)
    db.commit()
    db.refresh(db_progression)
    return db_progression

def delete_progression(db: Session, progression_id: int, user_id: int):
    db_progression = get_progression(db, progression_id=progression_id, user_id=user_id)
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
