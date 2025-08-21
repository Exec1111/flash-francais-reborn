from .user import UserBase, UserCreate, UserResponse, UserLogin, Token, TokenData, UserRole

# Import des schémas pour éviter les imports circulaires
from .common import ObjectiveIdentifier, SequenceIdentifier, SessionIdentifier, ResourceIdentifier
from .objective import ObjectiveRead
from .session import SessionRead, SessionReadSimple
from .resource import ResourceShort, ResourceRead, ResourceResponse
from .study_object import StudyObjectRead, StudyObjectReadShort, StudyObjectWithResources  
from .oeuvre import OeuvreRead, OeuvreReadShort
from .sequence import SequenceRead, SequenceWithObjects

# Reconstruction des modèles après tous les imports pour résoudre les forward references
def rebuild_models():
    """Reconstruit tous les modèles Pydantic après import pour résoudre les forward references"""
    try:
        # Résoudre explicitement les références en avant entre schémas
        ResourceRead.model_rebuild()
        ResourceResponse.model_rebuild()
        StudyObjectRead.model_rebuild()
        StudyObjectWithResources.model_rebuild()
        OeuvreRead.model_rebuild()
        OeuvreReadShort.model_rebuild()
    except Exception as e:
        print(f"Erreur lors de la reconstruction des modèles: {e}")

# Appel de la reconstruction au moment de l'import du package
rebuild_models()
