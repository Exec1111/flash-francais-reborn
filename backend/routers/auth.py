from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from typing import Any

from database import get_db
from schemas.user import UserCreate, UserResponse, Token
from security import authenticate_user, create_access_token, get_current_active_user
from config import get_settings
import logging
from crud import user as crud

load_dotenv()

settings = get_settings()
auth_router = APIRouter()

# Configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@auth_router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)) -> Any:
    """
    Crée un nouvel utilisateur.
    """
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé"
        )
    return crud.create_user(db=db, user=user)

@auth_router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    """
    Obtient un token JWT pour l'authentification.
    """
    env = os.getenv("ENV", "production").lower()
    
    if env == "development":
        # Mode développement : accepter n'importe quel mot de passe
        user = crud.get_user_by_email(db, email=form_data.username)
        if user:
            access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user.email, "role": user.role.value},
                expires_delta=access_token_expires
            )
            return {"access_token": access_token, "token_type": "bearer"}
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email non trouvé",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # Mode production : vérification normale du mot de passe
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@auth_router.get("/me", response_model=UserResponse)
def read_users_me(current_user = Depends(get_current_active_user)) -> Any:
    """
    Récupère les informations de l'utilisateur connecté.
    """
    return current_user
