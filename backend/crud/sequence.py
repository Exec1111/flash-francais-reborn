from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload # Import for eager loading
from models import Sequence, Session as SessionModel, Objective, StudyObject # Import Sequence, Session, Objective et StudyObject
from schemas.sequence import SequenceCreate, SequenceUpdate # Import schemas
from crud.objective import get_objective # Import pour récupérer les objectifs
from sqlalchemy import func
from typing import List

def get_sequence(db: Session, sequence_id: int):
    """Récupère une séquence par son ID, en chargeant les objectifs ET les study_objects associés."""
    return db.query(Sequence).options(
        selectinload(Sequence.objectives),
        selectinload(Sequence.sessions),
        selectinload(Sequence.study_objects)
    ).filter(Sequence.id == sequence_id).first()

def get_sequences(db: Session, user_id: int = None, skip: int = 0, limit: int = 100):
    """Récupère une liste de séquences.
    
    Args:
        db (Session): La session de base de données
        user_id (int, optional): ID de l'utilisateur pour filtrer les séquences
        skip (int, optional): Nombre d'éléments à sauter. Defaults to 0.
        limit (int, optional): Nombre maximum d'éléments à retourner. Defaults to 100.
    """
    query = db.query(Sequence)
    if user_id is not None:
        query = query.filter(Sequence.user_id == user_id)
    # Ajouter selectinload pour charger les objectifs
    return query.options(
        selectinload(Sequence.objectives),
        selectinload(Sequence.sessions) # Charger aussi les sessions ici pour la liste
    ).order_by(Sequence.order).offset(skip).limit(limit).all()

def count_sequences(db: Session, user_id: int) -> int:
    """Compte le nombre total de séquences pour un utilisateur."""
    return db.query(Sequence).filter(Sequence.user_id == user_id).count()

def get_sequences_by_progression(db: Session, progression_id: int, user_id: int = None, skip: int = 0, limit: int = 100):
    """Récupère les séquences appartenant à une progression spécifique.
    
    Args:
        db (Session): La session de base de données
        progression_id (int): ID de la progression
        user_id (int, optional): ID de l'utilisateur pour filtrer les séquences
        skip (int, optional): Nombre d'éléments à sauter. Defaults to 0.
        limit (int, optional): Nombre maximum d'éléments à retourner. Defaults to 100.
    """
    query = db.query(Sequence).filter(Sequence.progression_id == progression_id)
    if user_id is not None:
        query = query.filter(Sequence.user_id == user_id)
    return query.options(selectinload(Sequence.objectives)).order_by(Sequence.order).offset(skip).limit(limit).all()

def create_sequence(db: Session, sequence: SequenceCreate, user_id: int):
    """Crée une nouvelle séquence liée à un utilisateur et potentiellement à des objectifs et objets d'étude."""
    sequence_data = sequence.model_dump()
    objective_ids = sequence_data.pop('objective_ids', []) # Extraire les IDs d'objectifs
    study_object_ids = sequence_data.pop('study_object_ids', []) # Extraire les IDs d'objets d'étude

    # Créer l'objet Sequence de base
    db_sequence = Sequence(**sequence_data, user_id=user_id)

    # Lier les objectifs s'ils sont fournis
    if objective_ids:
        objectives = []
        for obj_id in objective_ids:
            db_objective = get_objective(db, objective_id=obj_id)
            if db_objective:
                objectives.append(db_objective)
            else:
                print(f"Warning: Objective with id {obj_id} not found, skipping.")
        db_sequence.objectives = objectives

    # Lier les objets d'étude s'ils sont fournis
    if study_object_ids:
        study_objects = db.query(StudyObject).filter(StudyObject.id.in_(study_object_ids)).all()
        db_sequence.study_objects = study_objects

    db.add(db_sequence)
    db.commit()
    db.refresh(db_sequence)
    # Recharger avec les objectifs et objets d'étude pour s'assurer qu'ils sont présents dans l'objet retourné
    db.refresh(db_sequence, attribute_names=['objectives', 'study_objects'])
    return db_sequence

