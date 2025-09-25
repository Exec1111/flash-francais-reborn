from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pathlib import Path
import re
import hashlib
from PIL import Image
from io import BytesIO
import logging
from database import get_db
from dependencies import get_current_active_user
from models import User as UserModel
from werkzeug.utils import secure_filename
from config import get_settings
import shutil

settings = get_settings()
logger = logging.getLogger(__name__)

resource_media_router = APIRouter()

# Utilitaires image/HTML
IMG_SRC_REGEX = re.compile(r"<img[^>]+src=[\"']([^\"']+)[\"']", re.I)

def _extract_image_srcs(html: str) -> set[str]:
    if not html:
        return set()
    return set(IMG_SRC_REGEX.findall(html))

def _normalize_media_src_to_path(src: str, user_id: int) -> Path | None:
    """Convertit une URL/chemin d'image en chemin disque absolu si sous le dossier de l'utilisateur.
    Supporte: URLs absolues http(s)://.../media/uploads/..., chemins "/media/uploads/...",
    ou relatifs "media/uploads/...".
    """
    if not src:
        return None
    # Enlever l'origine si présente
    try:
        if src.startswith("http://") or src.startswith("https://"):
            # Garder uniquement la partie après le host
            src = "/" + src.split("/", 3)[-1]
    except Exception:
        pass
    # Assurer un leading slash pour le match MEDIA_URL_PREFIX
    if not src.startswith('/'):
        src = '/' + src
    if not src.startswith(str(settings.MEDIA_URL_PREFIX)):
        return None
    # Extraire le chemin relatif après MEDIA_URL_PREFIX
    rel = src[len(str(settings.MEDIA_URL_PREFIX)):].lstrip('/')
    # Sécurité: ne gérer que les chemins /uploads/<user_id>/...
    parts = rel.split('/')
    if len(parts) < 2 or parts[0] != 'uploads' or parts[1] != str(user_id):
        return None
    abs_path = Path(settings.UPLOADS_BASE_DIR) / rel
    return abs_path

def _is_image_still_referenced(user_id: int, image_path: Path, exclude_html_path: Path | None = None) -> bool:
    """Vérifie si image_path est encore référencée dans un autre fichier HTML de l'utilisateur.
    On scanne "uploads/<user_id>/**/*.html" (hors exclude_html_path).
    """
    user_root = Path(settings.UPLOADS_BASE_DIR) / 'uploads' / str(user_id)
    if not user_root.exists():
        return False
    # Construire la forme d'URL attendue dans les HTML
    rel = image_path.relative_to(Path(settings.UPLOADS_BASE_DIR))
    url1 = f"{settings.MEDIA_URL_PREFIX}/{rel.as_posix()}"
    url2 = f"/{(Path('media') / 'uploads' / rel).as_posix()}"  # fallback si chemin relatif avec /media/uploads
    for html_file in user_root.rglob('*.html'):
        try:
            if exclude_html_path and html_file.resolve() == exclude_html_path.resolve():
                continue
            content = html_file.read_text(encoding='utf-8', errors='ignore')
            if url1 in content or url2 in content:
                return True
        except Exception:
            continue
    return False

def _get_user_storage_usage_bytes(user_id: int) -> int:
    """Retourne la taille totale des fichiers sous uploads/<user_id> (hors .trash)."""
    root = Path(settings.UPLOADS_BASE_DIR) / 'uploads' / str(user_id)
    total = 0
    if not root.exists():
        return 0
    for p in root.rglob('*'):
        try:
            if p.is_file() and '.trash' not in p.parts:
                total += p.stat().st_size
        except Exception:
            continue
    return total

