"""
Service pour la génération de ressources IA à partir de prompts.
"""
from typing import Dict, Any
import logging
import os
import uuid
import json
from backend.ai.prompts.base import BasePrompt
from backend.ai.prompts.exercises.qcm import QCMPrompt
from backend.models import ResourceType, ResourceSubType

logger = logging.getLogger(__name__)

# Registre des prompts associés aux types/sous-types de ressources
PROMPT_REGISTRY = {
    ("exercice", "qcm"): QCMPrompt,
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
        import google.generativeai as genai
        from dotenv import load_dotenv
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-pro-preview-03-25")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        uploaded_file = genai.upload_file(path=model_path)
        user_data = json.loads(data_json)
        prompt = (
            "Génère-moi un document HTML en utilisant le modèle fourni (fichier joint), en te basant sur les données suivantes (au format JSON) :\n"
            f"{json.dumps(user_data, ensure_ascii=False, indent=2)}\n"
            "Le rendu doit respecter fidèlement la structure et le style du modèle."
        )
        response = model.generate_content([uploaded_file, "\n\n", prompt])
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
        PromptClass = PROMPT_REGISTRY.get((type_key, subtype_key))
        if not PromptClass:
            raise ResourceGenerationError(f"Aucun prompt trouvé pour {type_key}/{subtype_key}")
        prompt_instance = PromptClass()
        prompt_text = prompt_instance.format_user_prompt(input_variables)
        import google.generativeai as genai
        from dotenv import load_dotenv
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-pro-preview-03-25")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content([prompt_text])
        response_content = response.text
        logger.info(f"Réponse brute du LLM : {response_content}")
        parsed_content = prompt_instance.parse_response(response_content)
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
