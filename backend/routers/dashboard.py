from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List, Dict, Any, Optional
from pydantic import BaseModel # Importer BaseModel depuis Pydantic

import models
import crud
from dependencies import get_db, get_current_active_user
from crud.progression import count_progressions, get_progressions_with_no_sequences
from crud.sequence import count_sequences, get_sequences_with_no_sessions
from crud.resource import count_resources
from crud.session import count_sessions, get_sessions_with_no_resources
from models import Sequence, Session as SessionModel, Objective 

dashboard_router = APIRouter( # Renommé la variable pour cohérence
    # prefix="/api/v1/dashboard", # Préfixe géré dans app.py
    tags=["dashboard"],
    dependencies=[Depends(get_current_active_user)],
    responses={404: {"description": "Not found"}},
)

# --- Schémas spécifiques au Dashboard ---

class StatItem(BaseModel): # Hériter de BaseModel (Pydantic)
    key: str
    label: str
    value: Any

class WarningItem(BaseModel): # Hériter de BaseModel (Pydantic)
    id: str
    message: str
    # Optionnel: Pourrait inclure des détails ou des liens vers les éléments concernés
    details: Optional[Dict[str, Any]] = None

class DashboardSummary(BaseModel): # Hériter de BaseModel (Pydantic)
    stats: List[StatItem]
    warnings: List[WarningItem]

# --- Endpoint ---

@dashboard_router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    user_id = current_user.id

    # --- Calcul des Statistiques ---
    total_progressions = crud.progression.count_progressions(db=db, user_id=user_id)
    total_sequences = crud.sequence.count_sequences(db=db, user_id=user_id)
    total_resources = crud.resource.count_resources(db=db, user_id=user_id)
    total_sessions = crud.session.count_sessions(db=db, user_id=user_id)

    stats_data: List[StatItem] = [
        StatItem(key="total_progressions", label="Nombre total de progressions", value=total_progressions),
        StatItem(key="total_sequences", label="Nombre total de séquences", value=total_sequences),
        StatItem(key="total_resources", label="Nombre total de ressources personnelles", value=total_resources),
        StatItem(key="total_sessions", label="Nombre total de sessions", value=total_sessions),
    ]

    # Calcul des moyennes
    avg_sequences_per_progression = 0
    if total_progressions > 0:
        avg_sequences_per_progression = round(total_sequences / total_progressions, 1)
    stats_data.append(StatItem(
        key="avg_sequences_per_progression", 
        label="Nombre moyen de séquences par progression", 
        value=avg_sequences_per_progression
    ))

    avg_resources_per_session = 0
    if total_sessions > 0:
        avg_resources_per_session = round(total_resources / total_sessions, 1)
    stats_data.append(StatItem(
        key="avg_resources_per_session", 
        label="Nombre moyen de ressources par session", 
        value=avg_resources_per_session
    ))

    # --- Vérification des Avertissements ---
    warnings_data: List[WarningItem] = []
    
    if total_progressions == 0:
        warnings_data.append(WarningItem(
            id="no_progression_yet", 
            message="Commencez par créer votre première progression pédagogique !"
        ))

    progressions_no_seq = crud.progression.get_progressions_with_no_sequences(db=db, user_id=user_id)
    if progressions_no_seq:
        prog_names = [p.title for p in progressions_no_seq[:3]]
        message = f"Les progressions suivantes n'ont aucune séquence : {', '.join(prog_names)}"
        if len(progressions_no_seq) > 3:
            message += f" (et {len(progressions_no_seq) - 3} autres)."
        else:
            message += "."
        warnings_data.append(WarningItem(
            id="progressions_empty",
            message=message,
            details={"count": len(progressions_no_seq), "ids": [p.id for p in progressions_no_seq]}
        ))
        
    sequences_no_sess = crud.sequence.get_sequences_with_no_sessions(db=db, user_id=user_id)
    if sequences_no_sess:
        seq_names = [s.title for s in sequences_no_sess[:3]]
        message = f"Les séquences suivantes sont vides (pas de session) : {', '.join(seq_names)}"
        if len(sequences_no_sess) > 3:
            message += f" (et {len(sequences_no_sess) - 3} autres)."
        else:
            message += "."
        warnings_data.append(WarningItem(
            id="sequences_empty",
            message=message,
            details={"count": len(sequences_no_sess), "ids": [s.id for s in sequences_no_sess]}
        ))
        
    sessions_no_res = crud.session.get_sessions_with_no_resources(db=db, user_id=user_id)
    if sessions_no_res:
        sess_names = [s.title for s in sessions_no_res[:3]]
        message = f"Les sessions suivantes sont vides (pas de ressource) : {', '.join(sess_names)}"
        if len(sessions_no_res) > 3:
            message += f" (et {len(sessions_no_res) - 3} autres)."
        else:
            message += "."
        warnings_data.append(WarningItem(
            id="sessions_empty",
            message=message,
            details={"count": len(sessions_no_res), "ids": [s.id for s in sessions_no_res]}
        ))

    # --- Vérification des objectifs de séquence non couverts --- 
    sequences_with_objectives = db.query(Sequence).filter(Sequence.user_id == user_id)\
        .options(
            selectinload(Sequence.objectives), # Objectifs de la séquence
            selectinload(Sequence.sessions).selectinload(SessionModel.objectives) # Séances -> Objectifs des séances
        ).all()

    for sequence in sequences_with_objectives:
        sequence_objective_ids = {obj.id for obj in sequence.objectives}
        if not sequence_objective_ids: continue # Passer si pas d'objectifs définis pour la séquence
            
        covered_objective_ids = set()
        for session in sequence.sessions:
            for obj in session.objectives:
                covered_objective_ids.add(obj.id)
                
        uncovered_ids = sequence_objective_ids - covered_objective_ids
        
        if uncovered_ids:
            uncovered_objectives_details = [
                {"id": obj.id, "title": obj.title} 
                for obj in sequence.objectives if obj.id in uncovered_ids
            ]
            warnings_data.append(
                WarningItem(
                    id=f"uncovered_objectives_{sequence.id}", # ID unique pour ce type d'alerte
                    message=f"La séquence '{sequence.title}' a des objectifs non couverts par ses séances.",
                    details={
                        "sequence_id": sequence.id,
                        "sequence_title": sequence.title,
                        "uncovered_objectives": uncovered_objectives_details
                    }
                )
            )

    return DashboardSummary(stats=stats_data, warnings=warnings_data)
