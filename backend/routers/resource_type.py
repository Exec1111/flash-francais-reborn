from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import crud
from schemas.resource_type import ResourceTypeResponse, ResourceSubTypeResponse, ResourceTypeWithSubTypes

resource_type_router = APIRouter(
    tags=["resource_types"],
    responses={404: {"description": "Not found"}},
)

@resource_type_router.get("/types", response_model=List[ResourceTypeResponse])
def get_resource_types_route(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Récupère la liste de tous les types de ressources.
    """
    resource_types = crud.get_resource_types(db, skip=skip, limit=limit)
    return resource_types

@resource_type_router.get("/types/{type_id}", response_model=ResourceTypeWithSubTypes)
def get_resource_type_route(type_id: int, db: Session = Depends(get_db)):
    """
    Récupère un type de ressource par son ID avec ses sous-types.
    """
    resource_type = crud.get_resource_type(db, type_id=type_id)
    if resource_type is None:
        raise HTTPException(status_code=404, detail="Type de ressource non trouvé")
    
    # Récupérer les sous-types associés
    subtypes = crud.get_resource_subtypes(db, type_id=type_id)
    
    # Créer un objet ResourceTypeWithSubTypes
    return ResourceTypeWithSubTypes(
        id=resource_type.id,
        key=resource_type.key,
        value=resource_type.value,
        sub_types=subtypes
    )

@resource_type_router.get("/subtypes", response_model=List[ResourceSubTypeResponse])
def get_resource_subtypes_route(type_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Récupère la liste des sous-types de ressources, optionnellement filtrés par type_id.
    """
    resource_subtypes = crud.get_resource_subtypes(db, type_id=type_id, skip=skip, limit=limit)
    return resource_subtypes

@resource_type_router.get("/subtypes/{subtype_id}", response_model=ResourceSubTypeResponse)
def get_resource_subtype_route(subtype_id: int, db: Session = Depends(get_db)):
    """
    Récupère un sous-type de ressource par son ID.
    """
    resource_subtype = crud.get_resource_subtype(db, subtype_id=subtype_id)
    if resource_subtype is None:
        raise HTTPException(status_code=404, detail="Sous-type de ressource non trouvé")
    return resource_subtype
