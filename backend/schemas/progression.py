from pydantic import BaseModel, computed_field
from typing import List, Optional
from .sequence import SequenceRead

class ProgressionBase(BaseModel):
    title: str
    description: str | None = None
    order: int = 0

class ProgressionCreate(ProgressionBase):
    study_object_ids: Optional[List[int]] = None

class ProgressionUpdate(ProgressionBase):
    study_object_ids: Optional[List[int]] = None

class ProgressionRead(ProgressionBase):
    id: int
    order: int
    sequences: List[SequenceRead] = []
    # On déclare explicitement le champ attendu dans la réponse
    study_object_ids: List[int]

    @classmethod
    def from_orm_with_study_objects(cls, orm_obj):
        return cls(
            id=orm_obj.id,
            title=orm_obj.title,
            description=orm_obj.description,
            order=orm_obj.order,
            sequences=[SequenceRead.from_orm(seq) for seq in getattr(orm_obj, 'sequences', [])],
            study_object_ids=[obj.id for obj in getattr(orm_obj, 'study_objects', [])]
        )

    class Config:
        from_attributes = True
