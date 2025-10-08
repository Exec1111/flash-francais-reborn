from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
import logging
import os
import time

from database import get_db
from dependencies import get_current_active_user
from models import User as UserModel
from ai.schemas import AIResourceTypesListResponse, AIResourceGenerationRequest, AIResourceGenerationResponse
from ai import ai_resource_service
from ai.prompts.prompt_generator import PromptGenerator
from crud.resource import get_resource, get_resources_by_session_and_type, get_available_supports_for_session
from crud.sequence import get_sequence
from crud.oeuvre import get_oeuvre
from config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Resource Generation"],
)

settings = get_settings()

@router.get(
    "/resource-types",
    response_model=AIResourceTypesListResponse,
    summary="Liste les types de ressources AI disponibles",
    description="Retourne les types et sous-types de ressources qui peuvent être générés par IA."
)
async def get_ai_resource_types(db: Session = Depends(get_db)):
    """
    Endpoint pour lister les types de ressources qui peuvent être générés par IA.
    """
    logger.info("Récupération des types de ressources IA disponibles")
    try:
        types = ai_resource_service.get_available_ai_resource_types(db=db)
        return {"types": types}
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des types de ressources IA: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur inattendue s'est produite: {e}"
        )

@router.post(
    "/generate-resource",
    response_model=AIResourceGenerationResponse,
    summary="Génère une ressource avec l'IA",
    description="Génère le contenu d'une ressource en utilisant un LLM avec le prompt approprié au type/sous-type spécifié."
)
async def generate_resource(
    request: AIResourceGenerationRequest,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint pour générer une ressource avec l'IA.
    """
    logger.info(f"Génération de ressource IA de type {request.type_key}/{request.subtype_key} demandée par l'utilisateur {current_user.email}")

    # Log détaillé des variables envoyées à l'IA
    logger.info(f"Variables de requête pour {request.type_key}/{request.subtype_key}: {request.variables}")

    try:
        # Logs détaillés avant la génération
        logger.info("Détails de la requête de génération:")
        logger.info(f"Type: {request.type_key}")
        logger.info(f"Sous-type: {request.subtype_key}")
        logger.info(f"Utilisateur ID: {current_user.id}, Email: {current_user.email}")

        # Traiter les paramètres si ils sont dans une liste (format de la suggestion d'exercices)
        if isinstance(request.variables, dict) and 'parameters' in request.variables:
            logger.info(f"[Gen] Paramètres détectés dans une liste: {request.variables['parameters']}")
            # Extraire les paramètres de la liste et les mettre directement dans variables
            parameters_list = request.variables.pop('parameters', [])
            for param in parameters_list:
                if isinstance(param, dict) and 'name' in param and 'value' in param:
                    param_name = param['name']
                    param_value = param['value']
                    request.variables[param_name] = param_value
                    logger.info(f"[Gen] Paramètre extrait: {param_name} = {param_value}")

        # Traiter resource_ids pour créer resource_content
        if isinstance(request.variables, dict) and 'resource_ids' in request.variables:
            resource_ids = request.variables.get('resource_ids', [])
            if resource_ids:
                logger.info(f"[Gen] resource_ids détectés: {resource_ids}")
                resource_content = []
                for resource_id in resource_ids:
                    try:
                        # 1) Essayer d'abord comme ressource
                        resource = get_resource(db, resource_id=int(resource_id))
                        if resource:
                            # Récupérer le contenu de la ressource
                            upload_dir = settings.UPLOADS_BASE_DIR
                            content = ""

                            # 1a) Essayer d'abord le Markdown Docling
                            md_rel = getattr(resource, 'docling_md_path', None)
                            if md_rel:
                                md_abs = os.path.join(upload_dir, md_rel)
                                if os.path.exists(md_abs):
                                    with open(md_abs, 'r', encoding='utf-8') as f:
                                        content = f.read()
                                    logger.info(f"[Gen] Contenu récupéré depuis Docling MD: {md_abs}")

                            # 1b) Fallback: fichier original
                            if not content:
                                file_rel = resource.file_path
                                if file_rel:
                                    file_abs = os.path.join(upload_dir, file_rel)
                                    if os.path.exists(file_abs):
                                        try:
                                            with open(file_abs, 'r', encoding='utf-8') as f:
                                                content = f.read()
                                            logger.info(f"[Gen] Contenu récupéré depuis fichier original: {file_abs}")
                                        except Exception as e:
                                            logger.warning(f"[Gen] Impossible de lire le fichier original: {e}")

                            if content:
                                resource_content.append({
                                    'id': resource.id,
                                    'title': resource.title,
                                    'content': content
                                })
                                logger.info(f"[Gen] Ressource {resource.id} ajoutée à resource_content")
                            else:
                                logger.warning(f"[Gen] Aucun contenu trouvé pour la ressource {resource.id}")
                        else:
                            # 2) Si pas trouvé comme ressource, essayer comme œuvre
                            oeuvre = get_oeuvre(db, oeuvre_id=int(resource_id))
                            if oeuvre:
                                # Récupérer le contenu de l'œuvre depuis les champs JSON
                                content_parts = []

                                # 2a) Résumé
                                if oeuvre.contenu and isinstance(oeuvre.contenu, dict):
                                    resume = oeuvre.contenu.get('resume', '')
                                    if resume:
                                        content_parts.append(f"Résumé: {resume}")

                                # 2b) Thèmes
                                if oeuvre.contenu and isinstance(oeuvre.contenu, dict):
                                    themes = oeuvre.contenu.get('themes', [])
                                    if themes:
                                        if isinstance(themes, list):
                                            content_parts.append(f"Thèmes: {', '.join(themes)}")
                                        else:
                                            content_parts.append(f"Thèmes: {themes}")

                                # 2c) Informations pédagogiques
                                if oeuvre.pedagogie and isinstance(oeuvre.pedagogie, dict):
                                    niveau = oeuvre.pedagogie.get('niveau_mini_recommande', '')
                                    if niveau:
                                        content_parts.append(f"Niveau recommandé: {niveau}")

                                    domaines = oeuvre.pedagogie.get('domaines_programme', [])
                                    if domaines:
                                        if isinstance(domaines, list):
                                            content_parts.append(f"Domaines: {', '.join(domaines)}")
                                        else:
                                            content_parts.append(f"Domaines: {domaines}")

                                # 2d) Métadonnées de l'œuvre
                                metadata_parts = []
                                if oeuvre.type:
                                    metadata_parts.append(f"Type: {oeuvre.type}")
                                if oeuvre.genre:
                                    metadata_parts.append(f"Genre: {oeuvre.genre}")
                                if oeuvre.mouvement_litteraire:
                                    metadata_parts.append(f"Mouvement: {oeuvre.mouvement_litteraire}")
                                if oeuvre.date_publication:
                                    metadata_parts.append(f"Année: {oeuvre.date_publication}")
                                if oeuvre.langue_originale:
                                    metadata_parts.append(f"Langue: {oeuvre.langue_originale}")

                                if metadata_parts:
                                    content_parts.insert(0, f"Métadonnées: {', '.join(metadata_parts)}")

                                # 2e) Auteur
                                if oeuvre.auteur_complet:
                                    content_parts.insert(0, f"Auteur: {oeuvre.auteur_complet}")

                                # Combiner tout le contenu
                                content = "\n\n".join(content_parts)

                                if content:
                                    resource_content.append({
                                        'id': oeuvre.id,
                                        'title': oeuvre.titre,
                                        'content': content
                                    })
                                    logger.info(f"[Gen] Œuvre {oeuvre.id} ajoutée à resource_content")
                                else:
                                    logger.warning(f"[Gen] Aucun contenu trouvé pour l'œuvre {oeuvre.id}")
                            else:
                                logger.warning(f"[Gen] ID {resource_id} non trouvé ni comme ressource ni comme œuvre")
                    except Exception as e:
                        logger.error(f"[Gen] Erreur lors de la récupération du contenu pour l'ID {resource_id}: {e}")

                if resource_content:
                    request.variables['resource_content'] = resource_content
                    logger.info(f"[Gen] resource_content créé avec {len(resource_content)} éléments")
                else:
                    logger.warning("[Gen] Aucun contenu trouvé pour les IDs fournis")

        # Analyser spécifiquement les variables
        if isinstance(request.variables, dict):
            for key, value in request.variables.items():
                logger.info(f"Variable '{key}': {value}")

        # Injecter le contenu du support si nécessaire (priorité au Markdown Docling)
        try:
            support_id = None
            # 1) support_id explicite dans variables
            if isinstance(request.variables, dict) and 'support_id' in request.variables:
                support_id = request.variables.get('support_id')
                logger.info(f"[Gen] support_id détecté dans variables: {support_id}")
            # 2) ou bien 'support': {'id': ...} sans contenu
            elif isinstance(request.variables, dict) and 'support' in request.variables:
                support_block = request.variables.get('support') or {}
                if isinstance(support_block, dict):
                    if not support_block.get('content') and support_block.get('id'):
                        support_id = support_block.get('id')
                        logger.info(f"[Gen] Bloc support sans contenu détecté, id={support_id}")

            if support_id:
                support_resource = get_resource(db, resource_id=int(support_id))
                if support_resource:
                    upload_dir = settings.UPLOADS_BASE_DIR
                    content = ""
                    try:
                        # Tenter d'abord le Markdown Docling
                        md_rel = getattr(support_resource, 'docling_md_path', None)
                        if md_rel:
                            md_abs = os.path.join(upload_dir, md_rel)
                            if os.path.exists(md_abs):
                                with open(md_abs, 'r', encoding='utf-8') as f:
                                    content = f.read()
                                logger.info(f"[Gen] Support: utilisation du Markdown Docling: {md_abs}")
                            else:
                                logger.warning(f"[Gen] Docling MD introuvable: {md_abs}. Repli sur le fichier original.")

                        # Fallback: fichier original
                        if not content:
                            file_rel = support_resource.file_path
                            if file_rel:
                                file_abs = os.path.join(upload_dir, file_rel)
                                if os.path.exists(file_abs):
                                    with open(file_abs, 'r', encoding='utf-8') as f:
                                        content = f.read()
                                    logger.info(f"[Gen] Support: utilisation du fichier original: {file_abs}")
                                else:
                                    logger.warning(f"[Gen] Fichier original introuvable: {file_abs}")
                            else:
                                logger.warning(f"[Gen] file_path non spécifié pour la ressource ID {support_resource.id}")
                    except Exception as read_err:
                        logger.error(f"[Gen] Erreur lors de la lecture du support: {read_err}")

                    # Injecter dans variables pour le générateur
                    if isinstance(request.variables, dict):
                        request.variables['support'] = {
                            'id': support_resource.id,
                            'title': support_resource.title,
                            'content': content
                        }
                        logger.info(f"[Gen] Bloc support injecté (extrait contenu): {(content[:100] + '...') if content else 'Vide'}")
                        logger.info(
                            f"[Gen] Docling status: status={getattr(support_resource, 'docling_status', None)}, "
                            f"md_path={getattr(support_resource, 'docling_md_path', None)}, "
                            f"chars={getattr(support_resource, 'docling_chars', None)}"
                        )
                else:
                    logger.warning(f"[Gen] support_id={support_id} non trouvé. Pas d'injection de contenu.")
        except Exception as inj_err:
            logger.error(f"[Gen] Erreur lors de l'injection du support: {inj_err}")

        import time
        start_time = time.perf_counter()

        logger.info("Début de l'appel au service de génération d'IA...")
        content = await ai_resource_service.generate_ai_resource_content(
            type_key=request.type_key,
            subtype_key=request.subtype_key,
            input_variables=request.variables,
            user_id=current_user.id,
            duration_ms=None  # Sera mesuré dans la fonction si non fourni
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(f"Appel au service de génération d'IA terminé en {duration_ms}ms")

        # Vérifier si le contenu est None
        if content is None:
            logger.error("Contenu généré est None")
            raise ai_resource_service.ResourceGenerationError("Aucun contenu généré par l'IA")

        # Log détaillé du contenu généré
        logger.info(f"Contenu généré avec succès pour {request.type_key}/{request.subtype_key} en {duration_ms}ms")
        logger.info(f"Réponse du service IA: {content}")

        # Vérification de la validité du contenu généré
        if not content or (isinstance(content, dict) and len(content) == 0):
            logger.error(f"Contenu généré vide ou invalide pour {request.type_key}/{request.subtype_key}")
            raise ai_resource_service.ResourceGenerationError(f"Contenu généré vide ou invalide pour {request.type_key}/{request.subtype_key}")

        return {"content": content}

    except ai_resource_service.ResourceGenerationError as e:
        logger.error(f"Erreur de génération de ressource: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValueError as e:
        logger.error(f"Erreur de validation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la génération de ressource: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur inattendue s'est produite: {e}"
        )

@router.get(
    "/resource-types/{type_key}/{subtype_key}/schema",
    summary="Récupère le schéma des variables pour un type de ressource AI",
    description="Renvoie les métadonnées des champs de formulaire pour un type de ressource AI spécifique."
)
async def get_resource_type_schema(
    type_key: str,
    subtype_key: str,
    current_user: UserModel = Depends(get_current_active_user)
):
    """
    Endpoint pour obtenir le schéma des variables nécessaires à la génération d'un type de ressource AI.
    Permet au frontend de construire des formulaires dynamiques.
    """
    logger.info(f"Récupération du schéma pour {type_key}/{subtype_key} demandée par l'utilisateur {current_user.email}")

    # Vérifier que le type et sous-type existent
    logger.info(f"Recherche du prompt pour les clés : {type_key.lower()}/{subtype_key.lower()}")
    logger.info(f"Clés disponibles dans PROMPT_REGISTRY : {list(ai_resource_service.PROMPT_REGISTRY.keys())}")
    prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower()))
    if not prompt_name:
        # Tentative avec d'autres variations de la clé
        if subtype_key.lower().replace('-', '_') != subtype_key.lower():
            prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower().replace('-', '_')))
            logger.info(f"Tentative avec tiret remplacé par underscore : {subtype_key.lower().replace('-', '_')}")
        elif subtype_key.lower().replace('_', '-') != subtype_key.lower():
            prompt_name = ai_resource_service.PROMPT_REGISTRY.get((type_key.lower(), subtype_key.lower().replace('_', '-')))
            logger.info(f"Tentative avec underscore remplacé par tiret : {subtype_key.lower().replace('_', '-')}")

        if not prompt_name:
            raise HTTPException(status_code=404, detail=f"Type de ressource '{type_key}/{subtype_key}' non trouvé")
        else:
            logger.info(f"Prompt trouvé après normalisation : {prompt_name}")
    else:
        logger.info(f"Prompt trouvé directement : {prompt_name}")
    try:
        # Utiliser le générateur config-driven
        # Supporte le format dict du registre: {"config": "<nom_fichier_yaml>"}
        prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
        generator = PromptGenerator(prompt_config)
        form_fields = []
        for p in generator.parameters:
            # Déterminer type de champ - utiliser 'enum' pour les champs avec énumération
            if "enum" in p:
                field_type = "enum"  # Utiliser le type enum pour les champs avec énumération
            else:
                # Gérer les différents types de paramètres
                param_type = str(p.get("type", "string")).lower()
                if param_type in ("int", "integer"):
                    field_type = "number"
                elif param_type in ("list", "array"):
                    field_type = "list"
                else:
                    field_type = "string"

            # Validations et valeurs par défaut
            validations = {}
            default = p.get("default")  # Définir default AVANT de l'utiliser
            # Champ requis si pas de default
            required = default is None

            if "enum" in p:
                validations["enum"] = p["enum"]
                # Ajouter aussi directement l'énumération comme attribut du champ
                # pour faciliter l'accès dans le frontend
                form_fields.append({
                    "name": p["name"],
                    "label": p.get("label", p["name"]),
                    "description": p.get("description", ""),
                    "type": field_type,
                    "required": required,
                    "default": default,
                    "validations": validations,
                    "enum": p["enum"]  # Ajouter directement l'énumération ici
                })
                continue  # Passer à l'itération suivante
            # default et required sont déjà définis plus haut, pas besoin de les redéfinir ici
            form_fields.append({
                "name": p["name"],
                "label": p.get("label", p["name"]),
                "description": p.get("description", ""),
                "type": field_type,
                "required": required,
                "default": default,
                "validations": validations
            })
        return {"fields": form_fields}

    except Exception as e:
        logger.error(f"Erreur lors de la récupération du schéma pour {type_key}/{subtype_key}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Une erreur inattendue s'est produite: {e}"
        )