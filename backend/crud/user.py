from sqlalchemy.orm import Session
from models import User, UserRole
from schemas.user import UserCreate
from hashing import get_password_hash, verify_password

def get_user(db: Session, user_id: int):
    """Récupère un utilisateur par son ID."""
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    """Récupère un utilisateur par son email."""
    return db.query(User).filter(User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    """Récupère une liste d'utilisateurs."""
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate):
    """Crée un nouvel utilisateur."""
    # Vérifier si l'utilisateur existe déjà
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        return None
    
    # Créer l'utilisateur
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        hashed_password=hashed_password,
        role=UserRole(user.role)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    """Authentifie un utilisateur."""
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def update_user(db: Session, user_id: int, user_data: dict):
    """Met à jour les informations d'un utilisateur."""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    # Mettre à jour les champs
    for key, value in user_data.items():
        if key == "password":
            setattr(db_user, "hashed_password", get_password_hash(value))
        elif key == "role" and value:
            setattr(db_user, key, UserRole(value))
        elif hasattr(db_user, key):
            setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    """Supprime un utilisateur."""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    db.delete(db_user)
    db.commit()
    return db_user
