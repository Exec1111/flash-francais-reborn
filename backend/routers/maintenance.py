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
from pathlib import Path
from backend.config import get_settings
from routers.auth import get_current_active_user
from models import User as UserModel

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


@router.get("/temp-files/list", tags=["maintenance"])
async def list_temp_files(user_id: str | None = None, max_items: int = 200) -> Dict[str, Any]:
    """
    Lister les fichiers du répertoire temporaire.
    - Optionnel: `user_id` pour cibler `/static/tmp/{user_id}`
    - `max_items` pour limiter le nombre d'éléments retournés
    """
    try:
        cleaner = get_temp_cleaner()
        base_dir: Path = cleaner.temp_dir
        target: Path = base_dir / user_id if user_id else base_dir

        if not target.exists():
            return {
                "success": True,
                "path": str(target),
                "files": [],
                "message": "Répertoire inexistant"
            }

        items = []
        for entry in target.iterdir():
            try:
                stat = entry.stat()
                items.append({
                    "name": entry.name,
                    "path": str(entry.relative_to(base_dir)),
                    "is_dir": entry.is_dir(),
                    "size": stat.st_size,
                    "mtime": int(stat.st_mtime)
                })
            except Exception as e:
                items.append({
                    "name": entry.name,
                    "path": str(entry.relative_to(base_dir)),
                    "error": str(e)
                })
            if len(items) >= max_items:
                break

        return {
            "success": True,
            "path": str(target),
            "count": len(items),
            "files": items
        }
    except Exception as e:
        logger.error(f"Erreur lors du listing du dossier temporaire: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du listing du dossier temporaire: {str(e)}"
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


# --- Nouveaux endpoints: usage de stockage & corbeille ---

def _compute_user_usage(user_id: int) -> Dict[str, Any]:
    settings = get_settings()
    base = Path(settings.UPLOADS_BASE_DIR) / 'uploads' / str(user_id)
    total = 0
    trash_total = 0
    if base.exists():
        for p in base.rglob('*'):
            try:
                if p.is_file():
                    size = p.stat().st_size
                    if '.trash' in p.parts:
                        trash_total += size
                    else:
                        total += size
            except Exception:
                continue
    quota_mb = getattr(settings, 'USER_STORAGE_QUOTA_MB', 0)
    return {
        'user_id': user_id,
        'used_bytes': total,
        'used_mb': round(total / (1024*1024), 2),
        'trash_bytes': trash_total,
        'trash_mb': round(trash_total / (1024*1024), 2),
        'quota_mb': quota_mb,
        'quota_bytes': quota_mb * 1024 * 1024 if quota_mb else 0,
        'percent': (round((total / (quota_mb*1024*1024))*100, 2) if quota_mb else None)
    }


@router.get("/storage/usage", tags=["maintenance"])
async def get_my_storage_usage(
    current_user: UserModel = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Retourne l'usage de stockage de l'utilisateur courant (hors corbeille) et la corbeille."""
    try:
        usage = _compute_user_usage(current_user.id)
        return { 'success': True, 'usage': usage }
    except Exception as e:
        logger.error(f"Erreur get_my_storage_usage: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du calcul de l'usage de stockage")


@router.post("/trash/empty", tags=["maintenance"])
async def empty_my_trash(
    current_user: UserModel = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Vide la corbeille (.trash) de l'utilisateur courant."""
    settings = get_settings()
    trash = Path(settings.UPLOADS_BASE_DIR) / 'uploads' / str(current_user.id) / '.trash'
    deleted = 0
    if trash.exists() and trash.is_dir():
        for item in trash.iterdir():
            try:
                if item.is_file():
                    item.unlink(missing_ok=True)
                    deleted += 1
                elif item.is_dir():
                    # sécurité: supprimer seulement dossiers vides
                    try:
                        item.rmdir()
                    except OSError:
                        pass
            except Exception as e:
                logger.warning(f"Erreur suppression dans la corbeille {item}: {e}")
        # tenter de supprimer .trash si vide
        try:
            if not any(trash.iterdir()):
                trash.rmdir()
        except Exception:
            pass

    return { 'success': True, 'deleted': deleted }
