from pydantic import BaseModel
from typing import List
from datetime import timedelta, datetime

# --- Schéma Simple pour Objective --- #
# (Pour éviter dépendance circulaire avec schemas.objective)
class ObjectiveReadSimple(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True

# --- Schémas pour Session --- #
class SessionBase(BaseModel):
    title: str
    date: datetime
    notes: str | None = None
    duration: timedelta | None = None # Utilisation de timedelta pour la durée
    sequence_id: int

class SessionCreate(SessionBase):
    pass

class SessionUpdate(BaseModel): # Permettre les mises à jour partielles
    title: str | None = None
    date: datetime | None = None
    notes: str | None = None
    duration: timedelta | None = None
    sequence_id: int | None = None # Moins courant à mettre à jour, mais possible
    objective_ids: List[int] | None = None # Ajout du champ pour la mise à jour des liens

class SessionRead(SessionBase):
    id: int
    sequence_id: int
    # Inclure potentiellement des ressources ou objectifs liés si nécessaire
    # resources: List["ResourceReadSimple"] = [] # Nécessiterait ResourceReadSimple
    objectives: List[ObjectiveReadSimple] = [] # Décommenté et utilise le schéma simple créé

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy

# Schéma simplifié pour les références (évite dépendances circulaires)
class SessionReadSimple(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy
