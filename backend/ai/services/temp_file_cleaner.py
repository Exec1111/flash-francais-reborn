"""
Service de nettoyage automatique des fichiers temporaires.
Compatible avec Render et exécution périodique toutes les 12 heures.
"""
import os
import time
import logging
import asyncio
from typing import List, Tuple
from pathlib import Path
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TempFileCleaner:
    """
    Service de nettoyage des fichiers temporaires.
    Supprime automatiquement les fichiers créés il y a plus de 12 heures.
    """

    def __init__(self, temp_dir: str = None, max_age_hours: int = 12):
        """
        Initialise le nettoyeur de fichiers temporaires.

        Args:
            temp_dir: Répertoire temporaire à nettoyer (par défaut: static/tmp)
            max_age_hours: Âge maximum des fichiers en heures (par défaut: 12)
        """
        if temp_dir is None:
            # Chemin par défaut basé sur la structure du projet
            current_file = Path(__file__).resolve()
            backend_dir = current_file.parent.parent.parent
            temp_dir = backend_dir / "static" / "tmp"

        self.temp_dir = Path(temp_dir)
        self.max_age_hours = max_age_hours
        self.max_age_seconds = max_age_hours * 3600
        # S'assurer que le répertoire de base existe pour éviter les logs d'absence
        try:
            self.temp_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Impossible de créer le répertoire temporaire de base {self.temp_dir}: {e}")

    async def clean_old_files(self) -> Tuple[int, int, List[str]]:
        """
        Nettoie les fichiers temporaires plus anciens que max_age_hours.

        Returns:
            Tuple (fichiers_supprimes, dossiers_supprimes, erreurs)
        """
        # Initialiser toutes les variables nécessaires
        files_deleted = 0
        dirs_deleted = 0
        errors = []
        cutoff_time = time.time() - self.max_age_seconds
        
        if not self.temp_dir.exists():
            # Tenter une création tardive si supprimé
            try:
                self.temp_dir.mkdir(parents=True, exist_ok=True)
                logger.info(f"Répertoire temporaire créé: {self.temp_dir}")
            except Exception:
                logger.info(f"Répertoire temporaire inexistant: {self.temp_dir}")
                return 0, 0, []

        logger.info(f"Début du nettoyage dans: {self.temp_dir}")
        logger.info(f"Suppression des fichiers de plus de {self.max_age_hours}h")

        # Debug: lister tous les répertoires et fichiers trouvés
        try:
            all_items = list(self.temp_dir.iterdir())
            logger.info(f"RÉPERTOIRES TROUVÉS dans {self.temp_dir}: {[item.name for item in all_items if item.is_dir()]}")
            for user_dir in all_items:
                if user_dir.is_dir():
                    files_in_dir = list(user_dir.iterdir())
                    logger.info(f"FICHIERS dans {user_dir.name}: {[f.name for f in files_in_dir if f.is_file()]}")
                    for file_path in files_in_dir:
                        if file_path.is_file():
                            file_stat = file_path.stat()
                            age_hours = (time.time() - file_stat.st_mtime) / 3600
                            logger.info(f"  - {file_path.name}: âge={age_hours:.1f}h, mtime={file_stat.st_mtime}, cutoff={cutoff_time}")
        except Exception as e:
            logger.error(f"Erreur lors du debug: {e}")

        try:
            # Parcourir tous les sous-répertoires utilisateur
            for user_dir in self.temp_dir.iterdir():
                if not user_dir.is_dir():
                    continue

                logger.debug(f"Nettoyage du répertoire utilisateur: {user_dir.name}")

                # Nettoyer les fichiers dans ce répertoire
                for file_path in user_dir.iterdir():
                    if not file_path.is_file():
                        continue

                    try:
                        # Vérifier l'âge du fichier
                        file_stat = file_path.stat()
                        if file_stat.st_mtime < cutoff_time:
                            # Fichier trop ancien, le supprimer
                            file_path.unlink()
                            files_deleted += 1
                            logger.debug(f"Fichier supprimé: {file_path}")
                        else:
                            logger.debug(f"Fichier conservé (récent): {file_path}")

                    except Exception as e:
                        error_msg = f"Erreur suppression {file_path}: {str(e)}"
                        logger.error(error_msg)
                        errors.append(error_msg)

                # Vérifier si le répertoire utilisateur est vide
                try:
                    if not any(user_dir.iterdir()):
                        # Répertoire vide, le supprimer
                        user_dir.rmdir()
                        dirs_deleted += 1
                        logger.debug(f"Répertoire vide supprimé: {user_dir}")
                except Exception as e:
                    error_msg = f"Erreur suppression répertoire {user_dir}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

        except Exception as e:
            error_msg = f"Erreur lors du nettoyage: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)

        logger.info(f"Nettoyage terminé: {files_deleted} fichiers, {dirs_deleted} répertoires supprimés")
        if errors:
            logger.warning(f"Erreurs rencontrées: {len(errors)}")

        return files_deleted, dirs_deleted, errors

    async def get_stats(self) -> dict:
        """
        Retourne des statistiques sur les fichiers temporaires.

        Returns:
            Dictionnaire avec les statistiques
        """
        if not self.temp_dir.exists():
            return {"total_files": 0, "total_dirs": 0, "old_files": 0, "storage_mb": 0}

        total_files = 0
        total_dirs = 0
        old_files = 0
        total_size = 0
        cutoff_time = time.time() - self.max_age_seconds

        try:
            for user_dir in self.temp_dir.iterdir():
                if user_dir.is_dir():
                    total_dirs += 1
                    for file_path in user_dir.iterdir():
                        if file_path.is_file():
                            total_files += 1
                            file_stat = file_path.stat()
                            total_size += file_stat.st_size

                            if file_stat.st_mtime < cutoff_time:
                                old_files += 1
        except Exception as e:
            logger.error(f"Erreur lors du calcul des stats: {e}")

        return {
            "total_files": total_files,
            "total_dirs": total_dirs,
            "old_files": old_files,
            "storage_mb": round(total_size / (1024 * 1024), 2)
        }


# Instance globale pour utilisation dans l'application
temp_cleaner = TempFileCleaner()


async def scheduled_cleanup():
    """
    Fonction de nettoyage périodique appelée par le scheduler.
    """
    try:
        files_deleted, dirs_deleted, errors = await temp_cleaner.clean_old_files()

        # Log des résultats
        if files_deleted > 0 or dirs_deleted > 0:
            logger.info(f"Nettoyage automatique: {files_deleted} fichiers, {dirs_deleted} répertoires supprimés")
        else:
            logger.info("Nettoyage automatique: aucun fichier à supprimer")

        if errors:
            logger.warning(f"Erreurs lors du nettoyage: {errors}")

    except Exception as e:
        logger.error(f"Erreur lors du nettoyage périodique: {e}")


def get_temp_cleaner() -> TempFileCleaner:
    """
    Retourne l'instance globale du nettoyeur.
    """
    return temp_cleaner
