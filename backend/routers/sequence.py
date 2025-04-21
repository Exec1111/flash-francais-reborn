from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud
from schemas.sequence import SequenceCreate, SequenceRead, SequenceUpdate
from models.user import User
from models.sequence import Sequence  # Import direct du modèle Sequence
from security import get_current_active_user, get_current_user

sequence_router = APIRouter(
    # prefix="/sequences", # Supprimé car géré dans app.py
    tags=["sequences"],
    responses={404: {"description": "Not found"}},
)

from fastapi import Body

@sequence_router.patch("/reorder", status_code=204)
def reorder_sequences(
    sequence_ids: List[int] = Body(..., embed=True, description="Liste ordonnée des IDs de séquences"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Réordonne les séquences d'une progression selon la liste d'IDs reçue.
    """
    # On récupère toutes les séquences concernées, on vérifie l'appartenance à l'utilisateur
    sequences = db.query(Sequence).filter(Sequence.id.in_(sequence_ids)).all()
    if len(sequences) != len(sequence_ids):
        raise HTTPException(status_code=404, detail="Certaines séquences n'existent pas.")
    # Vérification de l'utilisateur
    for seq in sequences:
        if seq.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Séquence non autorisée.")
    # Mise à jour des ordres
    id_to_seq = {seq.id: seq for seq in sequences}
    for idx, seq_id in enumerate(sequence_ids):
        seq = id_to_seq[seq_id]
        seq.order = idx
        db.add(seq)
    db.commit()
    return

@sequence_router.post("/", response_model=SequenceRead, name="create_sequence")
def create_sequence_endpoint(
    sequence: SequenceCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Vérifier si la progression parente existe (optionnel mais bonne pratique)
    db_progression = crud.get_progression(db, progression_id=sequence.progression_id, user_id=current_user.id)
    if db_progression is None:
        raise HTTPException(status_code=404, detail=f"Progression with id {sequence.progression_id} not found")
    
    # Nous devons conserver l'objet Pydantic intact
    # Associer l'utilisateur et gérer les objective_ids dans la fonction CRUD
    db_sequence = crud.create_sequence(db=db, sequence=sequence, user_id=current_user.id)
    
    # La fonction CRUD gère maintenant le commit et le refresh
    # db_sequence.user_id = current_user.id
    # db.commit()
    # db.refresh(db_sequence)
    
    return db_sequence

@sequence_router.get("/", response_model=List[SequenceRead])
def read_sequences_route(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère la liste des séquences de l'utilisateur connecté."""
    sequences = crud.get_sequences(db, user_id=current_user.id, skip=skip, limit=limit)
    return sequences

@sequence_router.get("/by_progression/{progression_id}", response_model=List[SequenceRead])
def read_sequences_by_progression_route(
    progression_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier si la progression parente existe
    db_progression = crud.get_progression(db, progression_id=progression_id, user_id=current_user.id)
    if db_progression is None:
        raise HTTPException(status_code=404, detail=f"Progression with id {progression_id} not found")
    
    # Vérifier si l'utilisateur a accès à cette progression
    if db_progression.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Vous n'avez pas l'autorisation d'accéder aux séquences de cette progression"
        )
    
    sequences = crud.get_sequences_by_progression(
        db,
        progression_id=progression_id,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    return sequences

@sequence_router.get("/{sequence_id}", response_model=SequenceRead)
def read_sequence_route(
    sequence_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_sequence = crud.get_sequence(db, sequence_id=sequence_id)
    if db_sequence is None:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return SequenceRead.from_orm_with_study_objects(db_sequence)

@sequence_router.post("/{sequence_id}/study-objects/{study_object_id}", response_model=SequenceRead)
def add_study_object(
    sequence_id: int, 
    study_object_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        db_sequence = crud.add_study_object_to_sequence(db, sequence_id, study_object_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SequenceRead.from_orm_with_study_objects(db_sequence)

@sequence_router.delete("/{sequence_id}/study-objects/{study_object_id}", response_model=SequenceRead)
def remove_study_object(
    sequence_id: int, 
    study_object_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        db_sequence = crud.remove_study_object_from_sequence(db, sequence_id, study_object_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SequenceRead.from_orm_with_study_objects(db_sequence)

@sequence_router.put("/{sequence_id}", response_model=SequenceRead)
def update_sequence_route(
    sequence_id: int, 
    sequence: SequenceUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 1. Vérifier si la séquence existe et appartient à l'utilisateur
    db_sequence_existing = crud.get_sequence(db, sequence_id=sequence_id)
    if db_sequence_existing is None:
        raise HTTPException(status_code=404, detail="Sequence not found")
    if db_sequence_existing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this sequence")

    # 2. Vérifier si la nouvelle progression_id existe si elle est fournie
    if sequence.progression_id is not None:
        db_progression = crud.get_progression(db, progression_id=sequence.progression_id, user_id=current_user.id)
        if db_progression is None:
            raise HTTPException(status_code=404, detail=f"Progression with id {sequence.progression_id} not found or does not belong to user")
            
    # 3. Appeler la fonction CRUD mise à jour
    db_sequence_updated = crud.update_sequence(
        db=db, 
        sequence_id=sequence_id, 
        sequence_update=sequence
        # user_id=current_user.id # Retiré car non attendu par crud.update_sequence et vérif faite avant
    )
    # La fonction CRUD retourne None si non trouvée, mais on l'a déjà vérifié plus haut
    # if db_sequence_updated is None:
    #     raise HTTPException(status_code=404, detail="Sequence not found")
    return db_sequence_updated

@sequence_router.delete("/{sequence_id}", status_code=204)
def delete_sequence_route(
    sequence_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Vérifier si la séquence existe et appartient à l'utilisateur avant de supprimer
    db_sequence = crud.get_sequence(db, sequence_id=sequence_id)
    if db_sequence is None:
        raise HTTPException(status_code=404, detail="Sequence not found")
    if db_sequence.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this sequence")
        
    success = crud.delete_sequence(db, sequence_id=sequence_id)
    # if not success:
    #     # Cette vérification est maintenant redondante car faite au début
    #     raise HTTPException(status_code=404, detail="Sequence not found")
    return # Retourne None pour 204