@resource_media_router.post("/upload-image")
async def upload_image(
    *,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    file: UploadFile = File(...),
):
    """Endpoint minimal pour l'upload d'une image depuis TinyMCE.
    Attend un champ `file` et retourne {"location": "<URL publique>"}.
    """
    try:
        if not file or not file.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fichier manquant")

        if file.content_type not in {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Type d'image non supporté")

        # Lire en mémoire pour calculer la taille et éventuellement compresser
        original_data = await file.read()
        await file.close()

        max_image_bytes = settings.IMAGE_MAX_UPLOAD_SIZE_MB * 1024 * 1024

        # Pas de compression pour SVG: on applique seulement la limite de taille en octets
        if file.content_type == "image/svg+xml":
            if len(original_data) > max_image_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Image trop volumineuse (SVG). Max {settings.IMAGE_MAX_UPLOAD_SIZE_MB} Mo."
                )
            final_data = original_data
            final_ext = ".svg"
        else:
            # Compression adaptative si activée
            final_data = original_data
            final_ext = None
            if settings.IMAGE_COMPRESSION_ENABLED:
                try:
                    im = Image.open(BytesIO(original_data))
                    im_format = im.format or "JPEG"
                    # Redimensionner si nécessaire
                    max_w, max_h = settings.IMAGE_MAX_WIDTH, settings.IMAGE_MAX_HEIGHT
                    im.thumbnail((max_w, max_h))

                    # Déterminer format cible et gestion de la transparence
                    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and 'transparency' in im.info)
                    if has_alpha:
                        target_format = "WEBP"  # Meilleur support transparence + compression
                        save_params = {"format": target_format, "quality": settings.IMAGE_JPEG_QUALITY_START}
                    else:
                        target_format = "JPEG" if file.content_type in {"image/jpeg", "image/jpg", "image/png", "image/gif"} else "WEBP"
                        # Convertir en mode compatible
                        if im.mode in ("RGBA", "LA", "P"):
                            im = im.convert("RGB")
                        save_params = {"format": target_format, "quality": settings.IMAGE_JPEG_QUALITY_START, "optimize": True}

                    # Boucle de compression décroissante
                    quality = settings.IMAGE_JPEG_QUALITY_START
                    while quality >= settings.IMAGE_JPEG_QUALITY_MIN:
                        buf = BytesIO()
                        save_params_loop = dict(save_params)
                        save_params_loop["quality"] = quality
                        im.save(buf, **save_params_loop)
                        data_try = buf.getvalue()
                        if len(data_try) <= max_image_bytes:
                            final_data = data_try
                            final_ext = ".webp" if target_format == "WEBP" else ".jpg"
                            break
                        quality -= settings.IMAGE_QUALITY_STEP

                    # Si toujours trop gros, on refuse
                    if len(final_data) > max_image_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"Image trop volumineuse après compression. Max {settings.IMAGE_MAX_UPLOAD_SIZE_MB} Mo."
                        )
                except HTTPException:
                    raise
                except Exception as e:
                    # En cas d'échec de la compression, appliquer la limite dure sur les données originales
                    if len(original_data) > max_image_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"Image trop volumineuse (compression échouée). Max {settings.IMAGE_MAX_UPLOAD_SIZE_MB} Mo."
                        )
                    final_data = original_data

            # Déterminer l'extension si non fixée par compression
            if final_ext is None:
                safe_filename = secure_filename(file.filename)
                final_ext = Path(safe_filename).suffix.lower() or {
                    "image/jpeg": ".jpg",
                    "image/png": ".png",
                    "image/gif": ".gif",
                    "image/webp": ".webp",
                }.get(file.content_type, ".jpg")

        # Contrôle de quota utilisateur avant écriture
        quota_mb = getattr(settings, 'USER_STORAGE_QUOTA_MB', 0)
        if quota_mb and quota_mb > 0:
            current_usage = _get_user_storage_usage_bytes(current_user.id)
            projected = current_usage + len(final_data)
            quota_bytes = quota_mb * 1024 * 1024
            if projected > quota_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Quota de stockage dépassé: {round(current_usage/(1024*1024),2)} Mo utilisés / {quota_mb} Mo. "
                           f"L'image ({round(len(final_data)/(1024*1024),2)} Mo) ferait dépasser le quota."
                )

        # Nommer le fichier par hash (idempotent): <sha256>.<ext>
        sha256 = hashlib.sha256(final_data).hexdigest()
        hashed_filename = f"{sha256}{final_ext}"

        # Dossier utilisateur
        user_upload_dir_on_disk = Path(settings.UPLOADS_BASE_DIR) / "uploads" / str(current_user.id)
        user_upload_dir_on_disk.mkdir(parents=True, exist_ok=True)

        final_path = user_upload_dir_on_disk / hashed_filename

        # Écrire seulement si absent (si même image déjà uploadée)
        if not final_path.exists():
            with open(final_path, "wb") as buffer:
                buffer.write(final_data)

        # Construire l'URL publique via MEDIA_URL_PREFIX
        rel_path = f"uploads/{current_user.id}/{hashed_filename}"
        public_url = f"{settings.MEDIA_URL_PREFIX}/{rel_path}".replace("\\", "/")

        return {"location": public_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de l'upload d'image TinyMCE: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'upload d'image")