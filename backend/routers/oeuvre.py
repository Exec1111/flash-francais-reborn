from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from crud import oeuvre as crud
from schemas.oeuvre import (
    OeuvreCreate,
    OeuvreRead,
    OeuvreReadShort,
    OeuvreUpdate,
    OeuvreAIGenerate
)
from schemas.pagination import PaginatedResponse
from dependencies import get_current_user
from models import User

router = APIRouter(
    prefix="/oeuvres",
    tags=["oeuvres"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=OeuvreRead)
def create_oeuvre(
    obj: OeuvreCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Crée une nouvelle œuvre"""
    db_obj = crud.create_oeuvre(db, obj, current_user)
    return OeuvreRead.from_orm(db_obj)


@router.get("/", response_model=PaginatedResponse[OeuvreReadShort])
def get_oeuvres(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(20, ge=1, le=100, description="Nombre maximum d'éléments à retourner"),
    search: Optional[str] = Query(None, description="Recherche dans le titre et l'auteur"),
    type_filter: Optional[str] = Query(None, description="Filtrer par type d'œuvre"),
    genre_filter: Optional[str] = Query(None, description="Filtrer par genre"),
    public_only: bool = Query(False, description="Afficher seulement les œuvres publiques"),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère la liste des œuvres avec filtres et pagination"""
    oeuvres_data = crud.get_oeuvres(
        db, 
        user=current_user, 
        skip=skip, 
        limit=limit,
        search=search,
        type_filter=type_filter,
        genre_filter=genre_filter,
        public_only=public_only
    )
    
    pydantic_items = [OeuvreReadShort.from_orm(item) for item in oeuvres_data["items"]]
    return PaginatedResponse(total=oeuvres_data["total"], items=pydantic_items)


@router.get("/public", response_model=PaginatedResponse[OeuvreReadShort])
def get_public_oeuvres(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(20, ge=1, le=100, description="Nombre maximum d'éléments à retourner"),
    search: Optional[str] = Query(None, description="Recherche dans le titre et l'auteur"),
    type_filter: Optional[str] = Query(None, description="Filtrer par type d'œuvre"),
    genre_filter: Optional[str] = Query(None, description="Filtrer par genre")
):
    """Récupère la liste des œuvres publiques (accessible sans authentification)"""
    oeuvres_data = crud.get_oeuvres(
        db, 
        user=None, 
        skip=skip, 
        limit=limit,
        search=search,
        type_filter=type_filter,
        genre_filter=genre_filter,
        public_only=True
    )
    
    pydantic_items = [OeuvreReadShort.from_orm(item) for item in oeuvres_data["items"]]
    return PaginatedResponse(total=oeuvres_data["total"], items=pydantic_items)


@router.get("/{oeuvre_id}", response_model=OeuvreRead)
def get_oeuvre(
    oeuvre_id: int, 
    db: Session = Depends(get_db), 
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère une œuvre par son ID"""
    db_obj = crud.get_oeuvre(db, oeuvre_id, current_user, include_relations=True)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Œuvre non trouvée")
    return OeuvreRead.from_orm(db_obj)


@router.patch("/{oeuvre_id}", response_model=OeuvreRead)
def update_oeuvre(
    oeuvre_id: int, 
    obj: OeuvreUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Met à jour une œuvre (seulement si l'utilisateur en est le propriétaire)"""
    db_obj = crud.update_oeuvre(db, oeuvre_id, obj, current_user)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Œuvre non trouvée ou non autorisée")
    return OeuvreRead.from_orm(db_obj)


@router.delete("/{oeuvre_id}", status_code=204)
def delete_oeuvre(
    oeuvre_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Supprime une œuvre (seulement si l'utilisateur en est le propriétaire)"""
    deleted = crud.delete_oeuvre(db, oeuvre_id, current_user)
    if not deleted:
        raise HTTPException(status_code=404, detail="Œuvre non trouvée ou non autorisée")


@router.get("/by_type/{type_oeuvre}", response_model=List[OeuvreReadShort])
def get_oeuvres_by_type(
    type_oeuvre: str, 
    db: Session = Depends(get_db), 
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère les œuvres d'un type donné"""
    oeuvres = crud.get_oeuvres_by_type(db, type_oeuvre, current_user)
    return [OeuvreReadShort.from_orm(oeuvre) for oeuvre in oeuvres]


@router.get("/by_auteur/{nom_auteur}", response_model=List[OeuvreReadShort])
def get_oeuvres_by_auteur(
    nom_auteur: str, 
    db: Session = Depends(get_db), 
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère les œuvres d'un auteur donné"""
    oeuvres = crud.get_oeuvres_by_auteur(db, nom_auteur, current_user)
    return [OeuvreReadShort.from_orm(oeuvre) for oeuvre in oeuvres]


@router.get("/search/{query_text}", response_model=List[OeuvreReadShort])
def search_oeuvres(
    query_text: str, 
    limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
    db: Session = Depends(get_db), 
    current_user: Optional[User] = Depends(get_current_user)
):
    """Recherche d'œuvres par texte libre"""
    oeuvres = crud.search_oeuvres(db, query_text, current_user, limit)
    return [OeuvreReadShort.from_orm(oeuvre) for oeuvre in oeuvres]


@router.get("/metadata/types", response_model=List[str])
def get_types_oeuvres(
    db: Session = Depends(get_db), 
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère la liste des types d'œuvres disponibles"""
    return crud.get_types_oeuvres(db, current_user)


@router.get("/metadata/genres", response_model=List[str])
def get_genres_oeuvres(
    db: Session = Depends(get_db), 
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère la liste des genres d'œuvres disponibles"""
    return crud.get_genres_oeuvres(db, current_user)


# Route pour la génération IA
@router.post("/generate")
async def generate_oeuvre_ai(
    obj: OeuvreAIGenerate, 
    current_user: User = Depends(get_current_user)
):
    """Génère les données d'une œuvre via l'IA sans la sauvegarder"""
    try:
        # Importer le service de génération IA
        from backend.ai.services.resource_generator import generate_ai_resource_content
        
        # Préparer les variables d'entrée pour l'IA
        title_part = (obj.titre or "").strip()
        author_full = " ".join([p for p in [(obj.auteur_prenom or "").strip(), (obj.auteur_nom or "").strip()] if p])
        titre_ou_auteur = " - ".join([p for p in [title_part, author_full] if p])

        input_variables = {
            "titre_ou_auteur": titre_ou_auteur,
            "type_prefere": obj.type_prefere or "",
            "niveau_cible": obj.niveau_cible or "3e",
            "extrait": obj.extrait or False,
            # Champs additionnels pour guider l'IA
            "prompt_libre": getattr(obj, "prompt_libre", None) or "",
            "study_object": {
                "title": getattr(obj, "study_object_title", None) or "",
                "description": getattr(obj, "study_object_description", None) or "",
            },
        }
        
        # Appeler le service de génération IA
        ai_generated_data = await generate_ai_resource_content(
            type_key="oeuvre",
            subtype_key="generation", 
            input_variables=input_variables,
            user_id=current_user.id
        )
        
        # Retourner directement les données générées sans sauvegarder
        return ai_generated_data
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la génération IA de l'œuvre: {str(e)}"
        )


@router.post("/{oeuvre_id}/resources/{resource_id}")
async def add_resource_to_oeuvre(
    oeuvre_id: int,
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Associe une ressource à une œuvre"""
    success = crud.add_resource_to_oeuvre(db, oeuvre_id, resource_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Œuvre ou ressource non trouvée")
    return {"message": "Ressource associée avec succès"}


@router.delete("/{oeuvre_id}/resources/{resource_id}")
async def remove_resource_from_oeuvre(
    oeuvre_id: int,
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dissocie une ressource d'une œuvre"""
    success = crud.remove_resource_from_oeuvre(db, oeuvre_id, resource_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Œuvre ou ressource non trouvée")
    return {"message": "Ressource dissociée avec succès"}


@router.get("/by-resource/{resource_id}")
async def get_oeuvres_by_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère les œuvres associées à une ressource"""
    oeuvres = crud.get_oeuvres_by_resource(db, resource_id, current_user)
    return [OeuvreReadShort.from_orm(oeuvre) for oeuvre in oeuvres]

@router.get("/by-study-object/{study_object_id}")
async def get_oeuvres_by_study_object(
    study_object_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère les œuvres associées à un objet d'étude"""
    oeuvres = crud.get_oeuvres_by_study_object(db, study_object_id, current_user)
    return [OeuvreReadShort.from_orm(oeuvre) for oeuvre in oeuvres]
