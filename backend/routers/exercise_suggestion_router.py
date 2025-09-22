from fastapi import APIRouter, HTTPException, status, Depends, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging
import os

from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel
from backend.ai import ai_resource_service
from backend.crud.session import get_session_by_id
from backend.crud.sequence import get_sequence
from backend.crud.resource import get_resource, get_resources_by_session_and_type, get_available_supports_for_session
from backend.schemas.ai_suggestion import AISuggestionResponse
from config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/exercise-suggestions",
    tags=["Exercise Suggestions"],
)

settings = get_settings()

# Définition du modèle pour les paramètres de configuration des exercices
class ExerciseConfigParams(BaseModel):
    niveau_classe: Optional[str] = None
    nombre_ressources: Optional[int] = None
    type_resources: Optional[List[Dict[str, str]]] = None  # Liste des types/sous-types de ressources à inclure
    support_id: Optional[int] = None  # ID de la ressource de type 'oeuvre' à utiliser comme support

@router.post(
    "/sessions/{session_id}/suggest-exercises",
    response_model=AISuggestionResponse,
    summary="Suggère des types d'exercices pour une session donnée",
    description="Analyse une session et suggère des types d'exercices pertinents à générer par IA."
)
async def suggest_exercises_for_session_endpoint(
    session_id: int,
    config_params: ExerciseConfigParams = Body(default=None),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    logger.info(f"[TRACE] API POST /ai/sessions/{session_id}/suggest-exercises appelé par user_id={getattr(current_user, 'id', '?')} email={getattr(current_user, 'email', '?')}")

    # 1. Récupérer les détails de la session
    session = get_session_by_id(db, session_id=session_id)
    if not session:
        logger.error(f"Session ID {session_id} non trouvée.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session non trouvée")

    # 2. Récupérer les objectifs de la session (titre + description si disponible)
    session_objectives_titles = []
    for obj in session.objectives:
        if obj and obj.title:
            if getattr(obj, 'description', None):
                session_objectives_titles.append(f"{obj.title} — {obj.description}")
            else:
                session_objectives_titles.append(obj.title)

    # 3. Récupérer les objets d'étude de la séquence parente
    sequence_study_objects_titles = []
    if session.sequence_id:
        sequence = get_sequence(db, sequence_id=session.sequence_id)
        if sequence and sequence.study_objects:
            # Inclure la description des objets d'étude si disponible
            for so in sequence.study_objects:
                if so and so.title:
                    if getattr(so, 'description', None):
                        sequence_study_objects_titles.append(f"{so.title} — {so.description}")
                    else:
                        sequence_study_objects_titles.append(so.title)

    # 4. Récupérer un résumé des ressources existantes pour la session
    existing_resources_summary = []
    if session.resources:
        for res in session.resources:
            # Utiliser value ou key au lieu de name qui n'existe pas dans ResourceSubType/ResourceType
            summary = f"{res.sub_type.value if res.sub_type else res.type.value}: '{res.title}'"
            if res.source_type == "ai":
                summary += " (IA)"
            existing_resources_summary.append(summary)

    # 5. Préparation des paramètres de configuration pour le prompt IA
    config_dict = {}
    if config_params:
        if config_params.niveau_classe:
            config_dict['niveau_classe'] = config_params.niveau_classe
        if config_params.nombre_ressources:
            config_dict['nombre_ressources'] = config_params.nombre_ressources
        if config_params.type_resources:
            config_dict['type_resources'] = config_params.type_resources
            logger.info(f"Types de ressources spécifiés: {config_params.type_resources}")

        # Récupération du support si spécifié
        if config_params.support_id:
            logger.info(f"DEBUG: Support ID reçu: {config_params.support_id}")
            support_resource = get_resource(db, resource_id=config_params.support_id)
            if not support_resource:
                logger.warning(f"Support ID {config_params.support_id} non trouvé")
            else:
                # Afficher le type de support à titre informatif
                logger.info(f"Type de support: {support_resource.type.key if support_resource.type else 'inconnu'}, subtype: {support_resource.sub_type.key if support_resource.sub_type else 'inconnu'}")
                # Accepter tous les types de supports
                # Ajouter l'information du support à la configuration
                # Lire le contenu du fichier à partir du chemin file_path
                content = ""
                try:
                    upload_dir = settings.UPLOADS_BASE_DIR
                    # 1) Tenter la lecture du Markdown Docling si disponible
                    docling_md_path = getattr(support_resource, 'docling_md_path', None)
                    chosen_path = None
                    if docling_md_path:
                        md_abs_path = os.path.join(upload_dir, docling_md_path)
                        if os.path.exists(md_abs_path):
                            with open(md_abs_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            chosen_path = md_abs_path
                            logger.info(f"Support: utilisation du Markdown Docling: {md_abs_path}")
                        else:
                            logger.warning(f"Docling MD introuvable: {md_abs_path}. Tentative de déduction via docling_tables_path.")

                    # 1b) Si tables HTML Docling existent, deviner un .md voisin
                    if not content:
                        tables_rel = getattr(support_resource, 'docling_tables_path', None)
                        if tables_rel:
                            try:
                                tables_abs = os.path.join(upload_dir, tables_rel)
                                base_dir = os.path.dirname(tables_abs)
                                base_name = os.path.basename(tables_abs)
                                md_candidates = []
                                if base_name.endswith('_tables.html'):
                                    md_candidates.append(os.path.join(base_dir, base_name.replace('_tables.html', '.md')))
                                if base_name.endswith('.html'):
                                    md_candidates.append(os.path.join(base_dir, base_name[:-5] + '.md'))
                                # Essayer les candidats
                                for cand in md_candidates:
                                    if os.path.exists(cand):
                                        with open(cand, 'r', encoding='utf-8') as f:
                                            content = f.read()
                                        chosen_path = cand
                                        logger.info(f"Support: utilisation du Markdown Docling deviné: {cand}")
                                        break
                                # Sinon chercher n'importe quel .md dans le dossier
                                if not content and os.path.isdir(base_dir):
                                    for name in os.listdir(base_dir):
                                        if name.lower().endswith('.md'):
                                            cand = os.path.join(base_dir, name)
                                            with open(cand, 'r', encoding='utf-8') as f:
                                                content = f.read()
                                            chosen_path = cand
                                            logger.info(f"Support: utilisation du Markdown Docling trouvé dans le dossier: {cand}")
                                            break
                            except Exception as e_md_guess:
                                logger.warning(f"Echec de déduction du Markdown via docling_tables_path: {e_md_guess}")

                    # 2) Repli: fichier original (peut être PDF, donc possiblement illisible en texte)
                    if not content:
                        file_path = support_resource.file_path
                        if file_path:
                            absolute_path = os.path.join(upload_dir, file_path)
                            if os.path.exists(absolute_path):
                                try:
                                    with open(absolute_path, 'r', encoding='utf-8') as f:
                                        content = f.read()
                                    chosen_path = absolute_path
                                    logger.info(f"Support: utilisation du fichier original (texte): {absolute_path}")
                                except Exception as e_txt:
                                    logger.warning(f"Lecture texte du fichier original échouée ({absolute_path}): {e_txt}")
                            else:
                                logger.warning(f"Le fichier original n'existe pas : {absolute_path}")
                        else:
                            logger.warning(f"Chemin de fichier non spécifié pour la ressource ID {support_resource.id}")

                    # 3) Dernier recours: utiliser le HTML des tables Docling si présent
                    if not content:
                        tables_rel = getattr(support_resource, 'docling_tables_path', None)
                        if tables_rel:
                            tables_abs = os.path.join(upload_dir, tables_rel)
                            if os.path.exists(tables_abs):
                                try:
                                    with open(tables_abs, 'r', encoding='utf-8') as f:
                                        content = f.read()
                                    chosen_path = tables_abs
                                    logger.info(f"Support: utilisation du HTML des tables Docling (fallback): {tables_abs}")
                                except Exception as e_html:
                                    logger.warning(f"Lecture HTML des tables échouée ({tables_abs}): {e_html}")

                    # Log de statut Docling pour diagnostic
                    logger.info(
                        f"Docling status pour support ID {support_resource.id}: "
                        f"status={getattr(support_resource, 'docling_status', None)}, "
                        f"md_path={getattr(support_resource, 'docling_md_path', None)}, "
                        f"tables_path={getattr(support_resource, 'docling_tables_path', None)}, "
                        f"chars={getattr(support_resource, 'docling_chars', None)}, "
                        f"chosen={chosen_path}"
                    )
                except Exception as e:
                    logger.error(f"Erreur lors de la lecture du support: {e}")

                config_dict['support'] = {
                    'id': support_resource.id,
                    'title': support_resource.title,
                    'type': support_resource.type.key if support_resource.type else '',
                    'subtype': support_resource.sub_type.key if support_resource.sub_type else '',
                    'content': content
                }
                logger.info(f"DEBUG: Support ajouté à config_dict avec titre: {support_resource.title}")
                logger.info(f"DEBUG: Contenu du support (extrait): {content[:100] if content else 'Vide'}...")
                logger.info(f"Support utilisé pour la génération: {support_resource.title} (ID: {support_resource.id})")
        else:
            logger.info("DEBUG: Aucun support_id reçu dans config_params")

    # 5b. Récupération des ressources disponibles pour les exercices
    # Récupérer les vraies ressources (pas les œuvres) pour les passer au prompt
    available_resource_ids = []
    try:
        # Récupérer toutes les ressources de la session (tous types)
        session_resources = get_resources_by_session_and_type(db, session_id=session_id, type_key=None, subtype_key=None)
        if session_resources:
            available_resource_ids = [r.id for r in session_resources]
            logger.info(f"Ressources disponibles pour les exercices: {available_resource_ids}")
        else:
            logger.info("Aucune ressource disponible dans la session pour les exercices")
    except Exception as e:
        logger.warning(f"Erreur lors de la récupération des ressources disponibles: {e}")

    if available_resource_ids:
        config_dict['available_resource_ids'] = available_resource_ids
        logger.info(f"DEBUG: available_resource_ids ajouté à config_dict: {available_resource_ids}")

        # Pour les suggestions d'exercices, nous devons aussi passer resource_ids
        # car c'est ce que les templates d'exercices attendent
        config_dict['resource_ids'] = available_resource_ids
        logger.info(f"DEBUG: resource_ids ajouté à config_dict pour les exercices: {available_resource_ids}")

    logger.info(f"Configuration pour suggestion d'exercices: {config_dict}")

    # 6. Appeler le service de suggestion avec les nouveaux paramètres
    try:
        suggestions_data = await ai_resource_service.suggest_exercise_types_for_session(
            session_title=session.title or "Session sans titre",
            session_description=session.notes or "",
            session_objectives=session_objectives_titles,
            sequence_study_objects=sequence_study_objects_titles,
            existing_resources_summary=existing_resources_summary,
            **config_dict
        )

        # Transformation de la réponse de l'IA pour correspondre au schéma attendu
        if "suggested_exercises" in suggestions_data and "suggestions" not in suggestions_data:
            # L'IA a renvoyé la clé 'suggested_exercises' au lieu de 'suggestions'
            logger.info("Transformation de 'suggested_exercises' en 'suggestions' pour correspondre au schéma")
            suggestions_data = {"suggestions": suggestions_data["suggested_exercises"]}

        # Vérification que la structure est correcte avant de créer l'objet Pydantic
        if "suggestions" not in suggestions_data:
            logger.error(f"La réponse de l'IA ne contient ni 'suggestions' ni 'suggested_exercises': {suggestions_data}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Format de réponse IA incorrect pour les suggestions d'exercices"
            )

        return AISuggestionResponse(**suggestions_data)

    except ai_resource_service.ResourceGenerationError as e:
        logger.error(f"Erreur de génération IA lors de la suggestion d'exercices pour session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la suggestion d'exercices pour session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Une erreur interne est survenue.")