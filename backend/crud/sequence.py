from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload # Import for eager loading
from models import Sequence # Import Sequence model
from schemas.sequence import SequenceCreate, SequenceUpdate # Import schemas

def get_sequence(db: Session, sequence_id: int):
    """Récupère une séquence par son ID."""
    return db.query(Sequence).filter(Sequence.id == sequence_id).first()

def get_sequences(db: Session, skip: int = 0, limit: int = 100):
    """Récupère une liste de séquences."""
    return db.query(Sequence).offset(skip).limit(limit).all()

def get_sequences_by_progression(db: Session, progression_id: int, skip: int = 0, limit: int = 100):
    """Récupère les séquences appartenant à une progression spécifique."""
    # Utilise selectinload pour charger efficacement les objectifs liés
    return (
        db.query(Sequence)
        .options(selectinload(Sequence.objectives)) # Charge les objectifs associés
        .filter(Sequence.progression_id == progression_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_sequence(db: Session, sequence: SequenceCreate):
    """Crée une nouvelle séquence."""
    db_sequence = Sequence(**sequence.model_dump())
    db.add(db_sequence)
    db.commit()
    db.refresh(db_sequence)
    return db_sequence

def update_sequence(db: Session, sequence_id: int, sequence_update: SequenceUpdate):
    """Met à jour une séquence existante."""
    db_sequence = get_sequence(db, sequence_id=sequence_id)
    if db_sequence is None:
        return None
    # Mise à jour des champs fournis dans sequence_update
    for key, value in sequence_update.model_dump(exclude_unset=True).items():
        setattr(db_sequence, key, value)
    db.add(db_sequence) # Utiliser add() pour les objets suivis
    db.commit()
    db.refresh(db_sequence)
    return db_sequence

def delete_sequence(db: Session, sequence_id: int):
    """Supprime une séquence par son ID."""
    db_sequence = get_sequence(db, sequence_id=sequence_id)
    if db_sequence is None:
        return None # Ou False si vous préférez un booléen
    db.delete(db_sequence)
    db.commit()
    return True # Confirme la suppression
