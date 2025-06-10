from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload
from models import Progression, Sequence, User, StudyObject # Ajout de StudyObject
from schemas.progression import ProgressionCreate, ProgressionUpdate
from sqlalchemy import func
from typing import List, Optional

def get_progression(db: Session, progression_id: int, user_id: int):
    print(f"[TRACE] Appel get_progression: progression_id={progression_id}, user_id={user_id}")
    query = db.query(Progression).filter(Progression.id == progression_id)
    print(f"[TRACE] Query initialisée: {query}")
    query = query.options(selectinload(Progression.sequences))
    print("[TRACE] selectinload(Progression.sequences) appliqué")
    query = query.options(selectinload(Progression.study_objects))
    print("[TRACE] selectinload(Progression.study_objects) appliqué")
    if user_id:
        query = query.filter(Progression.user_id == user_id)
        print(f"[TRACE] Filtre user_id appliqué: {user_id}")
    result = query.first()
    print(f"[TRACE] Résultat ORM: {result}")
    if result:
        print(f"[TRACE] study_objects liés: {[obj.id for obj in getattr(result, 'study_objects', [])]}")
    return result

def get_progressions(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    query = db.query(Progression)
    if user_id:
        query = query.filter(Progression.user_id == user_id)
    query = query.options(selectinload(Progression.sequences))
    query = query.options(selectinload(Progression.study_objects))
    progressions = query.offset(skip).limit(limit).all()
    # Traces debug
    for prog in progressions:
        print(f"[TRACE] Progression id={prog.id}, study_objects={[obj.id for obj in getattr(prog, 'study_objects', [])]}")
    return progressions

def count_progressions(db: Session, user_id: int) -> int:
    """Compte le nombre total de progressions pour un utilisateur."""
    return db.query(Progression).filter(Progression.user_id == user_id).count()

def create_progression(db: Session, progression: ProgressionCreate, user_id: int):
    # Extraire les study_object_ids du modèle Pydantic
    # Utiliser model_dump() pour obtenir un dictionnaire, puis pop pour extraire la clé
    progression_data = progression.model_dump()
    study_object_ids = progression_data.pop('study_object_ids', []) # Sera une liste vide si non fourni

    # Créer l'instance Progression avec les données de base
    # progression_data contient maintenant title, description, order (si présent dans ProgressionBase et ProgressionCreate)
    db_progression = Progression(
        user_id=user_id,
        **progression_data # S'assure que tous les champs de ProgressionCreate sont passés
    )

    # Associer les objets d'étude s'ils sont fournis
    if study_object_ids:
        # StudyObject est déjà importé en haut du fichier
        study_objects = db.query(StudyObject).filter(StudyObject.id.in_(study_object_ids)).all()
        if study_objects: # S'assurer qu'on a trouvé des objets avant d'assigner
            db_progression.study_objects = study_objects # Assigner à la relation
        else:
            # Optionnel: log si des IDs sont fournis mais aucun objet n'est trouvé
            # Vous pouvez utiliser le logger configuré si vous en avez un, ou un simple print
            print(f"Avertissement: Aucun StudyObject trouvé pour les IDs: {study_object_ids} lors de la création de la progression.")

    db.add(db_progression)
    db.commit()
    db.refresh(db_progression) # Rafraîchit les attributs simples de db_progression

    # S'assurer que la relation study_objects est également chargée dans la session pour l'objet db_progression
    # Cela est utile si l'objet db_progression est utilisé immédiatement après et que l'on s'attend à ce que study_objects soit peuplé.
    # Rafraîchir seulement si des IDs ont été fournis et que la relation a potentiellement été peuplée.
    if study_object_ids and hasattr(db_progression, 'study_objects'):
        # La condition `if study_objects:` dans le bloc précédent assure que `db_progression.study_objects`
        # n'est assigné que si des objets valides ont été trouvés.
        # Si `db_progression.study_objects` a été peuplé (c'est-à-dire, n'est pas None et potentiellement non vide),
        # il est bon de le rafraîchir pour charger les données depuis la BDD dans la session actuelle.
        db.refresh(db_progression, attribute_names=['study_objects'])

    return db_progression

def update_progression(db: Session, progression_id: int, progression_update: ProgressionUpdate, user_id: int):
    db_progression = get_progression(db, progression_id=progression_id, user_id=user_id)
    if db_progression is None:
        return None
    update_data = progression_update.model_dump(exclude_unset=True)
    study_object_ids = update_data.pop('study_object_ids', None)
    if study_object_ids is not None:
        from models.study_object import StudyObject
        db_progression.study_objects = db.query(StudyObject).filter(StudyObject.id.in_(study_object_ids)).all()
    for key, value in update_data.items():
        setattr(db_progression, key, value)
    db.add(db_progression)
    db.commit()
    db.refresh(db_progression)
    return db_progression

def delete_progression(db: Session, progression_id: int, user_id: int):
    db_progression = get_progression(db, progression_id=progression_id, user_id=user_id)
    if db_progression is None:
        return None
    db.delete(db_progression)
    db.commit()
    return True

def get_progressions_with_no_sequences(db: Session, user_id: int) -> List[Progression]:
    """Récupère les progressions d'un utilisateur qui n'ont aucune séquence associée."""
    return (
        db.query(Progression)
        .outerjoin(Sequence, Progression.id == Sequence.progression_id)
        .filter(Progression.user_id == user_id)
        .group_by(Progression.id)
        .having(func.count(Sequence.id) == 0)
        .all()
    )
