"""
AI Router - Refactored Version
=============================

Ce fichier est la version refactorisée du ai_router.py original.
Il délègue maintenant la logique métier à des modules spécialisés pour améliorer:
- La lisibilité et la maintenabilité
- La séparation des responsabilités
- La réutilisabilité du code
- Les tests unitaires

Modules inclus:
- qcm_router: Gestion des QCM
- chat_router: Interface de chat AI
- resource_generation_router: Génération de ressources
- resource_merging_router: Fusion de ressources
- session_router: Génération de sessions
- exercise_suggestion_router: Suggestions d'exercices
- pdf_analysis_router: Analyse de PDF
"""

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
import logging

from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel

# Import des modules spécialisés
from .chat_router import router as chat_router
from .resource_generation_router import router as resource_generation_router
from .resource_merging_router import router as resource_merging_router
from .session_router import router as session_router
from .exercise_suggestion_router import router as exercise_suggestion_router
from .pdf_analysis_router import router as pdf_analysis_router

# Configure logging
logger = logging.getLogger(__name__)

# Router principal
router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)

# Inclure tous les sous-routers
router.include_router(qcm_router)
router.include_router(chat_router)
router.include_router(resource_generation_router)
router.include_router(resource_merging_router)
router.include_router(session_router)
router.include_router(exercise_suggestion_router)
router.include_router(pdf_analysis_router)

# Endpoints de haut niveau (si nécessaire)
@router.get("/health")
async def health_check():
    """
    Endpoint de santé pour vérifier que le router AI fonctionne correctement.
    """
    return {"status": "healthy", "message": "AI router is operational"}

@router.get("/status")
async def get_ai_status(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Endpoint pour obtenir le statut des services AI disponibles.
    """
    logger.info(f"AI status check requested by user {current_user.email}")

    return {
        "user_id": current_user.id,
        "services": {
            "chat": "available",
            "resource_generation": "available",
            "resource_merging": "available",
            "session_generation": "available",
            "exercise_suggestions": "available",
            "pdf_analysis": "available"
        },
        "timestamp": "2025-01-22T14:00:00Z"
    }