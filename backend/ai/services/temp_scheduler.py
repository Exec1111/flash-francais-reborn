"""
Scheduler pour le nettoyage périodique des fichiers temporaires.
Compatible avec FastAPI et Render.
"""
import asyncio
import logging
from typing import Optional
from contextlib import asynccontextmanager

from backend.ai.services.temp_file_cleaner import scheduled_cleanup

logger = logging.getLogger(__name__)


class TempFileScheduler:
    """
    Scheduler pour l'exécution périodique du nettoyage des fichiers temporaires.
    """

    def __init__(self, interval_hours: int = 12):
        """
        Initialise le scheduler.

        Args:
            interval_hours: Intervalle entre les nettoyages en heures
        """
        self.interval_hours = interval_hours
        self.interval_seconds = interval_hours * 3600
        self.task: Optional[asyncio.Task] = None
        self.running = False

    async def start(self):
        """
        Démarre le scheduler de nettoyage périodique.
        """
        if self.running:
            logger.warning("Scheduler déjà en cours d'exécution")
            return

        self.running = True
        logger.info(f"Démarrage du scheduler de nettoyage (intervalle: {self.interval_hours}h)")

        # Créer la tâche périodique
        self.task = asyncio.create_task(self._run_scheduler())

    async def stop(self):
        """
        Arrête le scheduler.
        """
        if not self.running:
            return

        self.running = False
        logger.info("Arrêt du scheduler de nettoyage")

        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

    async def _run_scheduler(self):
        """
        Boucle principale du scheduler.
        """
        while self.running:
            try:
                # Attendre l'intervalle configuré
                await asyncio.sleep(self.interval_seconds)

                # Exécuter le nettoyage
                logger.info("Déclenchement du nettoyage périodique")
                await scheduled_cleanup()

            except asyncio.CancelledError:
                logger.info("Scheduler annulé")
                break
            except Exception as e:
                logger.error(f"Erreur dans le scheduler: {e}")
                # Continuer malgré l'erreur
                await asyncio.sleep(60)  # Attendre 1 minute avant de réessayer

    async def trigger_manual_cleanup(self):
        """
        Déclenche un nettoyage manuel (pour les tests ou administration).
        """
        logger.info("Déclenchement manuel du nettoyage")
        await scheduled_cleanup()


# Instance globale du scheduler
temp_scheduler = TempFileScheduler()


@asynccontextmanager
async def lifespan_manager(app):
    """
    Gestionnaire de lifespan pour FastAPI.
    Démarre et arrête automatiquement le scheduler.
    """
    # Démarrage
    logger.info("Démarrage de l'application - Initialisation du scheduler")
    await temp_scheduler.start()

    yield

    # Arrêt
    logger.info("Arrêt de l'application - Arrêt du scheduler")
    await temp_scheduler.stop()


def get_temp_scheduler() -> TempFileScheduler:
    """
    Retourne l'instance globale du scheduler.
    """
    return temp_scheduler
