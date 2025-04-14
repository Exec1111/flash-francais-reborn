from pydantic import BaseModel
from typing import List, TYPE_CHECKING, Optional
from schemas.objective import ObjectiveRead
from schemas.session import SessionRead

# Pour les type hints uniquement, afin d'éviter les imports circulaires réels
if TYPE_CHECKING:
    from schemas.objective import ObjectiveRead
    from schemas.session import SessionRead

class SequenceBase(BaseModel):
    title: str
    description: str | None = None
    progression_id: int

class SequenceCreate(SequenceBase):
    # Liste optionnelle d'IDs d'objectifs à associer lors de la création
    objective_ids: Optional[List[int]] = None

class SequenceUpdate(BaseModel): # Allow partial updates
    title: str | None = None
    description: str | None = None
    progression_id: int | None = None # Usually not updated, but possible
    # Liste optionnelle d'IDs d'objectifs à associer lors de la mise à jour
    # None = ne pas toucher, [] = supprimer toutes les associations, [1, 2] = définir les associations à 1 et 2
    objective_ids: Optional[List[int]] = None

class SequenceRead(SequenceBase):
    id: int
    progression_id: int
    # Utiliser une Forward Reference (string) pour éviter l'import circulaire
    objectives: List['ObjectiveRead'] = []
    # Ajouter la liste des sessions (séances)
    sessions: List['SessionRead'] = []

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy

# Importer ici juste avant le rebuild pour résoudre les références
from schemas.objective import ObjectiveRead
from schemas.session import SessionRead

# Résoudre les références forward
SequenceRead.model_rebuild()
