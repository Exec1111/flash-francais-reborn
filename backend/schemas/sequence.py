from pydantic import BaseModel
from typing import List, TYPE_CHECKING, Optional
from schemas.objective import ObjectiveRead
from schemas.session import SessionRead
from schemas.study_object import StudyObjectReadShort

# Pour les type hints uniquement, afin d'éviter les imports circulaires réels
if TYPE_CHECKING:
    from schemas.objective import ObjectiveRead
    from schemas.session import SessionRead

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
    study_object_ids: List[int] = []
    study_objects: List[StudyObjectReadShort] = []

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
            study_objects=[StudyObjectReadShort.from_orm(obj) for obj in getattr(sequence_orm, 'study_objects', [])],
        )

# Importer ici juste avant le rebuild pour résoudre les références
from schemas.objective import ObjectiveRead
from schemas.session import SessionRead

# Résoudre les références forward
SequenceRead.model_rebuild()
