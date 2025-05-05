"""
Service pour la génération de ressources IA à partir de prompts.
"""
from typing import Dict, Any, List
import logging
import os
import uuid
import json
from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.models import ResourceType, ResourceSubType
from google import genai
from google.genai import types
from dotenv import load_dotenv
import jsonschema  # validation of dynamic schemas
from starlette.responses import Response
from pydantic.json_schema import model_json_schema
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)

# Registre des prompts associés aux types/sous-types de ressources (nom des configs YAML)
PROMPT_REGISTRY = {
    ("exercice", "qcm"): "qcm",
    ("exercice", "vocabulaire"): "vocabulaire",
    ("exercice", "champlex"): "champlex",
    ("exercice", "champlex2"): "champlex2",
    ("oeuvre", "extrait"): "extrait_oeuvre",
    ("oeuvre", "oeuvrecomp"): "oeuvre_oeuvrecomp",
    ("seance", "generator"): "session_generator",
    # Ajouter d'autres mappings ici au fur et à mesure
}

class ResourceGenerationError(Exception):
    pass

async def merge_ai_resource_content(
    type_key: str,
    subtype_key: str,
    data_json: str,
    model_path: str,
    user_id: int
):
    """
    Fusionne un contenu JSON édité avec un modèle HTML (uploadé ou par défaut),
    appelle Gemini pour générer le HTML final, sauvegarde le fichier temporaire et retourne son chemin et son URL.
    """
    logger.info(f"[Fusion] Lancement fusion pour user {user_id}, modèle {model_path}")
    try:
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash-preview-04-17")
        
        # Configuration du client
        client = genai.Client(api_key=api_key)
        
        # Upload du fichier modèle HTML
        uploaded_html = client.files.upload(file=model_path)

        # Charger les données JSON
        user_data = json.loads(data_json)

        # Construire le prompt avec JSON inline
        generator = PromptGenerator("merge_template")
        json_str = json.dumps(user_data, ensure_ascii=False, indent=2)
        system_prompt, user_prompt = generator.build(json_data=json_str)
        prompt = f"{system_prompt}\n\n{user_prompt}"

        # Afficher le contenu du modèle HTML joint
        try:
            with open(model_path, "r", encoding="utf-8") as f:
                html_model_content = f.read()
            logger.info(f"[Fusion][LLM] Contenu du modèle HTML joint :\n{html_model_content}")
        except Exception as e:
            logger.warning(f"[Fusion][LLM] Impossible de lire le modèle HTML {model_path} : {e}")

        logger.info(f"[Fusion][LLM] Appel API Gemini : model={model_name}, user_id={user_id}, model_path={model_path}, prompt=\n{prompt}")
        from google.genai.errors import ServerError
        import time
        payload = [uploaded_html, prompt]
        response = None
        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[payload]
                )
                break
            except ServerError as err:
                logger.warning(f"[Fusion][LLM] Erreur interne (tentative {attempt+1}): {err}")
                if attempt < 2:
                    time.sleep(2 ** attempt)
                else:
                    raise
        html_generated = response.text
        # logger.info(f"[Fusion][LLM] Réponse brute générée par le LLM :\n{html_generated}")
        from config import get_settings
        settings = get_settings()
        static_gen_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "tmp", str(user_id))
        os.makedirs(static_gen_dir, exist_ok=True)
        html_filename = f"qcm_{uuid.uuid4().hex}.html"
        html_path = os.path.join(static_gen_dir, html_filename)
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_generated)
        relative_public_path = f"tmp/{user_id}/{html_filename}"
        html_url = f"http://localhost:10000/static/{relative_public_path}"
        logger.info(f"[Fusion] HTML généré sauvegardé : {html_path}")
        return html_path, html_url
    except Exception as e:
        logger.error(f"Erreur lors de la fusion IA : {e}", exc_info=True)
        raise ResourceGenerationError(f"Erreur fusion IA : {str(e)}")

async def generate_ai_resource_content(
    type_key: str,
    subtype_key: str,
    input_variables: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Génère le contenu d'une ressource IA en utilisant le prompt approprié.
    """
    try:
        # Récupérer le nom de prompt depuis le registre
        prompt_name = PROMPT_REGISTRY.get((type_key, subtype_key))
        if not prompt_name:
            raise ResourceGenerationError(f"Aucun prompt trouvé pour {type_key}/{subtype_key}")
        # Générateur générique basé sur YAML/Jinja
        generator = PromptGenerator(prompt_name)
        system, user = generator.build(**input_variables)
        
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash-preview-04-17")
        
        # Configuration du client Google GenAI
        client = genai.Client(api_key=api_key)
        
        # Fusionner instructions système et contenu utilisateur en un seul message user
        prompt_text = f"{system}\n\n{user}"
        logger.info(f"Prompt généré (après rendu Jinja) : {prompt_text}")
        contents = [{"role": "user", "parts": [{"text": prompt_text}]}]
        
        # Construire et nettoyer le schéma dynamique si présent
        schema = generator.schema
        if schema:
            # Retirer $schema et additionalProperties
            def clean(node):
                if isinstance(node, dict):
                    node.pop('$schema', None)
                    node.pop('additionalProperties', None)
                    for v in node.values(): clean(v)
                elif isinstance(node, list):
                    for item in node: clean(item)
            clean(schema)
            # Aplatir listes de types au premier élément
            def flatten(node):
                if isinstance(node, dict):
                    t = node.get('type')
                    if isinstance(t, list) and t:
                        node['type'] = t[0]
                    for v in node.values(): flatten(v)
                elif isinstance(node, list):
                    for item in node: flatten(item)
            flatten(schema)
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema
            )
        else:
            config = types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        
        # Appel API en JSON
        logger.info(f"Modèle : {model_name}")
        logger.info(f"contents : {contents}")
        logger.info(f"config : {config}")
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config
        )
        
        # Extraire le JSON
        response_content = response.text.strip()
        # logger.info(f"Réponse brute du modèle : {response_content}")
        
        # Parsing direct du JSON retourné
        parsed_content = json.loads(response_content)
        
        # Valider localement selon le schéma du prompt, sans bloquer en cas d'erreur
        try:
            generator.validate(parsed_content)
        except Exception as ve:
            logger.warning(f"Validation du schéma échouée: {ve}")
        return parsed_content
    except Exception as e:
        logger.error(f"Erreur lors de la génération de contenu IA: {e}", exc_info=True)
        raise ResourceGenerationError(f"Erreur de génération: {str(e)}")

def get_available_ai_resource_types() -> Dict[str, Dict[str, list]]:
    """
    Retourne la liste des types/sous-types de ressources AI disponibles.
    
    Returns:
        Dictionnaire des types et leurs sous-types associés pour lesquels 
        des prompts de génération sont disponibles
    """
    result = {}
    
    for (type_key, subtype_key) in PROMPT_REGISTRY.keys():
        if type_key not in result:
            result[type_key] = {"subtypes": []}
        
        result[type_key]["subtypes"].append(subtype_key)
    
    return result

def get_session_json_schema():
    """
    Génère dynamiquement le schéma JSON pour la génération de séances à partir du modèle Pydantic.
    
    Returns:
        Le schéma JSON pour guider l'IA dans la génération de séances
    """
    try:
        # Import ici pour éviter les dépendances circulaires
        from schemas.session import SessionCreate
        
        # Créer un modèle qui contient une liste de sessions
        class SessionsGenerationOutput(BaseModel):
            sessions: List[SessionCreate]
        
        # Générer le schéma JSON à la volée
        schema = model_json_schema(SessionsGenerationOutput)
        logger.info(f"Schéma JSON généré pour les séances : {schema}")
        return schema
    except Exception as e:
        logger.error(f"Erreur lors de la génération du schéma JSON pour séances: {e}", exc_info=True)
        # En cas d'erreur, retourner un schéma minimal pour que l'IA puisse fonctionner
        return {
            "type": "object",
            "properties": {
                "sessions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "date": {"type": "string", "format": "date-time"},
                            "notes": {"type": "string"},
                            "duration": {"type": "integer"},
                            "sequence_id": {"type": "integer"},
                            "objective_ids": {
                                "type": "array", 
                                "items": {"type": "integer"}
                            },
                            "resource_ids": {
                                "type": "array",
                                "items": {"type": "integer"}
                            }
                        },
                        "required": ["title", "date", "sequence_id"]
                    }
                }
            },
            "required": ["sessions"]
        }

def remove_defaults_from_schema(schema):
    if isinstance(schema, dict):
        schema.pop('default', None)
        for value in schema.values():
            remove_defaults_from_schema(value)
    elif isinstance(schema, list):
        for item in schema:
            remove_defaults_from_schema(item)

async def generate_ai_sessions(
    sequence_id: int,
    sequence_title: str,
    niveau: str,
    nombre_seances: str,
    inclure_ressources: bool,
    ressources_disponibles: List[Dict[str, Any]],
    objectifs: List[Dict[str, Any]],
    study_objects: List[Dict[str, Any]],
    instructions_supplementaires: str = ""
) -> Dict[str, Any]:
    """
    Génère des séances (sessions) pour une séquence à l'aide de l'IA.
    
    Args:
        sequence_id: ID de la séquence pour laquelle générer des séances
        sequence_title: Titre de la séquence
        niveau: Niveau des apprenants (A1-C2)
        nombre_seances: Nombre de séances à générer ou "auto"
        inclure_ressources: Si True, inclure des ressources dans les séances
        ressources_disponibles: Liste des ressources disponibles pour les séances
        objectifs: Liste des objectifs pédagogiques de la séquence
        study_objects: Liste des objets d'étude pour la séquence
        instructions_supplementaires: Instructions supplémentaires pour la génération
    
    Returns:
        Dictionnaire contenant la liste des séances générées
    """
    try:
        # Préparer les variables d'entrée pour le prompt
        input_variables = {
            "nombre_seances": nombre_seances,
            "titre_sequence": sequence_title,
            "niveau": niveau,
            "inclure_ressources": inclure_ressources,
            "ressources_disponibles": ressources_disponibles,
            "objectifs": objectifs,
            "study_objects": study_objects,
            "instructions_supplementaires": instructions_supplementaires
        }
        
        # Générer le contenu en utilisant le prompt "session_generator"
        prompt_name = "session_generator"
        generator = PromptGenerator(prompt_name)
        system, user = generator.build(**input_variables)
        
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash-preview-04-17")
        
        # Configuration du client Google GenAI
        client = genai.Client(api_key=api_key)
        
        # Fusionner instructions système et contenu utilisateur en un seul message user
        prompt_text = f"{system}\n\n{user}"
        logger.info(f"Prompt généré (après rendu Jinja) : {prompt_text}")
        contents = [{"role": "user", "parts": [{"text": prompt_text}]}]
        
        # Obtenir le schéma dynamique pour les séances
        schema = get_session_json_schema()
        
        # Nettoyer le schéma généré pour le rendre compatible avec l'API Gemini
        def clean(node):
            if isinstance(node, dict):
                node.pop('$schema', None)
                node.pop('additionalProperties', None)
                for v in node.values(): clean(v)
            elif isinstance(node, list):
                for item in node: clean(item)
        clean(schema)
        
        # Aplatir les listes de types au premier élément
        def flatten(node):
            if isinstance(node, dict):
                t = node.get('type')
                if isinstance(t, list) and t:
                    node['type'] = t[0]
                for v in node.values(): flatten(v)
            elif isinstance(node, list):
                for item in node: flatten(item)
        flatten(schema)
        
        # Supprimer toutes les clés 'default' du schéma pour compatibilité Gemini
        remove_defaults_from_schema(schema)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema
        )
        
        prompt_context = {
            "titre_sequence": sequence_title,
            "niveau": niveau,
            "nombre_seances": nombre_seances,
            "objectifs": objectifs,
            "study_objects": study_objects,
            "instructions_supplementaires": instructions_supplementaires,
            # autres champs...
        }
        logger.info(f"Contexte du prompt : {prompt_context}")
        
        # Appel API en JSON
        logger.info(f"Génération de séances - Modèle : {model_name}")
        logger.info(f"Génération de séances - Prompt : {prompt_text}...")
        logger.info(f"Génération de séances - Schema : {schema}")
        
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config
        )
        
        # Extraire le JSON
        response_content = response.text.strip()
        logger.info(f"Réponse brute du modèle (tronquée) : {response_content[:500]}...")
        
        # Parsing du JSON retourné
        parsed_content = json.loads(response_content)
        
        # Ajouter l'ID de séquence à chaque séance générée
        for session in parsed_content.get("sessions", []):
            session["sequence_id"] = sequence_id
        
        return parsed_content
    except Exception as e:
        logger.error(f"Erreur lors de la génération de séances: {e}", exc_info=True)
        raise ResourceGenerationError(f"Erreur de génération de séances: {str(e)}")
