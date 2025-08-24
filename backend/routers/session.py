from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud
from schemas.session import SessionCreate, SessionUpdate, SessionRead
from models.user import User
from models.session import Session as SessionModel
from security import get_current_active_user
from crud.session import set_fiche_resource, remove_fiche_resource
import os

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
def read_session_route(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    return db_session

@session_router.put("/{session_id}", response_model=SessionRead)
def update_session_route(session_id: int, session: SessionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Vérifier que la séance existe et appartient à l'utilisateur
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this session")

    # Vérifier si la nouvelle séquence_id existe si elle est fournie
    if session.sequence_id is not None:
        db_sequence = crud.get_sequence(db, sequence_id=session.sequence_id)
        if db_sequence is None:
            raise HTTPException(status_code=404, detail=f"Sequence with id {session.sequence_id} not found")

    updated_session = crud.update_session(db=db, session_id=session_id, session_update=session)
    if updated_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return updated_session

# -------------------- Fiche de séance --------------------

def _add_fiche_url(db_session: SessionModel):
    """Ajoute l'URL publique de la fiche (si présente)."""
    if db_session.fiche_resource_id and db_session.fiche_resource and db_session.fiche_resource.file_path:
        base = os.getenv("API_BASE_URL", "http://localhost:10000").rstrip("/")
        # Normaliser le chemin en séparateurs POSIX pour éviter les antislashs dans l'expression d'une f-string
        rel_path = db_session.fiche_resource.file_path.lstrip("/").replace("\\", "/")
        db_session.fiche_url = f"{base}/media/uploads/{rel_path}"
    else:
        db_session.fiche_url = None
    return db_session


@session_router.post("/{session_id}/fiche/{resource_id}", response_model=SessionRead)
def attach_fiche_resource(session_id: int, resource_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Attache ou remplace la fiche de séance par la ressource donnée."""
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    updated = set_fiche_resource(db, session_id, resource_id)
    updated = _add_fiche_url(updated)
    return updated


@session_router.delete("/{session_id}/fiche", response_model=SessionRead)
def detach_fiche_resource(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Supprime la fiche de séance (et la ressource associée)."""
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    updated = remove_fiche_resource(db, session_id)
    updated = _add_fiche_url(updated)
    return updated

# -------------------- Gestion des œuvres dans les séances --------------------

@session_router.post("/{session_id}/oeuvres/{oeuvre_id}", response_model=SessionRead)
def attach_oeuvre_to_session(
    session_id: int,
    oeuvre_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Attache une œuvre à une séance."""
    # Vérifier que la séance existe et appartient à l'utilisateur
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this session")

    # Vérifier que l'œuvre existe
    db_oeuvre = crud.get_oeuvre(db, oeuvre_id=oeuvre_id)
    if db_oeuvre is None:
        raise HTTPException(status_code=404, detail=f"Oeuvre with id {oeuvre_id} not found")

    # Vérifier que l'œuvre n'est pas déjà attachée
    if db_oeuvre in db_session.oeuvres:
        raise HTTPException(status_code=400, detail="Oeuvre is already attached to this session")

    # Attacher l'œuvre
    db_session.oeuvres.append(db_oeuvre)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    return db_session

@session_router.delete("/{session_id}/oeuvres/{oeuvre_id}", response_model=SessionRead)
def detach_oeuvre_from_session(
    session_id: int,
    oeuvre_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Détache une œuvre d'une séance."""
    # Vérifier que la séance existe et appartient à l'utilisateur
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this session")

    # Vérifier que l'œuvre existe
    db_oeuvre = crud.get_oeuvre(db, oeuvre_id=oeuvre_id)
    if db_oeuvre is None:
        raise HTTPException(status_code=404, detail=f"Oeuvre with id {oeuvre_id} not found")

    # Vérifier que l'œuvre est bien attachée
    if db_oeuvre not in db_session.oeuvres:
        raise HTTPException(status_code=400, detail="Oeuvre is not attached to this session")

    # Détacher l'œuvre
    db_session.oeuvres.remove(db_oeuvre)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    return db_session

@session_router.get("/{session_id}/oeuvres", response_model=List[dict])
def get_session_oeuvres(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère la liste des œuvres attachées à une séance."""
    # Vérifier que la séance existe et appartient à l'utilisateur
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    # Retourner les œuvres avec leurs informations essentielles
    oeuvres = []
    for oeuvre in db_session.oeuvres:
        oeuvres.append({
            "id": oeuvre.id,
            "titre": oeuvre.titre,
            "auteur_complet": oeuvre.auteur_complet,
            "type": oeuvre.type,
            "genre": oeuvre.genre,
            "date_publication": oeuvre.date_publication
        })

    return oeuvres

@session_router.delete("/{session_id}", status_code=204)
def delete_session_route(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Vérifier que la séance existe et appartient à l'utilisateur
    db_session = crud.get_session_by_id(db, session_id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")

    success = crud.delete_session(db, session_id=session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return # Retourne None pour 204
