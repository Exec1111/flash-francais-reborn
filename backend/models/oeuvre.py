from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime


class Oeuvre(Base):
    __tablename__ = "oeuvres"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String, nullable=False, index=True)
    
    # Informations sur l'auteur (stockées en JSON pour flexibilité)
    auteur = Column(JSON, nullable=False)  # {"nom": "...", "prenom": "...", "nationalite": "..."}
    
    # Caractéristiques de l'œuvre
    type = Column(String, nullable=False, index=True)  # roman, poème, nouvelle, théâtre, essai, etc.
    genre = Column(String, nullable=True)  # tragédie, comédie, fantastique, réalisme, etc.
    mouvement_litteraire = Column(String, nullable=True)  # romantisme, classicisme, réalisme, etc.
    langue_originale = Column(String, nullable=True)
    date_publication = Column(Integer, nullable=True)  # année
    extrait = Column(Boolean, nullable=False, default=False)
    
    # Contenu (stocké en JSON)
    contenu = Column(JSON, nullable=True)  # {"resume": "...", "themes": [...], "mots_cles": [...]}
    
    # Pédagogie (stocké en JSON)
    pedagogie = Column(JSON, nullable=True)  # {"niveau_mini_recommande": "...", "domaines_programme": [...], "difficulte": "..."}
    
    # Ressources (stocké en JSON) - optionnel pour l'instant
    ressources = Column(JSON, nullable=True)  # {"documents_associes": [...], "adaptations": [...], "liens_externes": [...]}
    
    # Métadonnées
    cree_par = Column(String, nullable=False, index=True)  # "SYSTEME" ou user_id
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    tags = Column(JSON, nullable=True)  # array of strings
    
    # Relation avec l'utilisateur (pour les œuvres créées par un utilisateur spécifique)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user = relationship("User", back_populates="oeuvres")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Oeuvre {self.titre} by {self.auteur.get('nom', 'Unknown') if self.auteur else 'Unknown'}>"

    @property
    def is_public(self) -> bool:
        """Retourne True si l'œuvre est publique (créée par le système)"""
        return self.cree_par == "SYSTEME"
    
    @property
    def auteur_complet(self) -> str:
        """Retourne le nom complet de l'auteur formaté"""
        if not self.auteur:
            return "Auteur inconnu"
        
        prenom = self.auteur.get('prenom', '')
        nom = self.auteur.get('nom', '')
        
        if prenom and nom:
            return f"{prenom} {nom}"
        elif nom:
            return nom
        elif prenom:
            return prenom
        else:
            return "Auteur inconnu"
