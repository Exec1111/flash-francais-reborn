from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from models import Oeuvre
from models.user import User
from schemas.oeuvre import OeuvreCreate, OeuvreUpdate


def get_oeuvre(db: Session, oeuvre_id: int, user: Optional[User] = None) -> Optional[Oeuvre]:
    """Récupère une œuvre par son ID, en tenant compte des permissions"""
    query = db.query(Oeuvre).filter(Oeuvre.id == oeuvre_id)
    
    if user:
        # L'utilisateur peut voir ses propres œuvres + les œuvres publiques
        query = query.filter(
            or_(
                Oeuvre.cree_par == "SYSTEME",  # Œuvres publiques
                Oeuvre.user_id == user.id      # Ses propres œuvres
            )
        )
    else:
        # Si pas d'utilisateur, seulement les œuvres publiques
        query = query.filter(Oeuvre.cree_par == "SYSTEME")
    
    return query.first()


def get_oeuvres(db: Session, user: Optional[User] = None, skip: int = 0, limit: int = 100, 
                search: Optional[str] = None, type_filter: Optional[str] = None,
                genre_filter: Optional[str] = None, public_only: bool = False):
    """Récupère la liste des œuvres avec filtres et pagination"""
    query = db.query(Oeuvre)
    
    # Filtrage par permissions
    if user and not public_only:
        # L'utilisateur peut voir ses propres œuvres + les œuvres publiques
        query = query.filter(
            or_(
                Oeuvre.cree_par == "SYSTEME",  # Œuvres publiques
                Oeuvre.user_id == user.id      # Ses propres œuvres
            )
        )
    else:
        # Seulement les œuvres publiques
        query = query.filter(Oeuvre.cree_par == "SYSTEME")
    
    # Filtrage par recherche textuelle
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Oeuvre.titre.ilike(search_term),
                Oeuvre.auteur.op('->>')('nom').ilike(search_term),
                Oeuvre.auteur.op('->>')('prenom').ilike(search_term)
            )
        )
    
    # Filtrage par type
    if type_filter:
        query = query.filter(Oeuvre.type == type_filter)
    
    # Filtrage par genre
    if genre_filter:
        query = query.filter(Oeuvre.genre == genre_filter)
    
    # Tri par titre
    query = query.order_by(Oeuvre.titre)
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return {"total": total, "items": items}


def get_oeuvres_by_type(db: Session, type_oeuvre: str, user: Optional[User] = None) -> List[Oeuvre]:
    """Récupère les œuvres d'un type donné"""
    query = db.query(Oeuvre).filter(Oeuvre.type == type_oeuvre)
    
    if user:
        query = query.filter(
            or_(
                Oeuvre.cree_par == "SYSTEME",
                Oeuvre.user_id == user.id
            )
        )
    else:
        query = query.filter(Oeuvre.cree_par == "SYSTEME")
    
    return query.all()


def get_oeuvres_by_auteur(db: Session, nom_auteur: str, user: Optional[User] = None) -> List[Oeuvre]:
    """Récupère les œuvres d'un auteur donné"""
    query = db.query(Oeuvre).filter(
        or_(
            Oeuvre.auteur.op('->>')('nom').ilike(f"%{nom_auteur}%"),
            Oeuvre.auteur.op('->>')('prenom').ilike(f"%{nom_auteur}%")
        )
    )
    
    if user:
        query = query.filter(
            or_(
                Oeuvre.cree_par == "SYSTEME",
                Oeuvre.user_id == user.id
            )
        )
    else:
        query = query.filter(Oeuvre.cree_par == "SYSTEME")
    
    return query.all()


