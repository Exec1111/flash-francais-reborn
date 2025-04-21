from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
from .association_tables import progression_study_object, study_object_resource

class StudyObject(Base):
    __tablename__ = "study_objects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    progressions = relationship(
        "Progression",
        secondary=progression_study_object,
        back_populates="study_objects"
    )
    resources = relationship(
        "Resource",
        secondary=study_object_resource,
        back_populates="study_objects"
    )
