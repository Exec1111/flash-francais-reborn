from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud
from schemas.session import SessionCreate, SessionUpdate, SessionRead
from models.user import User
from models.session import Session as SessionModel
from security import get_current_active_user

session_router = APIRouter(
    # prefix="/sessions", # Supprimé car géré dans app.py
    tags=["sessions"],
    responses={404: {"description": "Not found"}},
)

@session_router.patch("/reorder", status_code=204)
def reorder_sessions(
    session_ids: List[int] = Body(..., embed=True, description="Liste ordonnée des IDs de séances"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Réordonne les séances d'une séquence selon la liste d'IDs reçue.
    """
    # Récupérer toutes les séances concernées et vérifier l'appartenance à l'utilisateur
    sessions = db.query(SessionModel).filter(SessionModel.id.in_(session_ids)).all()
    
    if len(sessions) != len(session_ids):
        raise HTTPException(status_code=404, detail="Certaines séances n'existent pas.")
    
    # Vérification des droits de l'utilisateur
    for session in sessions:
        if session.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Séance non autorisée.")
    
    # Vérifier que toutes les séances appartiennent à la même séquence
    first_sequence_id = sessions[0].sequence_id
    for session in sessions:
        if session.sequence_id != first_sequence_id:
            raise HTTPException(
                status_code=400, 
                detail="Impossible de réordonner des séances appartenant à des séquences différentes."
            )
    
    # Mise à jour des ordres
    id_to_session = {session.id: session for session in sessions}
    for idx, session_id in enumerate(session_ids):
        session = id_to_session[session_id]
        session.order = idx
        db.add(session)
    
    db.commit()
    return

@session_router.post("/", response_model=SessionRead)
def create_session_route(
    session: SessionCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Vérifier si la séquence parente existe
    db_sequence = crud.get_sequence(db, sequence_id=session.sequence_id)
    if db_sequence is None:
        raise HTTPException(status_code=404, detail=f"Sequence with id {session.sequence_id} not found")
    
    # Vérifier que l'utilisateur a accès à cette séquence
    if db_sequence.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Vous n'avez pas l'autorisation d'ajouter des séances à cette séquence"
        )
    
    # Créer une session liée à l'utilisateur courant
    return crud.create_session_with_user(db=db, session=session, user_id=current_user.id)

@session_router.get("/", response_model=List[SessionRead])
def read_sessions_route(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    sessions = crud.get_sessions(db, skip=skip, limit=limit)
    return sessions

@session_router.get("/by_sequence/{sequence_id}", response_model=List[SessionRead])
def read_sessions_by_sequence_route(
    sequence_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Vérifier si la séquence parente existe
    db_sequence = crud.get_sequence(db, sequence_id=sequence_id)
    if db_sequence is None:
        raise HTTPException(status_code=404, detail=f"Séquence avec l'id {sequence_id} non trouvée")
    
    # Vérifier si l'utilisateur a accès à cette séquence
    if db_sequence.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Vous n'avez pas l'autorisation d'accéder aux séances de cette séquence"
        )
    
    sessions = crud.get_sessions_by_sequence(
        db,
        sequence_id=sequence_id,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    return sessions

@session_router.get("/{session_id}", response_model=SessionRead)
def read_session_route(session_id: int, db: Session = Depends(get_db)):
    db_session = crud.get_session_by_id(db, session_id=session_id)
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
