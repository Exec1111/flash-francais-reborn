import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from database import Base
from models.user import User
from models.resource import Resource
from models.sequence import Sequence
from models.session import Session
from models.progression import Progression

# Charger les variables d'environnement (.env) pour le développement local
load_dotenv()

# Récupérer l'URL de la base de données depuis les variables d'environnement
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise Exception("Erreur : La variable d'environnement DATABASE_URL n'est pas définie.")

# Créer un moteur de base de données
engine = create_engine(DATABASE_URL)

# Supprimer toutes les tables en utilisant DROP TABLE ... CASCADE
print(f"Connexion à la base de données : {DATABASE_URL}")
print("Suppression de toutes les tables avec CASCADE...")
try:
    with engine.connect() as connection:
        inspector = inspect(engine)
        # Récupérer tous les noms de tables dans le schéma public (par défaut pour PostgreSQL)
        # Filtrer pour ne pas inclure la table alembic_version
        table_names = [table_name for table_name in inspector.get_table_names(schema='public') if table_name != 'alembic_version']
        
        if table_names:
            # Inverser l'ordre n'est généralement pas nécessaire avec CASCADE, mais ne nuit pas.
            # table_names.reverse()
            for table_name in table_names:
                print(f"  Suppression de la table {table_name}...")
                # S'assurer que le nom de la table est correctement échappé si nécessaire, 
                # bien que pour les noms de table standard, cela devrait fonctionner.
                connection.execute(text(f'DROP TABLE IF EXISTS public."{table_name}" CASCADE'))
            connection.commit() # S'assurer que les suppressions sont commitées
            print("Toutes les tables (hors alembic_version) ont été supprimées avec succès.")
        else:
            print("Aucune table à supprimer trouvée (hors alembic_version).")

except Exception as e:
    print(f"Erreur lors de la suppression des tables : {e}")
    # Il est important de remonter l'exception si on veut que le script s'arrête en cas d'échec critique
    raise

# Recréer toutes les tables
print("Création de toutes les tables...")
Base.metadata.create_all(engine)

print("Base de données réinitialisée avec succès")
