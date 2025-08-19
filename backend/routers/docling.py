import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_active_user
from models import User as UserModel
from config import get_settings

from ai.services.docling_service import (
    extract_from_pdf_bytes,
    extract_from_pdf_path,
)
from schemas.docling import DoclingExtractResponse
import crud.resource

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.post("/extract", response_model=DoclingExtractResponse)
async def extract_pdf(
    *,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    resource_id: Optional[int] = Form(None),
    ocr: bool = Form(False),
    file: Optional[UploadFile] = File(None),
):
    """
    Extrait les informations d'un PDF en utilisant Docling.

    - Soit fournir `resource_id` (PDF déjà stocké et appartenant à l'utilisateur)
    - Soit uploader `file` (content-type application/pdf)
    - Option `ocr` (bool) pour activer l'OCR
    """
    if (resource_id is None and file is None) or (resource_id is not None and file is not None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fournir soit resource_id, soit file (exclusif).",
        )

    if resource_id is not None:
        # Charger la ressource et vérifier l'appartenance
        db_res = crud.resource.get_resource(db=db, resource_id=resource_id)
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
            return DoclingExtractResponse(**data)
        except Exception as e:
            logger.error(f"Docling: échec d'extraction pour resource_id={resource_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Erreur interne lors de l'extraction Docling")

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
        return DoclingExtractResponse(**data)
    except Exception as e:
        logger.error(f"Docling: échec d'extraction pour upload '{file.filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'extraction Docling")
