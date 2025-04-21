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

class StudyObjectRead(StudyObjectBase):
    id: int
    progression_ids: List[int] = []
    resource_ids: List[int] = []

    class Config:
        from_attributes = True

class StudyObjectReadShort(BaseModel):
    id: int
    title: str
    description: str | None = None

    class Config:
        from_attributes = True
