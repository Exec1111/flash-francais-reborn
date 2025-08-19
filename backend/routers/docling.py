import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel
from backend.config import get_settings

from backend.ai.services.docling_service import (
    extract_from_pdf_bytes,
    extract_from_pdf_path,
)
from backend.schemas.docling import DoclingExtractResponse as DoclingExtractResponseModel
from backend.crud import resource as resource_crud
 
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


def _save_markdown(markdown: str, base_dir: Path, user_id: int, base_name: str) -> Path:
    out_dir = Path(base_dir) / "markdown" / f"user_{user_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    safe_base = secure_filename(base_name) or "document"
    out_path = out_dir / f"{safe_base}-{ts}.md"
    out_path.write_text(markdown, encoding="utf-8")
    logger.info(f"Markdown sauvegardé: {out_path}")
    return out_path


@router.post("/extract", response_model=DoclingExtractResponseModel)
async def extract_pdf(
    *,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    resource_id: Optional[int] = Form(None),
    ocr: bool = Form(False),
    file: Optional[UploadFile] = File(None),
):
    """
    Extrait les informations d'un PDF via l'implémentation légère (PyMuPDF) et sauvegarde un .md.

    - Soit fournir `resource_id` (PDF déjà stocké et appartenant à l'utilisateur)
    - Soit uploader `file` (content-type application/pdf)
    - Option `ocr` (bool) accepté mais non supporté (ignorer)
    """
    if (resource_id is None and file is None) or (resource_id is not None and file is not None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fournir soit resource_id, soit file (exclusif).",
        )

    if resource_id is not None:
        # Charger la ressource et vérifier l'appartenance
        db_res = resource_crud.get_resource(db=db, resource_id=resource_id)
        if db_res is None:
            raise HTTPException(status_code=404, detail="Resource not found")
        if db_res.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this resource")
        if not db_res.file_path or (db_res.file_type and db_res.file_type != "application/pdf"):
            raise HTTPException(status_code=400, detail="La ressource n'est pas un PDF valide")

        # Construire le chemin absolu sur disque
        rel = str(db_res.file_path).lstrip("/")
        pdf_path = Path(settings.UPLOADS_BASE_DIR) / rel
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="Fichier PDF introuvable sur le disque")

        try:
            data = extract_from_pdf_path(pdf_path, do_ocr=ocr)
            # Sauvegarde .md
            _save_markdown(
                markdown=data["document_markdown"],
                base_dir=Path(settings.UPLOADS_BASE_DIR),
                user_id=current_user.id,
                base_name=f"resource_{resource_id}",
            )
            return DoclingExtractResponseModel(**data)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Extraction / sauvegarde échouée pour resource_id={resource_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Erreur interne lors de l'extraction/sauvegarde")

    # Sinon: upload direct
    assert file is not None

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")

    try:
        content = await file.read()
    finally:
        await file.close()

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Le fichier est trop volumineux. La taille maximale est de {settings.MAX_UPLOAD_SIZE_MB} Mo.",
        )

    try:
        data = extract_from_pdf_bytes(content, do_ocr=ocr)
        # Sauvegarde .md
        base_name = Path(file.filename).stem if file.filename else "document"
        _save_markdown(
            markdown=data["document_markdown"],
            base_dir=Path(settings.UPLOADS_BASE_DIR),
            user_id=current_user.id,
            base_name=base_name,
        )
        return DoclingExtractResponseModel(**data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extraction / sauvegarde échouée pour upload '{file.filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'extraction/sauvegarde")
