from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas.resource import ResourceTypeSchema, ResourceSubTypeSchema
import crud.resource
import logging

logger = logging.getLogger(__name__)

resource_types_router = APIRouter()

@resource_types_router.get("/types", response_model=List[ResourceTypeSchema])
def read_resource_types(
    db: Session = Depends(get_db),
):
    """Récupère la liste de tous les types de ressources."""
    types = crud.resource.get_resource_types(db)
    return types

@resource_types_router.get("/sub-types", response_model=List[ResourceSubTypeSchema])
def read_resource_sub_types(
    type_id: Optional[int] = Query(None, description="Filtrer les sous-types par l'ID du type parent"),
    db: Session = Depends(get_db),
):
    """Récupère la liste des sous-types de ressources, éventuellement filtrée par type."""
    sub_types = crud.resource.get_resource_sub_types(db, type_id=type_id)
    return sub_types