def update_sequence(db: Session, sequence_id: int, sequence_update: SequenceUpdate):
    """Met à jour une séquence existante, y compris ses objectifs et objets d'étude associés."""
    db_sequence = get_sequence(db, sequence_id=sequence_id)
    if db_sequence is None:
        return None

    update_data = sequence_update.model_dump(exclude_unset=True)
    new_objective_ids = update_data.pop('objective_ids', None) # Récupérer et retirer objective_ids
    new_study_object_ids = update_data.pop('study_object_ids', None) # Récupérer et retirer study_object_ids

    # Gérer la mise à jour de la relation many-to-many avec les objectifs
    if new_objective_ids is not None: # Si une liste (même vide) est fournie
        new_objectives = []
        for obj_id in new_objective_ids:
            db_objective = get_objective(db, objective_id=obj_id)
            if db_objective:
                new_objectives.append(db_objective)
            else:
                print(f"Warning: Objective with id {obj_id} not found, skipping.")
        db_sequence.objectives = new_objectives

    # Gérer la mise à jour de la relation many-to-many avec les objets d'étude
    if new_study_object_ids is not None: # Si une liste (même vide) est fournie
        new_study_objects = db.query(StudyObject).filter(StudyObject.id.in_(new_study_object_ids)).all() if new_study_object_ids else []
        db_sequence.study_objects = new_study_objects

    # Mise à jour des autres champs fournis dans sequence_update
    for key, value in update_data.items(): # update_data ne contient plus objective_ids ni study_object_ids
        setattr(db_sequence, key, value)

    db.add(db_sequence) # Utiliser add() pour les objets suivis
    db.commit()
    db.refresh(db_sequence)
    # Recharger avec les objectifs et objets d'étude pour s'assurer qu'ils sont présents dans l'objet retourné
    db.refresh(db_sequence, attribute_names=['objectives', 'study_objects'])
    return db_sequence

def delete_sequence(db: Session, sequence_id: int):
    """Supprime une séquence par son ID."""
    db_sequence = get_sequence(db, sequence_id=sequence_id)
    if db_sequence is None:
        return None # Ou False si vous préférez un booléen
    db.delete(db_sequence)
    db.commit()
    return True # Confirme la suppression

def get_sequences_with_no_sessions(db: Session, user_id: int) -> List[Sequence]:
    """Récupère les séquences d'un utilisateur qui n'ont aucune session associée."""
    return (
        db.query(Sequence)
        .outerjoin(SessionModel, Sequence.id == SessionModel.sequence_id)
        .filter(Sequence.user_id == user_id)
        .group_by(Sequence.id)
        .having(func.count(SessionModel.id) == 0)
        .all()
    )

def add_study_object_to_sequence(db: Session, sequence_id: int, study_object_id: int):
    """Attache un objet d'étude à une séquence, en vérifiant qu'il appartient à la progression parente."""
    db_sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    if not db_sequence:
        raise ValueError("Sequence not found")
    db_study_object = db.query(StudyObject).filter(StudyObject.id == study_object_id).first()
    if not db_study_object:
        raise ValueError("StudyObject not found")
    # Vérification de la contrainte : l'objet doit appartenir à la progression parente
    if db_study_object not in db_sequence.progression.study_objects:
        raise ValueError("Cet objet d'étude n'appartient pas à la progression parente de la séquence.")
    if db_study_object not in db_sequence.study_objects:
        db_sequence.study_objects.append(db_study_object)
        db.commit()
    return db_sequence

def remove_study_object_from_sequence(db: Session, sequence_id: int, study_object_id: int):
    """Détache un objet d'étude d'une séquence."""
    db_sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    db_study_object = db.query(StudyObject).filter(StudyObject.id == study_object_id).first()
    if not db_sequence or not db_study_object:
        raise ValueError("Sequence or StudyObject not found")
    if db_study_object in db_sequence.study_objects:
        db_sequence.study_objects.remove(db_study_object)
        db.commit()
    return db_sequence
