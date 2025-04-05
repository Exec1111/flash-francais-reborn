"""
Ce fichier est déprécié. Les flashcards ne sont plus utilisées dans l'application.
"""

# Code commenté pour référence future
"""
from sqlalchemy.orm import Session
from models.flashcard import Flashcard
from schemas.flashcard import FlashcardCreate

def get_flashcards(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Flashcard).offset(skip).limit(limit).all()

def get_flashcard(db: Session, flashcard_id: int):
    return db.query(Flashcard).filter(Flashcard.id == flashcard_id).first()

def create_flashcard(db: Session, flashcard: FlashcardCreate):
    db_flashcard = Flashcard(
        french_word=flashcard.french_word,
        english_translation=flashcard.english_translation,
        example_sentence=flashcard.example_sentence
    )
    db.add(db_flashcard)
    db.commit()
    db.refresh(db_flashcard)
    return db_flashcard

def delete_flashcard(db: Session, flashcard_id: int):
    flashcard = db.query(Flashcard).filter(Flashcard.id == flashcard_id).first()
    if flashcard:
        db.delete(flashcard)
        db.commit()
    return flashcard

def update_flashcard(db: Session, flashcard_id: int, flashcard: FlashcardCreate):
    db_flashcard = db.query(Flashcard).filter(Flashcard.id == flashcard_id).first()
    if db_flashcard:
        for key, value in flashcard.dict().items():
            setattr(db_flashcard, key, value)
        db.commit()
        db.refresh(db_flashcard)
    return db_flashcard
"""
