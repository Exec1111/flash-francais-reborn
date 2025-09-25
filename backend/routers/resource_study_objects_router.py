from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from dependencies import get_current_active_user
from models import User as UserModel
from schemas.study_object import StudyObjectReadShort
import logging
from crud.study_object import get_study_objects_by_resource

logger = logging.getLogger(__name__)

resource_study_objects_router = APIRouter()

@resource_study_objects_router.get("/{resource_id}/study_objects", response_model=List[StudyObjectReadShort])
def get_study_objects_for_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Retourne la liste des objets d'étude associés à une ressource donnée."""
    study_objects = get_study_objects_by_resource(db, resource_id)
    return [StudyObjectReadShort.from_orm(obj) for obj in study_objects]