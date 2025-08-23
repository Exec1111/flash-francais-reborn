from pydantic import BaseModel
from typing import List, TYPE_CHECKING, Optional
from typing import List, TYPE_CHECKING, Optional # Assurez-vous que TYPE_CHECKING est importé
from pydantic import BaseModel # Assurez-vous que BaseModel est importé

# Pour les type hints uniquement, afin d'éviter les imports circulaires réels
if TYPE_CHECKING:
    from .objective import ObjectiveRead
    from .session import SessionRead
    from .study_object import StudyObjectReadShort, StudyObjectWithResources
    from .resource import ResourceRead

# Imports d'exécution pour résoudre les références croisées lors de la validation/rebuild
try:
    from .objective import ObjectiveRead  # type: ignore
    from .session import SessionRead  # type: ignore
    from .study_object import StudyObjectWithResources  # type: ignore
    from .resource import ResourceRead  # type: ignore
except Exception:
    pass

class SequenceBase(BaseModel):
    title: str
    description: str | None = None
    progression_id: int
    order: int = 0  # Ajout du champ order dans la base

class SequenceCreate(SequenceBase):
    # Liste optionnelle d'IDs d'objectifs à associer lors de la création
    objective_ids: Optional[List[int]] = None
    # Liste optionnelle d'IDs d'objets d'étude à associer lors de la création
    study_object_ids: Optional[List[int]] = None

class SequenceUpdate(BaseModel): # Allow partial updates
    title: str | None = None
    description: str | None = None
    progression_id: int | None = None # Usually not updated, but possible
    # Liste optionnelle d'IDs d'objectifs à associer lors de la mise à jour
    # None = ne pas toucher, [] = supprimer toutes les associations, [1, 2] = définir les associations à 1 et 2
    objective_ids: Optional[List[int]] = None
    # Liste optionnelle d'IDs d'objets d'étude à associer lors de la mise à jour
    # None = ne pas toucher, [] = supprimer toutes les associations, [1, 2] = définir les associations à 1 et 2
    study_object_ids: Optional[List[int]] = None

class SequenceRead(BaseModel):
    id: int
    title: str
    description: Optional[str]
    order: Optional[int]
    progression_id: int
    objectives: List['ObjectiveRead'] = []
    sessions: List['SessionRead'] = []
    study_object_ids: List[int] = [] # Peut être redondant si StudyObjectWithResources les inclut, ou utile pour un accès rapide
    study_objects: List['StudyObjectWithResources'] = []
    bilan_resource_id: Optional[int] = None
    bilan_resource: Optional['ResourceRead'] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_study_objects(cls, sequence_orm):
        return cls(
            id=sequence_orm.id,
            title=sequence_orm.title,
            description=sequence_orm.description,
            order=sequence_orm.order,
            progression_id=sequence_orm.progression_id,
            objectives=getattr(sequence_orm, 'objectives', []),
            sessions=getattr(sequence_orm, 'sessions', []),
            study_object_ids=[obj.id for obj in getattr(sequence_orm, 'study_objects', [])],
            study_objects=getattr(sequence_orm, 'study_objects', []),
            bilan_resource_id=getattr(sequence_orm, 'bilan_resource_id', None),
            bilan_resource=getattr(sequence_orm, 'bilan_resource', None),
        )

# Les imports directs pour model_rebuild ne sont plus nécessaires si tout est en forward ref
# from schemas.objective import ObjectiveRead
# from schemas.session import SessionRead
# from schemas.study_object import StudyObjectWithResources # Non plus nécessaire ici

# Les imports sont gérés dans schemas/__init__.py pour éviter les imports circulaires

# Schéma pour récupérer une séquence avec tous ses objets pour la génération de résumé
class SequenceWithObjects(BaseModel):
    id: int
    title: str
    description: Optional[str]
    progression_id: int
    level: Optional[str] = None
    objectives: List['ObjectiveRead'] = []
    resources: List['ResourceRead'] = []
    study_objects: List['StudyObjectWithResources'] = []
    bilan_resource_id: Optional[int] = None
    bilan_resource: Optional['ResourceRead'] = None
    
    class Config:
        from_attributes = True

# Les model_rebuild() sont gérés dans schemas/__init__.py pour éviter les imports circulaires
