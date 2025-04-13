from pydantic import BaseModel

# --- Schémas Identifiants Communs --- #
# Utilisés pour les références simples afin d'éviter les imports circulaires
# entre les schémas principaux (objective, sequence, resource, session).

class ObjectiveIdentifier(BaseModel):
    """Représentation simple d'un objectif (ID + Titre)."""
    id: int
    title: str

    class Config:
        from_attributes = True

class SequenceIdentifier(BaseModel):
    """Représentation simple d'une séquence (ID + Titre)."""
    id: int
    title: str

    class Config:
        from_attributes = True

# Ajoutez d'autres identifiants simples si nécessaire (ex: ResourceIdentifier)

class TypeIdentifier(BaseModel):
    """Représentation simple d'un type (ID + Value)."""
    id: int
    value: str | None = None

    class Config:
        from_attributes = True

class SubTypeIdentifier(BaseModel):
    """Représentation simple d'un sous-type (ID + Value)."""
    id: int
    value: str | None = None

    class Config:
        from_attributes = True

class ResourceIdentifier(BaseModel):
    """Représentation simple d'une ressource (ID + Titre + Type/SubType)."""
    id: int
    title: str
    type: TypeIdentifier | None = None
    sub_type: SubTypeIdentifier | None = None

    class Config:
        from_attributes = True

class SessionIdentifier(BaseModel):
    """Représentation simple d'une session (ID + Titre)."""
    id: int
    title: str

    class Config:
        from_attributes = True
