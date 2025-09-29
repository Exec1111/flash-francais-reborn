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
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_token_expiration(token: str) -> Optional[datetime]:
    """Récupère la date d'expiration d'un token JWT."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp_timestamp = payload.get("exp")
        if exp_timestamp:
            return datetime.utcfromtimestamp(exp_timestamp)
        return None
    except JWTError:
        return None

def extend_token(token: str) -> Optional[str]:
    """Prolonge un token JWT existant."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # Supprimer les claims temporels pour créer un nouveau token
        payload.pop("exp", None)
        payload.pop("iat", None)
        
        # Créer un nouveau token avec une nouvelle durée
        new_expires_delta = timedelta(minutes=settings.SESSION_EXTEND_MINUTES)
        return create_access_token(payload, new_expires_delta)
    except JWTError:
        logger.warning("Impossible de prolonger le token: token invalide")
        return None

def get_token_time_remaining(token: str) -> Optional[int]:
    """Retourne le temps restant avant expiration du token en minutes."""
    expiration = get_token_expiration(token)
    if expiration:
        remaining = expiration - datetime.utcnow()
        remaining_minutes = max(0, round(remaining.total_seconds() / 60))
        #logger.info(f"[SESSION DEBUG] Expiration: {expiration}, Now: {datetime.utcnow()}, Remaining: {remaining_minutes} minutes (exact: {remaining.total_seconds()/60:.2f})")
        return remaining_minutes
    return None

def should_show_warning(token: str) -> bool:
    """Détermine si le warning de session doit être affiché."""
    time_remaining = get_token_time_remaining(token)
    if time_remaining is not None:
        # Afficher le warning seulement si le temps restant est inférieur ou égal au seuil
        # ET supérieur à 0 (pour éviter l'affichage immédiat sur une nouvelle session)
        should_warn = 0 < time_remaining <= settings.SESSION_WARNING_MINUTES
        logger.info(f"[SESSION DEBUG] Time remaining: {time_remaining}min, Warning threshold: {settings.SESSION_WARNING_MINUTES}min, Should warn: {should_warn}")
        return should_warn
    return False

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
