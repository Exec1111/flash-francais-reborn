#!/usr/bin/env python3
"""
Script de nettoyage des fichiers temporaires pour Render.
Peut être exécuté via cron job ou tâche périodique.

Usage:
    python cleanup_temp_files.py
    ou depuis cron: 0 */12 * * * /path/to/python cleanup_temp_files.py
"""
import os
import sys
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv

# Ajouter le répertoire parent au PYTHONPATH
sys.path.append(str(Path(__file__).parent.parent))

# Charger les variables d'environnement
load_dotenv()

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/temp_cleanup.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


async def main():
    """
    Fonction principale du script de nettoyage.
    """
    try:
        logger.info("=== Démarrage du nettoyage des fichiers temporaires ===")

        # Import des services après configuration du PYTHONPATH
        from backend.ai.services.temp_file_cleaner import TempFileCleaner

        # Créer le nettoyeur
        cleaner = TempFileCleaner()

        # Afficher les stats avant nettoyage
        logger.info("Statistiques avant nettoyage:")
        stats_before = await cleaner.get_stats()
        logger.info(f"  - Fichiers totaux: {stats_before['total_files']}")
        logger.info(f"  - Répertoires: {stats_before['total_dirs']}")
        logger.info(f"  - Fichiers anciens (>12h): {stats_before['old_files']}")
        logger.info(f"  - Espace utilisé: {stats_before['storage_mb']} MB")

        # Exécuter le nettoyage
        logger.info("Exécution du nettoyage...")
        files_deleted, dirs_deleted, errors = await cleaner.clean_old_files()

        # Afficher les résultats
        logger.info("=== Résultats du nettoyage ===")
        logger.info(f"Fichiers supprimés: {files_deleted}")
        logger.info(f"Répertoires supprimés: {dirs_deleted}")

        if errors:
            logger.warning(f"Erreurs rencontrées: {len(errors)}")
            for error in errors[:5]:  # Afficher max 5 erreurs
                logger.warning(f"  - {error}")
            if len(errors) > 5:
                logger.warning(f"  ... et {len(errors) - 5} autres erreurs")

        # Afficher les stats après nettoyage
        logger.info("Statistiques après nettoyage:")
        stats_after = await cleaner.get_stats()
        logger.info(f"  - Fichiers totaux: {stats_after['total_files']}")
        logger.info(f"  - Répertoires: {stats_after['total_dirs']}")
        logger.info(f"  - Espace libéré: {stats_before['storage_mb'] - stats_after['storage_mb']:.2f} MB")

        logger.info("=== Nettoyage terminé avec succès ===")

        # Retourner un code de sortie approprié
        if errors:
            sys.exit(1)  # Erreur si des problèmes sont survenus
        else:
            sys.exit(0)  # Succès

    except Exception as e:
        logger.error(f"Erreur critique lors du nettoyage: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    # Exécuter le nettoyage
    asyncio.run(main())
