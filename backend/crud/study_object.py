from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from models import StudyObject, Progression, Resource
from schemas.study_object import StudyObjectCreate, StudyObjectUpdate


def get_study_object(db: Session, study_object_id: int) -> Optional[StudyObject]:
    return db.query(StudyObject).options(
        selectinload(StudyObject.progressions),
        selectinload(StudyObject.resources)
    ).filter(StudyObject.id == study_object_id).first()


def get_study_objects(db: Session, skip: int = 0, limit: int = 100):
    query = db.query(StudyObject).options(
        selectinload(StudyObject.progressions), 
        selectinload(StudyObject.resources)
    )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"total": total, "items": items}


def get_study_objects_by_progression(db: Session, progression_id: int) -> List[StudyObject]:
    return db.query(StudyObject).join(StudyObject.progressions).filter(Progression.id == progression_id).all()


def get_study_objects_by_resource(db: Session, resource_id: int) -> List[StudyObject]:
    """Récupère tous les objets d'étude associés à une ressource donnée."""
    return db.query(StudyObject).join(StudyObject.resources).filter(Resource.id == resource_id).all()


def create_study_object(db: Session, obj_in: StudyObjectCreate) -> StudyObject:
    db_obj = StudyObject(title=obj_in.title, description=obj_in.description)
    if obj_in.progression_ids:
        db_progressions = db.query(Progression).filter(Progression.id.in_(obj_in.progression_ids)).all()
        db_obj.progressions = db_progressions
    if obj_in.resource_ids:
        db_resources = db.query(Resource).filter(Resource.id.in_(obj_in.resource_ids)).all()
        db_obj.resources = db_resources
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_study_object(db: Session, study_object_id: int, obj_update: StudyObjectUpdate) -> Optional[StudyObject]:
    db_obj = get_study_object(db, study_object_id)
    if not db_obj:
        return None
    update_data = obj_update.model_dump(exclude_unset=True)
    if "title" in update_data:
        db_obj.title = update_data["title"]
    if "description" in update_data:
        db_obj.description = update_data["description"]
    if "resource_ids" in update_data and update_data["resource_ids"] is not None:
        db_resources = db.query(Resource).filter(Resource.id.in_(update_data["resource_ids"])).all()
        db_obj.resources = db_resources
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_study_object(db: Session, study_object_id: int) -> bool:
    db_obj = get_study_object(db, study_object_id)
    if not db_obj:
        return False
    db.delete(db_obj)
    db.commit()
    return True


def attach_to_progression(db: Session, study_object_id: int, progression_id: int) -> StudyObject:
    db_obj = get_study_object(db, study_object_id)
    db_prog = db.query(Progression).filter(Progression.id == progression_id).first()
    if not db_obj or not db_prog:
        raise ValueError("StudyObject or Progression not found")
    if db_prog not in db_obj.progressions:
        db_obj.progressions.append(db_prog)
        db.commit()
    return db_obj


def detach_from_progression(db: Session, study_object_id: int, progression_id: int) -> StudyObject:
    db_obj = get_study_object(db, study_object_id)
    if not db_obj:
        raise ValueError("StudyObject not found")
    db_obj.progressions = [p for p in db_obj.progressions if p.id != progression_id]
    db.commit()
    return db_obj


def attach_resource(db: Session, study_object_id: int, resource_id: int) -> StudyObject:
    db_obj = get_study_object(db, study_object_id)
    db_res = db.query(Resource).filter(Resource.id == resource_id).first()
    if not db_obj or not db_res:
        raise ValueError("StudyObject or Resource not found")
    if db_res not in db_obj.resources:
        db_obj.resources.append(db_res)
        db.commit()
    return db_obj


def detach_resource(db: Session, study_object_id: int, resource_id: int) -> StudyObject:
    db_obj = get_study_object(db, study_object_id)
    if not db_obj:
        raise ValueError("StudyObject not found")
    db_obj.resources = [r for r in db_obj.resources if r.id != resource_id]
    db.commit()
    return db_obj
