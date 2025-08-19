import logging
import tempfile
from pathlib import Path
from typing import Any, Dict, List

import fitz  # PyMuPDF
from markdownify import markdownify as mdify

logger = logging.getLogger(__name__)


def _pdf_to_markdown(pdf_path: Path) -> str:
    """Extrait le contenu d'un PDF en Markdown en deux étapes légères:
    1) Extraction HTML par page avec PyMuPDF
    2) Conversion HTML -> Markdown avec markdownify
    """
    try:
        with fitz.open(pdf_path) as doc:
            html_pages: List[str] = []
            for page in doc:
                # Représentation XHTML plus sémantique de la page
                html_pages.append(page.get_text("xhtml"))
    except Exception as e:
        logger.error(f"PyMuPDF: échec d'ouverture/lecture du PDF {pdf_path}: {e}")
        raise

    combined_html = "\n<hr/>\n".join(html_pages)

    # Si PyMuPDF ne retourne pas d'HTML (très rare), fallback en texte brut
    if not combined_html.strip():
        try:
            with fitz.open(pdf_path) as doc:
                text_pages = [page.get_text("text", sort=True) for page in doc]
            return "\n\n".join(text_pages)
        except Exception as e:
            logger.error(f"PyMuPDF: échec de fallback texte pour {pdf_path}: {e}")
            raise

    # Convertir HTML -> Markdown
    md = mdify(
        combined_html,
        heading_style="ATX",  # #, ##, ###
        strip=["img"]  # exclure les images base64 pour alléger la conversion Markdown
    )
    return md


def extract_from_pdf_path(pdf_path: Path, do_ocr: bool = False) -> Dict[str, Any]:
    """
    Traite un PDF (légèrement) et retourne un dict sérialisable contenant:
    - document_markdown: str
    - tables: List[{index:int, html:str}] (non supporté ici -> liste vide)
    """
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF introuvable: {pdf_path}")

    if do_ocr:
        logger.warning("OCR demandé mais non supporté dans l'implémentation légère PyMuPDF; le texte incorporé sera extrait uniquement.")

    logger.info(f"PyMuPDF: conversion du fichier {pdf_path}")
    md = _pdf_to_markdown(pdf_path)

    return {
        "document_markdown": md,
        "tables": [],  # Extraction de tables non prise en charge dans cette implémentation légère
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
