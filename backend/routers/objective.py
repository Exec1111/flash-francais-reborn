from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from crud import objective as crud_objective
from schemas import objective as schemas_objective
# Importer les schémas "simples" si/quand ils seront créés
from schemas.sequence import SequenceReadSimple
from schemas.session import SessionReadSimple

objective_router = APIRouter()

# --- CRUD Routes for Objective --- #

@objective_router.post("/", response_model=schemas_objective.ObjectiveRead, status_code=status.HTTP_201_CREATED)
def create_objective(objective: schemas_objective.ObjectiveCreate, db: Session = Depends(get_db)):
    """Crée un nouvel objectif."""
    try:
        return crud_objective.create_objective(db=db, objective=objective)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@objective_router.get("/", response_model=List[schemas_objective.ObjectiveRead])
def read_objectives(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Récupère une liste d'objectifs."""
    objectives = crud_objective.get_objectives(db, skip=skip, limit=limit)
    return objectives

@objective_router.get("/{objective_id}", response_model=schemas_objective.ObjectiveRead)
def read_objective(objective_id: int, db: Session = Depends(get_db)):
    """Récupère un objectif par son ID."""
    db_objective = crud_objective.get_objective(db, objective_id=objective_id)
    if db_objective is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found")
    return db_objective

@objective_router.put("/{objective_id}", response_model=schemas_objective.ObjectiveRead)
def update_objective(objective_id: int, objective: schemas_objective.ObjectiveUpdate, db: Session = Depends(get_db)):
    """Met à jour un objectif."""
    try:
        db_objective = crud_objective.update_objective(db, objective_id=objective_id, objective_update=objective)
        if db_objective is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found")
        return db_objective
    except ValueError as e:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@objective_router.delete("/{objective_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_objective(objective_id: int, db: Session = Depends(get_db)):
    """Supprime un objectif."""
    deleted = crud_objective.delete_objective(db, objective_id=objective_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found")
    return None # Ou Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Association Routes --- #

# -- Sequence <-> Objective -- #

@objective_router.post("/sequences/{sequence_id}/objectives/{objective_id}", status_code=status.HTTP_204_NO_CONTENT)
def link_objective_to_sequence(sequence_id: int, objective_id: int, db: Session = Depends(get_db)):
    """Associe un objectif existant à une séquence existante."""
    try:
        crud_objective.add_objective_to_sequence(db, sequence_id=sequence_id, objective_id=objective_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@objective_router.delete("/sequences/{sequence_id}/objectives/{objective_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_objective_from_sequence(sequence_id: int, objective_id: int, db: Session = Depends(get_db)):
    """Désassocie un objectif d'une séquence."""
    try:
        crud_objective.remove_objective_from_sequence(db, sequence_id=sequence_id, objective_id=objective_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@objective_router.get("/by_sequence/{sequence_id}", response_model=List[schemas_objective.ObjectiveRead])
def get_objectives_for_sequence(sequence_id: int, db: Session = Depends(get_db)):
    """Récupère tous les objectifs associés à une séquence spécifique."""
    try:
        return crud_objective.get_objectives_by_sequence(db, sequence_id=sequence_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@objective_router.get("/{objective_id}/sequences", response_model=List[SequenceReadSimple])
def get_sequences_for_objective(objective_id: int, db: Session = Depends(get_db)):
    """Récupère la liste simplifiée des séquences associées à un objectif spécifique."""
    try:
        sequences = crud_objective.get_sequences_by_objective(db, objective_id=objective_id)
        # Pydantic convertira automatiquement les objets Sequence en SequenceReadSimple
        return sequences
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

# -- Session <-> Objective -- #

@objective_router.post("/sessions/{session_id}/objectives/{objective_id}", status_code=status.HTTP_204_NO_CONTENT)
def link_objective_to_session(session_id: int, objective_id: int, db: Session = Depends(get_db)):
    """Associe un objectif existant à une séance existante."""
    try:
        crud_objective.add_objective_to_session(db, session_id=session_id, objective_id=objective_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@objective_router.delete("/sessions/{session_id}/objectives/{objective_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_objective_from_session(session_id: int, objective_id: int, db: Session = Depends(get_db)):
    """Désassocie un objectif d'une séance."""
    try:
        crud_objective.remove_objective_from_session(db, session_id=session_id, objective_id=objective_id)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@objective_router.get("/by_session/{session_id}", response_model=List[schemas_objective.ObjectiveRead])
def get_objectives_for_session(session_id: int, db: Session = Depends(get_db)):
    """Récupère tous les objectifs associés à une séance spécifique."""
    try:
        return crud_objective.get_objectives_by_session(db, session_id=session_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@objective_router.get("/{objective_id}/sessions", response_model=List[SessionReadSimple])
def get_sessions_for_objective(objective_id: int, db: Session = Depends(get_db)):
    """Récupère la liste simplifiée des séances associées à un objectif spécifique."""
    try:
        sessions = crud_objective.get_sessions_by_objective(db, objective_id=objective_id)
        # Pydantic convertira automatiquement les objets Session en SessionReadSimple
        return sessions
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
