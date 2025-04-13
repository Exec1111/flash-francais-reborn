from pydantic import BaseModel
from typing import List, Optional
from datetime import timedelta, datetime

# --- Schéma Simple pour Objective --- #
# (Pour éviter dépendance circulaire avec schemas.objective)
class ObjectiveReadSimple(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True

# --- Schéma Simple pour Type --- #
# (Pour éviter dépendance circulaire)
class TypeSchemaSimple(BaseModel):
    id: int
    value: str | None = None # Le nom/libellé du type

    class Config:
        from_attributes = True

# --- Schéma Simple pour Sous-Type --- #
# (Pour éviter dépendance circulaire)
class SubTypeSchemaSimple(BaseModel):
    id: int
    value: str | None = None # Le nom/libellé du sous-type

    class Config:
        from_attributes = True

# --- Schéma Simple pour Resource --- #
# (Pour éviter dépendance circulaire avec schemas.resource)
class ResourceReadSimple(BaseModel):
    id: int
    title: str # Ou 'name' selon le modèle Resource
    type: TypeSchemaSimple | None = None # Ajouter le type
    sub_type: SubTypeSchemaSimple | None = None # Ajouter le sous-type

    class Config:
        from_attributes = True

# --- Schémas pour Session --- #
class SessionBase(BaseModel):
    title: str
    date: datetime
    notes: str | None = None
    duration: int | None = None  # Durée en minutes (entier)
    sequence_id: int

class SessionCreate(SessionBase):
    resource_ids: List[int] = [] # Ajout pour lier les ressources dès la création

class SessionUpdate(BaseModel): # Permettre les mises à jour partielles
    title: str | None = None
    date: datetime | None = None
    notes: str | None = None
    duration: int | None = None  # Durée en minutes (entier)
    sequence_id: int | None = None # Moins courant à mettre à jour, mais possible
    objective_ids: List[int] | None = None # Ajout du champ pour la mise à jour des liens
    resource_ids: List[int] | None = None # Ajout pour mettre à jour les ressources liées

class SessionRead(SessionBase):
    id: int
    sequence_id: int
    objectives: List[ObjectiveReadSimple] = [] # Décommenté et utilise le schéma simple créé
    resources: List[ResourceReadSimple] = [] # Utilise maintenant ResourceReadSimple enrichi

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy

# Schéma simplifié pour les références (évite dépendances circulaires)
class SessionReadSimple(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True # Compatible avec l'ORM SQLAlchemy
