from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import crud
from schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse, ResourceFileUpload
from database import get_db
from dependencies import get_current_active_user # Import corrigé
from models import User as UserModel # Pour l'info utilisateur
import logging
import os
import shutil
from pathlib import Path
import json # Pour parser session_ids
from fastapi import status

logger = logging.getLogger(__name__)

resource_router = APIRouter()

# --- Routes pour les Ressources ---

@resource_router.post("/", response_model=ResourceResponse)
async def create_resource_route(
    *, # Force les arguments suivants à être keyword-only
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    type_id: int = Form(...),
    sub_type_id: int = Form(...),
    source_type: str = Form(...), # 'file' ou 'ai'
    session_ids_json: Optional[str] = Form("[]"), # Accepter une string JSON pour la liste d'IDs
    file: Optional[UploadFile] = File(None) # Le fichier uploadé
):
    """Crée une nouvelle ressource. 
    Si source_type est 'file', un fichier doit être uploadé. 
    Sinon (si 'ai'), le fichier est ignoré. 
    session_ids doit être une string JSON valide (ex: "[1, 2, 3]")
    """
    logger.info(f"Tentative de création de ressource par l'utilisateur {current_user.id}")
    
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

    # --- Validation du fichier uploadé ---
    MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB
    ALLOWED_MIME_TYPE = "application/pdf"

    if source_type == 'file':
        if file is None:
            raise HTTPException(status_code=400, detail="Un fichier est requis lorsque source_type est 'file'")
        
        if file.content_type != ALLOWED_MIME_TYPE:
            logger.error(f"File type not allowed: {file.content_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Type de fichier non autorisé. Seuls les fichiers PDF sont acceptés."
            )
        
        actual_size = file.size
        if actual_size > MAX_FILE_SIZE:
            logger.error(f"File size exceeded limit: {actual_size} bytes")
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Le fichier est trop volumineux. La taille maximale est de {MAX_FILE_SIZE / (1024 * 1024)} Mo."
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
        user_id=current_user.id
    )

    file_upload_data: Optional[ResourceFileUpload] = None
    temp_file_path: Optional[str] = None

    # Gérer le fichier uploadé si source_type est 'file'
    if source_type == 'file':
        # Préparer les informations du fichier pour le CRUD
        file_upload_data = ResourceFileUpload(
            file_name=file.filename,
            file_type=file.content_type,
            file_size=file.size
        )
        
        # Déterminer le chemin de sauvegarde final
        backend_root = Path(__file__).parent.parent
        upload_dir = backend_root / "static" / "uploads" / str(current_user.id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        final_file_path = upload_dir / file.filename
        temp_file_path = final_file_path # Utiliser directement le chemin final pour l'écriture

        # Sauvegarder le fichier uploadé de manière asynchrone
        try:
            logger.info(f"Sauvegarde du fichier uploadé vers : {temp_file_path}")
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"Fichier sauvegardé avec succès : {temp_file_path}")
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du fichier {file.filename}: {e}")
            # Supprimer le fichier temporaire s'il a été créé
            if temp_file_path and os.path.exists(temp_file_path):
                 try:
                     os.remove(temp_file_path)
                 except OSError as remove_err:
                     logger.error(f"Erreur lors de la suppression du fichier temporaire échoué {temp_file_path}: {remove_err}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde du fichier: {e}")
        finally:
            # Fermer le fichier uploadé (important)
             await file.close()

    # Appeler la fonction CRUD pour créer la ressource en BDD
    try:
        db_resource = crud.resource.create_resource(
            db=db, 
            resource=resource_data, 
            file_upload=file_upload_data # Passer les infos du fichier
        )
        logger.info(f"Ressource créée avec ID: {db_resource.id}")
        # La fonction CRUD retourne maintenant l'objet SQLAlchemy chargé
        # FastAPI s'occupe de la conversion vers ResourceResponse grâce à `response_model`
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

@resource_router.get("/", response_model=List[ResourceResponse])
def read_resources(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100
):
    """Récupère la liste des ressources pour l'utilisateur courant."""
    logger.info(f"Lecture des ressources pour l'utilisateur {current_user.id}")
    resources = crud.resource.get_resources(db, user_id=current_user.id, skip=skip, limit=limit)
    # FastAPI convertit la liste d'objets SQLAlchemy en List[ResourceResponse]
    return resources

