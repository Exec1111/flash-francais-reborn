from pydantic import BaseModel, Field, field_validator, computed_field
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
import logging
from datetime import datetime
from .session import SessionReadSimple
from .common import ObjectiveIdentifier

logger = logging.getLogger(__name__)

# Schémas pour Type et SubType (pour l'affichage dans la réponse)
class ResourceTypeSchema(BaseModel):
    id: int
    key: str
    value: str

    class Config:
        from_attributes = True

class ResourceSubTypeSchema(BaseModel):
    id: int
    key: str
    value: str

    class Config:
        from_attributes = True

# Schéma de base pour la création et la mise à jour
class ResourceBase(BaseModel):
    title: str
    description: Optional[str] = None
    type_id: int
    sub_type_id: int
    source_type: str  # 'file' ou 'ai'
    session_ids: Optional[List[int]] = None
    objective_ids: Optional[List[int]] = None

    @field_validator('source_type')
    def check_source_type(cls, v):
        if v not in ['file', 'ai']:
            raise ValueError('source_type must be either "file" or "ai"')
        return v

# Schéma spécifique pour la création
class ResourceCreate(ResourceBase):
    user_id: int

# Schéma pour les informations d'un fichier uploadé (transmis au CRUD)
class ResourceFileUpload(BaseModel):
    file_name: str
    file_type: str
    file_size: int

# Schéma minimal pour Session (pour le computed_field session_ids)
class SessionMinimalSchema(BaseModel):
    id: int

    class Config:
        from_attributes = True

# Schéma de réponse complet
class ResourceResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    type_id: int
    sub_type_id: Optional[int] = None
    user_id: int
    source_type: str
    # Champs spécifiques aux fichiers
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    html_url: Optional[str] = None  # Ajout pour exposer l'URL du HTML généré
    # Relations chargées
    type: Optional[ResourceTypeSchema] = None
    sub_type: Optional[ResourceSubTypeSchema] = None
    sessions: List[SessionMinimalSchema] = []
    objectives: List[ObjectiveIdentifier] = []

    class Config:
        from_attributes = True

# Schéma pour la mise à jour
class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type_id: Optional[int] = None
    sub_type_id: Optional[int] = None
    session_ids: Optional[List[int]] = None
    objective_ids: Optional[List[int]] = None
    # Pas de mise à jour de source_type ici, c'est généralement fixé à la création
    # Pas de file_* ici, la mise à jour de fichier est gérée séparément dans la route/CRUD

    class Config:
        from_attributes = True

class ResourceTypeBase(BaseModel):
    name: str
    description: Optional[str] = None

class ResourceRead(ResourceBase):
    id: int
    sessions: List[SessionReadSimple] = []
    objectives: List[ObjectiveIdentifier] = []

    class Config:
        from_attributes = True

class ResourceListResponse(BaseModel):
    items: List[ResourceRead]
    total: int

# Appeler model_rebuild pour résoudre les références en avant (forward references)
# après que tous les modèles ont été définis.
ResourceResponse.model_rebuild()
ResourceRead.model_rebuild()
