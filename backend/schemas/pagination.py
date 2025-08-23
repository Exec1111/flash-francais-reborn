from typing import List, TypeVar, Generic
from pydantic import BaseModel

ItemType = TypeVar('ItemType')

class PaginatedResponse(BaseModel, Generic[ItemType]):
    total: int
    items: List[ItemType]

    class Config:
        from_attributes = True # Activer le mode ORM pour que les ItemType puissent être sérialisés depuis des objets SQLAlchemy
        # orm_mode = False # Ancien commentaire
