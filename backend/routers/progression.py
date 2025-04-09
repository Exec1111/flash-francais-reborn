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
    # Passer l'ID de l'utilisateur à la fonction CRUD
    return crud.create_progression(db=db, progression=progression, user_id=current_user.id)

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
    db_progression = crud.get_progression(db, progression_id=progression_id, user_id=current_user.id)
    if db_progression is None:
        raise HTTPException(status_code=404, detail="Progression not found or not accessible")
    db_progression = crud.update_progression(db=db, progression_id=progression_id, progression_update=progression, user_id=current_user.id)
    return db_progression

@progression_router.delete("/{progression_id}", status_code=204) # No content on successful deletion
def delete_progression_route(progression_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Supprime une progression spécifique appartenant à l'utilisateur courant."""
    deleted = crud.delete_progression(db=db, progression_id=progression_id, user_id=current_user.id)
    if deleted is None: # crud.delete_progression returns None if not found/not owned
        raise HTTPException(status_code=404, detail="Progression not found or not accessible")
    # Si deleted est True, FastAPI renverra automatiquement 204 No Content car il n'y a pas de corps de réponse
    # Pas besoin de return explicite ici dans ce cas.
    # Si on veut être hyper explicite, on peut faire `return Response(status_code=204)` mais ce n'est pas nécessaire.
    # Simplement ne rien retourner fonctionne pour les status_code 204.
