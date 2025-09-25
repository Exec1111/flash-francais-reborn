from fastapi import APIRouter, Depends, HTTPException, Form, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import Dict, List
import re
from pathlib import Path
import logging
from database import get_db
from dependencies import get_current_active_user
from models import User as UserModel
from schemas.docling import DoclingStatusResponse, DoclingTable
from config import get_settings
import crud.resource
from .resource_utils import run_docling_extraction

settings = get_settings()
logger = logging.getLogger(__name__)

resource_docling_router = APIRouter()

@resource_docling_router.get("/{resource_id}/docling", response_model=DoclingStatusResponse)
def get_resource_docling(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    """Retourne le statut Docling d'une ressource et, si prêt, le contenu (markdown + tables)."""
    db_resource = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if db_resource.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this resource")

    # Statut de base
    status_value = db_resource.docling_status or "pending"
    resp: Dict[str, object] = {
        "status": status_value,
        "ocr_used": getattr(db_resource, "ocr_used", None),
        "docling_version": getattr(db_resource, "docling_version", None),
        "extracted_at": getattr(db_resource, "extracted_at", None),
        "docling_error": getattr(db_resource, "docling_error", None),
        "docling_chars": getattr(db_resource, "docling_chars", None),
    }

    # Si prêt, lire les fichiers cache s'ils existent
    try:
        if status_value == "ready":
            uploads_base = Path(settings.UPLOADS_BASE_DIR)
            md_rel = (db_resource.docling_md_path or "").lstrip("/")
            tables_rel = (db_resource.docling_tables_path or "").lstrip("/")

            if md_rel:
                md_path = uploads_base / md_rel
                if md_path.exists():
                    resp["document_markdown"] = md_path.read_text(encoding="utf-8")
            if tables_rel:
                tables_path = uploads_base / tables_rel
                if tables_path.exists():
                    raw = tables_path.read_text(encoding="utf-8")
                    parts = re.split(r"\s*<hr\s*/?>\s*", raw, flags=re.I)
                    tables: List[DoclingTable] = []
                    for part in parts:
                        if not part or not part.strip():
                            continue
                        m = re.search(r"<h3>\s*Table\s+(\d+)\s*</h3>", part, flags=re.I)
                        if not m:
                            continue
                        idx = int(m.group(1))
                        html = re.sub(r"^\s*<h3>.*?</h3>\s*", "", part, flags=re.I | re.S)
                        tables.append(DoclingTable(index=idx, html=html))
                    resp["tables"] = tables
    except Exception as e:
        logger.error(f"Erreur lors de la lecture du cache Docling pour resource_id={resource_id}: {e}", exc_info=True)

    return DoclingStatusResponse(**resp)

@resource_docling_router.post("/{resource_id}/reextract", response_model=DoclingStatusResponse)
async def reextract_resource_docling(
    resource_id: int,
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    current_user: UserModel = Depends(get_current_active_user),
    ocr: bool = Form(False),
    force: bool = Form(False),
):
    """Planifie une nouvelle extraction Docling pour la ressource.
    - ocr: active l'OCR
    - force: force la ré-extraction même si une extraction est en cours
    """
    db_resource = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if db_resource.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this resource")
    if not db_resource.file_path or (db_resource.file_type and db_resource.file_type != "application/pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resource is not a valid PDF")

    # Si déjà en cours et pas de force, retourner le statut actuel
    if not force and (db_resource.docling_status in ("pending", "processing")):
        return DoclingStatusResponse(
            status=db_resource.docling_status or "processing",
            ocr_used=db_resource.ocr_used,
            docling_version=db_resource.docling_version,
            extracted_at=db_resource.extracted_at,
            docling_error=db_resource.docling_error,
            docling_chars=db_resource.docling_chars,
        )

    # Marquer en attente et planifier
    try:
        db_resource.docling_status = "pending"
        db_resource.docling_error = None
        db.add(db_resource)
        db.commit()
        db.refresh(db_resource)
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du statut Docling (pending) pour resource_id={resource_id}: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la préparation de la ré-extraction Docling")

    background_tasks.add_task(run_docling_extraction, db_resource.id, current_user.id, ocr)
    logger.info(f"Ré-extraction Docling planifiée pour resource_id={resource_id} (ocr={ocr}, force={force})")

    return DoclingStatusResponse(status="pending")