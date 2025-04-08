from pydantic import BaseModel, Field, field_validator, computed_field
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
import logging

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
    sub_type_id: Optional[int] = None # Peut être nullable si non applicable ? Vérifier logique métier.
    user_id: int
    source_type: str
    # Champs spécifiques aux fichiers
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    # Relations chargées
    type: Optional[ResourceTypeSchema] = None
    sub_type: Optional[ResourceSubTypeSchema] = None
    # Champ pour que from_attributes peuple la relation (utilisé par computed_field)
    sessions: List[SessionMinimalSchema] = []

    # @computed_field
    # @property
    # def session_ids(self) -> List[int]:
    #     # Accède à self.sessions peuplé par from_attributes
    #     if hasattr(self, 'sessions') and self.sessions:
    #         return [s.id for s in self.sessions]
    #     return []

    class Config:
        from_attributes = True # Active la conversion depuis les objets SQLAlchemy

# Schéma pour la mise à jour
class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type_id: Optional[int] = None
    sub_type_id: Optional[int] = None
    session_ids: Optional[List[int]] = None
    # Pas de mise à jour de source_type ici, c'est généralement fixé à la création
    # Pas de file_* ici, la mise à jour de fichier est gérée séparément dans la route/CRUD

    class Config:
        from_attributes = True
