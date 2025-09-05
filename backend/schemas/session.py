from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Importer les identifiants depuis common.py
from .common import ObjectiveIdentifier, ResourceIdentifier, TypeIdentifier, SubTypeIdentifier

# Schéma pour identifier une œuvre dans une séance
class OeuvreIdentifier(BaseModel):
    id: int
    titre: str
    auteur_complet: str
    type: str

    class Config:
        from_attributes = True

# --- Schémas pour Session --- #
class SessionBase(BaseModel):
    title: str
    date: datetime
    notes: str | None = None
    order: Optional[int] = None # Pour gérer l'ordre des séances
    sequence_id: int

class SessionCreate(SessionBase):
    objective_ids: Optional[List[int]] = None # Ajout pour lier les objectifs dès la création
    resource_ids: List[int] = [] # Ajout pour lier les ressources dès la création
    oeuvre_ids: List[int] = [] # Ajout pour lier les œuvres dès la création

class SessionUpdate(BaseModel): # Permettre les mises à jour partielles
    title: str | None = None
    date: datetime | None = None
    notes: str | None = None
    sequence_id: int | None = None # Moins courant à mettre à jour, mais possible
    objective_ids: List[int] | None = None # Ajout du champ pour la mise à jour des liens
    resource_ids: List[int] | None = None # Ajout pour mettre à jour les ressources liées
    oeuvre_ids: List[int] | None = None # Ajout pour mettre à jour les œuvres liées
    fiche_resource_id: int | None = None

class SessionRead(SessionBase):
    id: int
    sequence_id: int
    fiche_resource_id: int | None = None
    fiche_url: str | None = None
    objectives: List[ObjectiveIdentifier] = []
    resources: List[ResourceIdentifier] = []
    oeuvres: List[OeuvreIdentifier] = []

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy

class SessionReadSimple(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy
