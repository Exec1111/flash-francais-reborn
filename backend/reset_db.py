from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models.user import User
from models.resource import Resource
from models.sequence import Sequence
from models.session import Session
from models.progression import Progression

# Créer un moteur de base de données
DATABASE_URL = "postgresql://postgres:123456@localhost:5432/flash_francais"
engine = create_engine(DATABASE_URL)

# Supprimer toutes les tables
Base.metadata.drop_all(engine)

# Recréer toutes les tables
Base.metadata.create_all(engine)

print("Base de données réinitialisée avec succès")
