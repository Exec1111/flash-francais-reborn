from pydantic import BaseModel
from typing import List, Optional
from .sequence import SequenceRead

class ProgressionBase(BaseModel):
    title: str
    description: str | None = None

class ProgressionCreate(ProgressionBase):
    pass

class ProgressionUpdate(ProgressionBase):
    pass

class ProgressionRead(ProgressionBase):
    id: int

    # Inclure la liste des séquences associées
    sequences: List[SequenceRead] = []

    class Config:
        from_attributes = True
