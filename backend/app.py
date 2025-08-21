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
from fastapi.security import HTTPBearer
from fastapi.openapi.models import APIKey, APIKeyIn, SecuritySchemeType
from fastapi.openapi.utils import get_openapi

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
from routers.ai_router import router as ai_api_router  # Importation explicite du routeur AI
from routers.config import router as config_router
from routers.dashboard import dashboard_router # Importation du routeur Dashboard
from routers.study_object import router as study_object_router
from routers.oeuvre import router as oeuvre_router
from routers import admin
from routers.docling import router as docling_router

# ... (autres includes)
# (déplacement de l'inclusion du routeur admin plus bas)

from schemas.sequence import SequenceRead
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

# --- Ajout du schéma de sécurité Bearer ---
bearer_scheme = HTTPBearer()

# --- Code d'initialisation de FastAPI ---
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
        },
        {
            "name": "dashboard",
            "description": "Opérations du dashboard"
        },
        {
            "name": "study_objects",
            "description": "Opérations d'étude"
        },
        {
            "name": "oeuvres",
            "description": "Opérations sur les œuvres littéraires"
        },
        {
            "name": "admin",
            "description": "Opérations d'administration"
        }
    ],
    docs_url=settings.DOCS_URL,
    redoc_url=settings.REDOC_URL,
    openapi_url=settings.OPENAPI_URL
)

# --- Patch OpenAPI pour ajouter Bearer Auth dans Swagger UI ---
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    # Appliquer le schéma Bearer par défaut à tous les endpoints
    for path in openapi_schema["paths"].values():
        for method in path.values():
            method.setdefault("security", []).append({"BearerAuth": []})
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# --- Middleware global de secours pour forcer l'en-tête CORS sur toutes les réponses ---
@app.middleware("http")
async def ensure_cors_header(request, call_next):
    response = await call_next(request)
    if "access-control-allow-origin" not in response.headers:
        response.headers["Access-Control-Allow-Origin"] = "*"
    return response

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
# Autoriser toutes origines (pas de cookies)
origins = ["*"]
# origins = [
    # "http://localhost:3000",  # L'origine de votre frontend React en dev
    # "http://localhost:8080",  # Autre origine éventuelle
    # "http://127.0.0.1:3000", # Variante IP
    # "http://localhost:3000",  # Frontend React local
    # "https://flash-francais-reborn.onrender.com"] # production

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Liste des origines autorisées
    allow_credentials=False,  # Pas de cookies nécessaires pour servir des fichiers statiques
    allow_methods=["*"],    # Autoriser toutes les méthodes (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],    # Autoriser tous les en-têtes
)

# --- Configuration du service de fichiers statiques ---
if settings.ENV.lower() == "production":
    MEDIA_ROOT = str(settings.UPLOADS_BASE_DIR)
else:
    MEDIA_ROOT = "local_uploads"

if not os.path.exists(MEDIA_ROOT):
    os.makedirs(MEDIA_ROOT, exist_ok=True)
    logger.info(f"Création du répertoire pour les médias: {MEDIA_ROOT}")

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

# Inclusion des routes Docling
app.include_router(
    docling_router,
    prefix="/api/v1/docling",
    tags=["docling"]
)

# Inclusion des routes AI
app.include_router(
    ai_api_router,
    prefix="/api/v1/ai",
    tags=["AI"]
)

# Inclusion des routes d'utilisateur
app.include_router(
    user_router,
    prefix="/api/v1/users",
    tags=["users"]
)

# Inclusion des routes du dashboard
app.include_router(
    dashboard_router,
    prefix="/api/v1/dashboard",
    tags=["dashboard"]
)
logger.info("✅ [DIAGNOSTIC] Dashboard router included successfully.")

# Inclusion des routes d'étude
app.include_router(
    study_object_router,
    prefix="/api/v1/study_objects",
    tags=["study_objects"]
)

# Inclusion des routes d'œuvres
app.include_router(
    oeuvre_router,
    prefix="/api/v1",
    tags=["oeuvres"]
)

# Inclusion des routes de configuration
app.include_router(
    config_router,
    prefix="/api/v1/config",
    tags=["config"]
)

# Inclusion des routes admin
app.include_router(admin.router)

