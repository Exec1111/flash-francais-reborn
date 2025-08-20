from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse, ResourceFileUpload, ResourceListResponse
from schemas.resource import ResourceTypeSchema, ResourceSubTypeSchema
from schemas.study_object import StudyObjectReadShort # Import global
from schemas.pagination import PaginatedResponse # AJOUT
from database import get_db
import crud.resource # Importer spécifiquement le module requis
from crud.resource import get_upload_path
from dependencies import get_current_active_user # Import absolu
from models import User as UserModel # Pour l'info utilisateur
import logging
import os
import shutil
from pathlib import Path
import json # Pour parser session_ids
from fastapi import status
from werkzeug.utils import secure_filename # Sécurité: importer depuis werkzeug.utils
from config import get_settings
from ai.services.docling_background import run_docling_extraction
from schemas.docling import DoclingStatusResponse, DoclingTable
import re
import hashlib
settings = get_settings()

logger = logging.getLogger(__name__)
logger.info(">>> ROUTER FILE resource.py LOADED <<<") # <--- ADD LOG 1

# Utiliser le chemin défini dans la config
DISK_UPLOADS_BASE = settings.UPLOADS_BASE_DIR

resource_router = APIRouter()
logger.info(">>> APIRouter() INSTANTIATED for resources <<<") # <--- ADD LOG 2

# --- Routes pour les Types et Sous-Types --- #
@resource_router.get("/types", response_model=List[ResourceTypeSchema])
def read_resource_types(
    db: Session = Depends(get_db),
    # current_user: UserModel = Depends(get_current_active_user) # Authentification optionnelle ici
):
    """Récupère la liste de tous les types de ressources."""
    types = crud.resource.get_resource_types(db)
    return types

@resource_router.get("/sub-types", response_model=List[ResourceSubTypeSchema])
def read_resource_sub_types(
    type_id: Optional[int] = Query(None, description="Filtrer les sous-types par l'ID du type parent"),
    db: Session = Depends(get_db),
    # current_user: UserModel = Depends(get_current_active_user) # Authentification optionnelle ici
):
    """Récupère la liste des sous-types de ressources, éventuellement filtrée par type."""
    sub_types = crud.resource.get_resource_sub_types(db, type_id=type_id)
    return sub_types

# --- Routes pour les Ressources ---

@resource_router.post("/", response_model=ResourceResponse)
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
    file: Optional[UploadFile] = File(None), # Le fichier uploadé
    html_path: Optional[str] = Form(None) # Chemin HTML généré pour IA
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
        session_ids = json.loads(session_ids_json) if session_ids_json else []
        if not isinstance(session_ids, list):
            raise ValueError("session_ids_json doit être une liste JSON.")
        # Convertir les IDs en int (et filtrer les None potentiels)
        session_ids = [int(sid) for sid in session_ids if sid is not None]
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Erreur de parsing JSON pour session_ids: {e}")
        raise HTTPException(status_code=400, detail=f"Format invalide pour session_ids_json: {e}")

    # Parser les IDs d'objectifs depuis la string JSON
    try:
        objective_ids = json.loads(objective_ids_json) if objective_ids_json else []
        if not isinstance(objective_ids, list):
            raise ValueError("objective_ids_json doit être une liste JSON.")
        # Convertir les IDs en int (et filtrer les None potentiels)
        objective_ids = [int(oid) for oid in objective_ids if oid is not None]
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Erreur de parsing JSON pour objective_ids: {e}")
        raise HTTPException(status_code=400, detail=f"Format invalide pour objective_ids_json: {e}")

    # Parser les IDs d'objets d'étude depuis la string JSON
    try:
        study_object_ids = json.loads(study_object_ids_json) if study_object_ids_json else []
        if not isinstance(study_object_ids, list):
            raise ValueError("study_object_ids_json doit être une liste JSON.")
        study_object_ids = [int(soid) for soid in study_object_ids if soid is not None]
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Erreur de parsing JSON pour study_object_ids: {e}")
        raise HTTPException(status_code=400, detail=f"Format invalide pour study_object_ids_json: {e}")

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
        user_upload_dir_on_disk = Path(DISK_UPLOADS_BASE) / "uploads" / str(current_user.id)
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
            # Localiser le fichier généré (chemin local ou URL)
            if html_path.startswith('http'):
                # extraire le chemin relatif public après '/static/'
                rel_public = html_path.split('/static/')[-1]
                src = Path(__file__).resolve().parent.parent / 'static' / rel_public
            else:
                src = Path(html_path)
            # Préparer destination
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
@resource_router.get("/", response_model=PaginatedResponse[ResourceResponse]) # MODIFICATION
async def read_resources(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(10, ge=1, le=200, description="Nombre maximum d'éléments à retourner"),
    search_term: Optional[str] = Query(None, min_length=1, max_length=100, alias="search"),
    type_id: Optional[int] = Query(None, ge=1, alias="typeId"),
    sub_type_id: Optional[int] = Query(None, ge=1, alias="subTypeId"),
    type_key: Optional[str] = Query(None, alias="typeKey") # AJOUT pour filtrer par clé de type
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
    # ResourceResponse.from_orm(item) est utilisé car ResourceResponse.Config.from_attributes = True
    try:
        pydantic_items = [ResourceResponse.from_orm(item) for item in resources_data["items"]]
    except Exception as e:
        logger.error(f"Error converting Resource ORM item to Pydantic schema: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error processing resource data")

    return PaginatedResponse(total=resources_data["total"], items=pydantic_items)

# --- Route GET pour les ressources d'une session spécifique ---
@resource_router.get("/by_session/{session_id}", response_model=list[ResourceResponse])
async def read_resources_by_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    logger.info(f">>> ENTERING read_resources_by_session for session {session_id} <<<") # <--- ADD LOG 3
    """Récupère les ressources d'une session spécifique pour l'utilisateur courant."""
    # ---> AJOUT: Vérifier d'abord si la session existe et appartient à l'utilisateur
    db_session = crud.session.get_session_by_id(db=db, session_id=session_id) # Utilisation du nom correct de la fonction
    
    # Vérification existence ET appartenance
    if db_session is None or \
       db_session.sequence is None or \
       db_session.sequence.progression is None or \
       db_session.sequence.progression.user_id != current_user.id:
        logger.warning(f"Session {session_id} non trouvée ou non appartenant à l'utilisateur {current_user.id} lors de la demande de ressources.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session {session_id} not found")
    
    logger.info(f"Lecture des ressources pour la session {session_id} par l'utilisateur {current_user.id}")
    # Utiliser les valeurs par défaut pour skip/limit dans la fonction CRUD
    resources = crud.resource.get_resources_by_session(db=db, session_id=session_id, user_id=current_user.id) # Ici on passe user_id à la fonction CRUD des *ressources*
 
    if not resources:
        logger.warning(f"Aucune ressource trouvée pour la session {session_id} appartenant à l'utilisateur {current_user.id}")
    return resources

# --- Route GET pour les ressources standalone ---
@resource_router.get("/standalone/", response_model=List[ResourceResponse])
def read_standalone_resources(
    db: Session = Depends(get_db), 
    current_user: UserModel = Depends(get_current_active_user),
    skip: int = 0, 
    limit: int = 100
):
    """Récupère les ressources non associées à une session (pour l'utilisateur courant)."""
    # NOTE: Cette route nécessite une fonction CRUD dédiée ou un filtrage spécifique.
    # Pour l'instant, on utilise une fonction hypothétique qui filtre par user ET absence de session.
    logger.info(f"Lecture des ressources standalone pour l'utilisateur {current_user.id}")
    resources = crud.resource.get_standalone_resources_for_user(db=db, user_id=current_user.id, skip=skip, limit=limit)
    if resources is None: # Si la fonction CRUD n'est pas prête, retourne une liste vide
        logger.warning(f"Fonctionnalité standalone pour user {current_user.id} non entièrement implémentée dans le CRUD.")
        return []
    return resources

# --- Route GET pour une ressource spécifique par ID ---
@resource_router.get("/{resource_id}", response_model=ResourceResponse)
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
    from schemas.study_object import StudyObjectReadShort
    study_objects = [StudyObjectReadShort.from_orm(obj) for obj in getattr(db_resource, "study_objects", [])]
    study_object_ids = [obj.id for obj in study_objects]
    # Construction de la réponse enrichie
    response = ResourceResponse.model_validate(db_resource)
    response_dict = response.model_dump()
    # Sérialisation explicite des objets Pydantic
    response_dict['study_objects'] = [obj.model_dump() for obj in study_objects]
    response_dict['study_object_ids'] = study_object_ids
    return response_dict

@resource_router.put("/{resource_id}", response_model=ResourceResponse)
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
    objective_ids_json: Optional[str] = Form(None), # Ajout pour les objectifs
    study_object_ids_json: Optional[str] = Form(None), # Ajout pour les objets d'étude
    source_type: Optional[str] = Form(None), # Ajouté pour potentiellement changer le type
    html_content: Optional[str] = Form(None),  # Contenu HTML modifié envoyé par le frontend
    file: Optional[UploadFile] = File(None)
):
    """Met à jour une ressource. Si un fichier est fourni, il remplace l'ancien (si existant).
       Si source_type est changé (ex: file -> url), l'ancien fichier est supprimé.
    """
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
            import re
            full_path.parent.mkdir(parents=True, exist_ok=True)
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
            full_path.write_text(html_content, encoding="utf-8")
            logger.info(f"Fichier HTML {full_path} mis à jour avec succès pour la ressource {resource_id}.")
        except Exception as e:
            logger.error(f"Erreur lors de l'écriture du fichier HTML pour la ressource {resource_id}: {e}")
            raise HTTPException(status_code=500, detail="Erreur lors de l'enregistrement du contenu HTML")

    # --- Parsing des IDs de session --- 
    session_ids: Optional[List[int]] = None # Default à None pour indiquer pas de changement
    if session_ids_json is not None:
        try:
            parsed_ids = json.loads(session_ids_json) # Peut être une liste vide []
            if not isinstance(parsed_ids, list):
                raise ValueError("session_ids_json doit être une liste JSON.")
            session_ids = [int(sid) for sid in parsed_ids if sid is not None]
            logger.info(f"Session IDs parsés pour MAJ: {session_ids}")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour session_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour session_ids_json: {e}")

    # --- Parsing des IDs d'objectifs --- 
    objective_ids: Optional[List[int]] = None # Default à None pour indiquer pas de changement
    if objective_ids_json is not None:
        try:
            parsed_ids = json.loads(objective_ids_json) # Peut être une liste vide []
            if not isinstance(parsed_ids, list):
                raise ValueError("objective_ids_json doit être une liste JSON.")
            objective_ids = [int(oid) for oid in parsed_ids if oid is not None]
            logger.info(f"Objective IDs parsés pour MAJ: {objective_ids}")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour objective_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour objective_ids_json: {e}")

    # --- Parsing des IDs d'objets d'étude --- 
    study_object_ids: Optional[List[int]] = None # Default à None pour indiquer pas de changement
    if study_object_ids_json is not None:
        try:
            parsed_ids = json.loads(study_object_ids_json) # Peut être une liste vide []
            if not isinstance(parsed_ids, list):
                raise ValueError("study_object_ids_json doit être une liste JSON.")
            study_object_ids = [int(oid) for oid in parsed_ids if oid is not None]
            logger.info(f"Study Object IDs parsés pour MAJ: {study_object_ids}")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour study_object_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour study_object_ids_json: {e}")

    # --- Gestion de l'upload de fichier --- 
    file_upload_data: Optional[ResourceFileUpload] = None
    temp_saved_file_path: Optional[Path] = None

    # Gérer le fichier uploadé s'il est fourni
    if file is not None:
        safe_filename = secure_filename(file.filename) # Sécuriser le nom
        file_upload_data = ResourceFileUpload(
            file_name=safe_filename, # Utiliser le nom sécurisé
            file_type=file.content_type,
            file_size=file.size
        )
        
        # Utiliser UPLOADS_BASE_DIR des settings
        user_upload_dir_on_disk = settings.UPLOADS_BASE_DIR / "uploads" / str(current_user.id)
        user_upload_dir_on_disk.mkdir(parents=True, exist_ok=True)
        final_file_path_on_disk = user_upload_dir_on_disk / safe_filename
        temp_saved_file_path = final_file_path_on_disk # Garder une trace pour suppression en cas d'erreur CRUD

        try:
            logger.info(f"Sauvegarde du nouveau fichier pour mise à jour vers : {final_file_path_on_disk}")
            # Utiliser write() qui est asynchrone avec UploadFile
            with open(final_file_path_on_disk, "wb") as buffer:
                buffer.write(await file.read())
            logger.info(f"Nouveau fichier sauvegardé avec succès : {final_file_path_on_disk}")
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du nouveau fichier {safe_filename}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur lors de la sauvegarde du fichier: {e}")
        finally:
            await file.close()

    # Préparer les données pour la mise à jour via le schéma Pydantic
    # Utiliser exclude_unset=False n'est pas idéal ici car Form(...) peut retourner None
    update_data_dict = {
        "title": title,
        "description": description,
        "type_id": type_id,
        "sub_type_id": sub_type_id,
        # Inclure session_ids et objective_ids SEULEMENT si les JSON correspondants ont été fournis
        # La logique est: si json=None, on ne touche pas à la relation.
        # Si json="[]", on passe une liste vide pour supprimer les relations.
    }
    if session_ids_json is not None:
        update_data_dict["session_ids"] = session_ids
    if objective_ids_json is not None:
        update_data_dict["objective_ids"] = objective_ids
    if study_object_ids_json is not None:
        update_data_dict["study_object_ids"] = study_object_ids
        
    # Filtrer les clés dont la valeur est None pour ne pas écraser les valeurs existantes par None
    update_data_filtered = {k: v for k, v in update_data_dict.items() if v is not None}
    
    # Si session_ids ou objective_ids a été fourni (même vide), on les remet
    if "session_ids" in update_data_dict:
         update_data_filtered["session_ids"] = update_data_dict["session_ids"] # Peut être []
    if "objective_ids" in update_data_dict:
         update_data_filtered["objective_ids"] = update_data_dict["objective_ids"] # Peut être []
    if "study_object_ids" in update_data_dict:
         update_data_filtered["study_object_ids"] = update_data_dict["study_object_ids"] # Peut être []

    resource_update_schema = ResourceUpdate(**update_data_filtered)
    logger.debug(f"Schéma ResourceUpdate préparé: {resource_update_schema.model_dump_json(exclude_none=True)}")

    # Appeler la fonction CRUD mise à jour
    try:
        # La fonction CRUD doit gérer la suppression de l'ancien fichier si nécessaire
        updated_resource = crud.resource.update_resource(
            db=db, 
            resource_id=resource_id, 
            resource_update=resource_update_schema, # Passer le schéma Pydantic
            file_upload=file_upload_data # Passer les infos du nouveau fichier s'il y en a un
        )

        # Vérifier si la mise à jour a réussi (normalement géré par l'exception ou return None du CRUD)
        if updated_resource is None:
            # Cette condition est maintenant redondante car gérée au début et dans le CRUD
            logger.error(f"La fonction CRUD update_resource a retourné None pour la ressource {resource_id} après vérifications initiales.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found during update process")

        logger.info(f"Ressource {resource_id} mise à jour avec succès.")
        return updated_resource
    except ValueError as e:
        # Si le CRUD lève une ValueError (ex: session non trouvée, problème logique)
        # Supprimer le fichier qu'on VIENT de sauvegarder si on en a sauvegardé un
        if temp_saved_file_path and temp_saved_file_path.exists():
            try:
                os.remove(temp_saved_file_path)
                logger.warning(f"Nouveau fichier uploadé {temp_saved_file_path} supprimé car la mise à jour a échoué: {e}")
            except OSError as remove_err:
                logger.error(f"Erreur lors de la suppression du nouveau fichier après échec mise à jour {temp_saved_file_path}: {remove_err}")
        logger.error(f"Erreur (ValueError) lors de la mise à jour de la ressource {resource_id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Autre erreur inattendue
        if temp_saved_file_path and temp_saved_file_path.exists():
            try:
                os.remove(temp_saved_file_path)
                logger.warning(f"Nouveau fichier uploadé {temp_saved_file_path} supprimé car la mise à jour a échoué: {e}")
            except OSError as remove_err:
                logger.error(f"Erreur lors de la suppression du nouveau fichier après échec mise à jour {temp_saved_file_path}: {remove_err}")
        logger.error(f"Erreur serveur inattendue lors de la mise à jour de la ressource {resource_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur interne du serveur.")

# --- Route DELETE pour supprimer ---
@resource_router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
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

    # Fichier source (ex: PDF uploadé)
    if getattr(db_resource_check, "file_path", None):
        rel = str(db_resource_check.file_path).lstrip("/")
        file_path_to_delete = uploads_base / rel
        logger.info(f"Chemin du fichier source à supprimer identifié : {file_path_to_delete}")

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
        # Ceci ne devrait pas arriver si la vérification initiale a réussi, mais par sécurité
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

    # Tentative de nettoyage du dossier 'docling' s'il est vide
    try:
        for p in [md_path_to_delete, tables_path_to_delete]:
            if p and p.parent.exists():
                # Ne supprimer que le répertoire 'docling' potentiel, pas le dossier utilisateur
                if p.parent.name.lower() == "docling":
                    try:
                        p.parent.rmdir()  # échoue si non vide
                        logger.info(f"Dossier vide supprimé: {p.parent}")
                    except OSError:
                        # Dossier non vide ou autre erreur: ignorer
                        pass
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage des dossiers docling: {e}")

    logger.info(f"Ressource {resource_id} supprimée avec succès de la BDD.")
    # Pas de contenu à retourner pour une réponse 204
    return # Ou return Response(status_code=status.HTTP_204_NO_CONTENT)
# --- Endpoints Docling ---
@resource_router.get("/{resource_id}/docling", response_model=DoclingStatusResponse)
def get_resource_docling(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    """Retourne le statut Docling d'une ressource et, si prêt, le contenu (markdown + tables)."""
    db_resource = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if db_resource.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this resource")

    # Statut de base
    status_value = db_resource.docling_status or "pending"
    resp: Dict[str, object] = {
        "status": status_value,
        "ocr_used": getattr(db_resource, "ocr_used", None),
        "docling_version": getattr(db_resource, "docling_version", None),
        "extracted_at": getattr(db_resource, "extracted_at", None),
        "docling_error": getattr(db_resource, "docling_error", None),
        "docling_chars": getattr(db_resource, "docling_chars", None),
    }

    # Si prêt, lire les fichiers cache s'ils existent
    try:
        if status_value == "ready":
            uploads_base = Path(settings.UPLOADS_BASE_DIR)
            md_rel = (db_resource.docling_md_path or "").lstrip("/")
            tables_rel = (db_resource.docling_tables_path or "").lstrip("/")

            if md_rel:
                md_path = uploads_base / md_rel
                if md_path.exists():
                    resp["document_markdown"] = md_path.read_text(encoding="utf-8")
            if tables_rel:
                tables_path = uploads_base / tables_rel
                if tables_path.exists():
                    raw = tables_path.read_text(encoding="utf-8")
                    parts = re.split(r"\s*<hr\s*/?>\s*", raw, flags=re.I)
                    tables: List[DoclingTable] = []
                    for part in parts:
                        if not part or not part.strip():
                            continue
                        m = re.search(r"<h3>\s*Table\s+(\d+)\s*</h3>", part, flags=re.I)
                        if not m:
                            continue
                        idx = int(m.group(1))
                        html = re.sub(r"^\s*<h3>.*?</h3>\s*", "", part, flags=re.I | re.S)
                        tables.append(DoclingTable(index=idx, html=html))
                    resp["tables"] = tables
    except Exception as e:
        logger.error(f"Erreur lors de la lecture du cache Docling pour resource_id={resource_id}: {e}", exc_info=True)

    return DoclingStatusResponse(**resp)


@resource_router.post("/{resource_id}/reextract", response_model=DoclingStatusResponse)
async def reextract_resource_docling(
    resource_id: int,
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    current_user: UserModel = Depends(get_current_active_user),
    ocr: bool = Form(False),
    force: bool = Form(False),
):
    """Planifie une nouvelle extraction Docling pour la ressource.
    - ocr: active l'OCR
    - force: force la ré-extraction même si une extraction est en cours
    """
    db_resource = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if db_resource.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this resource")
    if not db_resource.file_path or (db_resource.file_type and db_resource.file_type != "application/pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resource is not a valid PDF")

    # Si déjà en cours et pas de force, retourner le statut actuel
    if not force and (db_resource.docling_status in ("pending", "processing")):
        return DoclingStatusResponse(
            status=db_resource.docling_status or "processing",
            ocr_used=db_resource.ocr_used,
            docling_version=db_resource.docling_version,
            extracted_at=db_resource.extracted_at,
            docling_error=db_resource.docling_error,
            docling_chars=db_resource.docling_chars,
        )

    # Marquer en attente et planifier
    try:
        db_resource.docling_status = "pending"
        db_resource.docling_error = None
        db.add(db_resource)
        db.commit()
        db.refresh(db_resource)
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du statut Docling (pending) pour resource_id={resource_id}: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la préparation de la ré-extraction Docling")

    background_tasks.add_task(run_docling_extraction, db_resource.id, current_user.id, ocr)
    logger.info(f"Ré-extraction Docling planifiée pour resource_id={resource_id} (ocr={ocr}, force={force})")

    return DoclingStatusResponse(status="pending")


# --- Fin des Routes pour les Ressources ---

# --- Route de TEST Simplifiée ---
@resource_router.get("/by_session/{session_id}/test")
async def test_route_for_session(session_id: int):
    logger.info(f">>> SIMPLE TEST ROUTE CALLED for session {session_id} <<<")
    return {"message": f"Simple test route ok for session {session_id}"}
# --- Fin Route de TEST ---

@resource_router.get("/{resource_id}/study_objects", response_model=List[StudyObjectReadShort])
def get_study_objects_for_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Retourne la liste des objets d'étude associés à une ressource donnée."""
    from crud.study_object import get_study_objects_by_resource
    study_objects = get_study_objects_by_resource(db, resource_id)
    return [StudyObjectReadShort.from_orm(obj) for obj in study_objects]
