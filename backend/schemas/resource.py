from pydantic import BaseModel, Json
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import logging
import json

class ResourceBase(BaseModel):
    title: str
    description: Optional[str] = None
    type_id: int
    sub_type_id: int
    content: Optional[Json] = None
    session_ids: Optional[List[int]] = None

class ResourceCreate(ResourceBase):
    pass

class ResourceResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    type_id: int
    sub_type_id: Optional[int] = None
    content: Optional[Json] = None
    user_id: int
    type: Optional[Dict] = None
    sub_type: Optional[Dict] = None
    session_ids: List[int]

    @classmethod
    def from_resource(cls, resource, db: Session):
        # Log type and value of resource.content before processing
        logging.info(f"Resource ID: {resource.id}, Raw Content Type: {type(resource.content)}, Raw Content Value: {repr(resource.content)}")

        content_for_pydantic = None
        if isinstance(resource.content, dict):
            # Si SQLAlchemy a donné un dict, le ré-encoder en string JSON
            content_for_pydantic = json.dumps(resource.content)
            logging.info(f"Resource ID: {resource.id}, Encoded content to JSON string for Pydantic.")
        elif isinstance(resource.content, str):
             # Si c'est déjà une string (ou None), on la passe telle quelle
             content_for_pydantic = resource.content
        # Si c'est None, content_for_pydantic reste None

        return cls(
            id=resource.id,
            title=resource.title,
            description=resource.description,
            type_id=resource.type_id,
            sub_type_id=resource.sub_type_id,
            # Passer la string JSON (ou None)
            content=content_for_pydantic,
            user_id=resource.user_id,
            type={
                "id": resource.type.id,
                "key": resource.type.key,
                "value": resource.type.value
            } if resource.type else None,
            sub_type={
                "id": resource.sub_type.id,
                "key": resource.sub_type.key,
                "value": resource.sub_type.value
            } if resource.sub_type else None,
            session_ids=[s.id for s in resource.sessions] if resource.sessions else []
        )

    class Config:
        from_attributes = True

class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type_id: Optional[int] = None
    sub_type_id: Optional[int] = None
    content: Optional[Json] = None
    session_ids: Optional[List[int]] = None

    class Config:
        from_attributes = True
