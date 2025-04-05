from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserRole(enum.Enum):
    TEACHER = "teacher"
    STUDENT = "student"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.TEACHER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations avec les autres modèles
    resources = relationship("Resource", back_populates="user")
    sequences = relationship("Sequence", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    objectives = relationship("Objective", back_populates="user")
    progressions = relationship("Progression", back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"
