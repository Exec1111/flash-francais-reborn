from pydantic import BaseModel, Field, field_validator, computed_field
from typing import Optional, List, Dict, TYPE_CHECKING
from sqlalchemy.orm import Session
import logging
from datetime import datetime
from .session import SessionReadSimple
from .common import ObjectiveIdentifier

if TYPE_CHECKING:
    from schemas.study_object import StudyObjectReadShort

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
    sub_type_id: Optional[int] = None
    source_type: str  # 'file' ou 'ai'
    file_path: Optional[str] = None # Ajout pour le computed field
    session_ids: Optional[List[int]] = None
    objective_ids: Optional[List[int]] = None
    study_object_ids: Optional[List[int]] = None

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
    study_objects: Optional[List['StudyObjectReadShort']] = None  # Correction: utiliser le schéma Pydantic
    study_object_ids: Optional[List[int]] = None  # Ajout pour faciliter le pré-remplissage frontend

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
    study_object_ids: Optional[List[int]] = None  # Ajout pour la gestion des objets d'étude associés
    html_content: Optional[str] = None  # Contenu HTML envoyé pour écraser le fichier existant
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

    @computed_field(return_type=Optional[str])
    @property
    def html_content_url(self) -> Optional[str]:
        # 'self' est ici l'instance du modèle SQLAlchemy 'Resource'
        # grâce à from_attributes=True
        if self.source_type == 'ai' and self.file_path:
            # Note: The base URL part (e.g., http://localhost:8000) is handled by the browser.
            # We just need to provide the absolute path.
            # The frontend consistently uses /media/uploads/ for all resources.
            # There might be a background process moving AI files.
            # We align with the working frontend implementation.
            return f"/media/uploads/{self.file_path}"
        return None

    class Config:
        from_attributes = True

class ResourceListResponse(BaseModel):
    items: List[ResourceRead]
    total: int

# Appeler model_rebuild pour résoudre les références en avant (forward references)
# après que tous les modèles ont été définis.

class ResourceShort(BaseModel):
    id: int
    title: str
    description: Optional[str] = None # Optionnel, peut être utile

    class Config:
        from_attributes = True

# Importer explicitement les types requis pour model_rebuild()
if not TYPE_CHECKING:
    from .study_object import StudyObjectReadShort
    from .session import SessionReadSimple # Au cas où

ResourceResponse.model_rebuild()
ResourceRead.model_rebuild()
ResourceShort.model_rebuild()

