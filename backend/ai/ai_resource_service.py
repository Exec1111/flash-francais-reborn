"""
Service pour la génération de ressources IA à partir de prompts.
"""
from typing import Dict, Any
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

logger = logging.getLogger(__name__)

# Registre des prompts associés aux types/sous-types de ressources (nom des configs YAML)
PROMPT_REGISTRY = {
    ("exercice", "qcm"): "qcm",
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
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-pro-preview-03-25")
        
        # Configuration du client
        client = genai.Client(api_key=api_key)
        
        # Upload du fichier avec le nouveau SDK
        uploaded_file = client.files.upload(file=model_path)
        
        user_data = json.loads(data_json)
        prompt = (
            "Génère-moi un document HTML en utilisant le modèle fourni (fichier joint), en te basant sur les données suivantes (au format JSON) :\n"
            f"{json.dumps(user_data, ensure_ascii=False, indent=2)}\n"
            "Le rendu doit respecter fidèlement la structure et le style du modèle."
        )
        
        # Fusion via GenAI: passer le fichier et le prompt comme liste de File et str
        response = client.models.generate_content(
            model=model_name,
            contents=[ [ uploaded_file, prompt ] ]
        )
        
        html_generated = response.text
        # Nouveau dossier de destination (dans static)
        static_gen_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "generated_resources", "tmp", str(user_id))
        os.makedirs(static_gen_dir, exist_ok=True)
        html_filename = f"qcm_{uuid.uuid4().hex}.html"
        html_path = os.path.join(static_gen_dir, html_filename)
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_generated)
        # Chemin relatif pour accès public
        relative_public_path = f"generated_resources/tmp/{user_id}/{html_filename}"
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
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-pro-preview-03-25")
        
        # Configuration du client Google GenAI
        client = genai.Client(api_key=api_key)
        
        # Fusionner instructions système et contenu utilisateur en un seul message user
        prompt_text = f"{system}\n\n{user}"
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
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config
        )
        
        # Extraire le JSON
        response_content = response.text.strip()
        logger.info(f"Réponse brute du modèle : {response_content}")
        
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
