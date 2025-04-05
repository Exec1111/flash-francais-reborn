import os
import sys
from dotenv import load_dotenv

# Ajouter le dossier parent au PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Charger les variables d'environnement AVANT d'importer les autres modules
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException
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

# Configuration CORS
origins = [
    "http://localhost:3000",  # Frontend React
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Authorization"],  # Ajout des headers exposés
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
