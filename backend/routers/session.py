from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud
from schemas.session import SessionCreate, SessionRead, SessionUpdate

session_router = APIRouter(
    # prefix="/sessions", # Supprimé car géré dans app.py
    tags=["sessions"],
    responses={404: {"description": "Not found"}},
)

@session_router.post("/", response_model=SessionRead)
def create_session_route(session: SessionCreate, db: Session = Depends(get_db)):
    # Vérifier si la séquence parente existe
    db_sequence = crud.get_sequence(db, sequence_id=session.sequence_id)
    if db_sequence is None:
        raise HTTPException(status_code=404, detail=f"Sequence with id {session.sequence_id} not found")
    return crud.create_session(db=db, session=session)

@session_router.get("/", response_model=List[SessionRead])
def read_sessions_route(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    sessions = crud.get_sessions(db, skip=skip, limit=limit)
    return sessions

@session_router.get("/by_sequence/{sequence_id}", response_model=List[SessionRead])
def read_sessions_by_sequence_route(sequence_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Vérifier si la séquence parente existe
    db_sequence = crud.get_sequence(db, sequence_id=sequence_id)
    if db_sequence is None:
        raise HTTPException(status_code=404, detail=f"Sequence with id {sequence_id} not found")
    sessions = crud.get_sessions_by_sequence(db, sequence_id=sequence_id, skip=skip, limit=limit)
    return sessions

@session_router.get("/{session_id}", response_model=SessionRead)
def read_session_route(session_id: int, db: Session = Depends(get_db)):
    db_session = crud.get_session(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return db_session

@session_router.put("/{session_id}", response_model=SessionRead)
def update_session_route(session_id: int, session: SessionUpdate, db: Session = Depends(get_db)):
    # Vérifier si la nouvelle séquence_id existe si elle est fournie
    if session.sequence_id is not None:
        db_sequence = crud.get_sequence(db, sequence_id=session.sequence_id)
        if db_sequence is None:
            raise HTTPException(status_code=404, detail=f"Sequence with id {session.sequence_id} not found")
            
    db_session = crud.update_session(db=db, session_id=session_id, session_update=session)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return db_session

@session_router.delete("/{session_id}", status_code=204)
def delete_session_route(session_id: int, db: Session = Depends(get_db)):
    success = crud.delete_session(db, session_id=session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return # Retourne None pour 204
