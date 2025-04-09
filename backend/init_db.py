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
from sqlalchemy.orm import sessionmaker, Session
from database import engine, Base, SessionLocal  # S'assurer que SessionLocal est importé
# Importer les modèles nécessaires
from models.user import User, UserRole
from models.resource import ResourceType, ResourceSubType
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

def seed_reference_data(db: Session):
    """Crée les données initiales pour les tables de référence si elles n'existent pas."""
    print("Début du seeding des données de référence...")

    # ===============================================================
    # == MODIFIER ICI : Données initiales pour ResourceType ==
    # ===============================================================
    resource_types_to_seed = [
        {"key": "EXERCICE", "value": "Exercice"},
        {"key": "MULTIMEDIA", "value": "Multimédia"},
        {"key": "LECON", "value": "Leçon"},
        {"key": "OEUVRE", "value": "Oeuvre"},
        # Ajoutez autant de types que nécessaire ici
    ]
    # ===============================================================
    
    created_types = {} # Pour stocker les objets créés ou trouvés
    print("  Vérification/Création des ResourceType...")
    for type_data in resource_types_to_seed:
        # Utiliser l'attribut 'key' du modèle
        db_type = db.query(ResourceType).filter(ResourceType.key == type_data["key"]).first()
        if not db_type:
            print(f"    Création ResourceType: {type_data['key']}")
            # Utiliser 'key' et 'value' pour créer l'objet
            db_type = ResourceType(key=type_data["key"], value=type_data["value"])
            db.add(db_type)
        created_types[type_data["key"]] = db_type # Stocker l'objet trouvé ou créé (utiliser la clé comme id dans le dict)
    db.commit()
    print("  Vérification/Création des ResourceType terminée.")
    for type_obj in created_types.values():
        if type_obj in db.new or type_obj in db.dirty:
           db.refresh(type_obj)


    # ===============================================================
    # == MODIFIER ICI : Données initiales pour ResourceSubType ==
    # ===============================================================
    resource_subtypes_to_seed = [
        # Utiliser 'key' pour le sous-type et 'parent_type_key' pour le parent
        # Sous-types pour EXERCICE
        {"key": "QCM", "parent_type_key": "EXERCICE", "value": "QCM"},
        {"key": "DICTEE", "parent_type_key": "EXERCICE", "value": "DICTEE"},
        {"key": "QOEUVRE", "parent_type_key": "EXERCICE", "value": "Questions sur une oeuvre"},
        {"key": "QTEXTE", "parent_type_key": "EXERCICE", "value": "Questions sur un texte"},
        
        # Sous-types pour MULTIMEDIA - Aucun défini
        
        # Sous-types pour LECON
        {"key": "FORMAT1", "parent_type_key": "LECON", "value": "Format court"},
        {"key": "FORMAT2", "parent_type_key": "LECON", "value": "Format long"},
        
        # Sous-types pour OEUVRE
        {"key": "TEXTE", "parent_type_key": "OEUVRE", "value": "Extrait de texte"},
        {"key": "OEUVRE_SUB", "parent_type_key": "OEUVRE", "value": "Oeuvre complète"}, # Renommé la clé pour éviter conflit
        
        # Ajoutez autant de sous-types que nécessaire ici
    ]
    # ===============================================================
    
    print("  Vérification/Création des ResourceSubType...")
    for subtype_data in resource_subtypes_to_seed:
        # Utiliser l'attribut 'key' du modèle pour filtrer
        db_subtype = db.query(ResourceSubType).filter(ResourceSubType.key == subtype_data["key"]).first()
        if not db_subtype:
            # Utiliser 'parent_type_key' pour trouver le parent dans le dict
            parent_type = created_types.get(subtype_data["parent_type_key"])
            if parent_type:
                if not parent_type.id:
                   print(f"    ATTENTION: L'ID du type parent '{parent_type.key}' n'est pas disponible. Tentative de rafraîchissement...")
                   db.refresh(parent_type)
                   if not parent_type.id:
                       print(f"    ÉCHEC: Impossible d'obtenir l'ID pour {parent_type.key}. Skipping {subtype_data['key']}.")
                       continue
                       
                print(f"    Création ResourceSubType: {subtype_data['key']} (Parent: {parent_type.key} - ID: {parent_type.id})")
                # Utiliser 'key', 'value' et l'ID du parent pour créer l'objet
                db_subtype = ResourceSubType(
                    key=subtype_data["key"],
                    value=subtype_data["value"],
                    type_id=parent_type.id
                )
                db.add(db_subtype)
            else:
                print(f"    ATTENTION: Type parent '{subtype_data['parent_type_key']}' non trouvé pour le sous-type '{subtype_data['key']}'. Skipping.")
    
    db.commit()
    print("  Vérification/Création des ResourceSubType terminée.")
    print("Seeding des données de référence terminé.")

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
        
        # Seeding des données de référence
        print("Démarrage de la session pour le seeding...")
        db = SessionLocal()
        try:
            seed_reference_data(db)
        finally:
            print("Fermeture de la session de seeding.")
            db.close()
        
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
