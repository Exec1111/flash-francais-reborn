from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from models.association_tables import session_resource_association

# Modèle pour les types de ressources
class ResourceType(Base):
    __tablename__ = "resource_types"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    
    # Relations
    sub_types = relationship("ResourceSubType", back_populates="type")
    resources = relationship("Resource", back_populates="type")

# Modèle pour les sous-types de ressources
class ResourceSubType(Base):
    __tablename__ = "resource_subtypes"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    type_id = Column(Integer, ForeignKey("resource_types.id"), nullable=False)
    
    # Relations
    type = relationship("ResourceType", back_populates="sub_types")
    resources = relationship("Resource", back_populates="sub_type")

# Modèle principal pour les ressources
class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    type_id = Column(Integer, ForeignKey("resource_types.id"), nullable=False)
    sub_type_id = Column(Integer, ForeignKey("resource_subtypes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Champs ajoutés par la migration b6c5f8d9e0a1
    source_type = Column(String(10), nullable=False, comment='Type de source: file ou ai')
    file_path = Column(String, nullable=True, comment='Chemin du fichier uploadé')
    file_name = Column(String, nullable=True, comment='Nom original du fichier uploadé')
    file_size = Column(Integer, nullable=True, comment='Taille du fichier en octets')
    file_type = Column(String, nullable=True, comment='Type MIME du fichier')
    
    # Relations
    type = relationship("ResourceType", back_populates="resources")
    sub_type = relationship("ResourceSubType", back_populates="resources")
    sessions = relationship(
        "Session",
        secondary=session_resource_association,
        back_populates="resources"
    )
    user = relationship("User", back_populates="resources")
