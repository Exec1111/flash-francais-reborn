from pydantic import BaseModel
from typing import List, TYPE_CHECKING

# Pour les type hints uniquement, afin d'éviter les imports circulaires réels
if TYPE_CHECKING:
    from schemas.objective import ObjectiveRead

class SequenceBase(BaseModel):
    title: str
    description: str | None = None
    progression_id: int

class SequenceCreate(SequenceBase):
    pass

class SequenceUpdate(BaseModel): # Allow partial updates
    title: str | None = None
    description: str | None = None
    progression_id: int | None = None # Usually not updated, but possible

class SequenceRead(SequenceBase):
    id: int
    progression_id: int
    # Utiliser une Forward Reference (string) pour éviter l'import circulaire
    objectives: List['ObjectiveRead'] = []
    # sessions: List["SessionReadSimple"] = [] # Nécessiterait SessionReadSimple

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy

# Schéma simplifié pour les références (évite dépendances circulaires)
class SequenceReadSimple(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy
