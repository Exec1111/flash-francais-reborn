from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse, ResourceFileUpload, ResourceListResponse
from schemas.study_object import StudyObjectReadShort
from database import get_db
import crud.resource
from crud.resource import get_upload_path
from dependencies import get_current_active_user
from models import User as UserModel
from ai.services.template_resolver import TemplateResolver
from ai.utils.html_cleaner import clean_html, remove_empty_blocks_and_breaks
from .resource_utils import html_to_qcm_json, html_to_champlex_json
import logging
import os
import shutil
from pathlib import Path
import json as jsonlib
from config import get_settings
from werkzeug.utils import secure_filename

settings = get_settings()
logger = logging.getLogger(__name__)

resource_crud_router = APIRouter()

@resource_crud_router.post("/", response_model=ResourceResponse)
async def create_resource_route(
    *, # Force keyword-only args
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    current_user: UserModel = Depends(get_current_active_user),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    type_id: int = Form(...),
    sub_type_id: Optional[int] = Form(None),
    source_type: Optional[str] = Form(None), # 'file' ou 'ai', par défaut 'ai'
    session_ids_json: Optional[str] = Form("[]"), # Accepter une string JSON pour la liste d'IDs
    objective_ids_json: Optional[str] = Form("[]"), # Accepter une string JSON pour la liste d'IDs d'objectifs
    study_object_ids_json: Optional[str] = Form("[]"), # Accepter une string JSON pour la liste d'IDs d'objets d'étude
    oeuvre_ids_json: Optional[str] = Form("[]"), # Accepter une string JSON pour la liste d'IDs d'oeuvres
    file: Optional[UploadFile] = File(None), # Le fichier uploadé
    html_path: Optional[str] = Form(None), # Chemin HTML généré pour IA
    ai_content_json: Optional[str] = Form(None) # Contenu JSON généré par IA (pour exercices dynamiques)
):
    """Crée une nouvelle ressource.
    Si source_type est 'file', un fichier doit être uploadé.
    Sinon (si 'ai'), le fichier est ignoré.
    session_ids doit être une string JSON valide (ex: "[1, 2, 3]")
    """
    logger.info(f"Tentative de création de ressource par l'utilisateur {current_user.id}")

    # Si non précisé et pas de fichier, on considère IA
    if not source_type:
        source_type = 'ai'

    # Parser les IDs de session depuis la string JSON
    try:
        session_ids = jsonlib.loads(session_ids_json) if session_ids_json else []
        if not isinstance(session_ids, list):
            raise ValueError("session_ids_json doit être une liste JSON.")
        # Convertir les IDs en int (et filtrer les None potentiels)
        session_ids = [int(sid) for sid in session_ids if sid is not None]
    except (jsonlib.JSONDecodeError, ValueError) as e:
        logger.error(f"Erreur de parsing JSON pour session_ids: {e}")
        raise HTTPException(status_code=400, detail=f"Format invalide pour session_ids_json: {e}")

    # Parser les IDs d'objectifs depuis la string JSON
    try:
        objective_ids = jsonlib.loads(objective_ids_json) if objective_ids_json else []
        if not isinstance(objective_ids, list):
            raise ValueError("objective_ids_json doit être une liste JSON.")
        # Convertir les IDs en int (et filtrer les None potentiels)
        objective_ids = [int(oid) for oid in objective_ids if oid is not None]
    except (jsonlib.JSONDecodeError, ValueError) as e:
        logger.error(f"Erreur de parsing JSON pour objective_ids: {e}")
        raise HTTPException(status_code=400, detail=f"Format invalide pour objective_ids_json: {e}")

    # Parser les IDs d'objets d'étude depuis la string JSON
    try:
        study_object_ids = jsonlib.loads(study_object_ids_json) if study_object_ids_json else []
        if not isinstance(study_object_ids, list):
            raise ValueError("study_object_ids_json doit être une liste JSON.")
        study_object_ids = [int(soid) for soid in study_object_ids if soid is not None]
    except (jsonlib.JSONDecodeError, ValueError) as e:
        logger.error(f"Erreur de parsing JSON pour study_object_ids: {e}")
        raise HTTPException(status_code=400, detail=f"Format invalide pour study_object_ids_json: {e}")

    # Parser les IDs d'oeuvres depuis la string JSON
    try:
        oeuvre_ids = jsonlib.loads(oeuvre_ids_json) if oeuvre_ids_json else []
        if not isinstance(oeuvre_ids, list):
            raise ValueError("oeuvre_ids_json doit être une liste JSON.")
        oeuvre_ids = [int(oid) for oid in oeuvre_ids if oid is not None]
    except (jsonlib.JSONDecodeError, ValueError) as e:
        logger.error(f"Erreur de parsing JSON pour oeuvre_ids: {e}")
        raise HTTPException(status_code=400, detail=f"Format invalide pour oeuvre_ids_json: {e}")

    # --- Validation du fichier uploadé ---
    if source_type == 'file':
        if file is None:
            raise HTTPException(status_code=400, detail="Un fichier est requis lorsque source_type est 'file'")

        if file.content_type not in settings.ALLOWED_UPLOAD_MIME_TYPES:
            logger.error(f"File type not allowed: {file.content_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Type de fichier non autorisé. Seuls les fichiers {', '.join(settings.ALLOWED_UPLOAD_MIME_TYPES)} sont acceptés."
            )

        actual_size = file.size
        if actual_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            logger.error(f"File size exceeded limit: {actual_size} bytes")
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Le fichier est trop volumineux. La taille maximale est de {settings.MAX_UPLOAD_SIZE_MB} Mo."
            )
        logger.info(f"File validation passed for {file.filename}")
    # -------------------------------------

    # Préparer les données pour le schéma ResourceCreate
    resource_data = ResourceCreate(
        title=title,
        description=description,
        type_id=type_id,
        sub_type_id=sub_type_id,
        source_type=source_type,
        session_ids=session_ids,
        objective_ids=objective_ids, # Passer la liste parsée
        study_object_ids=study_object_ids, # Passer la liste parsée des IDs d'objets d'étude
        oeuvre_ids=oeuvre_ids, # Passer la liste parsée des IDs d'oeuvres
        user_id=current_user.id
    )

    file_upload_data: Optional[ResourceFileUpload] = None
    temp_file_path: Optional[str] = None

    # Gérer le fichier uploadé si source_type est 'file'
    if source_type == 'file':
        # Sécuriser le nom de fichier
        safe_filename = secure_filename(file.filename)
        if not safe_filename: # Vérifier si secure_filename n'a pas tout supprimé
              raise HTTPException(status_code=400, detail="Nom de fichier invalide.")

        # Construire le chemin ABSOLU sur le disque Render
        user_upload_dir_on_disk = Path(settings.UPLOADS_BASE_DIR) / "uploads" / str(current_user.id)
        user_upload_dir_on_disk.mkdir(parents=True, exist_ok=True) # Crée /var/data/uploads-storage/uploads/USER_ID/
        final_file_path_on_disk = user_upload_dir_on_disk / safe_filename

        # Construire le chemin relatif pour la BDD (identique à la structure des ressources IA)
        # Format: uploads/USER_ID/filename
        relative_path_for_db = get_upload_path(current_user.id, safe_filename)

        # Sauvegarder le fichier sur le disque
        try:
            with open(final_file_path_on_disk, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"Fichier '{safe_filename}' sauvegardé dans '{final_file_path_on_disk}' pour user {current_user.id}")
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du fichier {safe_filename} sur disque: {e}")
            # Supprimer le fichier potentiellement partiellement écrit ?
            if final_file_path_on_disk.exists():
                final_file_path_on_disk.unlink()
            raise HTTPException(status_code=500, detail="Erreur interne lors de la sauvegarde du fichier.")
        finally:
              # S'assurer que le file descriptor est fermé (important avec UploadFile)
              await file.close()

        # Préparer les informations du fichier pour le CRUD
        file_upload_data = ResourceFileUpload(
            file_name=safe_filename,
            file_type=file.content_type,
            file_size=file.size
        )

    # Appeler la fonction CRUD pour créer la ressource en BDD
    try:
        db_resource = crud.resource.create_resource(
            db=db,
            resource=resource_data,
            user_id=current_user.id,
            file_upload=file_upload_data # Utiliser 'file_upload' et passer les données du fichier (peut être None)
            # Ne pas passer 'file_path_url' car absent de la signature actuelle
        )
        logger.info(f"Ressource créée avec ID: {db_resource.id}")
        # Calculer et stocker le SHA-256 du fichier uploadé si applicable
        try:
            if source_type == 'file' and final_file_path_on_disk and final_file_path_on_disk.exists():
                sha256 = hashlib.sha256()
                with open(final_file_path_on_disk, 'rb') as f:
                    for chunk in iter(lambda: f.read(8192), b""):
                        sha256.update(chunk)
                db_resource.docling_sha256 = sha256.hexdigest()
                db.add(db_resource)
                db.commit()
                db.refresh(db_resource)
                logger.info(f"SHA-256 calculé et stocké pour resource_id={db_resource.id}")
        except Exception as e_sha:
            logger.warning(f"Impossible de calculer/stockER le SHA-256 pour resource_id={db_resource.id}: {e_sha}")
        # La fonction CRUD retourne maintenant l'objet SQLAlchemy chargé
        # FastAPI s'occupe de la conversion vers ResourceResponse grâce à `response_model`
        if source_type == 'ai' and html_path:
            # Déterminer type/sous-type de la ressource
            st = getattr(db_resource, 'sub_type', None)
            st_key = (getattr(st, 'key', '') or '').strip().lower()
            t = getattr(db_resource, 'type', None)
            t_key = (getattr(t, 'key', '') or '').strip().lower()

            # Résoudre le chemin source du HTML généré (quel que soit le type) pour éventuel parsing
            norm_html_path = str(html_path).replace('\\', '/')
            if norm_html_path.startswith('http'):
                rel_public = norm_html_path.split('/static/')[-1]
                src = Path(__file__).resolve().parent.parent / 'static' / rel_public
            elif norm_html_path.startswith('/static/'):
                rel_public = norm_html_path.split('/static/')[-1]
                src = Path(__file__).resolve().parent.parent / 'static' / rel_public
            elif norm_html_path.startswith('static/'):
                rel_public = norm_html_path.split('static/')[-1]
                src = Path(__file__).resolve().parent.parent / 'static' / rel_public
            else:
                src = Path(html_path)

            # JSON-first: ne pas copier le fichier de prévisualisation; on utilisera data_json + runtime
            if html_path in ('/api/v1/ai/champlex2-json-placeholder', '/api/v1/ai/champlex-json-placeholder', '/api/v1/ai/qcm-json-placeholder', '/api/v1/ai/pendu-json-placeholder') or \
               (t_key == 'exercice' and st_key in ['qcm', 'champlex', 'champlex2', 'pendu']):
                logger.info(f"[AI->Resource] JSON-first détecté pour {t_key}/{st_key}: pas de copie de fichier HTML (html_path={html_path})")
                dest = None  # Pas de fichier copié
            else:
                # Copier le fichier HTML généré par l'IA vers le dossier uploads (ancien système)
                logger.info(f"[AI->Resource] html_path reçu='{html_path}', normalisé='{norm_html_path}', src_resolu='{src}'")
                filename = src.name
                rel_path = get_upload_path(current_user.id, filename)
                dest = Path(settings.UPLOADS_BASE_DIR) / rel_path
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(src, dest)
                # Enregistrer le chemin relatif dans la BDD
                db_resource.file_path = rel_path
                db.add(db_resource)
                db.commit()
                db.refresh(db_resource)

            # Générer automatiquement le runtime pour les exercices dynamiques
            try:
                st = getattr(db_resource, 'sub_type', None)
                st_key = (getattr(st, 'key', '') or '').strip().lower()
                t = getattr(db_resource, 'type', None)
                t_key = (getattr(t, 'key', '') or '').strip().lower()

                logger.info(f"[DEBUG_CREATE] ai_content_json reçu: {ai_content_json is not None}")
                logger.info(f"[DEBUG_CREATE] ai_content_json contenu (100 premiers chars): {str(ai_content_json)[:100] if ai_content_json else 'None'}")
                if t_key == 'exercice' and st_key in ['qcm', 'champlex', 'champlex2', 'pendu']:
                    parsed_data_json = None

                    # JSON-first
                    if st_key in ['champlex2', 'champlex', 'qcm', 'pendu'] and ai_content_json:
                        try:
                            parsed_data_json = jsonlib.loads(ai_content_json)
                            if st_key == 'champlex2':
                                logger.info(f"[CREATE/CHAMPLEX2] data_json depuis IA JSON pour resource_id={db_resource.id} (mots={len(parsed_data_json.get('mots', []) or [])})")
                            elif st_key == 'champlex':
                                logger.info(f"[CREATE/CHAMPLEX] data_json depuis IA JSON pour resource_id={db_resource.id} (champs={len(parsed_data_json.get('champs', []) or [])})")
                            elif st_key == 'qcm':
                                logger.info(f"[CREATE/QCM] data_json depuis IA JSON pour resource_id={db_resource.id} (questions={len(parsed_data_json.get('questions', []) or [])})")
                            elif st_key == 'pendu':
                                logger.info(f"[CREATE/PENDU] data_json depuis IA JSON pour resource_id={db_resource.id} (mots={len(parsed_data_json.get('liste_mots', []) or [])})")
                        except jsonlib.JSONDecodeError as je:
                            logger.error(f"[CREATE/{st_key.upper()}] JSON invalide depuis IA: {je}")

                    # QCM et fallback Champlex: parsing HTML traditionnel si aucun JSON fourni
                    elif st_key in ['qcm', 'champlex']:
                        # Lire depuis le fichier copié si présent, sinon depuis la source de prévisualisation
                        html_source_path = dest if 'dest' in locals() and dest else src
                        html_content_created = html_source_path.read_text(encoding='utf-8', errors='ignore')
                        if st_key == 'qcm':
                            parsed_data_json = html_to_qcm_json(html_content_created)
                            logger.info(f"[CREATE/QCM] data_json parsé depuis HTML pour resource_id={db_resource.id} (questions={len(parsed_data_json.get('questions', []))})")
                        elif st_key == 'champlex':
                            parsed_data_json = html_to_champlex_json(html_content_created)
                            logger.info(f"[CREATE/CHAMPLEX] data_json parsé depuis HTML pour resource_id={db_resource.id} (champs={len(parsed_data_json.get('champs', []) or [])})")

                    # Générer le runtime si on a des données
                    if parsed_data_json:
                        _, runtime_template_path, resolved_template_key = TemplateResolver.resolve_templates(t_key, st_key)
                        if runtime_template_path and runtime_template_path.exists():
                            raw_template = runtime_template_path.read_text(encoding='utf-8')
                            data_str = jsonlib.dumps(parsed_data_json, ensure_ascii=False)
                            # Supporter plusieurs placeholders selon les templates
                            injected = raw_template.replace('<!--ACTIVITY_DATA_JSON-->', data_str)
                            injected = injected.replace('<!--QCM_DATA_JSON-->', data_str)
                            injected = injected.replace('<!--CHAMPLEX_DATA_JSON-->', data_str)
                            injected = injected.replace('<!--PENDU_DATA_JSON-->', data_str)
                            runtime_rel = get_upload_path(current_user.id, f"runtime_{st_key}_{db_resource.id}.html")
                            runtime_abs = Path(settings.UPLOADS_BASE_DIR) / runtime_rel
                            runtime_abs.parent.mkdir(parents=True, exist_ok=True)
                            runtime_abs.write_text(injected, encoding='utf-8')

                            # Persister champs liés au runtime
                            db_resource.runtime_html_path = runtime_rel
                            db_resource.data_json = parsed_data_json
                            # Figer template
                            if not getattr(db_resource, 'template_key', None):
                                db_resource.template_key = resolved_template_key
                            if not getattr(db_resource, 'template_version', None):
                                db_resource.template_version = 1
                            db.add(db_resource)
                            db.commit()
                            db.refresh(db_resource)
                            logger.info(f"[CREATE/{st_key.upper()}] Runtime HTML généré et persisté: {runtime_abs}")

                            # Nettoyage: supprimer le fichier de prévisualisation si présent (static/tmp)
                            try:
                                if 'src' in locals() and isinstance(src, Path) and src.exists():
                                    static_tmp_dir = Path(__file__).resolve().parent.parent / 'static' / 'tmp'
                                    if static_tmp_dir in src.parents:
                                        src.unlink(missing_ok=True)
                                        logger.info(f"[CREATE/{st_key.upper()}] Fichier de prévisualisation supprimé: {src}")
                            except Exception as e_cleanup:
                                logger.warning(f"[CREATE/{st_key.upper()}] Impossible de supprimer le fichier de prévisualisation {src}: {e_cleanup}")
            except Exception as e:
                logger.error(f"Erreur lors de la génération du runtime pour resource_id={db_resource.id}: {e}")
                # Ne pas faire échouer la création pour autant
        # Déclencher extraction Docling en tâche de fond si PDF uploadé
        try:
            if db_resource and db_resource.source_type == 'file' and (db_resource.file_type == "application/pdf"):
                # Marquer en attente et sauvegarder avant de lancer la tâche
                db_resource.docling_status = "pending"
                db.add(db_resource)
                db.commit()
                db.refresh(db_resource)
                # Lancer la tâche asynchrone
                background_tasks.add_task(run_docling_extraction, db_resource.id, current_user.id, False)
                logger.info(f"Extraction Docling planifiée en arrière-plan pour resource_id={db_resource.id}")
        except Exception as e_bg:
            logger.error(f"Impossible de planifier l'extraction Docling pour resource_id={getattr(db_resource, 'id', None)}: {e_bg}")
        return db_resource
    except ValueError as e:
        # Si le CRUD lève une ValueError (ex: user/session non trouvé, fichier manquant)
        # Supprimer le fichier physique si on l'avait sauvegardé
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.warning(f"Fichier uploadé {temp_file_path} supprimé car la création de la ressource a échoué: {e}")
            except OSError as remove_err:
                logger.error(f"Erreur lors de la suppression du fichier après échec création {temp_file_path}: {remove_err}")
        logger.error(f"Erreur lors de la création de la ressource: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Autre erreur inattendue
        if temp_file_path and os.path.exists(temp_file_path):
              try:
                  os.remove(temp_file_path)
              except OSError as remove_err:
                  logger.error(f"Erreur lors de la suppression du fichier après échec création {temp_file_path}: {remove_err}")
        logger.error(f"Erreur serveur inattendue lors de la création de la ressource: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

# --- Route GET pour lister toutes les ressources de l'utilisateur ---
@resource_crud_router.get("/", response_model=ResourceListResponse)
async def read_resources(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(10, ge=1, le=200, description="Nombre maximum d'éléments à retourner"),
    search_term: Optional[str] = Query(None, min_length=1, max_length=100, alias="search"),
    type_id: Optional[int] = Query(None, ge=1, alias="typeId"),
    sub_type_id: Optional[int] = Query(None, ge=1, alias="subTypeId"),
    type_key: Optional[str] = Query(None, alias="typeKey")
):
    """Récupère la liste paginée des ressources pour l'utilisateur courant, avec options de filtrage."""
    logger.info(f"Lecture des ressources pour l'utilisateur {current_user.id} avec skip={skip}, limit={limit}, search='{search_term}', typeId={type_id}, subTypeId={sub_type_id}")

    resources_data = crud.resource.get_resources(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        search_term=search_term,
        type_id=type_id,
        sub_type_id=sub_type_id,
        type_key=type_key
    )

    # Convertir les objets SQLAlchemy en schémas Pydantic ResourceResponse
    try:
        pydantic_items = [ResourceResponse.from_orm(item) for item in resources_data["items"]]
    except Exception as e:
        logger.error(f"Error converting Resource ORM item to Pydantic schema: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error processing resource data")

    return ResourceListResponse(total=resources_data["total"], items=pydantic_items)

# --- Route GET pour les ressources d'une session spécifique ---
@resource_crud_router.get("/by_session/{session_id}", response_model=list[ResourceResponse])
async def read_resources_by_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    logger.info(f">>> ENTERING read_resources_by_session for session {session_id} <<<")
    """Récupère les ressources d'une session spécifique pour l'utilisateur courant."""
    # ---> AJOUT: Vérifier d'abord si la session existe et appartient à l'utilisateur
    from crud.session import get_session_by_id
    db_session = get_session_by_id(db=db, session_id=session_id)

    # Vérification existence ET appartenance
    if db_session is None or \
       db_session.sequence is None or \
       db_session.sequence.progression is None or \
       db_session.sequence.progression.user_id != current_user.id:
        logger.warning(f"Session {session_id} non trouvée ou non appartenant à l'utilisateur {current_user.id} lors de la demande de ressources.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found")

    logger.info(f"Lecture des ressources pour la session {session_id} par l'utilisateur {current_user.id}")
    # Utiliser les valeurs par défaut pour skip/limit dans la fonction CRUD
    resources = crud.resource.get_resources_by_session(db=db, session_id=session_id, user_id=current_user.id)

    if not resources:
        logger.warning(f"Aucune ressource trouvée pour la session {session_id} appartenant à l'utilisateur {current_user.id}")
    return resources

# --- Route GET pour les ressources standalone ---
@resource_crud_router.get("/standalone/", response_model=List[ResourceResponse])
def read_standalone_resources(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100
):
    """Récupère les ressources non associées à une session (pour l'utilisateur courant)."""
    logger.info(f"Lecture des ressources standalone pour l'utilisateur {current_user.id}")
    resources = crud.resource.get_standalone_resources_for_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    if resources is None:
        logger.warning(f"Fonctionnalité standalone pour user {current_user.id} non entièrement implémentée dans le CRUD.")
        return []
    return resources

# --- Route GET pour une ressource spécifique par ID ---
@resource_crud_router.get("/{resource_id}", response_model=ResourceResponse)
def read_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Récupère une ressource spécifique par son ID, avec les objets d'étude associés."""
    db_resource = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if db_resource.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this resource")
    # Construction de la liste des objets d'étude associés (id, title, description)
    study_objects = [StudyObjectReadShort.from_orm(obj) for obj in getattr(db_resource, "study_objects", [])]
    study_object_ids = [obj.id for obj in study_objects]
    # Construction de la réponse enrichie
    response = ResourceResponse.model_validate(db_resource)
    response_dict = response.model_dump()
    # Sérialisation explicite des objets Pydantic
    response_dict['study_objects'] = [obj.model_dump() for obj in study_objects]
    response_dict['study_object_ids'] = study_object_ids
    # Ajouter runtime_html_url si disponible
    try:
        runtime_rel = getattr(db_resource, 'runtime_html_path', None)
        if runtime_rel:
            # Construit URL publique via MEDIA_URL_PREFIX
            response_dict['runtime_html_url'] = f"{settings.MEDIA_URL_PREFIX}/{str(runtime_rel).lstrip('/')}".replace('\\\\', '/').replace('\\', '/')
    except Exception:
        pass
    return response_dict

@resource_crud_router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource_route(
    resource_id: int,
    *,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    type_id: Optional[int] = Form(None),
    sub_type_id: Optional[int] = Form(None),
    session_ids_json: Optional[str] = Form(None),
    objective_ids_json: Optional[str] = Form(None),
    study_object_ids_json: Optional[str] = Form(None),
    oeuvre_ids_json: Optional[str] = Form(None),
    source_type: Optional[str] = Form(None),
    html_content: Optional[str] = Form(None),
    data_json_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """Met à jour une ressource. Si un fichier est fourni, il remplace l'ancien (si existant)."""
    logger.info(f"Tentative de mise à jour de la ressource {resource_id} par l'utilisateur {current_user.id}")

    # Vérifier d'abord si la ressource existe et appartient à l'utilisateur
    db_resource_check = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource_check is None:
        logger.warning(f"Ressource {resource_id} non trouvée pour la mise à jour.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if db_resource_check.user_id != current_user.id:
        logger.error(f"Accès non autorisé pour la mise à jour de la ressource {resource_id} par l'utilisateur {current_user.id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this resource")

    # --- Écriture éventuelle du nouveau contenu HTML ---
    if html_content is not None and db_resource_check.source_type == 'ai' and db_resource_check.file_path:
        try:
            # Le chemin stocké est relatif à /media/uploads/
            relative_path = db_resource_check.file_path.lstrip('/')
            full_path = settings.UPLOADS_BASE_DIR / relative_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            original_html = None
            # Préserver les balises <style> existantes si le nouveau contenu n'en contient pas
            if not re.search(r"<style[\s>].*?</style>", html_content, flags=re.S|re.I):
                try:
                    if full_path.exists():
                        original_html = full_path.read_text(encoding="utf-8")
                        styles_match = re.findall(r"<style[\s>].*?</style>", original_html, flags=re.S|re.I)
                        if styles_match:
                            preserved_styles = "\n".join(styles_match)
                            html_content = f"{preserved_styles}\n{html_content}"
                except Exception as e_read:
                    logger.warning(f"Impossible de lire l'ancien fichier HTML pour extraire les styles : {e_read}")
            # Extraire les références d'images avant écriture pour calculer le diff
            try:
                if original_html is None and full_path.exists():
                    original_html = full_path.read_text(encoding="utf-8")
            except Exception:
                original_html = None

            old_imgs = set(re.findall(r"<img[^>]+src=[\"']([^\"']+)[\"']", original_html or ""))
            new_imgs = set(re.findall(r"<img[^>]+src=[\"']([^\"']+)[\"']", html_content))

            # Nettoyer le HTML avant sauvegarde
            if html_content:
                original_length = len(html_content)
                html_content = clean_html(html_content)
                mid_length = len(html_content)
                html_content = remove_empty_blocks_and_breaks(html_content)
                cleaned_length = len(html_content)
                logger.info(f"HTML nettoyé : {original_length} -> {mid_length} -> {cleaned_length} caractères")

            full_path.write_text(html_content, encoding="utf-8")
            logger.info(f"Fichier HTML {full_path} mis à jour avec succès pour la ressource {resource_id}.")
        except Exception as e:
            logger.error(f"Erreur lors de l'écriture du fichier HTML pour la ressource {resource_id}: {e}")
            raise HTTPException(status_code=500, detail="Erreur lors de l'enregistrement du contenu HTML")

    # Préparer un éventuel data_json parsé depuis le HTML (pour exercices interactifs)
    parsed_data_json = None
    runtime_rel_path: Optional[str] = None
    template_key_to_use: Optional[str] = None
    template_version_to_use: Optional[int] = None

    try:
        # --- Mode JSON-first pour dynamiques ---
        if data_json_text is not None:
            try:
                provided_json = jsonlib.loads(data_json_text)
            except jsonlib.JSONDecodeError as je:
                raise HTTPException(status_code=400, detail=f"data_json invalid JSON: {je}")

            st = getattr(db_resource_check, 'sub_type', None)
            st_key = (getattr(st, 'key', '') or '').strip().lower()
            t = getattr(db_resource_check, 'type', None)
            t_key = (getattr(t, 'key', '') or '').strip().lower()

            if not (t_key == 'exercice' and st_key in ['qcm', 'champlex', 'champlex2', 'pendu']):
                logger.warning(f"[JSON-FIRST] data_json ignoré pour type/subtype non dynamique: {t_key}/{st_key}")
            else:
                # Validation légère selon subtype
                if st_key == 'champlex2':
                    mots = provided_json.get('mots') or []
                    sol = provided_json.get('solution') or []
                    if not isinstance(mots, list) or not isinstance(sol, list) or len(mots) != len(sol):
                        raise HTTPException(status_code=400, detail="data_json invalide pour champlex2: 'mots' et 'solution' doivent être des listes de même longueur")
                elif st_key == 'champlex':
                    champs = provided_json.get('champs') or []
                    if not isinstance(champs, list):
                        raise HTTPException(status_code=400, detail="data_json invalide pour champlex: 'champs' doit être une liste")
                elif st_key == 'qcm':
                    questions = provided_json.get('questions') or []
                    if not isinstance(questions, list):
                        raise HTTPException(status_code=400, detail="data_json invalide pour qcm: 'questions' doit être une liste")
                elif st_key == 'pendu':
                    liste_mots = provided_json.get('liste_mots') or []
                    if not isinstance(liste_mots, list):
                        raise HTTPException(status_code=400, detail="data_json invalide pour pendu: 'liste_mots' doit être une liste")
                # Générer runtime depuis data_json
                _, runtime_template_path, resolved_template_key = TemplateResolver.resolve_templates(t_key, st_key)
                if runtime_template_path and runtime_template_path.exists():
                    raw_template = runtime_template_path.read_text(encoding='utf-8')
                    data_str = jsonlib.dumps(provided_json, ensure_ascii=False)
                    # Support de plusieurs placeholders selon le template
                    # Support de plusieurs placeholders selon le template
                    injected = raw_template.replace('<!--ACTIVITY_DATA_JSON-->', data_str)
                    injected = injected.replace('<!--QCM_DATA_JSON-->', data_str)
                    injected = injected.replace('<!--CHAMPLEX_DATA_JSON-->', data_str)
                    injected = injected.replace('<!--PENDU_DATA_JSON-->', data_str)
                    rel = get_upload_path(current_user.id, f"runtime_{st_key}_{resource_id}.html")
                    abs_path = Path(settings.UPLOADS_BASE_DIR) / rel
                    abs_path.parent.mkdir(parents=True, exist_ok=True)
                    abs_path.write_text(injected, encoding='utf-8')
                    runtime_rel_path = rel
                    parsed_data_json = provided_json
                    template_key_to_use = getattr(db_resource_check, 'template_key', None) or resolved_template_key
                    template_version_to_use = getattr(db_resource_check, 'template_version', None) or 1
                    logger.info(f"[JSON-FIRST/{st_key.upper()}] Runtime HTML généré: {abs_path}")
                    logger.info(f"[DEBUG] parsed_data_json défini: {parsed_data_json is not None}")
                    logger.info(f"[DEBUG] runtime_rel_path défini: {runtime_rel_path}")

        if html_content is not None:
            # Détecter un QCM: baser sur le sous-type lié s'il existe
            st = getattr(db_resource_check, 'sub_type', None)
            st_key = (getattr(st, 'key', '') or '').strip().lower()
            t = getattr(db_resource_check, 'type', None)
            t_key = (getattr(t, 'key', '') or '').strip().lower()
            # Gestion des exercices interactifs (exclut analysetexte et dictee qui sont statiques)
            if t_key == 'exercice' and st_key in ['qcm', 'champlex', 'pendu']:
                # Parser selon le type d'exercice (champlex2 utilise JSON-first uniquement)
                if st_key == 'qcm':
                    parsed_data_json = html_to_qcm_json(html_content)
                    logger.info(f"[QCM] data_json parsé depuis HTML pour resource_id={resource_id} (questions={len(parsed_data_json.get('questions', []))})")
                elif st_key == 'champlex':
                    parsed_data_json = html_to_champlex_json(html_content)
                    champs_count = len(parsed_data_json.get('champs', []) or [])
                    logger.info(f"[CHAMPLEX] data_json parsé depuis HTML pour resource_id={resource_id} (champs={champs_count})")

                # Déterminer et figer le template utilisé (clé par défaut si absent)
                try:
                    existing_tpl_key = getattr(db_resource_check, 'template_key', None)
                    existing_tpl_version = getattr(db_resource_check, 'template_version', None)
                except Exception:
                    existing_tpl_key = None
                    existing_tpl_version = None
                if not existing_tpl_key:
                    # Résoudre automatiquement la clé de template
                    _, _, resolved_template_key = TemplateResolver.resolve_templates(t_key, st_key)
                    template_key_to_use = resolved_template_key
                    template_version_to_use = 1
                else:
                    template_key_to_use = existing_tpl_key
                    template_version_to_use = existing_tpl_version or 1

                # Générer le HTML runtime à partir du template résolu automatiquement
                try:
                    # Résoudre le template runtime via TemplateResolver
                    _, runtime_template_path, resolved_template_key = TemplateResolver.resolve_templates(t_key, st_key)

                    if runtime_template_path and runtime_template_path.exists():
                        # Utiliser le template_key résolu si pas encore défini
                        if not template_key_to_use:
                            template_key_to_use = resolved_template_key
                            template_version_to_use = 1

                        raw_template = runtime_template_path.read_text(encoding='utf-8')
                        # Échapper les données JSON pour éviter les problèmes de syntaxe JavaScript
                        import json
                        parsed_data = json.loads(parsed_data_json)
                        escaped_data_json = json.dumps(parsed_data, ensure_ascii=False)
                        escaped_data_json = (escaped_data_json.replace('\\', '\\\\')
                                           .replace('</script>', '<\\/script>')
                                           .replace('</style>', '<\\/style>')
                                           .replace('"', '\\"')
                                           .replace('\n', '\\n')
                                           .replace('\r', '\\r')
                                           .replace('\t', '\\t'))
                        injected = raw_template.replace('<!--ACTIVITY_DATA_JSON-->', escaped_data_json)
                        injected = injected.replace('<!--PENDU_DATA_JSON-->', escaped_data_json)
                        # Écrire dans uploads/<user_id>/runtime_{subtype}_{resource_id}.html
                        rel = get_upload_path(current_user.id, f"runtime_{st_key}_{resource_id}.html")
                        abs_path = Path(settings.UPLOADS_BASE_DIR) / rel
                        abs_path.parent.mkdir(parents=True, exist_ok=True)
                        abs_path.write_text(injected, encoding='utf-8')
                        runtime_rel_path = rel
                        logger.info(f"[{t_key.upper()}/{st_key.upper()}] Runtime HTML généré: {abs_path} (template: {runtime_template_path.name})")
                    else:
                        logger.warning(f"[{t_key.upper()}/{st_key.upper()}] Template runtime non trouvé: {runtime_template_path}")
                except Exception as e_gen:
                    logger.warning(f"[{t_key.upper()}/{st_key.upper()}] Échec génération HTML runtime pour resource_id={resource_id}: {e_gen}")

            # L'analyse de texte est statique - pas de runtime dynamique nécessaire
            elif t_key == 'exercice' and st_key == 'analysetexte':
                logger.info(f"[ANALYSETEXTE] Type statique détecté - pas de runtime dynamique pour resource_id={resource_id}")
    except Exception as e_parse:
        logger.warning(f"[EXERCICE] Échec parsing HTML→JSON pour resource_id={resource_id}: {e_parse}")

    # --- Parsing des IDs de session ---
    session_ids: Optional[List[int]] = None
    if session_ids_json is not None:
        try:
            parsed_ids = jsonlib.loads(session_ids_json)
            if not isinstance(parsed_ids, list):
                raise ValueError("session_ids_json doit être une liste JSON.")
            session_ids = [int(sid) for sid in parsed_ids if sid is not None]
            logger.info(f"Session IDs parsés pour MAJ: {session_ids}")
        except (jsonlib.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour session_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour session_ids_json: {e}")

    # --- Parsing des IDs d'objectifs ---
    objective_ids: Optional[List[int]] = None
    if objective_ids_json is not None:
        try:
            parsed_ids = jsonlib.loads(objective_ids_json)
            if not isinstance(parsed_ids, list):
                raise ValueError("objective_ids_json doit être une liste JSON.")
            objective_ids = [int(oid) for oid in parsed_ids if oid is not None]
            logger.info(f"Objective IDs parsés pour MAJ: {objective_ids}")
        except (jsonlib.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour objective_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour objective_ids_json: {e}")

    # --- Parsing des IDs d'objets d'étude ---
    study_object_ids: Optional[List[int]] = None
    if study_object_ids_json is not None:
        try:
            parsed_ids = jsonlib.loads(study_object_ids_json)
            if not isinstance(parsed_ids, list):
                raise ValueError("study_object_ids_json doit être une liste JSON.")
            study_object_ids = [int(oid) for oid in parsed_ids if oid is not None]
            logger.info(f"Study Object IDs parsés pour MAJ: {study_object_ids}")
        except (jsonlib.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour study_object_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour study_object_ids_json: {e}")

    # --- Parsing des IDs d'oeuvres ---
    oeuvre_ids: Optional[List[int]] = None
    if oeuvre_ids_json is not None:
        try:
            parsed_ids = jsonlib.loads(oeuvre_ids_json)
            if not isinstance(parsed_ids, list):
                raise ValueError("oeuvre_ids_json doit être une liste JSON.")
            oeuvre_ids = [int(oid) for oid in parsed_ids if oid is not None]
            logger.info(f"Oeuvre IDs parsés pour MAJ: {oeuvre_ids}")
        except (jsonlib.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour oeuvre_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour oeuvre_ids_json: {e}")

    # --- Gestion de l'upload de fichier ---
    file_upload_data: Optional[ResourceFileUpload] = None
    temp_saved_file_path: Optional[Path] = None

    # Gérer le fichier uploadé s'il est fourni
    if file is not None:
        safe_filename = secure_filename(file.filename)
        file_upload_data = ResourceFileUpload(
            file_name=safe_filename,
            file_type=file.content_type,
            file_size=file.size
        )

        # Utiliser UPLOADS_BASE_DIR des settings
        user_upload_dir_on_disk = settings.UPLOADS_BASE_DIR / "uploads" / str(current_user.id)
        user_upload_dir_on_disk.mkdir(parents=True, exist_ok=True)
        final_file_path_on_disk = user_upload_dir_on_disk / safe_filename
        temp_saved_file_path = final_file_path_on_disk

        try:
            logger.info(f"Sauvegarde du nouveau fichier pour mise à jour vers : {final_file_path_on_disk}")
            with open(final_file_path_on_disk, "wb") as buffer:
                buffer.write(await file.read())
            logger.info(f"Nouveau fichier sauvegardé avec succès : {final_file_path_on_disk}")
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du nouveau fichier {safe_filename}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur lors de la sauvegarde du fichier: {e}")
        finally:
            await file.close()

    # Préparer les données pour la mise à jour via le schéma Pydantic
    update_data_dict = {
        "title": title,
        "description": description,
        "type_id": type_id,
        "sub_type_id": sub_type_id,
    }

    # Injecter data_json si on a pu parser
    if parsed_data_json is not None:
        logger.info(f"[DEBUG] Sauvegarde data_json: {type(parsed_data_json)} - {len(str(parsed_data_json))} chars")
        update_data_dict["data_json"] = parsed_data_json
    else:
        logger.warning("[DEBUG] parsed_data_json est None - pas de sauvegarde data_json")
    if runtime_rel_path is not None:
        update_data_dict["runtime_html_path"] = runtime_rel_path
    if template_key_to_use is not None:
        update_data_dict["template_key"] = template_key_to_use
        update_data_dict["template_version"] = template_version_to_use
    if session_ids_json is not None:
        update_data_dict["session_ids"] = session_ids
    if objective_ids_json is not None:
        update_data_dict["objective_ids"] = objective_ids
    if study_object_ids_json is not None:
        update_data_dict["study_object_ids"] = study_object_ids
    if oeuvre_ids_json is not None:
        update_data_dict["oeuvre_ids"] = oeuvre_ids

    # Filtrer les clés dont la valeur est None
    update_data_filtered = {k: v for k, v in update_data_dict.items() if v is not None}

    # Si session_ids ou objective_ids a été fourni (même vide), on les remet
    if "session_ids" in update_data_dict:
          update_data_filtered["session_ids"] = update_data_dict["session_ids"]
    if "objective_ids" in update_data_dict:
          update_data_filtered["objective_ids"] = update_data_dict["objective_ids"]
    if "study_object_ids" in update_data_dict:
          update_data_filtered["study_object_ids"] = update_data_dict["study_object_ids"]
    if "oeuvre_ids" in update_data_dict:
          update_data_filtered["oeuvre_ids"] = update_data_dict["oeuvre_ids"]

    resource_update_schema = ResourceUpdate(**update_data_filtered)
    logger.debug(f"Schéma ResourceUpdate préparé: {resource_update_schema.model_dump_json(exclude_none=True)}")

    # Appeler la fonction CRUD mise à jour
    try:
        updated_resource = crud.resource.update_resource(
            db=db,
            resource_id=resource_id,
            resource_update=resource_update_schema,
            file_upload=file_upload_data
        )

        if updated_resource is None:
            logger.error(f"La fonction CRUD update_resource a retourné None pour la ressource {resource_id} après vérifications initiales.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found during update process")

        logger.info(f"Ressource {resource_id} mise à jour avec succès.")
        return updated_resource
    except ValueError as e:
        if temp_saved_file_path and temp_saved_file_path.exists():
            try:
                os.remove(temp_saved_file_path)
                logger.warning(f"Nouveau fichier uploadé {temp_saved_file_path} supprimé car la mise à jour a échoué: {e}")
            except OSError as remove_err:
                logger.error(f"Erreur lors de la suppression du nouveau fichier après échec mise à jour {temp_saved_file_path}: {remove_err}")
        logger.error(f"Erreur (ValueError) lors de la mise à jour de la ressource {resource_id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        if temp_saved_file_path and temp_saved_file_path.exists():
            try:
                os.remove(temp_saved_file_path)
                logger.warning(f"Nouveau fichier uploadé {temp_saved_file_path} supprimé car la mise à jour a échoué: {e}")
            except OSError as remove_err:
                logger.error(f"Erreur lors de la suppression du nouveau fichier après échec mise à jour {temp_saved_file_path}: {remove_err}")
        logger.error(f"Erreur serveur inattendue lors de la mise à jour de la ressource {resource_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur interne du serveur.")

# --- Route DELETE pour supprimer ---
@resource_crud_router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource_route(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Supprime une ressource et son fichier associé si elle en a un."""
    logger.info(f"Tentative de suppression de la ressource {resource_id} par l'utilisateur {current_user.id}")

    # Vérifier d'abord si la ressource existe et appartient à l'utilisateur
    db_resource_check = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource_check is None:
        logger.warning(f"Ressource {resource_id} non trouvée pour la suppression.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if db_resource_check.user_id != current_user.id:
        logger.error(f"Accès non autorisé pour la suppression de la ressource {resource_id} par l'utilisateur {current_user.id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this resource")

    # Garder une trace des chemins des fichiers à supprimer avant de supprimer l'enregistrement BDD
    uploads_base = Path(settings.UPLOADS_BASE_DIR)
    file_path_to_delete: Optional[Path] = None
    md_path_to_delete: Optional[Path] = None
    tables_path_to_delete: Optional[Path] = None

    # Fichier source (ex: PDF uploadé ou HTML IA)
    if getattr(db_resource_check, "file_path", None):
        rel = str(db_resource_check.file_path).lstrip("/")
        file_path_to_delete = uploads_base / rel
        logger.info(f"Chemin du fichier source à supprimer identifié : {file_path_to_delete}")

        # Si c'est un HTML, tenter de nettoyer les images référencées
        try:
            if file_path_to_delete.suffix.lower() in {'.html', '.htm'} and file_path_to_delete.exists():
                content = file_path_to_delete.read_text(encoding='utf-8', errors='ignore')
                img_srcs = set(re.findall(r"<img[^>]+src=[\"']([^\"']+)[\"']", content))
                if img_srcs:
                    trash_root = Path(settings.UPLOADS_BASE_DIR) / 'uploads' / str(current_user.id) / '.trash'
                    trash_root.mkdir(parents=True, exist_ok=True)
                    for src in img_srcs:
                        img_path = _normalize_media_src_to_path(src, current_user.id)
                        if img_path and img_path.exists():
                            if not _is_image_still_referenced(current_user.id, img_path, exclude_html_path=file_path_to_delete):
                                dest = trash_root / img_path.name
                                counter = 1
                                while dest.exists():
                                    dest = trash_root / f"{img_path.stem}_{counter}{img_path.suffix}"
                                    counter += 1
                                try:
                                    shutil.move(str(img_path), str(dest))
                                    logger.info(f"[DELETE] Image orpheline déplacée en corbeille: {img_path} -> {dest}")
                                except Exception as e_move:
                                    logger.warning(f"[DELETE] Échec déplacement image {img_path} vers corbeille: {e_move}")
        except Exception as e_htmlimg:
            logger.warning(f"Impossible de nettoyer les images référencées lors de la suppression: {e_htmlimg}")

    # Fichier markdown extrait
    if getattr(db_resource_check, "docling_md_path", None):
        md_rel = str(db_resource_check.docling_md_path).lstrip("/")
        md_path_to_delete = uploads_base / md_rel
        logger.info(f"Chemin du fichier markdown à supprimer identifié : {md_path_to_delete}")

    # Fichier tables extrait (HTML concaténé)
    if getattr(db_resource_check, "docling_tables_path", None):
        tables_rel = str(db_resource_check.docling_tables_path).lstrip("/")
        tables_path_to_delete = uploads_base / tables_rel
        logger.info(f"Chemin du fichier tables à supprimer identifié : {tables_path_to_delete}")

    # Appeler la fonction CRUD pour supprimer l'enregistrement en BDD
    deleted = crud.resource.delete_resource(db=db, resource_id=resource_id)

    if not deleted:
        logger.error(f"Échec de la suppression de la ressource {resource_id} en BDD après vérification.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found during delete process")

    # Si la suppression en BDD a réussi, supprimer les fichiers physiques s'ils existent
    for target_path in [file_path_to_delete, md_path_to_delete, tables_path_to_delete]:
        if target_path:
            if target_path.exists():
                try:
                    os.remove(target_path)
                    logger.info(f"Fichier supprimé: {target_path}")
                except OSError as e:
                    logger.error(f"Erreur lors de la suppression du fichier {target_path}: {e}")
            else:
                logger.warning(f"Fichier à supprimer introuvable: {target_path}")

    logger.info(f"Ressource {resource_id} supprimée avec succès de la BDD.")
    return