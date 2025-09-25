from fastapi import APIRouter
import logging
import json as jsonlib

logger = logging.getLogger(__name__)

resource_utils_router = APIRouter()

# Fonctions utilitaires pour le parsing HTML des exercices
def html_to_qcm_json(html_content: str) -> dict:
    """Parse le HTML d'un QCM et retourne un dict JSON."""
    # TODO: Implémenter le parsing HTML réel du QCM
    # Pour l'instant, retourner une structure basique
    return {"questions": []}

def html_to_champlex_json(html_content: str) -> dict:
    """Parse le HTML d'un Champlex et retourne un dict JSON."""
    # TODO: Implémenter le parsing HTML réel du Champlex
    # Pour l'instant, retourner une structure basique
    return {"champs": []}

# Fonction d'extraction Docling (sera implémentée plus tard)
async def run_docling_extraction(resource_id: int, user_id: int, ocr: bool):
    """Fonction d'extraction Docling en arrière-plan."""
    # TODO: Implémenter l'intégration Docling réelle
    logger.info(f"Docling extraction would be run for resource_id={resource_id}, user_id={user_id}, ocr={ocr}")

# Route de test
@resource_utils_router.get("/by_session/{session_id}/test")
async def test_route_for_session(session_id: int):
    logger.info(f">>> SIMPLE TEST ROUTE CALLED for session {session_id} <<<")
    return {"message": f"Simple test route ok for session {session_id}"}