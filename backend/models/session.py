from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Interval, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
# Importer la table d'association
from models.association_tables import session_objective_association, session_resource_association

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="sessions")
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    duration = Column(Integer)  # Durée en minutes
    notes = Column(Text, nullable=True)
    # Foreign Key to Sequence
    sequence_id = Column(Integer, ForeignKey("sequences.id"), nullable=False)
    # Champ pour l'ordre d'affichage et le drag-and-drop
    order = Column(Integer, nullable=True)

    # Lien vers la fiche de séance (Resource) générée par IA
    fiche_resource_id = Column(Integer, ForeignKey("resources.id"), nullable=True)
    fiche_resource = relationship("Resource", foreign_keys=[fiche_resource_id])

    # Relationship with Sequence (many-to-one)
    sequence = relationship("Sequence", back_populates="sessions") # 'sessions' sera ajouté à Sequence
    # Relationship with Objective (many-to-many)
    objectives = relationship(
        "Objective",
        secondary=session_objective_association,
        back_populates="sessions"
    )
    
    resources = relationship(
        "Resource",
        secondary=session_resource_association,
        back_populates="sessions"
    )
