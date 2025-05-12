from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.models.llm_interaction_log import LLMInteractionLog
from backend.models import User
from backend.schemas import llm_interaction_log as llm_log_schema
from backend.security import get_current_user
from backend.database import get_db

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/llm-logs", response_model=List[llm_log_schema.LLMInteractionLogOut])
def get_llm_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Supporte le cas où le rôle est une enum ou une string
    role_value = getattr(current_user.role, 'value', current_user.role)
    if not current_user or (str(role_value).lower() != 'admin'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    logs = db.query(LLMInteractionLog).order_by(LLMInteractionLog.timestamp.desc()).limit(100).all()
    return logs
