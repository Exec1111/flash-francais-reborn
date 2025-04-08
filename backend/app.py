import os
import sys
from dotenv import load_dotenv

# Ajouter le dossier parent au PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Charger les variables d'environnement AVANT d'importer les autres modules
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import logging

from database import get_db, engine, Base
from config import get_settings, Settings
from routers.auth import auth_router
from routers.progression import progression_router
from routers.sequence import sequence_router
from routers.session import session_router
from routers.resource import resource_router
from routers.resource_type import resource_type_router
from routers.objective import objective_router
from routers.user import user_router
from routers import ai_router  # Importation du routeur AI
from schemas.sequence import SequenceRead, SequenceReadSimple
from schemas.objective import ObjectiveRead

# Création des tables dans la base de données
Base.metadata.create_all(bind=engine)

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# --- Cache désactivé temporairement ---
# from contextlib import asynccontextmanager 
# from redis import asyncio as aioredis
# from fastapi_cache import FastAPICache
# from fastapi_cache.backends.redis import RedisBackend
# from fastapi_cache.decorator import cache
# --- Fin cache désactivé ---

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    API pour l'application Flash Français. Permet de gérer les utilisateurs et l'authentification.
    
    ## Authentification
    
    * Inscription d'un nouvel utilisateur
    * Connexion pour obtenir un token JWT
    * Récupération des informations de l'utilisateur connecté
    """,
    version="1.0.0",
    openapi_tags=[
        {
            "name": "auth",
            "description": "Opérations d'authentification"
        },
        {
            "name": "progressions",
            "description": "Opérations de progression"
        },
        {
            "name": "sequences",
            "description": "Opérations de séquence"
        },
        {
            "name": "sessions",
            "description": "Opérations de séance"
        },
        {
            "name": "resources",
            "description": "Opérations de ressource"
        },
        {
            "name": "resource_types",
            "description": "Opérations de types et sous-types de ressource"
        },
        {
            "name": "objectives",
            "description": "Opérations d'objectif et associations"
        },
        {
            "name": "test",
            "description": "Opérations de test"
        },
        {
            "name": "AI",
            "description": "Opérations d'intelligence artificielle"
        }
    ],
    docs_url=settings.DOCS_URL,
    redoc_url=settings.REDOC_URL,
    openapi_url=settings.OPENAPI_URL
)

# --- Cache désactivé temporairement --- 
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Initialiser Redis pour le cache
#     redis_url = settings.REDIS_URL # Assurez-vous que REDIS_URL est dans votre config/settings
#     if redis_url:
#         redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
#         FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
#         logger.info(f"Cache Redis initialisé avec succès depuis {redis_url}")
#         yield
#         await redis.close()
#     else:
#         logger.warning("REDIS_URL non définie. Le cache ne sera pas activé.")
#         yield # Démarrer l'app sans cache
# --- Fin cache désactivé ---

# --- Configuration CORS ---
origins = [
    "http://localhost:3000",  # L'origine de votre frontend React
    "http://localhost:8080",  # Si vous utilisez une autre origine pour le dev
    "http://127.0.0.1:3000", # Parfois nécessaire
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Liste des origines autorisées
    allow_credentials=True, # Autoriser les cookies/jetons dans les requêtes cross-origin
    allow_methods=["*"],    # Autoriser toutes les méthodes (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],    # Autoriser tous les en-têtes
)

# Inclusion des routes d'authentification
app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["auth"]
)

# Inclusion des routes de progression
app.include_router(
    progression_router,
    prefix="/api/v1/progressions",
    tags=["progressions"]
)

# Inclusion des routes de séquence
app.include_router(
    sequence_router,
    prefix="/api/v1/sequences",
    tags=["sequences"]
)

# Inclusion des routes de session
app.include_router(
    session_router,
    prefix="/api/v1/sessions",
    tags=["sessions"]
)

# Inclusion des routes de ressource
app.include_router(
    resource_router,
    prefix="/api/v1/resources",
    tags=["resources"]
)

# Inclusion des routes de types de ressource
app.include_router(
    resource_type_router,
    prefix="/api/v1/resource-types",
    tags=["resource_types"]
)

# Inclusion des routes d'objectif
app.include_router(
    objective_router,
    prefix="/api/v1/objectives",
    tags=["objectives"]
)

# Inclusion des routes AI
app.include_router(
    ai_router,
    prefix="/api/v1/ai",
    tags=["AI"]
)

# Inclusion des routes d'utilisateur
app.include_router(
    user_router,
    prefix="/api/v1/users",
    tags=["users"]
)

# --- Monter le dossier d'uploads en utilisant la config --- 
# Le dossier est déjà créé par la logique dans config.py
app.mount(settings.MEDIA_URL_PREFIX, StaticFiles(directory=str(settings.UPLOADS_BASE_DIR)), name="user_uploads")
logger.info(f"Montage des médias depuis '{settings.UPLOADS_BASE_DIR}' sur l'URL '{settings.MEDIA_URL_PREFIX}'")
# --- Fin montage Render Disk --- 

# Route de test
@app.get("/api/v1/sequences/test-route", tags=["test"])
def test_sequence_route():
    return {"message": "Route de test Séquence OK"}

@app.get("/", tags=["root"])
def root():
    return {"message": "Bienvenue sur l'API Flash Français"}

# --- Résoudre les Forward References dans les modèles Pydantic ---
# Doit être appelé APRÈS l'import des modules contenant les modèles

print("Rebuilding Pydantic models...")
SequenceRead.model_rebuild()
SequenceReadSimple.model_rebuild()
ObjectiveRead.model_rebuild()
# Appeler model_rebuild() pour d'autres modèles si nécessaire
print("Pydantic models rebuilt.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
