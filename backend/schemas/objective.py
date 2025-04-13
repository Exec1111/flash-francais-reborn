from pydantic import BaseModel
from typing import Optional, List

# Importer les schémas identifiants depuis common.py
from schemas.common import SequenceIdentifier, SessionIdentifier

# --- Schémas pour Objective --- #

class ObjectiveBase(BaseModel):
    title: str
    description: Optional[str] = None

class ObjectiveCreate(ObjectiveBase):
    # Au moment de la création, on fournit juste le titre/description.
    # L'association se fera via des endpoints dédiés (ex: /sequences/{id}/add_objective/{obj_id})
    pass

class ObjectiveUpdate(BaseModel): # Permet les mises à jour partielles
    title: Optional[str] = None
    description: Optional[str] = None

class ObjectiveRead(ObjectiveBase):
    id: int
    # Utiliser les identifiants importés
    sequences: List[SequenceIdentifier] = []
    sessions: List[SessionIdentifier] = []

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy

# Note: Des schémas "simples" (ex: SequenceReadSimple ne contenant que id et title)
# seraient utiles pour éviter les références circulaires et alléger les réponses
