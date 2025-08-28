"""
Routes API pour les opérations de maintenance et nettoyage.
Compatible avec Render et administration système.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.ai.services.temp_file_cleaner import get_temp_cleaner
from backend.ai.services.temp_scheduler import get_temp_scheduler
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/temp-files/stats", tags=["maintenance"])
async def get_temp_files_stats() -> Dict[str, Any]:
    """
    Obtenir les statistiques des fichiers temporaires.
    """
    try:
        cleaner = get_temp_cleaner()
        stats = await cleaner.get_stats()

        return {
            "success": True,
            "stats": stats,
            "message": "Statistiques récupérées avec succès"
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )


@router.post("/temp-files/clean", tags=["maintenance"])
async def trigger_manual_cleanup() -> Dict[str, Any]:
    """
    Déclencher un nettoyage manuel des fichiers temporaires.
    """
    try:
        cleaner = get_temp_cleaner()
        scheduler = get_temp_scheduler()

        # Déclencher le nettoyage manuel
        await scheduler.trigger_manual_cleanup()

        # Récupérer les nouvelles stats
        stats = await cleaner.get_stats()

        return {
            "success": True,
            "message": "Nettoyage manuel déclenché avec succès",
            "stats_after_cleanup": stats
        }
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage manuel: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du nettoyage manuel: {str(e)}"
        )


@router.get("/scheduler/status", tags=["maintenance"])
async def get_scheduler_status() -> Dict[str, Any]:
    """
    Obtenir le statut du scheduler de nettoyage.
    """
    try:
        scheduler = get_temp_scheduler()

        return {
            "success": True,
            "scheduler_status": {
                "running": scheduler.running,
                "interval_hours": scheduler.interval_hours,
                "next_cleanup_in_seconds": scheduler.interval_seconds if scheduler.running else None
            },
            "message": "Statut du scheduler récupéré avec succès"
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du statut du scheduler: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération du statut: {str(e)}"
        )


@router.post("/scheduler/restart", tags=["maintenance"])
async def restart_scheduler() -> Dict[str, Any]:
    """
    Redémarrer le scheduler de nettoyage.
    """
    try:
        scheduler = get_temp_scheduler()

        # Arrêter le scheduler actuel
        await scheduler.stop()

        # Redémarrer le scheduler
        await scheduler.start()

        return {
            "success": True,
            "message": "Scheduler redémarré avec succès",
            "scheduler_status": {
                "running": scheduler.running,
                "interval_hours": scheduler.interval_hours
            }
        }
    except Exception as e:
        logger.error(f"Erreur lors du redémarrage du scheduler: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du redémarrage du scheduler: {str(e)}"
        )


@router.get("/health/maintenance", tags=["maintenance"])
async def maintenance_health_check() -> Dict[str, Any]:
    """
    Health check pour les services de maintenance.
    """
    try:
        cleaner = get_temp_cleaner()
        scheduler = get_temp_scheduler()

        # Vérifier que les services sont accessibles
        stats = await cleaner.get_stats()

        return {
            "success": True,
            "status": "healthy",
            "services": {
                "temp_file_cleaner": "operational",
                "temp_scheduler": "running" if scheduler.running else "stopped"
            },
            "stats": stats,
            "message": "Services de maintenance opérationnels"
        }
    except Exception as e:
        logger.error(f"Erreur lors du health check de maintenance: {e}")
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e),
            "message": "Problème détecté dans les services de maintenance"
        }
