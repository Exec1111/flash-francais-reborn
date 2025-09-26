from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import re
import json
import os
from pathlib import Path
import logging
from schemas.resource import ResourceUpdate, ResourceResponse
from database import get_db
import crud.resource
from dependencies import get_current_active_user
from models import User as UserModel
from ai.services.template_resolver import TemplateResolver
from ai.utils.html_cleaner import clean_html, remove_empty_blocks_and_breaks
from .resource_utils import html_to_qcm_json, html_to_champlex_json
from config import get_settings
from werkzeug.utils import secure_filename

settings = get_settings()
logger = logging.getLogger(__name__)

resource_update_router = APIRouter()

@resource_update_router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource_route(
    resource_id: int,
    *,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    type_id: Optional[int] = Form(None),
    sub_type_id: Optional[int] = Form(None),
    session_ids_json: Optional[str] = Form(None),
    objective_ids_json: Optional[str] = Form(None),
    study_object_ids_json: Optional[str] = Form(None),
    oeuvre_ids_json: Optional[str] = Form(None),
    source_type: Optional[str] = Form(None),
    html_content: Optional[str] = Form(None),
    data_json_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """Met à jour une ressource. Si un fichier est fourni, il remplace l'ancien (si existant)."""
    logger.info(f"Tentative de mise à jour de la ressource {resource_id} par l'utilisateur {current_user.id}")

    # Vérifier d'abord si la ressource existe et appartient à l'utilisateur
    db_resource_check = crud.resource.get_resource(db, resource_id=resource_id)
    if db_resource_check is None:
        logger.warning(f"Ressource {resource_id} non trouvée pour la mise à jour.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if db_resource_check.user_id != current_user.id:
        logger.error(f"Accès non autorisé pour la mise à jour de la ressource {resource_id} par l'utilisateur {current_user.id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this resource")

    # --- Écriture éventuelle du nouveau contenu HTML ---
    if html_content is not None and db_resource_check.source_type == 'ai' and db_resource_check.file_path:
        try:
            # Le chemin stocké est relatif à /media/uploads/
            relative_path = db_resource_check.file_path.lstrip('/')
            full_path = settings.UPLOADS_BASE_DIR / relative_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            original_html = None
            # Préserver les balises <style> existantes si le nouveau contenu n'en contient pas
            if not re.search(r"<style[\s>].*?</style>", html_content, flags=re.S|re.I):
                try:
                    if full_path.exists():
                        original_html = full_path.read_text(encoding="utf-8")
                        styles_match = re.findall(r"<style[\s>].*?</style>", original_html, flags=re.S|re.I)
                        if styles_match:
                            preserved_styles = "\n".join(styles_match)
                            html_content = f"{preserved_styles}\n{html_content}"
                except Exception as e_read:
                    logger.warning(f"Impossible de lire l'ancien fichier HTML pour extraire les styles : {e_read}")
            # Extraire les références d'images avant écriture pour calculer le diff
            try:
                if original_html is None and full_path.exists():
                    original_html = full_path.read_text(encoding="utf-8")
            except Exception:
                original_html = None

            old_imgs = set(re.findall(r"<img[^>]+src=[\"']([^\"']+)[\"']", original_html or ""))
            new_imgs = set(re.findall(r"<img[^>]+src=[\"']([^\"']+)[\"']", html_content))

            # Nettoyer le HTML avant sauvegarde
            if html_content:
                original_length = len(html_content)
                html_content = clean_html(html_content)
                mid_length = len(html_content)
                html_content = remove_empty_blocks_and_breaks(html_content)
                cleaned_length = len(html_content)
                logger.info(f"HTML nettoyé : {original_length} -> {mid_length} -> {cleaned_length} caractères")

            full_path.write_text(html_content, encoding="utf-8")
            logger.info(f"Fichier HTML {full_path} mis à jour avec succès pour la ressource {resource_id}.")
        except Exception as e:
            logger.error(f"Erreur lors de l'écriture du fichier HTML pour la ressource {resource_id}: {e}")
            raise HTTPException(status_code=500, detail="Erreur lors de l'enregistrement du contenu HTML")

    # Préparer un éventuel data_json parsé depuis le HTML (pour exercices interactifs)
    parsed_data_json = None
    runtime_rel_path: Optional[str] = None
    template_key_to_use: Optional[str] = None
    template_version_to_use: Optional[int] = None

    try:
        # --- Mode JSON-first pour dynamiques ---
        if data_json_text is not None:
            try:
                provided_json = json.loads(data_json_text)
            except json.JSONDecodeError as je:
                raise HTTPException(status_code=400, detail=f"data_json invalid JSON: {je}")

            st = getattr(db_resource_check, 'sub_type', None)
            st_key = (getattr(st, 'key', '') or '').strip().lower()
            t = getattr(db_resource_check, 'type', None)
            t_key = (getattr(t, 'key', '') or '').strip().lower()

            if not (t_key == 'exercice' and st_key in ['qcm', 'champlex', 'champlex2', 'pendu', 'quisuisje']):
                logger.warning(f"[JSON-FIRST] data_json ignoré pour type/subtype non dynamique: {t_key}/{st_key}")
            else:
                # Validation légère selon subtype
                if st_key == 'champlex2':
                    mots = provided_json.get('mots') or []
                    sol = provided_json.get('solution') or []
                    if not isinstance(mots, list) or not isinstance(sol, list) or len(mots) != len(sol):
                        raise HTTPException(status_code=400, detail="data_json invalide pour champlex2: 'mots' et 'solution' doivent être des listes de même longueur")
                elif st_key == 'champlex':
                    champs = provided_json.get('champs') or []
                    if not isinstance(champs, list):
                        raise HTTPException(status_code=400, detail="data_json invalide pour champlex: 'champs' doit être une liste")
                elif st_key == 'qcm':
                    questions = provided_json.get('questions') or []
                    if not isinstance(questions, list):
                        raise HTTPException(status_code=400, detail="data_json invalide pour qcm: 'questions' doit être une liste")
                elif st_key == 'pendu':
                    liste_mots = provided_json.get('liste_mots') or []
                    if not isinstance(liste_mots, list):
                        raise HTTPException(status_code=400, detail="data_json invalide pour pendu: 'liste_mots' doit être une liste")
                # Générer runtime depuis data_json
                _, runtime_template_path, resolved_template_key = TemplateResolver.resolve_templates(t_key, st_key)
                if runtime_template_path and runtime_template_path.exists():
                    raw_template = runtime_template_path.read_text(encoding='utf-8')
                    data_str = json.dumps(provided_json, ensure_ascii=False)
                    # Support de plusieurs placeholders selon le template
                    # Support de plusieurs placeholders selon le template
                    injected = raw_template.replace('<!--ACTIVITY_DATA_JSON-->', data_str)
                    injected = injected.replace('<!--QCM_DATA_JSON-->', data_str)
                    injected = injected.replace('<!--CHAMPLEX_DATA_JSON-->', data_str)
                    injected = injected.replace('<!--PENDU_DATA_JSON-->', data_str)
                    injected = injected.replace('<!--QUISUISJE_DATA_JSON-->', data_str)
                    rel = get_upload_path(current_user.id, f"runtime_{st_key}_{resource_id}.html")
                    abs_path = Path(settings.UPLOADS_BASE_DIR) / rel
                    abs_path.parent.mkdir(parents=True, exist_ok=True)
                    abs_path.write_text(injected, encoding='utf-8')
                    runtime_rel_path = rel
                    parsed_data_json = provided_json
                    template_key_to_use = getattr(db_resource_check, 'template_key', None) or resolved_template_key
                    template_version_to_use = getattr(db_resource_check, 'template_version', None) or 1
                    logger.info(f"[JSON-FIRST/{st_key.upper()}] Runtime HTML généré: {abs_path}")
                    logger.info(f"[DEBUG] parsed_data_json défini: {parsed_data_json is not None}")
                    logger.info(f"[DEBUG] runtime_rel_path défini: {runtime_rel_path}")

        if html_content is not None:
            # Détecter un QCM: baser sur le sous-type lié s'il existe
            st = getattr(db_resource_check, 'sub_type', None)
            st_key = (getattr(st, 'key', '') or '').strip().lower()
            t = getattr(db_resource_check, 'type', None)
            t_key = (getattr(t, 'key', '') or '').strip().lower()
            # Gestion des exercices interactifs (exclut analysetexte et dictee qui sont statiques)
            if t_key == 'exercice' and st_key in ['qcm', 'champlex', 'pendu', 'quisuisje']:
                # Parser selon le type d'exercice (champlex2 utilise JSON-first uniquement)
                if st_key == 'qcm':
                    parsed_data_json = html_to_qcm_json(html_content)
                    logger.info(f"[QCM] data_json parsé depuis HTML pour resource_id={resource_id} (questions={len(parsed_data_json.get('questions', []))})")
                elif st_key == 'champlex':
                    parsed_data_json = html_to_champlex_json(html_content)
                    champs_count = len(parsed_data_json.get('champs', []) or [])
                    logger.info(f"[CHAMPLEX] data_json parsé depuis HTML pour resource_id={resource_id} (champs={champs_count})")

                # Déterminer et figer le template utilisé (clé par défaut si absent)
                try:
                    existing_tpl_key = getattr(db_resource_check, 'template_key', None)
                    existing_tpl_version = getattr(db_resource_check, 'template_version', None)
                except Exception:
                    existing_tpl_key = None
                    existing_tpl_version = None
                if not existing_tpl_key:
                    # Résoudre automatiquement la clé de template
                    _, _, resolved_template_key = TemplateResolver.resolve_templates(t_key, st_key)
                    template_key_to_use = resolved_template_key
                    template_version_to_use = 1
                else:
                    template_key_to_use = existing_tpl_key
                    template_version_to_use = existing_tpl_version or 1

                # Générer le HTML runtime à partir du template résolu automatiquement
                try:
                    # Résoudre le template runtime via TemplateResolver
                    _, runtime_template_path, resolved_template_key = TemplateResolver.resolve_templates(t_key, st_key)

                    if runtime_template_path and runtime_template_path.exists():
                        # Utiliser le template_key résolu si pas encore défini
                        if not template_key_to_use:
                            template_key_to_use = resolved_template_key
                            template_version_to_use = 1

                        raw_template = runtime_template_path.read_text(encoding='utf-8')
                        # Échapper les données JSON pour éviter les problèmes de syntaxe JavaScript
                        import json
                        parsed_data = json.loads(parsed_data_json)
                        escaped_data_json = json.dumps(parsed_data, ensure_ascii=False)
                        escaped_data_json = (escaped_data_json.replace('\\', '\\\\')
                                           .replace('</script>', '<\\/script>')
                                           .replace('</style>', '<\\/style>')
                                           .replace('"', '\\"')
                                           .replace('\n', '\\n')
                                           .replace('\r', '\\r')
                                           .replace('\t', '\\t'))
                        injected = raw_template.replace('<!--ACTIVITY_DATA_JSON-->', escaped_data_json)
                        injected = injected.replace('<!--PENDU_DATA_JSON-->', escaped_data_json)
                        injected = injected.replace('<!--QUISUISJE_DATA_JSON-->', escaped_data_json)
                        # Écrire dans uploads/<user_id>/runtime_{subtype}_{resource_id}.html
                        rel = get_upload_path(current_user.id, f"runtime_{st_key}_{resource_id}.html")
                        abs_path = Path(settings.UPLOADS_BASE_DIR) / rel
                        abs_path.parent.mkdir(parents=True, exist_ok=True)
                        abs_path.write_text(injected, encoding='utf-8')
                        runtime_rel_path = rel
                        logger.info(f"[{t_key.upper()}/{st_key.upper()}] Runtime HTML généré: {abs_path} (template: {runtime_template_path.name})")
                    else:
                        logger.warning(f"[{t_key.upper()}/{st_key.upper()}] Template runtime non trouvé: {runtime_template_path}")
                except Exception as e_gen:
                    logger.warning(f"[{t_key.upper()}/{st_key.upper()}] Échec génération HTML runtime pour resource_id={resource_id}: {e_gen}")

            # L'analyse de texte est statique - pas de runtime dynamique nécessaire
            elif t_key == 'exercice' and st_key == 'analysetexte':
                logger.info(f"[ANALYSETEXTE] Type statique détecté - pas de runtime dynamique pour resource_id={resource_id}")
    except Exception as e_parse:
        logger.warning(f"[EXERCICE] Échec parsing HTML→JSON pour resource_id={resource_id}: {e_parse}")

    # --- Parsing des IDs de session ---
    session_ids: Optional[List[int]] = None
    if session_ids_json is not None:
        try:
            parsed_ids = json.loads(session_ids_json)
            if not isinstance(parsed_ids, list):
                raise ValueError("session_ids_json doit être une liste JSON.")
            session_ids = [int(sid) for sid in parsed_ids if sid is not None]
            logger.info(f"Session IDs parsés pour MAJ: {session_ids}")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour session_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour session_ids_json: {e}")

    # --- Parsing des IDs d'objectifs ---
    objective_ids: Optional[List[int]] = None
    if objective_ids_json is not None:
        try:
            parsed_ids = json.loads(objective_ids_json)
            if not isinstance(parsed_ids, list):
                raise ValueError("objective_ids_json doit être une liste JSON.")
            objective_ids = [int(oid) for oid in parsed_ids if oid is not None]
            logger.info(f"Objective IDs parsés pour MAJ: {objective_ids}")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour objective_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour objective_ids_json: {e}")

    # --- Parsing des IDs d'objets d'étude ---
    study_object_ids: Optional[List[int]] = None
    if study_object_ids_json is not None:
        try:
            parsed_ids = json.loads(study_object_ids_json)
            if not isinstance(parsed_ids, list):
                raise ValueError("study_object_ids_json doit être une liste JSON.")
            study_object_ids = [int(oid) for oid in parsed_ids if oid is not None]
            logger.info(f"Study Object IDs parsés pour MAJ: {study_object_ids}")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour study_object_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour study_object_ids_json: {e}")

    # --- Parsing des IDs d'oeuvres ---
    oeuvre_ids: Optional[List[int]] = None
    if oeuvre_ids_json is not None:
        try:
            parsed_ids = json.loads(oeuvre_ids_json)
            if not isinstance(parsed_ids, list):
                raise ValueError("oeuvre_ids_json doit être une liste JSON.")
            oeuvre_ids = [int(oid) for oid in parsed_ids if oid is not None]
            logger.info(f"Oeuvre IDs parsés pour MAJ: {oeuvre_ids}")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Erreur parsing JSON pour oeuvre_ids dans MAJ: {e}")
            raise HTTPException(status_code=400, detail=f"Format invalide pour oeuvre_ids_json: {e}")

    # --- Gestion de l'upload de fichier ---
    file_upload_data: Optional[ResourceFileUpload] = None
    temp_saved_file_path: Optional[Path] = None

    # Gérer le fichier uploadé s'il est fourni
    if file is not None:
        safe_filename = secure_filename(file.filename)
        file_upload_data = ResourceFileUpload(
            file_name=safe_filename,
            file_type=file.content_type,
            file_size=file.size
        )

        # Utiliser UPLOADS_BASE_DIR des settings
        user_upload_dir_on_disk = settings.UPLOADS_BASE_DIR / "uploads" / str(current_user.id)
        user_upload_dir_on_disk.mkdir(parents=True, exist_ok=True)
        final_file_path_on_disk = user_upload_dir_on_disk / safe_filename
        temp_saved_file_path = final_file_path_on_disk

        try:
            logger.info(f"Sauvegarde du nouveau fichier pour mise à jour vers : {final_file_path_on_disk}")
            with open(final_file_path_on_disk, "wb") as buffer:
                buffer.write(await file.read())
            logger.info(f"Nouveau fichier sauvegardé avec succès : {final_file_path_on_disk}")
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du nouveau fichier {safe_filename}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur lors de la sauvegarde du fichier: {e}")
        finally:
            await file.close()

    # Préparer les données pour la mise à jour via le schéma Pydantic
    update_data_dict = {
        "title": title,
        "description": description,
        "type_id": type_id,
        "sub_type_id": sub_type_id,
    }

    # Injecter data_json si on a pu parser
    if parsed_data_json is not None:
        logger.info(f"[DEBUG] Sauvegarde data_json: {type(parsed_data_json)} - {len(str(parsed_data_json))} chars")
        update_data_dict["data_json"] = parsed_data_json
    else:
        logger.warning("[DEBUG] parsed_data_json est None - pas de sauvegarde data_json")
    if runtime_rel_path is not None:
        update_data_dict["runtime_html_path"] = runtime_rel_path
    if template_key_to_use is not None:
        update_data_dict["template_key"] = template_key_to_use
        update_data_dict["template_version"] = template_version_to_use
    if session_ids_json is not None:
        update_data_dict["session_ids"] = session_ids
    if objective_ids_json is not None:
        update_data_dict["objective_ids"] = objective_ids
    if study_object_ids_json is not None:
        update_data_dict["study_object_ids"] = study_object_ids
    if oeuvre_ids_json is not None:
        update_data_dict["oeuvre_ids"] = oeuvre_ids

    # Filtrer les clés dont la valeur est None
    update_data_filtered = {k: v for k, v in update_data_dict.items() if v is not None}

    # Si session_ids ou objective_ids a été fourni (même vide), on les remet
    if "session_ids" in update_data_dict:
          update_data_filtered["session_ids"] = update_data_dict["session_ids"]
    if "objective_ids" in update_data_dict:
          update_data_filtered["objective_ids"] = update_data_dict["objective_ids"]
    if "study_object_ids" in update_data_dict:
          update_data_filtered["study_object_ids"] = update_data_dict["study_object_ids"]
    if "oeuvre_ids" in update_data_dict:
          update_data_filtered["oeuvre_ids"] = update_data_dict["oeuvre_ids"]

    resource_update_schema = ResourceUpdate(**update_data_filtered)
    logger.debug(f"Schéma ResourceUpdate préparé: {resource_update_schema.model_dump_json(exclude_none=True)}")

    # Appeler la fonction CRUD mise à jour
    try:
        updated_resource = crud.resource.update_resource(
            db=db,
            resource_id=resource_id,
            resource_update=resource_update_schema,
            file_upload=file_upload_data
        )

        if updated_resource is None:
            logger.error(f"La fonction CRUD update_resource a retourné None pour la ressource {resource_id} après vérifications initiales.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found during update process")

        logger.info(f"Ressource {resource_id} mise à jour avec succès.")
        return updated_resource
    except ValueError as e:
        if temp_saved_file_path and temp_saved_file_path.exists():
            try:
                os.remove(temp_saved_file_path)
                logger.warning(f"Nouveau fichier uploadé {temp_saved_file_path} supprimé car la mise à jour a échoué: {e}")
            except OSError as remove_err:
                logger.error(f"Erreur lors de la suppression du nouveau fichier après échec mise à jour {temp_saved_file_path}: {remove_err}")
        logger.error(f"Erreur (ValueError) lors de la mise à jour de la ressource {resource_id}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        if temp_saved_file_path and temp_saved_file_path.exists():
            try:
                os.remove(temp_saved_file_path)
                logger.warning(f"Nouveau fichier uploadé {temp_saved_file_path} supprimé car la mise à jour a échoué: {e}")
            except OSError as remove_err:
                logger.error(f"Erreur lors de la suppression du nouveau fichier après échec mise à jour {temp_saved_file_path}: {remove_err}")
        logger.error(f"Erreur serveur inattendue lors de la mise à jour de la ressource {resource_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur interne du serveur.")