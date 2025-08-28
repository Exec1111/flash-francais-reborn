from functools import lru_cache
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
from typing import List, Optional

load_dotenv()

BACKEND_ROOT = Path(__file__).resolve().parent 

class Settings(BaseSettings):
    # Environnement (development, production)
    ENV: str = os.getenv("ENV", "development")
    
    # Configuration de la base de données
    DATABASE_URL: str = os.getenv('DATABASE_URL', '')
    RENDER_DATABASE_URL: str = os.getenv('RENDER_DATABASE_URL', '')
    
    # Configuration de l'API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Flash Français API"
    
    # Configuration de sécurité
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"  # Frontend URL
    
    # Paramètres d'authentification
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'your-secret-key')
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Paramètres de prolongation de session
    SESSION_WARNING_MINUTES: int = int(os.getenv('SESSION_WARNING_MINUTES', '5'))  # Warning 5 min avant expiration
    SESSION_EXTEND_MINUTES: int = int(os.getenv('SESSION_EXTEND_MINUTES', '30'))   # Prolongation de 30 min

    # Configuration de l'IA
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    GOOGLE_API_KEY: str = os.getenv('GOOGLE_API_KEY', '')
    AI_PROVIDER: str = os.getenv('AI_PROVIDER', 'openai')
    OPENAI_CHAT_MODEL: str = os.getenv('OPENAI_CHAT_MODEL', 'gpt-3.5-turbo')
    GEMINI_CHAT_MODEL: str = os.getenv('GEMINI_CHAT_MODEL', 'gemini-pro')

    # Préfixe URL pour servir les fichiers média
    MEDIA_URL_PREFIX: str = "/media/uploads" 

    # --- Ajout des paramètres d'upload manquants ---
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv('MAX_UPLOAD_SIZE_MB', '10')) # Taille max en Mo, défaut 10 Mo
    ALLOWED_UPLOAD_MIME_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "text/plain",
        "audio/mpeg", # Pour les MP3
        "video/mp4",  # Pour les MP4
        # Ajoutez d'autres types MIME si nécessaire
    ]
    # -----------------------------------------------

    # Chemin de base pour le stockage des uploads - Initialisé à None
    UPLOADS_BASE_DIR: Optional[Path] = None

    # Swagger UI (peut être désactivé en production via .env.production)
    DOCS_URL: str | None = "/docs"
    REDOC_URL: str | None = "/redoc"
    OPENAPI_URL: str | None = "/openapi.json"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = 'allow'  # Autorise les variables d'environnement supplémentaires

import logging # Assurez-vous que logging est importé
logger = logging.getLogger(__name__) # Initialiser logger pour ce module

@lru_cache() 
def get_settings() -> Settings:
    settings = Settings() # Crée l'instance initiale

    # Définir UPLOADS_BASE_DIR conditionnellement
    if settings.ENV.lower() == "production":
        # En production (Render), utiliser le disque monté
        PRODUCTION_DISK_PATH = "/var/data/uploads-storage"
        settings.UPLOADS_BASE_DIR = Path(PRODUCTION_DISK_PATH) / "uploads"
        logger.info(f"Environnement de PRODUCTION détecté. Uploads dans: {settings.UPLOADS_BASE_DIR}")

        # S'assurer que les URLs de documentation sont actives en production pour le débogage
        # Ces valeurs surchargeront celles de .env.production si elles sont None
        if settings.DOCS_URL is None:
            settings.DOCS_URL = "/docs"
            logger.info("Forcing DOCS_URL to '/docs' in production as it was None.")
        if settings.REDOC_URL is None:
            settings.REDOC_URL = "/redoc"
            logger.info("Forcing REDOC_URL to '/redoc' in production as it was None.")
        if settings.OPENAPI_URL is None:
            settings.OPENAPI_URL = "/openapi.json"
            logger.info("Forcing OPENAPI_URL to '/openapi.json' in production as it was None.")
    else:
        # En développement, utiliser un dossier local
        settings.UPLOADS_BASE_DIR = BACKEND_ROOT / "local_uploads"
        logger.info(f"Environnement de DEVELOPPEMENT détecté. Uploads dans: {settings.UPLOADS_BASE_DIR}")

    # Créer le dossier (local ou prod) s'il n'existe pas
    if settings.UPLOADS_BASE_DIR:
        try:
            os.makedirs(settings.UPLOADS_BASE_DIR, exist_ok=True)
        except OSError as e:
            logger.error(f"Impossible de créer le dossier d'uploads {settings.UPLOADS_BASE_DIR}: {e}")
            raise RuntimeError(f"Impossible de créer le dossier d'uploads requis: {settings.UPLOADS_BASE_DIR}") from e
    else:
        logger.critical("FATAL: UPLOADS_BASE_DIR n'a pas pu être configuré.")
        raise ValueError("FATAL: UPLOADS_BASE_DIR n'a pas pu être configuré.")

    # Vérifier si nous sommes sur Render et ajuster ENV si nécessaire
    if os.environ.get("RENDER") == "true":
        if settings.ENV.lower() != "production":
            logger.warning(f"Forcing ENV to 'production' as RENDER env var is true (was {settings.ENV}).")
            settings.ENV = "production"
            # Réappliquer la logique de documentation si ENV a été changé ici
            if settings.DOCS_URL is None:
                settings.DOCS_URL = "/docs"
                logger.info("Forcing DOCS_URL to '/docs' in production (RENDER env var).")
            if settings.REDOC_URL is None:
                settings.REDOC_URL = "/redoc"
                logger.info("Forcing REDOC_URL to '/redoc' in production (RENDER env var).")
            if settings.OPENAPI_URL is None:
                settings.OPENAPI_URL = "/openapi.json"
                logger.info("Forcing OPENAPI_URL to '/openapi.json' in production (RENDER env var).")
        
        render_db_url = os.environ.get("DATABASE_URL") # Cette variable est fournie par Render
        if render_db_url:
            settings.DATABASE_URL = render_db_url
            logger.info(f"Using DATABASE_URL from Render environment variable.")
        else:
            logger.warning("RENDER env var is true, but DATABASE_URL env var from Render is not set. Check Render service config.")
    else:
        # En développement local, DATABASE_URL est déjà chargé depuis .env par Pydantic
        pass
    
    return settings
