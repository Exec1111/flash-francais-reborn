from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud
from schemas.sequence import SequenceCreate, SequenceRead, SequenceUpdate

sequence_router = APIRouter(
    # prefix="/sequences", # Supprimé car géré dans app.py
    tags=["sequences"],
    responses={404: {"description": "Not found"}},
)

@sequence_router.post("/", response_model=SequenceRead, name="create_sequence")
def create_sequence_endpoint(sequence: SequenceCreate, db: Session = Depends(get_db)):
    # Vérifier si la progression parente existe (optionnel mais bonne pratique)
    db_progression = crud.get_progression(db, progression_id=sequence.progression_id)
    if db_progression is None:
        raise HTTPException(status_code=404, detail=f"Progression with id {sequence.progression_id} not found")
    return crud.create_sequence(db=db, sequence=sequence)

@sequence_router.get("/", response_model=List[SequenceRead])
def read_sequences_route(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    sequences = crud.get_sequences(db, skip=skip, limit=limit)
    return sequences

@sequence_router.get("/by_progression/{progression_id}", response_model=List[SequenceRead])
def read_sequences_by_progression_route(progression_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Vérifier si la progression parente existe
    db_progression = crud.get_progression(db, progression_id=progression_id)
    if db_progression is None:
        raise HTTPException(status_code=404, detail=f"Progression with id {progression_id} not found")
    sequences = crud.get_sequences_by_progression(db, progression_id=progression_id, skip=skip, limit=limit)
    return sequences

@sequence_router.get("/{sequence_id}", response_model=SequenceRead)
def read_sequence_route(sequence_id: int, db: Session = Depends(get_db)):
    db_sequence = crud.get_sequence(db, sequence_id=sequence_id)
    if db_sequence is None:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return db_sequence

@sequence_router.put("/{sequence_id}", response_model=SequenceRead)
def update_sequence_route(sequence_id: int, sequence: SequenceUpdate, db: Session = Depends(get_db)):
    # Vérifier si la nouvelle progression_id existe si elle est fournie
    if sequence.progression_id is not None:
        db_progression = crud.get_progression(db, progression_id=sequence.progression_id)
        if db_progression is None:
            raise HTTPException(status_code=404, detail=f"Progression with id {sequence.progression_id} not found")
            
    db_sequence = crud.update_sequence(db=db, sequence_id=sequence_id, sequence_update=sequence)
    if db_sequence is None:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return db_sequence

@sequence_router.delete("/{sequence_id}", status_code=204)
def delete_sequence_route(sequence_id: int, db: Session = Depends(get_db)):
    success = crud.delete_sequence(db, sequence_id=sequence_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return # Retourne None pour 204
