import logging
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from config import get_settings
from database import SessionLocal
from models import Resource
from ai.services.docling_service import extract_from_pdf_path

logger = logging.getLogger(__name__)


def _safe_docling_version() -> Optional[str]:
    try:
        import docling  # type: ignore
        return getattr(docling, "__version__", None)
    except Exception:
        return None


def run_docling_extraction(resource_id: int, user_id: int, ocr: bool = False) -> None:
    """
    Tâche de fond: extrait le Markdown et les tables d'un PDF associé à une ressource,
    écrit les fichiers sur disque et met à jour les métadonnées Docling de la ressource.
    """
    settings = get_settings()
    db = SessionLocal()
    res: Optional[Resource] = None

    try:
        res = db.query(Resource).get(resource_id)
        if not res:
            logger.error(f"Docling BG: resource_id={resource_id} introuvable")
            return
        if res.user_id != user_id:
            logger.error(
                f"Docling BG: ressource {resource_id} n'appartient pas à user {user_id}"
            )
            return
        if not res.file_path or (res.file_type and res.file_type != "application/pdf"):
            logger.warning(
                f"Docling BG: ressource {resource_id} n'est pas un PDF valide (file_type={res.file_type})"
            )
            return

        # Marquer en cours
        res.docling_status = "processing"
        res.docling_error = None
        db.add(res)
        db.commit()
        db.refresh(res)

        # Chemin du PDF absolu
        rel = str(res.file_path).lstrip("/")
        pdf_path = Path(settings.UPLOADS_BASE_DIR) / rel
        if not pdf_path.exists():
            raise FileNotFoundError(f"Fichier PDF introuvable: {pdf_path}")

        # Calcul SHA-256
        sha256 = hashlib.sha256()
        with open(pdf_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        sha_hex = sha256.hexdigest()

        # Déduplication: si une autre ressource (même utilisateur) a déjà ce SHA,
        # avec un statut 'ready' et le même paramètre OCR, réutiliser les sorties.
        try:
            existing = (
                db.query(Resource)
                .filter(
                    Resource.user_id == user_id,
                    Resource.docling_sha256 == sha_hex,
                    Resource.docling_status == "ready",
                    Resource.ocr_used == bool(ocr),
                )
                .order_by(Resource.extracted_at.desc())
                .first()
            )
        except Exception:
            existing = None

        if existing and existing.docling_md_path:
            try:
                out_dir = Path(settings.UPLOADS_BASE_DIR) / "uploads" / str(user_id) / "docling"
                out_dir.mkdir(parents=True, exist_ok=True)

                md_filename = f"resource_{resource_id}.md"
                tables_filename = f"resource_{resource_id}_tables.html"
                md_path_abs = out_dir / md_filename
                tables_path_abs = out_dir / tables_filename

                src_md_abs = Path(settings.UPLOADS_BASE_DIR) / str(existing.docling_md_path)
                src_tables_abs = (
                    Path(settings.UPLOADS_BASE_DIR) / str(existing.docling_tables_path)
                    if existing.docling_tables_path
                    else None
                )

                # Copier le contenu existant vers de nouveaux fichiers pour cette ressource
                md_text = src_md_abs.read_text(encoding="utf-8") if src_md_abs.exists() else ""
                md_path_abs.write_text(md_text, encoding="utf-8")

                tables_text = ""
                if src_tables_abs and src_tables_abs.exists():
                    tables_text = src_tables_abs.read_text(encoding="utf-8")
                tables_path_abs.write_text(tables_text, encoding="utf-8")

                # MAJ des métadonnées et chemins relatifs
                rel_base = Path("uploads") / str(user_id) / "docling"
                res.docling_md_path = str(rel_base / md_filename)
                res.docling_tables_path = str(rel_base / tables_filename)
                res.docling_chars = existing.docling_chars if existing.docling_chars is not None else len(md_text)
                res.docling_sha256 = sha_hex
                res.docling_version = existing.docling_version
                res.ocr_used = existing.ocr_used
                res.extracted_at = datetime.now(timezone.utc)
                res.docling_status = "ready"

                db.add(res)
                db.commit()
                logger.info(
                    f"Docling BG: réutilisation cache SHA pour resource_id={resource_id} à partir de resource_id={existing.id}"
                )
                return
            except Exception as e_copy:
                logger.warning(f"Docling BG: échec de réutilisation cache SHA, on retente extraction: {e_copy}")

        # Extraction Docling
        data = extract_from_pdf_path(pdf_path, do_ocr=ocr)
        md: str = data.get("document_markdown") or ""
        tables = data.get("tables") or []

        # Dossiers de sortie: uploads/{user_id}/docling/
        out_dir = Path(settings.UPLOADS_BASE_DIR) / "uploads" / str(user_id) / "docling"
        out_dir.mkdir(parents=True, exist_ok=True)

        md_filename = f"resource_{resource_id}.md"
        tables_filename = f"resource_{resource_id}_tables.html"
        md_path_abs = out_dir / md_filename
        tables_path_abs = out_dir / tables_filename

        # Ecriture des fichiers
        md_path_abs.write_text(md, encoding="utf-8")
        parts = []
        for t in tables:
            idx = t.get("index")
            html = t.get("html") or ""
            parts.append(f"<h3>Table {idx}</h3>\n{html}")
        tables_html = "\n<hr/>\n".join(parts) if parts else ""
        tables_path_abs.write_text(tables_html, encoding="utf-8")

        # Chemins relatifs BDD
        rel_base = Path("uploads") / str(user_id) / "docling"
        res.docling_md_path = str(rel_base / md_filename)
        res.docling_tables_path = str(rel_base / tables_filename)
        res.docling_chars = len(md)
        res.docling_sha256 = sha_hex
        res.docling_version = _safe_docling_version()
        res.ocr_used = bool(ocr)
        res.extracted_at = datetime.now(timezone.utc)
        res.docling_status = "ready"

        db.add(res)
        db.commit()
        logger.info(
            f"Docling BG: extraction OK pour resource_id={resource_id} -> md={res.docling_md_path}"
        )

    except Exception as e:
        logger.error(
            f"Docling BG: échec extraction resource_id={resource_id}: {e}", exc_info=True
        )
        try:
            if res is not None:
                res.docling_status = "error"
                res.docling_error = str(e)
                res.extracted_at = datetime.now(timezone.utc)
                db.add(res)
                db.commit()
        except Exception:
            logger.exception("Docling BG: échec de mise à jour d'état d'erreur")
    finally:
        db.close()
