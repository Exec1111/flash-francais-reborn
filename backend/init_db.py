"""
Script d'initialisation et de réinitialisation de la base de données.
"""
import os
from dotenv import load_dotenv

# Charger les variables d'environnement AVANT d'importer database.py
load_dotenv()

import sys
import traceback
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from models import Base, User, UserRole
from hashing import get_password_hash

# Configuration de la base de données
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    print("Erreur: Aucune URL de base de données trouvée")
    exit(1)

# Créer un moteur SQLAlchemy
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Créer une session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def drop_all_tables():
    """Supprime toutes les tables de la base de données"""
    try:
        print("Suppression de toutes les tables...")
        with engine.connect() as conn:
            # Désactiver les contraintes étrangères
            conn.execute(text("SET CONSTRAINTS ALL DEFERRED"))
            
            # Supprimer les tables dans l'ordre inverse de leur dépendance
            tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            table_list = [table[0] for table in tables]
            print(f"Tables existantes avant suppression: {table_list}")
            
            for table in table_list:
                print(f"Suppression de la table {table}...")
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            
            conn.commit()
            print("Toutes les tables ont été supprimées avec succès.")
        return True
    except Exception as e:
        print(f"Erreur lors de la suppression des tables: {e}")
        print(traceback.format_exc())
        return False

def create_admin_user():
    """
    Crée un utilisateur administrateur par défaut.
    """
    db = SessionLocal()
    try:
        print("Vérification de l'existence d'un administrateur...")
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if existing_admin:
            print("Un administrateur existe déjà dans la base de données.")
            return existing_admin
        
        print("Création d'un nouvel administrateur...")
        hashed_password = get_password_hash("admin123")
        admin_user = User(
            email="admin@flashfrancais.com",
            first_name="Administrateur",
            last_name="Système",
            hashed_password=hashed_password,
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"Administrateur créé avec succès: {admin_user.email}")
        print("Email: admin@flashfrancais.com")
        print("Mot de passe: admin123")
        return admin_user
    except Exception as e:
        print(f"Erreur lors de la création de l'administrateur: {e}")
        print(traceback.format_exc())
        db.rollback()
        return None
    finally:
        db.close()

def init_db(args=None):
    """
    Initialise la base de données en créant les tables et en créant un administrateur.
    """
    logger = logging.getLogger(__name__)
    try:
        print("Initialisation de la base de données...")
        
        # Vérifier si la connexion à la base de données fonctionne
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print(f"Connexion à la base de données réussie: {result.fetchone()}")
        
        # Vérifier si les tables existent déjà
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # Supprimer les tables si --reinit est spécifié
        if args and args.reinit:
            logger.info("Suppression des tables existantes...")
            Base.metadata.drop_all(bind=engine)
        
        # Créer les tables si elles n'existent pas
        logger.info("Création des tables si nécessaire...")
        Base.metadata.create_all(bind=engine)
        
        # Vérifier que les tables ont été créées
        new_tables = inspector.get_table_names()
        if set(new_tables) != set(existing_tables):
            logger.info(f"Tables créées: {', '.join(set(new_tables) - set(existing_tables))}")
        else:
            logger.info("Aucune nouvelle table créée")
        
        # Créer un administrateur par défaut
        print("Création de l'administrateur par défaut...")
        create_admin_user()
        
        return True
    except Exception as e:
        print(f"Erreur lors de l'initialisation de la base de données: {e}")
        print(traceback.format_exc())
        return False

def reinitialize_db():
    """
    Réinitialise complètement la base de données (suppression et recréation).
    """
    try:
        print("Réinitialisation complète de la base de données...")
        
        # Supprimer toutes les tables
        if not drop_all_tables():
            print("Échec de la suppression des tables")
            return False
            
        # Réinitialiser et recréer
        if not init_db():
            print("Échec de l'initialisation")
            return False
            
        print("Base de données réinitialisée avec succès.")
        return True
    except Exception as e:
        print(f"Erreur lors de la réinitialisation: {e}")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    import argparse
    import logging
    
    logging.basicConfig(level=logging.INFO)
    
    parser = argparse.ArgumentParser(description='Gestion de la base de données')
    parser.add_argument('--reinit', action='store_true', help='Réinitialise complètement la base de données')
    parser.add_argument('--force', action='store_true', help='Force la réinitialisation complète, y compris suppression des données')
    args = parser.parse_args()

    if args.force:
        logger = logging.getLogger(__name__)
        logger.info("Force de la réinitialisation complète...")
        # Supprimer toutes les tables existantes
        Base.metadata.drop_all(bind=engine)
        logger.info("Toutes les tables ont été supprimées")
        
    init_db(args)
    
    try:
        print("Démarrage du script d'initialisation de la base de données...")
        
        if args.reinit:
            print("Mode réinitialisation activé")
            success = reinitialize_db()
        else:
            print("Mode initialisation simple")
            success = init_db()
            
        if success:
            print("Opération terminée avec succès.")
            sys.exit(0)
        else:
            print("Échec de l'opération.")
            sys.exit(1)
    except Exception as e:
        print(f"Erreur non gérée: {e}")
        print(traceback.format_exc())
        sys.exit(1)
