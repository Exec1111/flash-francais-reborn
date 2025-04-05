from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import crud
from schemas.progression import ProgressionCreate, ProgressionRead, ProgressionUpdate
from dependencies import get_current_user
from models import User

progression_router = APIRouter(
    # prefix="/progressions", # Supprimé car géré dans app.py
    tags=["progressions"],
    responses={404: {"description": "Not found"}},
)

@progression_router.post("/", response_model=ProgressionRead, name="create_progression")
def create_progression_endpoint(progression: ProgressionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crud.create_progression(db=db, progression=progression)

@progression_router.get("/", response_model=List[ProgressionRead])
def read_progressions_route(
    skip: int = 0, 
    limit: int = 100, 
    user_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_id:
        progressions = crud.get_progressions(db, skip=skip, limit=limit, user_id=user_id)
    else:
        progressions = crud.get_progressions(db, skip=skip, limit=limit, user_id=current_user.id)
    return progressions

@progression_router.get("/{progression_id}", response_model=ProgressionRead)
def read_progression_route(progression_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_progression = crud.get_progression(db, progression_id=progression_id, user_id=current_user.id)
    if db_progression is None:
        raise HTTPException(status_code=404, detail="Progression not found")
    return db_progression

@progression_router.put("/{progression_id}", response_model=ProgressionRead)
def update_progression_route(progression_id: int, progression: ProgressionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_progression = crud.update_progression(db=db, progression_id=progression_id, progression_update=progression)
    if db_progression is None:
        raise HTTPException(status_code=404, detail="Progression not found")
    return db_progression

@progression_router.delete("/{progression_id}", status_code=204) # No content on successful deletion
def delete_progression_route(progression_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = crud.delete_progression(db, progression_id=progression_id)
    if not success:
        raise HTTPException(status_code=404, detail="Progression not found")
    return # Return None for 204 status code
