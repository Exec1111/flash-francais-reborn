from fastapi import APIRouter
from config import get_settings

router = APIRouter()

@router.get("/upload", tags=["config"])
def get_upload_config():
    settings = get_settings()
    max_mb = settings.MAX_UPLOAD_SIZE_MB
    allowed = settings.ALLOWED_UPLOAD_MIME_TYPES
    return {
        "max_upload_size_mb": max_mb,
        "max_upload_size_bytes": max_mb * 1024 * 1024,
        "allowed_mime_types": allowed,
    }
