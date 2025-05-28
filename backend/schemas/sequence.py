from pydantic import BaseModel
from typing import List, TYPE_CHECKING, Optional
from typing import List, TYPE_CHECKING, Optional # Assurez-vous que TYPE_CHECKING est importé
from pydantic import BaseModel # Assurez-vous que BaseModel est importé

# Pour les type hints uniquement, afin d'éviter les imports circulaires réels
if TYPE_CHECKING:
    from schemas.objective import ObjectiveRead
    from schemas.session import SessionRead
    from schemas.study_object import StudyObjectReadShort, StudyObjectWithResources # Déplacé ici
    from schemas.resource import ResourceRead  # Ajout pour SequenceWithObjects

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
            objectives=[ObjectiveRead.from_orm(obj) for obj in getattr(sequence_orm, 'objectives', [])],
            sessions=[SessionRead.from_orm(sess) for sess in getattr(sequence_orm, 'sessions', [])],
            study_object_ids=[obj.id for obj in getattr(sequence_orm, 'study_objects', [])],
            study_objects=[StudyObjectWithResources.from_orm(obj) for obj in getattr(sequence_orm, 'study_objects', [])],
        )

# Les imports directs pour model_rebuild ne sont plus nécessaires si tout est en forward ref
# from schemas.objective import ObjectiveRead
# from schemas.session import SessionRead
# from schemas.study_object import StudyObjectWithResources # Non plus nécessaire ici

# Importer explicitement les types requis pour model_rebuild()
if not TYPE_CHECKING:
    from .study_object import StudyObjectWithResources, StudyObjectReadShort
    from .objective import ObjectiveRead
    from .session import SessionRead
    from .resource import ResourceRead  # Ajout pour SequenceWithObjects

# Schéma pour récupérer une séquence avec tous ses objets pour la génération de résumé
class SequenceWithObjects(BaseModel):
    id: int
    title: str
    description: Optional[str]
    level: Optional[str] = None
    objectives: List['ObjectiveRead'] = []
    resources: List['ResourceRead'] = []
    
    class Config:
        from_attributes = True

# Résoudre les références forward
SequenceRead.model_rebuild()
SequenceWithObjects.model_rebuild()
