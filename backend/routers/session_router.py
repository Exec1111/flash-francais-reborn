from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
import logging
from typing import List
from pydantic import BaseModel

from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel
from backend.ai import ai_resource_service
from backend.crud.sequence import get_sequence
from backend.crud.session import create_session_with_user, get_session_by_id
from backend.schemas.session import SessionCreate
from backend.schemas.resource import ResourceResponse
from backend.crud.resource import get_resources_by_session_and_type, get_resource, get_available_supports_for_session
from config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"],
)

settings = get_settings()

# Création de nouveaux schémas pour la génération de séances
class AISessionGenerationRequest(BaseModel):
    sequence_id: int
    description_sequence: str | None = None
    nombre_seances: str  # nombre numérique ou "auto"
    inclure_ressources: bool = False
    instructions_supplementaires: str = ""
    niveau: str = "B1"  # Niveau par défaut

class AISessionGenerationResponse(BaseModel):
    sessions: List[SessionCreate]

@router.post(
    "/generate-sessions",
    response_model=AISessionGenerationResponse,
    summary="Génère des séances pour une séquence avec l'IA",
    description="Génère des séances (sessions) adaptées à une séquence pédagogique en utilisant l'IA."
)
async def generate_sessions(
    request: AISessionGenerationRequest,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint pour générer des séances avec l'IA pour une séquence donnée.
    """
    logger.info(f"Génération de séances pour la séquence {request.sequence_id} demandée par l'utilisateur {current_user.email}")

    try:
        # Vérifier que la séquence existe et appartient à l'utilisateur
        sequence = get_sequence(db, sequence_id=request.sequence_id)
        if not sequence:
            logger.warning(f"Séquence {request.sequence_id} non trouvée")
            raise HTTPException(status_code=404, detail="Séquence non trouvée")

        if sequence.user_id != current_user.id:
            logger.warning(f"Accès non autorisé à la séquence {request.sequence_id} par l'utilisateur {current_user.id}")
            raise HTTPException(status_code=403, detail="Vous n'avez pas accès à cette séquence")

        # Récupérer les ressources associées aux objets d'étude de la séquence
        ressources_disponibles = []
        if sequence and hasattr(sequence, 'study_objects') and sequence.study_objects:
            # Pour chaque objet d'étude, récupérer ses ressources associées
            for study_obj in sequence.study_objects:
                if hasattr(study_obj, 'resources') and study_obj.resources:
                    for resource in study_obj.resources:
                        # Formaté selon la structure attendue dans le template
                        ressources_disponibles.append({
                            "id": resource.id,
                            "title": resource.title,
                            "type": resource.type.value if hasattr(resource.type, 'value') else (resource.type.name if hasattr(resource.type, 'name') else "inconnu")
                        })

            # Log des ressources trouvées
            logger.info(f"Ressources récupérées pour la génération : {ressources_disponibles}")

        # Debug : afficher les objectifs liés à la séquence de manière lisible
        objectives_info = [f"ID: {obj.id}, Titre: {obj.title}" for obj in getattr(sequence, 'objectives', [])]
        logger.info(f"sequence.objectives = {objectives_info}")
        objectifs = []
        sequence_objectives = sequence.objectives if sequence else []
        for objective in sequence_objectives:
            objectifs.append({
                "id": objective.id,
                "title": objective.title,
                "description": getattr(objective, "description", None) or ""
            })

        # Récupérer les objets d'étude de la séquence avec leurs œuvres associées
        from crud.sequence import get_sequence_with_objects
        sequence_with_objects = await get_sequence_with_objects(db, request.sequence_id)

        formatted_study_objects = []
        if sequence_with_objects and sequence_with_objects.get('study_objects'):
            for study_obj in sequence_with_objects['study_objects']:
                # Formater l'objet d'étude avec ses œuvres
                study_object_data = {
                    "id": study_obj.id,
                    "title": study_obj.title,
                    "description": getattr(study_obj, 'description', None),
                    "oeuvres": []
                }

                # Ajouter les œuvres associées si elles existent
                if hasattr(study_obj, 'oeuvres') and study_obj.oeuvres:
                    for oeuvre in study_obj.oeuvres:
                        # Récupérer les informations d'auteur de manière robuste
                        auteur_info = {}
                        if hasattr(oeuvre, 'auteur') and oeuvre.auteur:
                            if isinstance(oeuvre.auteur, dict):
                                auteur_info = oeuvre.auteur
                            elif hasattr(oeuvre.auteur, '__dict__'):
                                auteur_info = oeuvre.auteur.__dict__
                            else:
                                auteur_info = {"nom": str(oeuvre.auteur)}

                        oeuvre_data = {
                            "id": oeuvre.id,
                            "titre": oeuvre.titre,
                            "auteur_complet": getattr(oeuvre, 'auteur_complet', ''),
                            "auteur": auteur_info,
                            "type": getattr(oeuvre, 'type', ''),
                            "genre": getattr(oeuvre, 'genre', None),
                            "date_publication": getattr(oeuvre, 'date_publication', None),
                            "extrait": getattr(oeuvre, 'extrait', False),
                            "mouvement_litteraire": getattr(oeuvre, 'mouvement_litteraire', None),
                            "langue_originale": getattr(oeuvre, 'langue_originale', None),
                            "contenu": getattr(oeuvre, 'contenu', None),
                            "pedagogie": getattr(oeuvre, 'pedagogie', None),
                            "tags": getattr(oeuvre, 'tags', [])
                        }
                        study_object_data["oeuvres"].append(oeuvre_data)

                formatted_study_objects.append(study_object_data)

            # Log pour déboguer
            study_objects_info = [f"ID: {so['id']}, Titre: {so['title']}, Œuvres: {len(so['oeuvres'])}" for so in formatted_study_objects]
            logger.info(f"Objets d'étude formatés avec œuvres : {study_objects_info}")

        logger.info(f"Objets d'étude formatés pour le prompt : {formatted_study_objects}")

        generation_result = await ai_resource_service.generate_ai_sessions(
            sequence_id=request.sequence_id,
            sequence_title=sequence.title,
            description_sequence=request.description_sequence or sequence.description or "",
            niveau=request.niveau,
            nombre_seances=request.nombre_seances,
            inclure_ressources=request.inclure_ressources,
            ressources_disponibles=ressources_disponibles,
            objectifs=objectifs,
            study_objects=formatted_study_objects,
            instructions_supplementaires=request.instructions_supplementaires,
            user_id=current_user.id
        )

        # Vérifier que nous avons bien les séances dans la réponse
        if "sessions" not in generation_result or not generation_result["sessions"]:
            logger.warning("Aucune séance n'a été générée dans la réponse de l'IA")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Aucune séance n'a été générée. Veuillez réessayer."
            )

        return {"sessions": generation_result["sessions"]}

    except ai_resource_service.ResourceGenerationError as e:
        logger.error(f"Erreur lors de la génération de séances: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur de génération : {str(e)}"
        )
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la génération de séances: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur inattendue s'est produite: {str(e)}"
        )

@router.get(
    "/{session_id}/available-supports",
    response_model=List[ResourceResponse],
    summary="Récupère les œuvres disponibles dans une session comme supports potentiels",
    description="Retourne la liste des ressources de type 'oeuvre' associées à la session spécifiée."
)
async def get_available_supports(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Récupère les ressources de type 'oeuvre' disponibles dans une session pour servir de support à la génération d'exercices.
    """
    logger.info(f"[TRACE] API GET /ai/sessions/{session_id}/available-supports appelé par user_id={current_user.id} email={current_user.email}")

    try:
        # Récupérer les ressources 'OEUVRE' liées directement à la session
        # ET celles liées aux objets d'étude de la séquence parente
        resources = get_available_supports_for_session(db, session_id=session_id)

        if not resources:
            logger.info(f"Aucun support 'OEUVRE' disponible pour la session {session_id}")
            return []

        # S'assurer que les références Pydantic sont résolues (au cas où le module schemas/__init__ n'a pas été importé)
        try:
            ResourceResponse.model_rebuild()
        except Exception:
            pass
        # Convertir en schéma Pydantic pour la réponse (inclut type/sub_type et oeuvres)
        return [ResourceResponse.model_validate(resource, from_attributes=True) for resource in resources]

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des supports pour la session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur est survenue lors de la récupération des supports disponibles: {str(e)}"
        )