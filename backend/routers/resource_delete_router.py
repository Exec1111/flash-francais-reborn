from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import re
import shutil
import os
from pathlib import Path
import logging
from database import get_db
import crud.resource
from dependencies import get_current_active_user
from models import User as UserModel
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

resource_delete_router = APIRouter()

def _normalize_media_src_to_path(src: str, user_id: int) -> Path | None:
    """Convertit une URL/chemin d'image en chemin disque absolu si sous le dossier de l'utilisateur."""
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
    """Vérifie si image_path est encore référencée dans un autre fichier HTML de l'utilisateur."""
    user_root = Path(settings.UPLOADS_BASE_DIR) / 'uploads' / str(user_id)
    if not user_root.exists():
        return False
    # Construire la forme d'URL attendue dans les HTML
    rel = image_path.relative_to(Path(settings.UPLOADS_BASE_DIR))
    url1 = f"{settings.MEDIA_URL_PREFIX}/{rel.as_posix()}"
    url2 = f"/{(Path('media') / 'uploads' / rel).as_posix()}"
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

@resource_delete_router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource_route(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Supprime une ressource et son fichier associé si elle en a un."""
    logger.info(f"Tentative de suppression de la ressource {resource_id} par l'utilisateur {current_user.id}")

    # Vérifier d'abord si la ressource existe et appartient à l'utilisateur
    db_resource_check = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource_check is None:
        logger.warning(f"Ressource {resource_id} non trouvée pour la suppression.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if db_resource_check.user_id != current_user.id:
        logger.error(f"Accès non autorisé pour la suppression de la ressource {resource_id} par l'utilisateur {current_user.id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this resource")

    # Garder une trace des chemins des fichiers à supprimer avant de supprimer l'enregistrement BDD
    uploads_base = Path(settings.UPLOADS_BASE_DIR)
    file_path_to_delete: Optional[Path] = None
    md_path_to_delete: Optional[Path] = None
    tables_path_to_delete: Optional[Path] = None

    # Fichier source (ex: PDF uploadé ou HTML IA)
    if getattr(db_resource_check, "file_path", None):
        rel = str(db_resource_check.file_path).lstrip("/")
        file_path_to_delete = uploads_base / rel
        logger.info(f"Chemin du fichier source à supprimer identifié : {file_path_to_delete}")

        # Si c'est un HTML, tenter de nettoyer les images référencées
        try:
            if file_path_to_delete.suffix.lower() in {'.html', '.htm'} and file_path_to_delete.exists():
                content = file_path_to_delete.read_text(encoding='utf-8', errors='ignore')
                img_srcs = set(re.findall(r"<img[^>]+src=[\"']([^\"']+)[\"']", content))
                if img_srcs:
                    trash_root = Path(settings.UPLOADS_BASE_DIR) / 'uploads' / str(current_user.id) / '.trash'
                    trash_root.mkdir(parents=True, exist_ok=True)
                    for src in img_srcs:
                        img_path = _normalize_media_src_to_path(src, current_user.id)
                        if img_path and img_path.exists():
                            if not _is_image_still_referenced(current_user.id, img_path, exclude_html_path=file_path_to_delete):
                                dest = trash_root / img_path.name
                                counter = 1
                                while dest.exists():
                                    dest = trash_root / f"{img_path.stem}_{counter}{img_path.suffix}"
                                    counter += 1
                                try:
                                    shutil.move(str(img_path), str(dest))
                                    logger.info(f"[DELETE] Image orpheline déplacée en corbeille: {img_path} -> {dest}")
                                except Exception as e_move:
                                    logger.warning(f"[DELETE] Échec déplacement image {img_path} vers corbeille: {e_move}")
        except Exception as e_htmlimg:
            logger.warning(f"Impossible de nettoyer les images référencées lors de la suppression: {e_htmlimg}")

    # Fichier markdown extrait
    if getattr(db_resource_check, "docling_md_path", None):
        md_rel = str(db_resource_check.docling_md_path).lstrip("/")
        md_path_to_delete = uploads_base / md_rel
        logger.info(f"Chemin du fichier markdown à supprimer identifié : {md_path_to_delete}")

    # Fichier tables extrait (HTML concaténé)
    if getattr(db_resource_check, "docling_tables_path", None):
        tables_rel = str(db_resource_check.docling_tables_path).lstrip("/")
        tables_path_to_delete = uploads_base / tables_rel
        logger.info(f"Chemin du fichier tables à supprimer identifié : {tables_path_to_delete}")

    # Appeler la fonction CRUD pour supprimer l'enregistrement en BDD
    deleted = crud.resource.delete_resource(db=db, resource_id=resource_id)

    if not deleted:
        logger.error(f"Échec de la suppression de la ressource {resource_id} en BDD après vérification.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found during delete process")

    # Si la suppression en BDD a réussi, supprimer les fichiers physiques s'ils existent
    for target_path in [file_path_to_delete, md_path_to_delete, tables_path_to_delete]:
        if target_path:
            if target_path.exists():
                try:
                    os.remove(target_path)
                    logger.info(f"Fichier supprimé: {target_path}")
                except OSError as e:
                    logger.error(f"Erreur lors de la suppression du fichier {target_path}: {e}")
            else:
                logger.warning(f"Fichier à supprimer introuvable: {target_path}")

    logger.info(f"Ressource {resource_id} supprimée avec succès de la BDD.")
    return