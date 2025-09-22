from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging
import os
import hashlib
import time
import re
from pathlib import Path

from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel
from backend.crud.resource import get_resource
from backend.ai.services.docling_service import extract_from_pdf_bytes, extract_from_pdf_path
from backend.ai import ai_resource_service
from backend.schemas.docling import DoclingExtractResponse
from config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/pdf-analysis",
    tags=["PDF Analysis"],
)

settings = get_settings()

class AnalyseTexteFromPDFResponse(BaseModel):
    content: Dict[str, Any]
    extraction: DoclingExtractResponse

@router.post(
    "/analyse-texte-from-pdf",
    response_model=AnalyseTexteFromPDFResponse,
    summary="Analyse de texte à partir d'un PDF (Docling -> IA)",
    description=(
        "Orchestre l'extraction de texte depuis un PDF (via Docling) puis génère une fiche d'analyse de texte "
        "(type 'exercice/analyse_texte') avec l'IA. Accepte soit un resource_id (PDF déjà stocké), soit un upload de PDF."
    ),
)
async def analyse_texte_from_pdf(
    *,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    resource_id: Optional[int] = Form(None),
    ocr: bool = Form(False),
    force_reextract: bool = Form(False),
    file: Optional[UploadFile] = File(None),
    niveau: str = Form("5ème"),
    nombre_questions: int = Form(6),
    instructions_personnalisees: Optional[str] = Form(None),
):
    """
    Endpoint orchestrateur : PDF -> Docling (extraction Markdown) -> IA (analyse_texte).
    """
    logger.info("[Orchestrateur] POST /ai/analyse-texte-from-pdf")
    # Logs de diagnostic des paramètres reçus
    try:
        logger.info(
            "[Orchestrateur] Params reçus: resource_id=%s, ocr=%s, niveau=%s, nombre_questions=%s, has_file=%s",
            resource_id,
            ocr,
            niveau,
            nombre_questions,
            file is not None,
        )
        if file is not None:
            logger.info(
                "[Orchestrateur] Upload metadata: filename=%s, content_type=%s",
                getattr(file, "filename", None),
                getattr(file, "content_type", None),
            )
    except Exception:
        logger.warning("[Orchestrateur] Impossible de logger les paramètres reçus.")

    # Exclusivité resource_id vs file
    if (resource_id is None and file is None) or (resource_id is not None and file is not None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fournir soit resource_id, soit file (exclusif).",
        )

    # 1) Extraction Docling
    try:
        logger.info("[Orchestrateur] Étape 1) Extraction Docling - sélection de la branche")
        if resource_id is not None:
            # Vérifier la ressource et l'appartenance
            db_res = get_resource(db=db, resource_id=resource_id)
            if db_res is None:
                raise HTTPException(status_code=404, detail="Resource not found")
            if db_res.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to access this resource")
            if not db_res.file_path:
                raise HTTPException(status_code=400, detail="La ressource n'est pas un PDF valide (aucun chemin de fichier)")
            # Assouplir la validation: accepter si l'extension est .pdf OU si le MIME est application/pdf
            try:
                file_path_str = str(db_res.file_path)
                file_type_str = (db_res.file_type or "").lower()
                is_pdf_ext = file_path_str.lower().endswith(".pdf")
                is_pdf_mime = file_type_str == "application/pdf" or file_type_str.endswith("/pdf")
                if not (is_pdf_ext or is_pdf_mime):
                    logger.warning(
                        "[Orchestrateur] Ressource %s suspecte: file_type=%s, file_path=%s",
                        db_res.id, db_res.file_type, db_res.file_path,
                    )
                    raise HTTPException(status_code=400, detail="La ressource n'est pas un PDF valide (type/extension)")
            except Exception:
                # En cas d'erreur de contrôle, refuser prudemment
                raise HTTPException(status_code=400, detail="La ressource n'est pas un PDF valide (erreur de validation)")

            # Construire le chemin absolu
            rel = str(db_res.file_path).lstrip("/")
            pdf_path = Path(settings.UPLOADS_BASE_DIR) / rel
            if not pdf_path.exists():
                raise HTTPException(status_code=404, detail="Fichier PDF introuvable sur le disque")

            # Utiliser le cache Docling si prêt et non forcé à ré-extraire (et OCR compatible)
            use_cache = False
            try:
                status_ready = (getattr(db_res, "docling_status", None) == "ready")
                md_rel = getattr(db_res, "docling_md_path", None)
                tables_rel = getattr(db_res, "docling_tables_path", None)
                ocr_compatible = (not ocr) or bool(getattr(db_res, "ocr_used", False))
                if (not force_reextract) and status_ready and md_rel and ocr_compatible:
                    md_abs = Path(settings.UPLOADS_BASE_DIR) / str(md_rel).lstrip("/")
                    tables_abs = Path(settings.UPLOADS_BASE_DIR) / str(tables_rel or "").lstrip("/")
                    if md_abs.exists():
                        logger.info("[Orchestrateur][Docling] Cache détecté pour resource_id=%s (md=%s)", db_res.id, md_abs)
                        try:
                            md_text = md_abs.read_text(encoding="utf-8")
                        except Exception:
                            md_text = ""

                        tables_list = []
                        try:
                            if tables_abs.exists():
                                combined = tables_abs.read_text(encoding="utf-8")
                                # Parse très léger basé sur notre format: <h3>Table {idx}</h3> ... \n<hr/> ...
                                parts = [p.strip() for p in re.split(r"\n?<hr\s*/?>\n?", combined, flags=re.I) if p.strip()]
                                for part in parts:
                                    m = re.search(r"<h3>\s*Table\s*(\d+)\s*</h3>\s*(.*)", part, flags=re.I | re.S)
                                    if not m:
                                        continue
                                    idx = int(m.group(1))
                                    html_tbl = m.group(2).strip()
                                    tables_list.append({"index": idx, "html": html_tbl})
                        except Exception:
                            tables_list = []

                        docling_data = {
                            "document_markdown": md_text or "",
                            "tables": tables_list,
                        }
                        use_cache = True
            except Exception:
                use_cache = False

            if not use_cache:
                # Logs Docling (extraction directe si pas de cache exploitable)
                logger.info("[Orchestrateur][Docling] START extract_from_pdf_path path=%s ocr=%s", str(pdf_path), ocr)
                _t0 = time.perf_counter()
                docling_data = extract_from_pdf_path(pdf_path, do_ocr=ocr)
                _dur_ms = int((time.perf_counter() - _t0) * 1000)
                try:
                    _keys = list(docling_data.keys()) if isinstance(docling_data, dict) else str(type(docling_data))
                except Exception:
                    _keys = "<inconnu>"
                logger.info("[Orchestrateur][Docling] DONE extract_from_pdf_path duration_ms=%s keys=%s", _dur_ms, _keys)
        else:
            # Upload direct
            assert file is not None
            # Assouplir la validation MIME pour tenir compte des navigateurs/proxys (Render) qui envoient octet-stream
            ct = (getattr(file, "content_type", None) or "").lower()
            fn = (getattr(file, "filename", None) or "").lower()
            is_pdf_ct = (ct == "application/pdf") or ct.endswith("/pdf") or ("pdf" in ct)
            is_pdf_by_name = fn.endswith(".pdf")
            if not (is_pdf_ct or (ct in ("", "application/octet-stream") and is_pdf_by_name)):
                logger.warning("[Orchestrateur] Upload rejeté: content_type=%s, filename=%s", ct, fn)
                raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés (type/extension)")
            logger.info("[Orchestrateur] Branche upload direct sélectionnée: filename=%s content_type=%s", fn, ct)
            try:
                content_bytes = await file.read()
            finally:
                await file.close()

            max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
            try:
                logger.info("[Orchestrateur] Taille du fichier reçu (bytes)=%s (max autorisé=%s)", len(content_bytes or b""), max_bytes)
            except Exception:
                logger.info("[Orchestrateur] Impossible de déterminer la taille du fichier reçu.")

            if not content_bytes or len(content_bytes) == 0:
                raise HTTPException(status_code=400, detail="Le fichier PDF est vide")

            if len(content_bytes) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Le fichier est trop volumineux. La taille maximale est de {settings.MAX_UPLOAD_SIZE_MB} Mo.",
                )

            # Empreinte/métadonnées du fichier pour diagnostic
            try:
                _md5 = hashlib.md5(content_bytes).hexdigest()
                _first = (content_bytes[:16] or b"").hex()
                logger.info("[Orchestrateur] Fichier reçu: md5=%s first16hex=%s", _md5, _first)
            except Exception:
                logger.info("[Orchestrateur] Impossible de calculer l'empreinte MD5 des bytes reçus")

            # Logs Docling (branche upload)
            logger.info("[Orchestrateur][Docling] START extract_from_pdf_bytes ocr=%s", ocr)
            _t0 = time.perf_counter()
            docling_data = extract_from_pdf_bytes(content_bytes, do_ocr=ocr)
            _dur_ms = int((time.perf_counter() - _t0) * 1000)
            try:
                _keys = list(docling_data.keys()) if isinstance(docling_data, dict) else str(type(docling_data))
            except Exception:
                _keys = "<inconnu>"
            logger.info("[Orchestrateur][Docling] DONE extract_from_pdf_bytes duration_ms=%s keys=%s", _dur_ms, _keys)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Orchestrateur] Échec extraction Docling: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de l'extraction Docling")

    document_markdown = (docling_data or {}).get("document_markdown", "")
    try:
        _len_doc = len(document_markdown or "")
        _tables_count = len(((docling_data or {}).get("tables") or []))
        logger.info(
            "[Orchestrateur] Longueur document_markdown extrait=%s | tables_extraites=%s",
            _len_doc,
            _tables_count,
        )
    except Exception:
        logger.info("[Orchestrateur] Impossible de mesurer la longueur du document extrait et/ou le nombre de tables.")
    if not isinstance(document_markdown, str) or not document_markdown.strip():
        raise HTTPException(status_code=400, detail="Aucun texte exploitable extrait du PDF")

    # Option: limiter la taille du texte transmis à l'IA
    try:
        max_chars = int(os.getenv("DOC_PDF_MAX_CHARS", "35000"))
    except Exception:
        max_chars = 15000
    texte_source = document_markdown[:max_chars]
    try:
        _len_src = len(texte_source or "")
        logger.info(
            "[Orchestrateur] Longueur texte_source transmis à l'IA (après troncature)=%s (max_chars=%s)",
            _len_src,
            max_chars,
        )
        if _len_doc is not None and _len_doc > max_chars:
            logger.warning(
                "[Orchestrateur] ATTENTION: document tronqué avant IA de %s caractères (len_doc=%s > max_chars=%s)",
                (_len_doc - max_chars),
                _len_doc,
                max_chars,
            )
    except Exception:
        logger.info("[Orchestrateur] Impossible de mesurer la longueur du texte transmis à l'IA et/ou la troncature.")

    # 2) Appel IA pour 'exercice/analyse_texte'
    try:
        logger.info("[Orchestrateur] Appel IA generate_ai_resource_content(exercice/analyse_texte)")
        content = await ai_resource_service.generate_ai_resource_content(
            type_key="exercice",
            subtype_key="analyse_texte",
            input_variables={
                "texte_source": texte_source,
                "niveau": niveau,
                "nombre_questions": nombre_questions,
                "instructions_personnalisees": instructions_personnalisees or "",
            },
            user_id=current_user.id,
            duration_ms=None,
        )
        if not content or (isinstance(content, dict) and len(content) == 0):
            raise ai_resource_service.ResourceGenerationError("Contenu généré vide ou invalide pour exercice/analyse_texte")
    except ai_resource_service.ResourceGenerationError as e:
        logger.error(f"[Orchestrateur] Erreur génération IA: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[Orchestrateur] Erreur inattendue génération IA: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne lors de la génération IA")

    # Réponse combinée
    return {
        "content": content,
        "extraction": docling_data,
    }