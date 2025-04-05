import logging
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Progression, Objective, Sequence, Session as SessionModel, Resource, User # Importe User mais ne l'utilise pas pour delete
from models.association_tables import session_objective_association, sequence_objective_association # Table Progression-Sequence non définie ici

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clear_data_except_users():
    db: Session = SessionLocal()
    try:
        logger.info("Début de la suppression des données (sauf utilisateurs)...")

        # L'ordre est important à cause des clés étrangères (FK)
        # 1. Supprimer les lignes des tables d'association explicitement définies
        logger.info("Suppression des liens Session-Objective et Sequence-Objective...")
        db.execute(session_objective_association.delete())
        db.execute(sequence_objective_association.delete())
        # db.execute(progression_sequence_association.delete()) # Cette table n'est pas définie ici
        db.commit()

        # 2. Supprimer les données des tables dépendantes (Resource dépend de Session)
        logger.info("Suppression des Ressources...")
        db.query(Resource).delete(synchronize_session=False)
        db.commit()

        # 3. Supprimer les données des tables principales
        logger.info("Suppression des Sessions...")
        db.query(SessionModel).delete(synchronize_session=False)
        db.commit()
        
        logger.info("Suppression des Séquences...")
        db.query(Sequence).delete(synchronize_session=False)
        db.commit()
        
        logger.info("Suppression des Progressions...")
        db.query(Progression).delete(synchronize_session=False)
        db.commit()
        
        logger.info("Suppression des Objectives...")
        db.query(Objective).delete(synchronize_session=False)
        db.commit()

        # La table User n'est pas touchée.

        logger.info("Suppression des données (sauf utilisateurs) terminée avec succès !")

    except Exception as e:
        logger.error(f"Erreur lors de la suppression des données: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Pas besoin de create_all ici, on suppose que les tables existent
    clear_data_except_users()
