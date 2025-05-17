from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud
from schemas.study_object import (
    StudyObjectCreate,
    StudyObjectRead,
    StudyObjectUpdate
)
from schemas.pagination import PaginatedResponse
from dependencies import get_current_user
from models import User

router = APIRouter(
    tags=["study_objects"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=StudyObjectRead)
def create(obj: StudyObjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_obj = crud.create_study_object(db, obj)
    return db_obj

@router.get("/", response_model=PaginatedResponse[StudyObjectRead])
def read_all(
    db: Session = Depends(get_db), 
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"), 
    limit: int = Query(10, ge=1, le=200, description="Nombre maximum d'éléments à retourner"),
    current_user: User = Depends(get_current_user)
    ):
    study_objects_data = crud.get_study_objects(db, skip=skip, limit=limit)
    pydantic_items = [StudyObjectRead.from_orm_with_resources(item) for item in study_objects_data["items"]]
    return PaginatedResponse(total=study_objects_data["total"], items=pydantic_items)

@router.get("/{obj_id}", response_model=StudyObjectRead)
def read_one(obj_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_obj = crud.get_study_object(db, obj_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="StudyObject not found")
    return StudyObjectRead.from_orm_with_resources(db_obj)

@router.patch("/{obj_id}", response_model=StudyObjectRead)
def update(obj_id: int, obj: StudyObjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_obj = crud.update_study_object(db, obj_id, obj)
    if not db_obj:
        raise HTTPException(status_code=404, detail="StudyObject not found")
    return db_obj

@router.delete("/{obj_id}", status_code=204)
def delete(obj_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    deleted = crud.delete_study_object(db, obj_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="StudyObject not found")

@router.post("/{obj_id}/progressions/{pid}", response_model=StudyObjectRead)
def attach_prog(obj_id: int, pid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return crud.attach_to_progression(db, obj_id, pid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{obj_id}/progressions/{pid}", response_model=StudyObjectRead)
def detach_prog(obj_id: int, pid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return crud.detach_from_progression(db, obj_id, pid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{obj_id}/resources/{rid}", response_model=StudyObjectRead)
def attach_res(obj_id: int, rid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return crud.attach_resource(db, obj_id, rid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{obj_id}/resources/{rid}", response_model=StudyObjectRead)
def detach_res(obj_id: int, rid: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return crud.detach_resource(db, obj_id, rid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/by_progression/{progression_id}", response_model=List[StudyObjectRead])
def get_by_progression(progression_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud.get_study_objects_by_progression(db, progression_id)