def create_oeuvre(db: Session, obj_in: OeuvreCreate, user: Optional[User] = None) -> Oeuvre:
    """Crée une nouvelle œuvre"""
    # Déterminer qui crée l'œuvre
    if user:
        cree_par = str(user.id)
        user_id = user.id
    else:
        cree_par = "SYSTEME"
        user_id = None
    
    # Conversion des objets Pydantic en dictionnaires pour le stockage JSON
    auteur_dict = obj_in.auteur.model_dump() if obj_in.auteur else {}
    contenu_dict = obj_in.contenu.model_dump() if obj_in.contenu else {}
    pedagogie_dict = obj_in.pedagogie.model_dump() if obj_in.pedagogie else {}
    ressources_dict = obj_in.ressources.model_dump() if obj_in.ressources else {}
    
    db_obj = Oeuvre(
        titre=obj_in.titre,
        auteur=auteur_dict,
        type=obj_in.type,
        genre=obj_in.genre,
        mouvement_litteraire=obj_in.mouvement_litteraire,
        langue_originale=obj_in.langue_originale,
        date_publication=obj_in.date_publication,
        extrait=obj_in.extrait,
        contenu=contenu_dict,
        pedagogie=pedagogie_dict,
        ressources=ressources_dict,
        tags=obj_in.tags,
        cree_par=cree_par,
        user_id=user_id
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_oeuvre(db: Session, oeuvre_id: int, obj_update: OeuvreUpdate, user: User) -> Optional[Oeuvre]:
    """Met à jour une œuvre (seulement si l'utilisateur en est le propriétaire)"""
    db_obj = db.query(Oeuvre).filter(
        and_(
            Oeuvre.id == oeuvre_id,
            Oeuvre.user_id == user.id  # Seulement ses propres œuvres
        )
    ).first()
    
    if not db_obj:
        return None
    
    update_data = obj_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if field in ["auteur", "contenu", "pedagogie", "ressources"] and value is not None:
            # Conversion des objets Pydantic en dictionnaires pour les champs JSON
            if hasattr(value, 'model_dump'):
                value = value.model_dump()
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_oeuvre(db: Session, oeuvre_id: int, user: User) -> bool:
    """Supprime une œuvre (seulement si l'utilisateur en est le propriétaire)"""
    db_obj = db.query(Oeuvre).filter(
        and_(
            Oeuvre.id == oeuvre_id,
            Oeuvre.user_id == user.id  # Seulement ses propres œuvres
        )
    ).first()
    
    if not db_obj:
        return False
    
    db.delete(db_obj)
    db.commit()
    return True


def get_types_oeuvres(db: Session, user: Optional[User] = None) -> List[str]:
    """Récupère la liste des types d'œuvres disponibles"""
    query = db.query(Oeuvre.type).distinct()
    
    if user:
        query = query.filter(
            or_(
                Oeuvre.cree_par == "SYSTEME",
                Oeuvre.user_id == user.id
            )
        )
    else:
        query = query.filter(Oeuvre.cree_par == "SYSTEME")
    
    return [result[0] for result in query.all() if result[0]]


def get_genres_oeuvres(db: Session, user: Optional[User] = None) -> List[str]:
    """Récupère la liste des genres d'œuvres disponibles"""
    query = db.query(Oeuvre.genre).distinct()
    
    if user:
        query = query.filter(
            or_(
                Oeuvre.cree_par == "SYSTEME",
                Oeuvre.user_id == user.id
            )
        )
    else:
        query = query.filter(Oeuvre.cree_par == "SYSTEME")
    
    return [result[0] for result in query.all() if result[0]]


def search_oeuvres(db: Session, query_text: str, user: Optional[User] = None, limit: int = 10) -> List[Oeuvre]:
    """Recherche d'œuvres par texte libre"""
    search_term = f"%{query_text}%"
    
    query = db.query(Oeuvre).filter(
        or_(
            Oeuvre.titre.ilike(search_term),
            Oeuvre.auteur.op('->>')('nom').ilike(search_term),
            Oeuvre.auteur.op('->>')('prenom').ilike(search_term),
            Oeuvre.contenu.op('->>')('resume').ilike(search_term),
            Oeuvre.tags.op('@>')([query_text.lower()])  # Recherche dans les tags
        )
    )
    
    if user:
        query = query.filter(
            or_(
                Oeuvre.cree_par == "SYSTEME",
                Oeuvre.user_id == user.id
            )
        )
    else:
        query = query.filter(Oeuvre.cree_par == "SYSTEME")
    
    return query.limit(limit).all()
