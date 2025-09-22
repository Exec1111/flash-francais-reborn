from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile, Form, Request
from sqlalchemy.orm import Session
import logging
import os
import uuid
import json
import jsonschema
from urllib.parse import urlparse

from backend.database import get_db
from backend.dependencies import get_current_active_user
from backend.models import User as UserModel
from backend.ai import ai_resource_service
from backend.ai.prompts.prompt_generator import PromptGenerator
from config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/resource-merging",
    tags=["Resource Merging"],
)

settings = get_settings()

@router.post(
    "/merge-resource",
    summary="Fusionne un contenu JSON avec un modèle HTML (uploadé ou par défaut) pour générer un document HTML final via LLM.",
    description="Fusionne un contenu JSON édité avec un modèle HTML (uploadé ou par défaut), génère un HTML via Gemini, sauvegarde le fichier temporaire et retourne l'URL du HTML généré."
)
async def merge_resource(
    request: Request,
    type_key: str = Form(...),
    subtype_key: str = Form(...),
    data_json: str = Form(...),
    model_file: UploadFile = File(None),
    model_name: str = Form(None),
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Endpoint pour fusionner un contenu JSON édité avec un modèle HTML (uploadé ou par défaut).
    """
    # Logs détaillés pour diagnostiquer l'erreur 422
    logger.info(f"[Fusion][DEBUG] Reçu requête pour type={type_key}, subtype={subtype_key}")
    logger.info(f"[Fusion][DEBUG] model_file présent: {model_file is not None}")
    logger.info(f"[Fusion][DEBUG] model_name: {model_name}")

    # Champlex / Champlex2 utilisent JSON-first: pas besoin de merge, retourner directement le JSON
    if type_key.lower() == 'exercice' and subtype_key.lower() in ('champlex2', 'champlex'):
        try:
            json_data = json.loads(data_json)
            logger.info(f"[Fusion][JSON-FIRST] Contournement du merge pour {subtype_key}: {json_data}")

            # Retourner une réponse simulée pour que le frontend continue
            placeholder = "/api/v1/ai/champlex2-json-placeholder" if subtype_key.lower() == 'champlex2' else "/api/v1/ai/champlex-json-placeholder"
            return {
                "html_url": placeholder,
                "data_json": json_data,
                "message": f"{subtype_key} utilise JSON-first, pas de merge nécessaire"
            }
        except json.JSONDecodeError as e:
            logger.error(f"[Fusion][JSON-FIRST] JSON invalide pour {subtype_key}: {e}")
            raise HTTPException(status_code=422, detail=f"Format JSON invalide: {str(e)}")

    try:
        # Logs du contenu JSON (première partie seulement pour ne pas surcharger les logs)
        json_str = data_json[:200] + "..." if len(data_json) > 200 else data_json
        logger.info(f"[Fusion][DEBUG] data_json reçu: {json_str}")
        # Vérifier que le JSON est valide
        json_data = json.loads(data_json)
        logger.info(f"[Fusion][DEBUG] JSON valide, structure: {list(json_data.keys()) if isinstance(json_data, dict) else 'liste ou autre type'}")
    except json.JSONDecodeError as e:
        logger.error(f"[Fusion][ERREUR] JSON invalide: {e}")
        raise HTTPException(status_code=422, detail=f"Format JSON invalide: {str(e)}")

    if not type_key or not subtype_key:
        logger.error(f"[Fusion][ERREUR] type_key ou subtype_key manquant dans la requête : type_key={type_key}, subtype_key={subtype_key}")
        raise HTTPException(status_code=400, detail="type_key et subtype_key sont obligatoires.")

    # Validation JSON via JSON Schema du sous-type s'il est défini
    try:
        prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower()))
        if not prompt_name:
            # Tentatives de normalisation '-' <-> '_'
            if '-' in subtype_key:
                prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower().replace('-', '_')))
            elif '_' in subtype_key:
                prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower().replace('_', '-')))
        if prompt_name:
            # Supporte le format dict du registre: {"config": "<nom_fichier_yaml>"}
            prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
            generator = PromptGenerator(prompt_config)
            if getattr(generator, "schema", None):
                generator.validate(json_data)
                logger.info(f"[Fusion][DEBUG] JSON conforme au schéma pour {type_key}/{subtype_key}")
        else:
            logger.warning(f"[Fusion][DEBUG] Aucun prompt_name trouvé pour {type_key}/{subtype_key} lors de la validation du schéma. Validation sautée.")
    except jsonschema.ValidationError as ve:
        logger.error(f"[Fusion][ERREUR] JSON non conforme au schéma: {ve.message}")
        raise HTTPException(status_code=422, detail=f"JSON non conforme au schéma: {ve.message}")

    try:
        # Traces détaillées pour le diagnostic du choix du modèle HTML
        if model_file:
            model_path = f"/tmp/uploaded_models/{uuid.uuid4()}_{model_file.filename}"
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            with open(model_path, "wb") as f:
                f.write(await model_file.read())
        elif model_name:
            model_path = os.path.join("backend", "templates", "qcm_models", model_name)
            if not os.path.exists(model_path):
                raise HTTPException(status_code=404, detail=f"Modèle {model_name} introuvable")
        else:
            # Sélection du modèle HTML par défaut via TEMPLATE_REGISTRY
            from backend.ai.services.registry import TEMPLATE_REGISTRY, DEFAULT_TEMPLATE_DIR
            normalized_type_key = type_key.lower()
            normalized_subtype_key = subtype_key.lower()
            template_key = (normalized_type_key, normalized_subtype_key)

            default_model_filename = TEMPLATE_REGISTRY.get(template_key)

            if not default_model_filename:
                logger.warning(f"Aucun modèle HTML par défaut trouvé dans TEMPLATE_REGISTRY pour type={type_key}, sous-type={subtype_key}.")
                raise HTTPException(status_code=404, detail=f"Modèle par défaut pour {type_key}/{subtype_key} introuvable dans le registre.")

            model_path = os.path.join(DEFAULT_TEMPLATE_DIR, default_model_filename)
            logger.info(f"Utilisation du modèle HTML par défaut: {model_path}")

            if not os.path.exists(model_path):
                logger.error(f"Fichier modèle HTML par défaut configuré mais introuvable sur le disque : {model_path}")
                # Cette erreur indique un problème de configuration ou de déploiement, car le fichier listé dans le registre n'existe pas.
                raise HTTPException(status_code=500, detail=f"Erreur interne: Fichier modèle {default_model_filename} introuvable pour {type_key}/{subtype_key}.")

        # Appel service de fusion (à implémenter)
        html_path, html_url = await ai_resource_service.merge_ai_resource_content(
            type_key=type_key,
            subtype_key=subtype_key,
            data_json=data_json,
            model_path=model_path,
            user_id=current_user.id
        )
        logger.info(f"[Fusion][TRACE] Fusion IA terminée pour type_key={type_key}, subtype_key={subtype_key}, html_path={html_path}, html_url={html_url}")
        # Préférer retourner une URL relative si le service la fournit déjà (simplifie le frontend)
        try:
            if isinstance(html_url, str) and html_url.startswith("/"):
                fixed_html_url = html_url
            else:
                # Reconstruire une URL absolue fiable basée sur la requête et X-Forwarded-*
                base = str(request.base_url).rstrip("/")
                xf_host = request.headers.get("x-forwarded-host")
                xf_proto = request.headers.get("x-forwarded-proto")
                if xf_host:
                    proto = xf_proto or ("https" if request.url.scheme == "https" else "http")
                    base = f"{proto}://{xf_host}".rstrip("/")
                parsed = urlparse(html_url) if html_url else None
                path = parsed.path if parsed else None
                if path:
                    fixed_html_url = f"{base}{path}"
                else:
                    fixed_html_url = html_url
        except Exception:
            fixed_html_url = html_url
        logger.info(f"[Fusion][TRACE] URL d'aperçu renvoyée au frontend: {fixed_html_url}")
        return {"html_url": fixed_html_url, "html_path": html_path}
    except Exception as e:
        logger.error(f"[Fusion][ERREUR] Exception lors de la fusion de ressource: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur fusion ressource: {e}")