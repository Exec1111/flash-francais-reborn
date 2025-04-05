from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import crud.user as crud
from schemas.user import TokenData
from config import get_settings
import logging

# Configuration du logger
logger = logging.getLogger(__name__)

settings = get_settings()

# Configuration de la sécurité
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def authenticate_user(db: Session, email: str, password: str):
    """Authentifie un utilisateur en vérifiant son email et son mot de passe."""
    logger.info(f"Tentative d'authentification pour l'email: {email}")
    user = crud.get_user_by_email(db, email)
    if not user:
        logger.warning(f"Utilisateur non trouvé pour l'email: {email}")
        return False
    
    logger.info(f"Utilisateur trouvé: {user.email}. Vérification du mot de passe.")
    if not user.check_password(password):
        logger.warning(f"Mot de passe incorrect pour l'email: {email}")
        return False
    
    logger.info(f"Authentification réussie pour l'email: {email}")
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crée un token JWT pour l'authentification."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Récupère l'utilisateur actuel à partir du token JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user = Depends(get_current_user)):
    """Vérifie si l'utilisateur actuel est actif."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Utilisateur inactif")
    return current_user

def get_current_admin_user(current_user = Depends(get_current_active_user)):
    """Vérifie si l'utilisateur actuel est un administrateur."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes"
        )
    return current_user

def get_current_teacher_user(current_user = Depends(get_current_active_user)):
    """Vérifie si l'utilisateur actuel est un professeur ou un administrateur."""
    if current_user.role.value not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes"
        )
    return current_user
