from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base
from models.association_tables import session_resource_association, objective_resource_association, study_object_resource, oeuvre_resource_association

# --- Modèle pour les Types de Ressources ---
class ResourceType(Base):
    __tablename__ = 'resource_types'

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False) # ex: 'text', 'image', 'video', 'audio', 'pdf'
    value = Column(String, nullable=False) # ex: 'Texte', 'Image', 'Vidéo', 'Audio', 'PDF'

    # Relation inverse: les ressources de ce type
    resources = relationship("Resource", back_populates="type")
    # Relation inverse: les sous-types appartenant à ce type
    sub_types = relationship("ResourceSubType", back_populates="type")

# --- Modèle pour les Sous-Types de Ressources ---
class ResourceSubType(Base):
    __tablename__ = 'resource_subtypes' 

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, index=True, nullable=False) 
    value = Column(String, nullable=False) 
    type_id = Column(Integer, ForeignKey('resource_types.id'), nullable=False) 

    # Relation: le type parent
    type = relationship("ResourceType", back_populates="sub_types")
    # Relation inverse: les ressources de ce sous-type
    resources = relationship(
        "Resource", 
        primaryjoin="Resource.sub_type_id == ResourceSubType.id", # Condition de jointure explicite
        back_populates="sub_type"
    )

# --- Modèle pour les Ressources ---
class Resource(Base):
    __tablename__ = 'resources'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    type_id = Column(Integer, ForeignKey('resource_types.id'), nullable=False)
    sub_type_id = Column(Integer, ForeignKey('resource_subtypes.id'), nullable=True) # Nullable si pas applicable
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    # Champs ajoutés par la migration b6c5f8d9e0a1
    source_type = Column(String(10), nullable=False, comment='Type de source: file ou ai')
    file_path = Column(String, nullable=True, comment='Chemin du fichier uploadé')
    file_name = Column(String, nullable=True, comment='Nom original du fichier uploadé')
    file_size = Column(Integer, nullable=True, comment='Taille du fichier en octets')
    file_type = Column(String, nullable=True, comment='Type MIME du fichier')

    # Métadonnées Docling / cache IA
    docling_status = Column(String(20), nullable=True, comment='Statut Docling: pending|processing|ready|error')
    docling_md_path = Column(String, nullable=True, comment='Chemin relatif du markdown extrait (Docling)')
    docling_tables_path = Column(String, nullable=True, comment='Chemin relatif des tables extraites (Docling)')
    docling_chars = Column(Integer, nullable=True, comment='Nombre de caractères du markdown Docling')
    docling_sha256 = Column(String(64), nullable=True, comment="Hash SHA-256 du fichier original au moment de l'extraction")
    docling_version = Column(String(50), nullable=True, comment='Version de Docling utilisée')
    ocr_used = Column(Boolean, nullable=True, comment='Extraction avec OCR utilisée')
    extracted_at = Column(DateTime, nullable=True, comment="Horodatage de fin d'extraction")
    docling_error = Column(Text, nullable=True, comment='Message d\'erreur Docling')

    # Relations
    user = relationship("User", back_populates="resources")
    sessions = relationship("Session", secondary=session_resource_association, back_populates="resources")

    # Relations avec Type et SubType
    type = relationship("ResourceType", back_populates="resources")
    sub_type = relationship("ResourceSubType", back_populates="resources")

    # Relationship Many-to-Many with Objective
    objectives = relationship(
        "Objective",
        secondary=objective_resource_association,
        back_populates="resources" # 'resources' a été ajouté à Objective
    )

    # Relation Many-to-Many avec StudyObject
    study_objects = relationship(
        "StudyObject",
        secondary=study_object_resource,
        back_populates="resources"
    )

    # Relation Many-to-Many avec Oeuvre
    oeuvres = relationship(
        "Oeuvre",
        secondary=oeuvre_resource_association,
        back_populates="resources"
    )