# --- Monter le dossier d'uploads avec CORS pour servir les fichiers HTML ---
from starlette.middleware.cors import CORSMiddleware as _Cors
_uploads_static = StaticFiles(directory=str(settings.UPLOADS_BASE_DIR), html=True)
_uploads_app = _Cors(
    _uploads_static,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
    allow_credentials=False,
)
app.mount(settings.MEDIA_URL_PREFIX, _uploads_app, name="user_uploads")
logger.info(f"Montage des médias (avec CORS) depuis '{settings.UPLOADS_BASE_DIR}' sur l'URL '{settings.MEDIA_URL_PREFIX}'")
# --- Fin montage Render Disk --- 

# --- Montage du dossier des ressources générées IA ---
import os
STATIC_GEN_DIR = os.path.join(os.path.dirname(__file__), "static", "generated_resources")
os.makedirs(STATIC_GEN_DIR, exist_ok=True)
app.mount("/static/generated_resources", StaticFiles(directory=STATIC_GEN_DIR), name="generated_resources")
logger.info(f"Montage des ressources générées IA sur /static/generated_resources depuis {STATIC_GEN_DIR}")

# --- Montage du dossier temporaire pour les ressources générées IA avant copie ---
STATIC_TMP_DIR = os.path.join(os.path.dirname(__file__), "static", "tmp")
os.makedirs(STATIC_TMP_DIR, exist_ok=True)
app.mount("/static/tmp", StaticFiles(directory=STATIC_TMP_DIR), name="tmp_resources")
logger.info(f"Montage du dossier temporaire sur /static/tmp depuis {STATIC_TMP_DIR}")

# Route de test
@app.get("/api/v1/sequences/test-route", tags=["test"])
def test_sequence_route():
    return {"message": "Route de test Séquence OK"}

@app.get("/", tags=["root"])
def root():
    return {"message": "Bienvenue sur l'API Flash Français"}

# --- Reconstruction manuelle des modèles Pydantic ---
print("Rebuilding Pydantic models...")

# Fonction pour reconstruire les modèles de manière différée
def rebuild_models_deferred():
    try:
        # Import de tous les schémas nécessaires
        from schemas.common import ObjectiveIdentifier, SequenceIdentifier, SessionIdentifier, ResourceIdentifier
        from schemas.objective import ObjectiveRead
        from schemas.session import SessionRead, SessionReadSimple
        from schemas.resource import ResourceRead, ResourceShort, ResourceResponse, ResourceReadShort
        from schemas.study_object import StudyObjectRead, StudyObjectReadShort, StudyObjectWithResources
        from schemas.oeuvre import OeuvreRead, OeuvreReadShort
        from schemas.sequence import SequenceRead, SequenceWithObjects
        from schemas.progression import ProgressionRead
        
        # Reconstruction dans l'ordre strict des dépendances
        # 1. Schémas de base sans dépendances
        ObjectiveIdentifier.model_rebuild()
        SequenceIdentifier.model_rebuild()
        SessionIdentifier.model_rebuild()
        ResourceIdentifier.model_rebuild()
        
        # 2. Schémas avec dépendances simples
        ObjectiveRead.model_rebuild()
        SessionRead.model_rebuild()
        SessionReadSimple.model_rebuild()
        
        # 3. Schémas de ressources
        ResourceRead.model_rebuild()
        ResourceShort.model_rebuild()
        ResourceReadShort.model_rebuild()
        ResourceResponse.model_rebuild()
        
        # 4. Schémas d'œuvres
        OeuvreRead.model_rebuild()
        OeuvreReadShort.model_rebuild()
        
        # 5. Schémas d'objets d'étude
        StudyObjectRead.model_rebuild()
        StudyObjectReadShort.model_rebuild()
        StudyObjectWithResources.model_rebuild()
        
        # 6. Schémas de séquences (qui dépendent d'ObjectiveRead)
        SequenceRead.model_rebuild()
        SequenceWithObjects.model_rebuild()
        
        # 7. Schémas de progression (qui dépendent de SequenceRead)
        ProgressionRead.model_rebuild()
        
        print("Pydantic models rebuilt successfully.")
        return True
    except Exception as e:
        print(f"Warning: Error rebuilding models: {e}")
        print("Some forward references may not be resolved.")
        return False

# Gestionnaire d'événement de démarrage pour reconstruire les modèles
@app.on_event("startup")
async def startup_event():
    """Reconstruit les modèles Pydantic au démarrage de l'application"""
    print("Application startup: rebuilding Pydantic models...")
    rebuild_models_deferred()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
