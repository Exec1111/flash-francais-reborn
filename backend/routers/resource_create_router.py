from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import hashlib
from pathlib import Path
import shutil
import json as jsonlib
import logging
import os
from schemas.resource import ResourceCreate, ResourceResponse, ResourceFileUpload
from database import get_db
import crud.resource
from crud.resource import get_upload_path
from dependencies import get_current_active_user
from fastapi.responses import FileResponse
from models import User as UserModel
from ai.services.template_resolver import TemplateResolver
from .resource_utils import html_to_qcm_json, html_to_champlex_json
from config import get_settings
from werkzeug.utils import secure_filename

settings = get_settings()
logger = logging.getLogger(__name__)

resource_create_router = APIRouter()

async def run_docling_extraction(resource_id: int, user_id: int, ocr: bool):
    """Fonction d'extraction Docling en arrière-plan."""
    # TODO: Implémenter l'intégration Docling réelle
    logger.info(f"Docling extraction would be run for resource_id={resource_id}, user_id={user_id}, ocr={ocr}")

@resource_create_router.post("/", response_model=ResourceResponse)
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
    logger.info(f"[CREATE_RESOURCE] === DÉBUT === Utilisateur {current_user.id}")
    logger.info(f"[CREATE_RESOURCE] Paramètres reçus: title='{title}', type_id={type_id}, sub_type_id={sub_type_id}, source_type='{source_type}', html_path='{html_path}'")
    logger.info(f"[CREATE_RESOURCE] ai_content_json présent: {ai_content_json is not None}")
    logger.info(f"[CREATE_RESOURCE] session_ids_json: {session_ids_json}")
    logger.info(f"[CREATE_RESOURCE] objective_ids_json: {objective_ids_json}")

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
        logger.info(f"[CREATE_RESOURCE] Ressource créée avec succès, ID: {db_resource.id}")
        logger.info(f"[CREATE_RESOURCE] Type de db_resource: {type(db_resource)}")
        logger.info(f"[CREATE_RESOURCE] Attributs de db_resource: {[attr for attr in dir(db_resource) if not attr.startswith('_')]}")
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
            if html_path in ('/api/v1/ai/champlex2-json-placeholder', '/api/v1/ai/champlex-json-placeholder', '/api/v1/ai/qcm-json-placeholder', '/api/v1/ai/pendu-json-placeholder', '/api/v1/ai/quisuisje-json-placeholder', '/api/v1/ai/textereconstitue-json-placeholder', '/api/v1/ai/vocabulaire-json-placeholder') or \
               (t_key == 'exercice' and st_key in ['qcm', 'champlex', 'champlex2', 'pendu', 'quisuisje', 'textereconstitue', 'vocabulaire']):
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
                if t_key == 'exercice' and st_key in ['qcm', 'champlex', 'champlex2', 'pendu', 'quisuisje', 'textereconstitue', 'vocabulaire']:
                    parsed_data_json = None

                    # JSON-first
                    if st_key in ['champlex2', 'champlex', 'qcm', 'pendu', 'quisuisje', 'textereconstitue', 'vocabulaire'] and ai_content_json:
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
                            elif st_key == 'quisuisje':
                                logger.info(f"[CREATE/QUISUISJE] data_json depuis IA JSON pour resource_id={db_resource.id} (vocabulaire={len(parsed_data_json.get('vocabulaire', []) or [])})")
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
                            injected = injected.replace('<!--QUISUISJE_DATA_JSON-->', data_str)
                            injected = injected.replace('<!--TEXTERECONSTITUE_DATA_JSON-->', data_str)
                            injected = injected.replace('<!--VOCABULAIRE_DATA_JSON-->', data_str)
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
        # Recharger l'objet avec toutes les relations via une nouvelle requête
        from sqlalchemy.orm import joinedload
        from models.resource import Resource
        
        db_resource_with_relations = db.query(Resource).options(
            joinedload(Resource.type),
            joinedload(Resource.sub_type),
            joinedload(Resource.user),
            joinedload(Resource.sessions),
            joinedload(Resource.objectives),
            joinedload(Resource.study_objects),
            joinedload(Resource.oeuvres)
        ).filter(Resource.id == db_resource.id).first()
        
        if not db_resource_with_relations:
            logger.error(f"[CREATE_RESOURCE] Impossible de recharger la ressource {db_resource.id}")
            return db_resource
        
        logger.info(f"[CREATE_RESOURCE] === RETOUR === db_resource: {db_resource_with_relations}")
        logger.info(f"[CREATE_RESOURCE] db_resource.id: {getattr(db_resource_with_relations, 'id', 'NONE')}")
        logger.info(f"[CREATE_RESOURCE] Type: {type(db_resource_with_relations)}")
        logger.info(f"[CREATE_RESOURCE] Relations chargées - type: {getattr(db_resource_with_relations.type, 'value', 'None') if db_resource_with_relations.type else 'None'}, sub_type: {getattr(db_resource_with_relations.sub_type, 'value', 'None') if db_resource_with_relations.sub_type else 'None'}")
        
        # Test de sérialisation manuelle pour diagnostiquer
        try:
            from schemas.resource import ResourceResponse
            logger.info(f"[CREATE_RESOURCE] Test de sérialisation Pydantic...")
            serialized = ResourceResponse.model_validate(db_resource_with_relations)
            logger.info(f"[CREATE_RESOURCE] Sérialisation réussie ! ID: {serialized.id}")
            logger.info(f"[CREATE_RESOURCE] Sérialisation - type: {serialized.type}, sub_type: {serialized.sub_type}")
        except Exception as e:
            logger.error(f"[CREATE_RESOURCE] ERREUR de sérialisation Pydantic: {e}")
            logger.error(f"[CREATE_RESOURCE] Type de l'erreur: {type(e)}")
            import traceback
            logger.error(f"[CREATE_RESOURCE] Traceback: {traceback.format_exc()}")
        
        return db_resource_with_relations
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