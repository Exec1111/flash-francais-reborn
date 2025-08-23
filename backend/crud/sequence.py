from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload, joinedload # Import for eager loading
from models import Sequence, Session as SessionModel, Objective, StudyObject, Resource, ResourceType # Import des modèles
from models.user import User
from schemas.sequence import SequenceCreate, SequenceUpdate # Import schemas
from crud.objective import get_objective # Import pour récupérer les objectifs
from sqlalchemy import func
from typing import List, Dict, Any, Optional

def get_sequence(db: Session, sequence_id: int):
    """Récupère une séquence par son ID, en chargeant les objectifs, les study_objects et le bilan associés."""
    return db.query(Sequence).options(
        selectinload(Sequence.objectives),
        selectinload(Sequence.sessions),
        selectinload(Sequence.study_objects),
        joinedload(Sequence.bilan_resource)  # Eager load for the bilan
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


async def get_sequence_with_objects(db: Session, sequence_id: int) -> Dict[str, Any]:
    """
    Récupère une séquence avec tous ses objets associés (objectifs, ressources, etc.)
    pour générer un bilan de fin de séquence complet.

    Args:
        db (Session): La session de base de données
        sequence_id (int): ID de la séquence

    Returns:
        Dict[str, Any]: Un dictionnaire contenant toutes les données de la séquence et ses objets associés
    """
    # Récupérer la séquence avec ses objectifs, objets d'étude et leurs œuvres (avec ressources), et son bilan
    from models import StudyObject, Oeuvre
    sequence = db.query(Sequence).options(
        selectinload(Sequence.objectives),
        selectinload(Sequence.study_objects).selectinload(StudyObject.oeuvres).selectinload(Oeuvre.resources),  # Eager load des œuvres et leurs ressources
        joinedload(Sequence.bilan_resource)  # Eager load for the bilan
    ).filter(Sequence.id == sequence_id).first()

    
    if not sequence:
        return None
    
    # Récupérer les ressources associées aux objets d'étude de la séquence
    study_object_ids = [obj.id for obj in sequence.study_objects]
    
    # Récupérer les ressources avec leur type
    resources = db.query(Resource).join(
        Resource.study_objects
    ).filter(
        StudyObject.id.in_(study_object_ids)
    ).options(
        joinedload(Resource.type),
        joinedload(Resource.sub_type)
    ).all()
    
    # Construire l'objet de réponse
    result = {
        "id": sequence.id,
        "title": sequence.title,
        "progression_id": sequence.progression_id,
        "description": sequence.description,
        "level": getattr(sequence, "level", "B1"),  # Valeur par défaut si le niveau n'est pas défini
        "objectives": sequence.objectives,
        "study_objects": sequence.study_objects,
        "resources": resources,
        "bilan_resource_id": sequence.bilan_resource_id,
        "bilan_resource": sequence.bilan_resource
    }
    
    return result


def is_owner_or_admin(db: Session, user: User, sequence: Sequence) -> bool:
    """
    Vérifie si l'utilisateur est propriétaire de la séquence ou s'il est administrateur.
    
    Args:
        db (Session): La session de base de données
        user (User): L'utilisateur à vérifier
        sequence (Sequence): La séquence concernée
        
    Returns:
        bool: True si l'utilisateur est propriétaire ou admin, False sinon
    """
    if user.role == "admin":
        return True
    
    return sequence.user_id == user.id


# ---------------------- Bilan de séquence ----------------------

def set_bilan_resource(db: Session, sequence_id: int, resource_id: int):
    """Attache un bilan à la séquence en remplaçant l'ancien si présent.
    
    Args:
        db (Session): session DB
        sequence_id (int): ID séquence
        resource_id (int): ID ressource bilan
    Returns:
        Sequence: instance mise à jour
    """
    sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    if sequence is None:
        raise ValueError("Sequence not found")

    # Supprimer l'ancienne ressource si différente
    if sequence.bilan_resource_id and sequence.bilan_resource_id != resource_id:
        old_res = db.query(Resource).filter(Resource.id == sequence.bilan_resource_id).first()
        if old_res:
            db.delete(old_res)

    sequence.bilan_resource_id = resource_id
    db.add(sequence)
    db.commit()
    db.refresh(sequence)
    return sequence

def remove_bilan_resource(db: Session, sequence_id: int):
    sequence = db.query(Sequence).filter(Sequence.id == sequence_id).first()
    if not sequence:
        raise ValueError("Sequence not found")
    if sequence.bilan_resource_id:
        old_res = db.query(Resource).filter(Resource.id == sequence.bilan_resource_id).first()
        if old_res:
            db.delete(old_res)
    sequence.bilan_resource_id = None
    db.commit()
    db.refresh(sequence)
    return sequence
