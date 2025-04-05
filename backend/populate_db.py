import os
from dotenv import load_dotenv

# Charger les variables d'environnement AVANT d'importer database.py
load_dotenv()

import logging
import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import Progression, Objective, Sequence, Session as SessionModel, Resource, User, UserRole
from models.resource import ResourceType
from models.association_tables import session_objective_association, sequence_objective_association
from sqlalchemy import text

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Afficher les informations de connexion
logger.info("\n=== Configuration de la base de données ===")
logger.info(f"Environnement : {os.environ.get('ENV', 'unknown')}")
logger.info(f"URL de base de données : {os.environ.get('DATABASE_URL', 'non définie')}")

def clear_existing_data(db: Session):
    """Supprime les données existantes."""
    logger.info("Suppression des anciennes données...")
    
    try:
        # Supprimer les associations d'abord
        logger.info("Suppression des associations...")
        db.execute(text("DELETE FROM session_resource"))
        db.execute(text("DELETE FROM sequence_objective_association"))
        db.execute(text("DELETE FROM session_objective_association"))
        
        # Supprimer les données des tables dans l'ordre inverse des dépendances
        logger.info("Suppression des séances...")
        db.query(SessionModel).delete()  # Supprime les séances qui dépendent des séquences
        
        logger.info("Suppression des séquences...")
        db.query(Sequence).delete()  # Supprime les séquences qui dépendent des progressions
        
        logger.info("Suppression des progressions...")
        db.query(Progression).delete()  # Supprime toutes les progressions
        
        logger.info("Suppression des ressources...")
        db.query(Resource).delete()
        
        logger.info("Suppression des objectifs...")
        db.query(Objective).delete()
        
        logger.info("Suppression des utilisateurs...")
        db.query(User).delete()
        
        db.commit()
        logger.info("Données supprimées avec succès.")
    except Exception as e:
        logger.error(f"Erreur lors de la suppression des données: {e}")
        db.rollback()
        raise

def create_test_users(db: Session):
    """Crée des utilisateurs de test."""
    users = [
        User(
            email="teacher1@example.com",
            first_name="John",
            last_name="Doe",
            hashed_password="hashed_password_1",
            role=UserRole.TEACHER,
            is_active=True
        ),
        User(
            email="student1@example.com",
            first_name="Alice",
            last_name="Smith",
            role=UserRole.STUDENT,
            is_active=True
        ),
        User(
            email="student2@example.com",
            first_name="Bob",
            last_name="Johnson",
            role=UserRole.STUDENT,
            is_active=True
        )
    ]
    
    db.add_all(users)
    db.commit()
    return users