@resource_router.get("/session/{session_id}", response_model=List[ResourceResponse])
def read_resources_by_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000) 
):
    """Récupère les ressources d'une session spécifique pour l'utilisateur courant."""
    logger.info(f"Lecture des ressources pour la session {session_id}, utilisateur {current_user.id}")
    resources = crud.resource.get_resources_by_session(db, session_id=session_id, user_id=current_user.id, skip=skip, limit=limit)
    # FastAPI convertit la liste d'objets SQLAlchemy
    return resources

@resource_router.get("/standalone/", response_model=List[ResourceResponse])
def read_standalone_resources(
    db: Session = Depends(get_db), 
    current_user: UserModel = Depends(get_current_active_user), # Ajouter l'authentification
    skip: int = 0, 
    limit: int = 100
):
    """Récupère les ressources non associées à une session (pour l'utilisateur courant)."""
    # TODO: Vérifier si cette route est toujours pertinente et si la logique CRUD est correcte.
    # La logique actuelle de get_resources_standalone filtre les ressources sans aucune session.
    # Il faut ajouter le filtre par user_id ici.
    # Pour l'instant, on retourne une liste vide ou on lève une exception NotImplemented
    # raise HTTPException(status_code=501, detail="Fonctionnalité non implémentée ou à revoir")
    # Alternative: adapter crud.resource.get_resources_standalone pour accepter user_id
    # Ou filtrer ici après récupération (moins efficace)
    logger.warning(f"La route /standalone/ nécessite une révision pour filtrer par user_id={current_user.id}")
    # Retourne vide pour l'instant
    return []
    # resources = crud.resource.get_resources_standalone(db=db, skip=skip, limit=limit)
    # return resources # Ceci retournerait TOUTES les ressources standalone, pas seulement celles de l'utilisateur

