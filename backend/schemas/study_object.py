from pydantic import BaseModel
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .resource import ResourceReadShort # Import du schéma correct
    from .oeuvre import OeuvreReadShort, OeuvreWithResources

# Imports d'exécution pour résoudre les références croisées lors de la validation/rebuild
try:
    from .resource import ResourceReadShort  # type: ignore
    from .oeuvre import OeuvreReadShort  # type: ignore
except Exception:
    # Laisser schemas/__init__.py gérer la reconstruction globale si nécessaire
    pass

class StudyObjectBase(BaseModel):
    title: str
    description: Optional[str] = None

class StudyObjectCreate(StudyObjectBase):
    progression_ids: Optional[List[int]] = []
    resource_ids: Optional[List[int]] = []
    oeuvre_ids: Optional[List[int]] = []

class StudyObjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    resource_ids: Optional[List[int]] = None
    oeuvre_ids: Optional[List[int]] = None

class StudyObjectRead(StudyObjectBase):
    id: int
    progression_ids: List[int] = []
    resource_ids: List[int] = []
    oeuvre_ids: List[int] = []
    oeuvres: Optional[List["OeuvreReadShort"]] = []
    user_id: int | None = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_resources(cls, orm_obj):
        return cls(
            id=orm_obj.id,
            title=orm_obj.title,
            description=orm_obj.description,
            progression_ids=[p.id for p in getattr(orm_obj, 'progressions', [])],
            resource_ids=[r.id for r in getattr(orm_obj, 'resources', [])],
            oeuvre_ids=[o.id for o in getattr(orm_obj, 'oeuvres', [])],
            oeuvres=getattr(orm_obj, 'oeuvres', []),
            user_id=getattr(orm_obj, 'user_id', None)
        )

class StudyObjectReadShort(BaseModel):
    id: int
    title: str
    description: str | None = None

    class Config:
        from_attributes = True

class StudyObjectWithResources(StudyObjectBase):
    id: int
    # Conserver progression_ids si nécessaire, ou les obtenir d'une autre manière si ce schéma est spécifique
    # progression_ids: List[int] = []
    resources: List['ResourceReadShort'] = []
    oeuvres: List['OeuvreWithResources'] = []  # Utilisation du schéma avec ressources

    class Config:
        from_attributes = True

    # Si nous avons besoin d'une logique de chargement spécifique pour les ressources
    # (par exemple, si la relation n'est pas directement chargée par from_attributes)
    # nous pourrions ajouter un @classmethod similaire à from_orm_with_resources
    # mais pour l'instant, on suppose que la relation `resources` sur l'objet ORM `orm_obj`
    # sera une liste d'objets ORM Resource, et Pydantic les convertira en ResourceShort.

# Reconstruction locale des modèles pour résoudre les forward refs si nécessaire
try:
    StudyObjectRead.model_rebuild()
    StudyObjectWithResources.model_rebuild()
except Exception:
    pass

# Les model_rebuild() sont également gérés dans schemas/__init__.py pour éviter les imports circulaires
