from database import Base # Assurez-vous que Base est importable

from models.user import User, UserRole
from models.progression import Progression
from models.sequence import Sequence
from models.session import Session
from models.resource import Resource
from models.objective import Objective
from models.association_tables import sequence_objective_association, session_objective_association

# Vous pouvez définir __all__ pour contrôler ce qui est importé avec 'from models import *'
__all__ = [
    "Base",
    "User",
    "UserRole",
    "Progression",
    "Sequence",
    "Session",
    "Resource",
    "Objective",
    "sequence_objective_association",
    "session_objective_association",
]
