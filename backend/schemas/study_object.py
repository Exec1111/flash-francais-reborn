from pydantic import BaseModel
from typing import List, Optional

class StudyObjectBase(BaseModel):
    title: str
    description: Optional[str] = None

class StudyObjectCreate(StudyObjectBase):
    progression_ids: Optional[List[int]] = []
    resource_ids: Optional[List[int]] = []

class StudyObjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    resource_ids: Optional[List[int]] = None

class StudyObjectRead(StudyObjectBase):
    id: int
    progression_ids: List[int] = []
    resource_ids: List[int] = []

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_resources(cls, orm_obj):
        return cls(
            id=orm_obj.id,
            title=orm_obj.title,
            description=orm_obj.description,
            progression_ids=[p.id for p in getattr(orm_obj, 'progressions', [])],
            resource_ids=[r.id for r in getattr(orm_obj, 'resources', [])]
        )

class StudyObjectReadShort(BaseModel):
    id: int
    title: str
    description: str | None = None

    class Config:
        from_attributes = True
