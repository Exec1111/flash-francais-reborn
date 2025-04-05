import bcrypt

# Configuration de bcrypt
bcrypt_rounds = 12  # Nombre de tours pour le hachage

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie si un mot de passe en clair correspond à un mot de passe haché."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Hache un mot de passe en utilisant bcrypt."""
    salt = bcrypt.gensalt(rounds=bcrypt_rounds)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
