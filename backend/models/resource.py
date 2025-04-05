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
    content = Column(JSON, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relations
    type = relationship("ResourceType", back_populates="resources")
    sub_type = relationship("ResourceSubType", back_populates="resources")
    sessions = relationship(
        "Session",
        secondary=session_resource_association,
        back_populates="resources"
    )
    user = relationship("User", back_populates="resources")
