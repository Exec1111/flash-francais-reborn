# Import des routeurs
from .auth import auth_router
from .progression import progression_router
from .sequence import sequence_router
from .session import session_router
from .resource import resource_router
from .objective import objective_router
from .user import user_router
from .ai_router import router as ai_router # Importe le routeur depuis le fichier ai_router.py

# Importez d'autres routeurs ici si nécessaire
# from routers.autre import router as autre_router

__all__ = ["auth_router", "progression_router", "sequence_router", "session_router", "resource_router", "objective_router", "user_router", "ai_router"]
