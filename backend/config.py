from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Environnement (development, production)
    ENV: str = "development"
    
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

    # Configuration de l'IA
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    GOOGLE_API_KEY: str = os.getenv('GOOGLE_API_KEY', '')
    AI_PROVIDER: str = os.getenv('AI_PROVIDER', 'openai')
    OPENAI_CHAT_MODEL: str = os.getenv('OPENAI_CHAT_MODEL', 'gpt-3.5-turbo')
    GEMINI_CHAT_MODEL: str = os.getenv('GEMINI_CHAT_MODEL', 'gemini-pro')

    # Swagger UI (peut être désactivé en production via .env.production)
    DOCS_URL: str | None = "/docs"
    REDOC_URL: str | None = "/redoc"
    OPENAPI_URL: str | None = "/openapi.json"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = 'allow'  # Autorise les variables d'environnement supplémentaires

@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    
    # Vérifier si nous sommes sur Render
    if os.environ.get("RENDER") == "true":
        # Forcer le mode production
        settings.ENV = "production"
        
        # Récupérer l'URL de la base de données directement depuis les variables d'environnement
        render_db_url = os.environ.get("DATABASE_URL")
        if render_db_url:
            settings.DATABASE_URL = render_db_url
        
        # Les paramètres de documentation sont déjà définis par .env.production
        # Nous ne les modifions pas ici pour éviter les conflits
    else:
        # En développement local, utiliser l'URL depuis .env
        local_db_url = os.environ.get("DATABASE_URL")
        if local_db_url:
            settings.DATABASE_URL = local_db_url
    
    return settings
