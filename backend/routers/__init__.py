# Import des routeurs
from .auth import auth_router
from .progression import progression_router
from .sequence import sequence_router
from .session import session_router
from .resource import resource_router  # Routeur principal original (maintenu pour compatibilité)
from .resource_router_refactored import resource_router as resource_router_refactored  # Nouveau routeur refactorisé
from .resource_types_router import resource_types_router
from .resource_media_router import resource_media_router
from .resource_crud_router import resource_crud_router
from .resource_docling_router import resource_docling_router
from .resource_study_objects_router import resource_study_objects_router
from .resource_utils import resource_utils_router
from .objective import objective_router
from .user import user_router

# Import des routeurs AI modulaires
from .chat_router import router as chat_router
from .resource_generation_router import router as resource_generation_router
from .resource_merging_router import router as resource_merging_router
from .session_router import router as ai_session_router
from .exercise_suggestion_router import router as exercise_suggestion_router
from .pdf_analysis_router import router as pdf_analysis_router

# Importez d'autres routeurs ici si nécessaire
# from routers.autre import router as autre_router

__all__ = [
    "auth_router", "progression_router", "sequence_router", "session_router",
    "resource_router", "resource_router_refactored", "resource_types_router",
    "resource_media_router", "resource_crud_router", "resource_docling_router",
    "resource_study_objects_router", "resource_utils_router", "objective_router",
    "user_router", "chat_router", "resource_generation_router",
    "resource_merging_router", "ai_session_router", "exercise_suggestion_router",
    "pdf_analysis_router"
]
