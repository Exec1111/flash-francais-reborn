from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
# Les tables d'association sont maintenant importées depuis models/__init__.py
from models import progression_study_object

class Progression(Base):
    __tablename__ = "progressions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="progressions")
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    order = Column(Integer, nullable=False, default=0)  # Ordre d'affichage

    # Relations avec les séquences (one-to-many)
    sequences = relationship("Sequence", back_populates="progression")
    study_objects = relationship(
        "StudyObject",
        secondary=progression_study_object,
        back_populates="progressions"
    )
