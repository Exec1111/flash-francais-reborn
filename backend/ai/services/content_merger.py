"""
Service pour la fusion de contenu JSON avec des templates HTML via l'IA.
"""
from typing import Dict, Any, Tuple
import logging
import os
import uuid
import json
import time
from dotenv import load_dotenv
from google import genai
from google.genai.errors import ServerError

from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.ai.services.registry import ResourceGenerationError
from backend.ai.utils.html_cleaner import preserve_content_spaces
from config import get_settings
from backend.database import SessionLocal
from backend.models.llm_interaction_log import LLMInteractionLog

logger = logging.getLogger(__name__)

async def merge_ai_resource_content(
    type_key: str,
    subtype_key: str,
    data_json: str,
    model_path: str,
    user_id: int
) -> Tuple[str, str]:
    """
    Fusionne un contenu JSON édité avec un modèle HTML (uploadé ou par défaut),
    appelle Gemini pour générer le HTML final, sauvegarde le fichier temporaire et retourne son chemin et son URL.
    
    Args:
        type_key: Clé du type de ressource
        subtype_key: Clé du sous-type de ressource
        data_json: JSON contenant les données à fusionner avec le template
        model_path: Chemin vers le fichier modèle HTML
        user_id: ID de l'utilisateur qui demande la fusion
        
    Returns:
        Un tuple (chemin_fichier, url) vers le fichier HTML généré
    """
    logger.info(f"Début de merge_ai_resource_content. model_path reçu : {model_path}")
    logger.info(f"[Fusion] Lancement fusion pour user {user_id}, modèle {model_path}")
    try:
        load_dotenv()
        api_key = os.getenv("GOOGLE_API_KEY")
        raw_model_name = os.getenv("GEMINI_CHAT_MODEL", "gemini-1.5-flash-latest") # Utilisation d'un fallback standard
        if not raw_model_name.startswith("models/"):
            model_name = f"models/{raw_model_name}"
        else:
            model_name = raw_model_name
        
        # Initialisation du client google-genai
        client = genai.Client(api_key=api_key)
        
        # Upload du fichier modèle HTML
        # Note: La documentation de google-genai pour client.files.upload spécifie 'file_path' comme argument
        # et elle retourne un objet File, pas directement le contenu ou un handle simple.
        # Nous supposons que cet objet File peut être passé directement dans 'contents' à generate_content.
        uploaded_html = client.files.upload(file=model_path)  # Changé de file_path à file

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
  
        except Exception as e:
            logger.warning(f"[Fusion][LLM] Impossible de lire le modèle HTML {model_path} : {e}")

        
        payload = [uploaded_html, prompt]
        response = None
        
        # Mesurer le temps d'exécution
        start_time = time.perf_counter()
        
        # Tentative avec retry en cas d'erreur serveur
        for attempt in range(3):
            try:
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=[payload]
                )
                break
            except ServerError as e:
                logger.warning(f"[Fusion][LLM] Tentative {attempt+1}/3 échouée : {e}")
                time.sleep(2)

        duration_ms = int((time.perf_counter() - start_time) * 1000)
        if response is None:
            raise ResourceGenerationError("Impossible d'obtenir une réponse du modèle après 3 tentatives.")

        # Extraire le HTML généré
        html_generated = response.text.strip()
        
        # Nettoyer le HTML généré pour supprimer les espaces et retours à la ligne inutiles
        if html_generated:
            original_length = len(html_generated)
            html_generated = preserve_content_spaces(html_generated)
            cleaned_length = len(html_generated)
            if original_length != cleaned_length:
                logger.debug(f"HTML fusionné nettoyé : {original_length} -> {cleaned_length} caractères")
        
        # Logging LLMInteractionLog
        try:
            db = SessionLocal()
            log_entry = LLMInteractionLog(
                api_provider="google_genai",
                model_name=model_name,
                prompt_type="merge_template",
                input_prompt=prompt,
                input_variables={"data_json": data_json, "model_path": model_path},
                generation_config=None,
                output_content=html_generated,
                parsed_output=None,
                error_message=None,
                request_token_count=None,
                response_token_count=None,
                duration_ms=duration_ms,
                user_id=user_id
            )
            db.add(log_entry)
            db.commit()
        except Exception as log_exc:
            logger.error(f"Erreur lors du logging LLMInteractionLog (fusion IA) : {log_exc}")
        finally:
            if 'db' in locals():
                db.close()
        # Création du dossier temporaire pour l'utilisateur
        settings = get_settings()
        static_gen_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                      "static", "tmp", str(user_id))
        os.makedirs(static_gen_dir, exist_ok=True)
        
        # Génération d'un nom de fichier unique
        html_filename = f"{uuid.uuid4().hex}.html"
        html_path = os.path.join(static_gen_dir, html_filename)
        
        # Écriture du fichier HTML généré
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_generated)
            
        # Construction du chemin web relatif (retourné au backend)
        # On retourne désormais une URL relative pour simplifier le frontend et éviter les hôtes en dur
        relative_public_path = f"/static/tmp/{user_id}/{html_filename}"
        html_url = relative_public_path
        
        logger.info(f"[Fusion] HTML généré sauvegardé : {html_path}")
        return html_path, html_url
    except Exception as e:
        logger.error(f"Erreur lors de la fusion IA : {e}", exc_info=True)
        raise ResourceGenerationError(f"Erreur fusion IA : {str(e)}")
