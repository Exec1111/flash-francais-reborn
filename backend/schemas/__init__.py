from .user import UserBase, UserCreate, UserResponse, UserLogin, Token, TokenData, UserRole

# Import des schémas pour éviter les imports circulaires
from .common import ObjectiveIdentifier, SequenceIdentifier, SessionIdentifier, ResourceIdentifier
from .objective import ObjectiveRead
from .session import SessionRead, SessionReadSimple
from .resource import ResourceShort, ResourceReadShort, ResourceRead, ResourceResponse
from .study_object import StudyObjectRead, StudyObjectReadShort, StudyObjectWithResources, StudyObjectWithOeuvres
from .oeuvre import OeuvreRead, OeuvreReadShort, OeuvreWithResources, OeuvreWithAuthor
from .sequence import SequenceRead, SequenceWithObjects

# Reconstruction des modèles après tous les imports pour résoudre les forward references
def rebuild_models():
    """Reconstruit tous les modèles Pydantic après import pour résoudre les forward references"""
    
    # Créer un namespace avec toutes les classes nécessaires pour les références forward
    types_namespace = {
        'ObjectiveRead': ObjectiveRead,
        'ResourceRead': ResourceRead,
        'ResourceReadShort': ResourceReadShort,
        'OeuvreReadShort': OeuvreReadShort,
        'OeuvreWithResources': OeuvreWithResources,
        'OeuvreWithAuthor': OeuvreWithAuthor,
        'StudyObjectReadShort': StudyObjectReadShort,
        'StudyObjectWithResources': StudyObjectWithResources,
        'StudyObjectWithOeuvres': StudyObjectWithOeuvres,
        'SessionRead': SessionRead,
        'SequenceRead': SequenceRead,
        'SequenceWithObjects': SequenceWithObjects,
    }
    
    models_to_rebuild = [
        # Modèles de base d'abord
        ('ObjectiveRead', ObjectiveRead),
        ('ResourceRead', ResourceRead),
        ('ResourceReadShort', ResourceReadShort),
        ('OeuvreReadShort', OeuvreReadShort),
        
        # Modèles qui dépendent des modèles de base
        ('OeuvreWithResources', OeuvreWithResources),
        ('OeuvreWithAuthor', OeuvreWithAuthor),
        ('OeuvreRead', OeuvreRead),
        ('StudyObjectRead', StudyObjectRead),
        ('StudyObjectWithResources', StudyObjectWithResources),
        ('StudyObjectWithOeuvres', StudyObjectWithOeuvres),
        
        # Modèles complexes en dernier
        ('ResourceResponse', ResourceResponse),
        ('SequenceRead', SequenceRead),
        ('SequenceWithObjects', SequenceWithObjects),
    ]

    for model_name, model_class in models_to_rebuild:
        try:
            # Utiliser _types_namespace pour fournir les classes nécessaires
            model_class.model_rebuild(_types_namespace=types_namespace)
            print(f"[OK] Modele {model_name} reconstruit avec succes")
        except Exception as e:
            print(f"[WARNING] Erreur lors de la reconstruction de {model_name}: {e}")
            # Continue avec les autres modèles même si un échoue

# Appel de la reconstruction au moment de l'import du package
rebuild_models()

# Rendre les classes disponibles dans le namespace global du module
__all__ = [
    'UserBase', 'UserCreate', 'UserResponse', 'UserLogin', 'Token', 'TokenData', 'UserRole',
    'ObjectiveIdentifier', 'SequenceIdentifier', 'SessionIdentifier', 'ResourceIdentifier',
    'ObjectiveRead', 'SessionRead', 'SessionReadSimple',
    'ResourceShort', 'ResourceReadShort', 'ResourceRead', 'ResourceResponse',
    'StudyObjectRead', 'StudyObjectReadShort', 'StudyObjectWithResources', 'StudyObjectWithOeuvres',
    'OeuvreRead', 'OeuvreReadShort', 'OeuvreWithResources', 'OeuvreWithAuthor',
    'SequenceRead', 'SequenceWithObjects'
]
