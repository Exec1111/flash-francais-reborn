import logging
import tempfile
from pathlib import Path
from typing import Any, Dict, List

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions

logger = logging.getLogger(__name__)


def _build_converter(do_ocr: bool) -> DocumentConverter:
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = bool(do_ocr)
    # Extraire la structure des tableaux par défaut
    pipeline_options.do_table_structure = True
    # Meilleur matching des cellules si dispo
    if pipeline_options.table_structure_options:
        pipeline_options.table_structure_options.do_cell_matching = True

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_options=pipeline_options,
            )
        }
    )
    return converter


def extract_from_pdf_path(pdf_path: Path, do_ocr: bool = False) -> Dict[str, Any]:
    """
    Traite un PDF via Docling et retourne un dict sérialisable contenant
    - document_markdown: str
    - tables: List[{index:int, html:str}]
    """
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF introuvable: {pdf_path}")

    logger.info(f"Docling: conversion du fichier {pdf_path} (OCR={do_ocr})")
    converter = _build_converter(do_ocr=do_ocr)

    conv_res = converter.convert(pdf_path)
    doc = conv_res.document

    # Export du markdown global du document
    md = doc.export_to_markdown()

    # Export basique des tableaux en HTML (pas d'utilisation de pandas pour éviter la dépendance)
    tables_html: List[Dict[str, Any]] = []
    for idx, table in enumerate(doc.tables):
        try:
            html = table.export_to_html(doc=doc)
        except Exception as e:
            logger.warning(f"Docling: échec export HTML du tableau {idx}: {e}")
            html = ""
        tables_html.append({"index": idx, "html": html})

    return {
        "document_markdown": md,
        "tables": tables_html,
    }


def extract_from_pdf_bytes(pdf_bytes: bytes, do_ocr: bool = False) -> Dict[str, Any]:
    """
    Sauvegarde les bytes PDF dans un fichier temporaire, puis appelle extract_from_pdf_path.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_bytes)
        tmp.flush()
        tmp_path = Path(tmp.name)

    try:
        return extract_from_pdf_path(tmp_path, do_ocr=do_ocr)
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            # Ne pas faire échouer la requête si la suppression du temp échoue
            pass
