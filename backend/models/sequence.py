from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from models.association_tables import sequence_objective_association, sequence_study_object
from datetime import datetime

class Sequence(Base):
    __tablename__ = "sequences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="sequences")
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Foreign Key to Progression
    progression_id = Column(Integer, ForeignKey("progressions.id"), nullable=False)

    order = Column(Integer, nullable=False, default=0)  # Ordre d'affichage

    # Relationship with Progression (many-to-one)
    progression = relationship("Progression", back_populates="sequences")
    # Relationship with Session (one-to-many)
    sessions = relationship(
        "Session", 
        back_populates="sequence",
        cascade="all, delete-orphan" # Ajout de la cascade pour la suppression
    )
    # Relations avec les objectifs (many-to-many)
    objectives = relationship(
        "Objective",
        secondary=sequence_objective_association,
        back_populates="sequences"
    )
    study_objects = relationship(
        "StudyObject",
        secondary=sequence_study_object,
        back_populates="sequences"
    )
