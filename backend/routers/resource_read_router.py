from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from schemas.resource import ResourceResponse, ResourceListResponse
from schemas.study_object import StudyObjectReadShort
from database import get_db
from dependencies import get_current_active_user
from models import User as UserModel
import crud.resource
import logging
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

resource_read_router = APIRouter()

@resource_read_router.get("/", response_model=ResourceListResponse)
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

@resource_read_router.get("/by_session/{session_id}", response_model=list[ResourceResponse])
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

@resource_read_router.get("/standalone/", response_model=List[ResourceResponse])
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

@resource_read_router.get("/{resource_id}", response_model=ResourceResponse)
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