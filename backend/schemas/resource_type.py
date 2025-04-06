from pydantic import BaseModel
from typing import List, Optional

class ResourceTypeBase(BaseModel):
    key: str
    value: str

class ResourceTypeCreate(ResourceTypeBase):
    pass

class ResourceTypeResponse(ResourceTypeBase):
    id: int

    class Config:
        from_attributes = True

class ResourceSubTypeBase(BaseModel):
    key: str
    value: str
    type_id: int

class ResourceSubTypeCreate(ResourceSubTypeBase):
    pass

class ResourceSubTypeResponse(ResourceSubTypeBase):
    id: int
    type: Optional[ResourceTypeResponse] = None

    class Config:
        from_attributes = True

class ResourceTypeWithSubTypes(ResourceTypeResponse):
    sub_types: List[ResourceSubTypeResponse] = []

    class Config:
        from_attributes = True