@resource_router.get("/{resource_id}", response_model=ResourceResponse)
def read_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Récupère une ressource spécifique par son ID."""
    logger.info(f"Lecture de la ressource {resource_id} pour l'utilisateur {current_user.id}")
    db_resource = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource is None:
        logger.warning(f"Ressource {resource_id} non trouvée.")
        raise HTTPException(status_code=404, detail="Resource not found")
    if db_resource.user_id != current_user.id:
        logger.error(f"Accès non autorisé à la ressource {resource_id} par l'utilisateur {current_user.id}")
        raise HTTPException(status_code=403, detail="Not authorized to access this resource")
    # FastAPI convertit l'objet SQLAlchemy
    return db_resource

@resource_router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource_route(
    resource_id: int,
    *, # Force keyword-only
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    type_id: Optional[int] = Form(None),
    sub_type_id: Optional[int] = Form(None),
    session_ids_json: Optional[str] = Form(None), # Accepter string JSON
    source_type: Optional[str] = Form(None), # Ajouté
    file: Optional[UploadFile] = File(None) # Fichier optionnel pour la mise à jour
):
    """Met à jour une ressource. Si un fichier est fourni, il remplace l'ancien (si existant)."""
    logger.info(f"Tentative de mise à jour de la ressource {resource_id} par l'utilisateur {current_user.id}")
    
    # Vérifier d'abord si la ressource existe et appartient à l'utilisateur
    db_resource_check = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource_check is None:
        logger.warning(f"Ressource {resource_id} non trouvée pour la mise à jour.")
        raise HTTPException(status_code=404, detail="Resource not found")
    if db_resource_check.user_id != current_user.id:
        logger.error(f"Accès non autorisé pour la mise à jour de la ressource {resource_id} par l'utilisateur {current_user.id}")
        raise HTTPException(status_code=403, detail="Not authorized to update this resource")

    # Parser les IDs de session depuis la string JSON si fournie
    session_ids: Optional[List[int]] = None
    if session_ids_json is not None:
        try:
            parsed_ids = json.loads(session_ids_json)
            if not isinstance(parsed_ids, list):
                raise ValueError("session_ids_json doit être une liste JSON.")
            session_ids = [int(sid) for sid in parsed_ids if sid is not None]
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur de parsing JSON pour session_ids lors de la mise à jour: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour session_ids_json: {e}")

    # --- Validation du fichier uploadé ---
    MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB
    ALLOWED_MIME_TYPE = "application/pdf"

    if file:
        if file.content_type != ALLOWED_MIME_TYPE:
            logger.error(f"File type not allowed: {file.content_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Type de fichier non autorisé. Seuls les fichiers PDF sont acceptés."
            )
        
        actual_size = file.size
        if actual_size > MAX_FILE_SIZE:
            logger.error(f"File size exceeded limit: {actual_size} bytes")
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Le fichier est trop volumineux. La taille maximale est de {MAX_FILE_SIZE / (1024 * 1024)} Mo."
            )
        logger.info(f"File validation passed for {file.filename}")
    # -------------------------------------

    # Préparer les données pour le schéma ResourceUpdate
    update_data = ResourceUpdate(
        title=title,
        description=description,
        type_id=type_id,
        sub_type_id=sub_type_id,
        session_ids=session_ids # Passer la liste parsée
    ).model_dump(exclude_unset=True) # Seulement les champs fournis
    
    # Si aucun champ n'est fourni pour la mise à jour (hors fichier), c'est peut-être une erreur
    if not update_data and file is None:
         raise HTTPException(status_code=400, detail="Aucune donnée fournie pour la mise à jour.")

    file_upload_data: Optional[ResourceFileUpload] = None
    temp_file_path: Optional[str] = None

    # Gérer le fichier uploadé s'il est fourni
    if file is not None:
        file_upload_data = ResourceFileUpload(
            file_name=file.filename,
            file_type=file.content_type,
            file_size=file.size
        )
        
        backend_root = Path(__file__).parent.parent
        upload_dir = backend_root / "static" / "uploads" / str(current_user.id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        final_file_path = upload_dir / file.filename
        temp_file_path = final_file_path # Écrasera l'ancien si le nom est le même

        try:
            logger.info(f"Sauvegarde du nouveau fichier pour mise à jour vers : {temp_file_path}")
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"Nouveau fichier sauvegardé avec succès : {temp_file_path}")
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du nouveau fichier {file.filename}: {e}")
            # Pas besoin de supprimer ici car on n'a pas encore appelé le CRUD
            raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde du fichier: {e}")
        finally:
            await file.close()

    # Appeler la fonction CRUD pour mettre à jour
    try:
        # Passer les données filtrées et les infos du fichier (si présentes)
        updated_resource = crud.resource.update_resource(
            db=db, 
            resource_id=resource_id, 
            resource_update=ResourceUpdate(**update_data), # Recréer un objet pour être sûr
            file_upload=file_upload_data
        )
        if updated_resource is None: # Double check, même si on a vérifié avant
            raise HTTPException(status_code=404, detail="Resource not found during update process")
        logger.info(f"Ressource {resource_id} mise à jour avec succès.")
        # FastAPI convertit l'objet SQLAlchemy retourné
        return updated_resource
    except ValueError as e:
        # Si le CRUD lève une ValueError (ex: session non trouvée)
        # Le fichier uploadé (si nouveau) est déjà sauvegardé, mais la BDD n'est pas à jour.
        # On pourrait le supprimer, mais c'est complexe à gérer proprement.
        # On log l'erreur et on retourne 400.
        logger.error(f"Erreur (ValueError) lors de la mise à jour de la ressource {resource_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Autre erreur inattendue
        logger.error(f"Erreur serveur inattendue lors de la mise à jour de la ressource {resource_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@resource_router.delete("/{resource_id}", status_code=204) # 204 No Content pour succès
def delete_resource_route(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Supprime une ressource."""
    logger.info(f"Tentative de suppression de la ressource {resource_id} par l'utilisateur {current_user.id}")
    
    # Vérifier d'abord si la ressource existe et appartient à l'utilisateur
    db_resource_check = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource_check is None:
        logger.warning(f"Ressource {resource_id} non trouvée pour la suppression.")
        raise HTTPException(status_code=404, detail="Resource not found")
    if db_resource_check.user_id != current_user.id:
        logger.error(f"Accès non autorisé pour la suppression de la ressource {resource_id} par l'utilisateur {current_user.id}")
        raise HTTPException(status_code=403, detail="Not authorized to delete this resource")

    # Appeler la fonction CRUD pour supprimer
    deleted = crud.resource.delete_resource(db=db, resource_id=resource_id)
    
    if not deleted:
        # Ceci ne devrait pas arriver si la vérification initiale a réussi, mais par sécurité
        logger.error(f"Échec de la suppression de la ressource {resource_id} après vérification.")
        raise HTTPException(status_code=404, detail="Resource not found during delete process")
    
    logger.info(f"Ressource {resource_id} supprimée avec succès.")
    # Pas de contenu à retourner pour une réponse 204
    return
