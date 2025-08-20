from database import Base # Assurez-vous que Base est importable

# Importer d'abord toutes les tables d'association pour éviter les références circulaires
from models.association_tables import (
    sequence_objective_association,
    session_objective_association,
    session_resource_association,
    objective_resource_association,
    progression_study_object,
    study_object_resource,
    sequence_study_object
)

# Ensuite, importer les modèles
from models.user import User, UserRole
from models.progression import Progression
from models.sequence import Sequence
from models.session import Session
from models.resource import Resource, ResourceType, ResourceSubType
from models.objective import Objective
from models.study_object import StudyObject
from models.oeuvre import Oeuvre

# Vous pouvez définir __all__ pour contrôler ce qui est importé avec 'from models import *'
__all__ = [
    "Base",
    "User",
    "UserRole",
    "Progression",
    "Sequence",
    "Session",
    "Resource",
    "ResourceType",
    "ResourceSubType",
    "Objective",
    "sequence_objective_association",
    "session_objective_association",
    "StudyObject",
    "progression_study_object",
    "study_object_resource",
    "Oeuvre",
]