def populate_database():
    db: Session = SessionLocal()
    try:
        logger.info("Début du peuplement de la base de données...")
        clear_existing_data(db)

        # 1. Créer les utilisateurs
        logger.info("Création des utilisateurs...")
        users = create_test_users(db)
        
        # 2. Créer les progressions
        logger.info("Création des progressions...")
        progressions_data = [
            ("Parcours Débutant A1", "Niveau A1 complet"),
            ("Parcours Intermédiaire A2", "Niveau A2 complet"),
            ("Parcours Avancé B1", "Niveau B1 complet"),
            ("Module : Grammaire Passé", "Focus sur Passé Composé et Imparfait"),
            ("Module : Voyage et Culture", "Préparation et découverte")
        ]
        
        progressions = []
        for title, description in progressions_data:
            progression = Progression(
                title=title,
                description=description,
                user=users[0]  # Créé par le premier enseignant
            )
            progressions.append(progression)
        
        db.add_all(progressions)
        db.commit()
        
        # 3. Créer les objectifs
        logger.info("Création des objectifs...")
        objectives_data = [
            ("Comprendre le présent", "Savoir conjuguer les verbes ER"),
            ("Vocabulaire : La nourriture", "Connaître 20 mots courants"),
            ("Grammaire : Les articles", "Différencier un/une/des et le/la/les"),
            ("Exprimer ses goûts", "Utiliser J'aime / Je n'aime pas"),
            ("Passé composé : auxiliaire AVOIR", "Formation avec les verbes réguliers"),
            ("Passé composé : auxiliaire ÊTRE", "Accord du participe passé"),
            ("Imparfait : formation", "Terminaisons et verbes courants"),
            ("Futur simple", "Formation et utilisation"),
            ("Vocabulaire : Les vêtements", "Nommer 15 vêtements"),
            ("Vocabulaire : La famille", "Membres de la famille"),
            ("Prépositions de lieu", "Utiliser sur, sous, dans, devant, derrière"),
            ("Adjectifs possessifs", "Mon, ton, son, notre, votre, leur"),
            ("Négation simple", "Ne...pas"),
            ("Questions simples", "Est-ce que, Qu'est-ce que, Où, Quand"),
            ("Pronoms COD", "Le, la, les, l'"),
            ("Pronoms COI", "Lui, leur"),
            ("Conditionnel présent", "Formation et politesse"),
            ("Subjonctif présent : introduction", "Après il faut que"),
            ("Vocabulaire : Les transports", "Moyens de transport courants"),
            ("Culture : Monuments de Paris", "Identifier 5 monuments")
        ]
        objectives = [Objective(title=t, description=d, user=users[0]) for t, d in objectives_data]  # Créés par le premier enseignant
        db.add_all(objectives)
        db.commit()
        
        # 4. Créer les séquences avec leurs progressions
        logger.info("Création des séquences...")
        sequence_titles = [
            "Séquence 1 : Présentation de soi",
            "Séquence 2 : La vie quotidienne",
            "Séquence 3 : Les activités",
            "Séquence 4 : Le temps libre",
            "Séquence 5 : Le voyage en France"
        ]
        
        sequences = []
        for i, title in enumerate(sequence_titles):
            sequence = Sequence(
                title=title,
                description=f"Description de la séquence {title}",
                user=users[0],  # Créé par le premier enseignant
                progression=progressions[i % len(progressions)]  # Associer à une progression
            )
            sequences.append(sequence)
        
        db.add_all(sequences)
        db.commit()
        
        # 5. Créer les séances
        logger.info("Création des séances...")
        start_date = date(2024, 1, 10)
        session_titles_templates = [
            "Leçon {}: {}",
            "Révision : {}",
            "Focus sur : {}",
            "Atelier pratique : {}"
        ]
        all_objective_ids = [o.id for o in objectives]
        
        sessions = []
        for i in range(50):
            template = random.choice(session_titles_templates)
            random_objective_title = random.choice([o.title for o in objectives])
            session_title = template.format(i + 1, random_objective_title)
            session_date = start_date + timedelta(days=random.randint(0, 365*1))
            
            num_objectives = random.randint(1, 3)
            session_objectives_ids = random.sample(all_objective_ids, min(num_objectives, len(all_objective_ids)))
            session_objectives = db.query(Objective).filter(Objective.id.in_(session_objectives_ids)).all()
            
            assigned_sequence = random.choice(sequences)
            
            sessions.append(SessionModel(
                title=session_title,
                date=session_date,
                objectives=session_objectives,
                sequence=assigned_sequence,
                user=users[0]  # Créé par le premier enseignant
            ))
        
        db.add_all(sessions)
        db.commit()
        
        # 6. Créer les ressources
        logger.info("Création des ressources...")
        resources = []
        resource_types = list(ResourceType)
        
        for i in range(20):
            res_type = random.choice(resource_types)
            resources.append(Resource(
                type=res_type,
                title=f"Ressource {res_type.value} {i+1}",
                description=f"Description de la ressource {i+1}",
                content={
                    "url": f"http://example.com/{res_type.value}/resource_{i+1}",
                    "type": res_type.value
                },
                user=users[0]  # Créé par le premier enseignant
            ))
        
        db.add_all(resources)
        db.commit()
        
        # 7. Associer les ressources aux séances
        logger.info("Association des ressources aux séances...")
        for sess in sessions:
            num_resources = random.randint(1, 3)
            selected_resources = random.sample(resources, num_resources)
            sess.resources.extend(selected_resources)
            db.add(sess)
        
        db.commit()
        
        # 8. Créer des progressions pour les étudiants
        logger.info("Création des progressions pour les étudiants...")
        for student in users[1:]:  # Pour chaque étudiant
            for sequence in sequences:
                progression = Progression(
                    title=f"Progression {sequence.title}",
                    description=f"Progression de {student.first_name} {student.last_name} sur {sequence.title}",
                    user=student,
                    sequences=[sequence]  # Utiliser sequences au pluriel
                )
                db.add(progression)
        
        db.commit()
        
        logger.info("Peuplement de la base de données terminé avec succès !")

    except Exception as e:
        logger.error(f"Erreur lors du peuplement de la base de données: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Vérification/Création des tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tables vérifiées/créées.")
        populate_database()
    except Exception as e:
        logger.critical(f"Impossible de créer les tables ou de peupler la DB: {e}", exc_info=True)
