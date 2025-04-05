from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
# Importer les tables d'association
from models.association_tables import sequence_objective_association, session_objective_association

class Objective(Base):
    __tablename__ = "objectives"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, unique=True) # Titre unique pour éviter les doublons
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="objectives")

    # Relationship Many-to-Many with Sequence
    sequences = relationship(
        "Sequence",
        secondary=sequence_objective_association,
        back_populates="objectives" # 'objectives' sera ajouté à Sequence
    )

    # Relationship Many-to-Many with Session
    sessions = relationship(
        "Session",
        secondary=session_objective_association,
        back_populates="objectives" # 'objectives' sera ajouté à Session
    )
