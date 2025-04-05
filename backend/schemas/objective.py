from pydantic import BaseModel
from typing import Optional, List

# Importer les schémas simplifiés pour éviter les dépendances circulaires
from schemas.sequence import SequenceReadSimple
from schemas.session import SessionReadSimple

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
    # Inclure les listes simplifiées de sequences et sessions liées
    sequences: List[SequenceReadSimple] = [] # Utilise le schéma simplifié
    sessions: List[SessionReadSimple] = []  # Utilise le schéma simplifié

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy

# Note: Des schémas "simples" (ex: SequenceReadSimple ne contenant que id et title)
# seraient utiles pour éviter les références circulaires et alléger les réponses
# lorsque ObjectiveRead inclura les listes liées.
