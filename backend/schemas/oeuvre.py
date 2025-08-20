from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class AuteurSchema(BaseModel):
    """Schéma pour les informations de l'auteur"""
    nom: Optional[str] = None
    prenom: Optional[str] = None
    nationalite: Optional[str] = None


class ContenuSchema(BaseModel):
    """Schéma pour le contenu de l'œuvre"""
    resume: Optional[str] = None
    themes: Optional[List[str]] = []
    mots_cles: Optional[List[str]] = []


class PedagogieSchema(BaseModel):
    """Schéma pour les informations pédagogiques"""
    niveau_mini_recommande: Optional[str] = None
    domaines_programme: Optional[List[str]] = []
    difficulte: Optional[str] = None


class DocumentAssocie(BaseModel):
    """Schéma pour un document associé"""
    type: str  # "fiche", "questionnaire", "corrigé"
    url: str


class Adaptation(BaseModel):
    """Schéma pour une adaptation de l'œuvre"""
    type: str  # "film", "théâtre", "BD", "musique"
    titre: str
    realisateur: Optional[str] = None


class LienExterne(BaseModel):
    """Schéma pour un lien externe"""
    label: str
    url: str


class RessourcesSchema(BaseModel):
    """Schéma pour les ressources associées à l'œuvre"""
    documents_associes: Optional[List[DocumentAssocie]] = []
    adaptations: Optional[List[Adaptation]] = []
    liens_externes: Optional[List[LienExterne]] = []


class OeuvreBase(BaseModel):
    """Schéma de base pour une œuvre"""
    titre: str = Field(..., description="Titre de l'œuvre")
    auteur: AuteurSchema = Field(..., description="Informations sur l'auteur")
    type: str = Field(..., description="Type de l'œuvre (roman, poème, etc.)")
    genre: Optional[str] = Field(None, description="Genre littéraire")
    mouvement_litteraire: Optional[str] = Field(None, description="Mouvement littéraire")
    langue_originale: Optional[str] = Field(None, description="Langue originale")
    date_publication: Optional[int] = Field(None, description="Année de publication")
    extrait: bool = Field(False, description="True si c'est un extrait, False si œuvre complète")
    contenu: Optional[ContenuSchema] = Field(None, description="Contenu de l'œuvre")
    pedagogie: Optional[PedagogieSchema] = Field(None, description="Informations pédagogiques")
    ressources: Optional[RessourcesSchema] = Field(None, description="Ressources associées")
    tags: Optional[List[str]] = Field([], description="Tags personnalisés")


class OeuvreCreate(OeuvreBase):
    """Schéma pour la création d'une œuvre"""
    pass


class OeuvreUpdate(BaseModel):
    """Schéma pour la mise à jour d'une œuvre"""
    titre: Optional[str] = None
    auteur: Optional[AuteurSchema] = None
    type: Optional[str] = None
    genre: Optional[str] = None
    mouvement_litteraire: Optional[str] = None
    langue_originale: Optional[str] = None
    date_publication: Optional[int] = None
    extrait: Optional[bool] = None
    contenu: Optional[ContenuSchema] = None
    pedagogie: Optional[PedagogieSchema] = None
    ressources: Optional[RessourcesSchema] = None
    tags: Optional[List[str]] = None


class OeuvreRead(OeuvreBase):
    """Schéma pour la lecture d'une œuvre"""
    id: int
    cree_par: str
    date_creation: datetime
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Propriétés calculées
    is_public: bool = Field(..., description="True si l'œuvre est publique")
    auteur_complet: str = Field(..., description="Nom complet formaté de l'auteur")

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, orm_obj):
        """Méthode personnalisée pour créer l'objet depuis l'ORM"""
        return cls(
            id=orm_obj.id,
            titre=orm_obj.titre,
            auteur=orm_obj.auteur or {},
            type=orm_obj.type,
            genre=orm_obj.genre,
            mouvement_litteraire=orm_obj.mouvement_litteraire,
            langue_originale=orm_obj.langue_originale,
            date_publication=orm_obj.date_publication,
            extrait=orm_obj.extrait,
            contenu=orm_obj.contenu or {},
            pedagogie=orm_obj.pedagogie or {},
            ressources=orm_obj.ressources or {},
            tags=orm_obj.tags or [],
            cree_par=orm_obj.cree_par,
            date_creation=orm_obj.date_creation,
            user_id=orm_obj.user_id,
            created_at=orm_obj.created_at,
            updated_at=orm_obj.updated_at,
            is_public=orm_obj.is_public,
            auteur_complet=orm_obj.auteur_complet
        )


class OeuvreReadShort(BaseModel):
    """Schéma court pour la lecture d'une œuvre (listes)"""
    id: int
    titre: str
    auteur_complet: str
    type: str
    genre: Optional[str] = None
    date_publication: Optional[int] = None
    extrait: bool
    is_public: bool
    tags: Optional[List[str]] = []

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, orm_obj):
        """Méthode personnalisée pour créer l'objet depuis l'ORM"""
        return cls(
            id=orm_obj.id,
            titre=orm_obj.titre,
            auteur_complet=orm_obj.auteur_complet,
            type=orm_obj.type,
            genre=orm_obj.genre,
            date_publication=orm_obj.date_publication,
            extrait=orm_obj.extrait,
            is_public=orm_obj.is_public,
            tags=orm_obj.tags or []
        )


class OeuvreAIGenerate(BaseModel):
    """Schéma pour la génération d'œuvre par IA"""
    titre: str = Field(..., description="Titre de l'œuvre à rechercher")
    auteur_prenom: str = Field(..., description="Prénom de l'auteur")
    auteur_nom: str = Field(..., description="Nom de l'auteur")
    type_prefere: Optional[str] = Field(None, description="Type d'œuvre préféré si plusieurs possibilités")
    niveau_cible: Optional[str] = Field(None, description="Niveau scolaire cible")
    extrait: bool = Field(False, description="Générer un extrait plutôt que l'œuvre complète")
