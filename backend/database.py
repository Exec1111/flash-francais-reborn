from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings
import os
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

def get_database_url():
    """
    Récupère l'URL de la base de données, en priorisant l'URL locale définie dans .env.
    """
    try:
        # Vérifier d'abord dans les variables d'environnement
        logger.info("=== Vérification des variables d'environnement ===")
        env_url = os.environ.get("DATABASE_URL")
        render_url = os.environ.get("RENDER_DATABASE_URL")
        
        logger.info(f"DATABASE_URL dans .env: {env_url}")
        logger.info(f"RENDER_DATABASE_URL: {render_url}")
        
        # Priorité à l'URL locale
        if env_url:
            logger.info("Utilisation de l'URL locale définie dans .env")
            return env_url
        
        # Si l'URL locale n'est pas définie, utiliser celle de Render
        if render_url:
            logger.info("Utilisation de l'URL de Render")
            return render_url
            
        logger.error("Aucune URL de base de données trouvée")
        return None
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'URL: {e}")
        raise

# Récupérer l'URL de la base de données
SQLALCHEMY_DATABASE_URL = get_database_url()

if not SQLALCHEMY_DATABASE_URL:
    logger.error("Aucune URL de base de données valide n'a été trouvée")
    exit(1)

# Afficher la configuration finale
logger.info(f"\n=== Configuration finale ===")
logger.info(f"URL finale de connexion à la base de données : {SQLALCHEMY_DATABASE_URL}")
logger.info(f"=== Fin de la configuration de la base de données ===")

# Configuration des paramètres de connexion en fonction de l'environnement
connect_args = {}
if settings.ENV == "production":
    # En production (Render), on utilise SSL
    connect_args["sslmode"] = "require"
    pool_size = 5
    max_overflow = 2
    pool_timeout = 30
    pool_recycle = 1800
else:
    # En développement local, pas de SSL
    pool_size = 5
    max_overflow = 2
    pool_timeout = 30
    pool_recycle = 1800

# Créer un moteur SQLAlchemy
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=pool_size,
    max_overflow=max_overflow,
    pool_timeout=pool_timeout,
    pool_recycle=pool_recycle,
    connect_args=connect_args
)
logger.info("Moteur SQLAlchemy créé avec succès")

# Créer une session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
logger.info("SessionLocal créée avec succès")

# Vérifier la connexion
try:
    with engine.connect() as conn:
        logger.info("Test de connexion réussi")
except Exception as e:
    logger.error(f"Erreur lors du test de connexion: {e}")
    raise

# Base de données
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
