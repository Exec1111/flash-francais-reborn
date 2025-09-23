"""
Service pour la fusion de contenu JSON avec des templates HTML via l'IA.
"""
from typing import Dict, Any, Tuple
import logging
import os
import uuid
import json
import time
import re
from dotenv import load_dotenv
from google import genai
from google.genai.errors import ServerError

from ai.prompts.prompt_generator import PromptGenerator
from ai.services.registry import ResourceGenerationError
from ai.utils.html_cleaner import preserve_content_spaces
from config import get_settings
from database import SessionLocal
from models.llm_interaction_log import LLMInteractionLog

logger = logging.getLogger(__name__)

async def merge_ai_resource_content(
    type_key: str,
    subtype_key: str,
    data_json: str,
    model_path: str,
    user_id: int
) -> Tuple[str, str]:
    """
    Fusionne un contenu JSON avec un modèle HTML.
    Pour les types JSON-first (qcm, champlex, champlex2), fait un simple remplacement de placeholder.
    Pour les autres types, utilise l'IA Gemini.
    
    Args:
        type_key: Type de ressource (ex: 'exercice')
        subtype_key: Sous-type de ressource (ex: 'qcm')
        data_json: Données JSON à fusionner
        model_path: Chemin vers le fichier modèle HTML
        user_id: ID de l'utilisateur qui demande la fusion
        
    Returns:
        Un tuple (chemin_fichier, url) vers le fichier HTML généré
    """
    
    # Types qui utilisent le système JSON-first (simple remplacement de placeholder)
    json_first_types = ['qcm', 'champlex', 'champlex2']
    
    logger.info(f"[MERGE] Type: {type_key}, Subtype: {subtype_key}")
    logger.info(f"[MERGE] Subtype normalisé: {subtype_key.lower()}")
    logger.info(f"[MERGE] JSON-first types: {json_first_types}")
    logger.info(f"[MERGE] Est JSON-first: {subtype_key.lower() in json_first_types}")
    
    if subtype_key.lower() in json_first_types:
        logger.info(f"[MERGE] Utilisation de la fusion JSON-first pour {type_key}/{subtype_key}")
        return await _merge_json_first_template(type_key, subtype_key, data_json, model_path, user_id)
    else:
        logger.info(f"[MERGE] Utilisation de la fusion IA pour {type_key}/{subtype_key}")
        return await _merge_ai_template(type_key, subtype_key, data_json, model_path, user_id)


async def _merge_json_first_template(
    type_key: str,
    subtype_key: str,
    data_json: str,
    model_path: str,
    user_id: int
) -> Tuple[str, str]:
    """
    Fusion simple pour les templates JSON-first : remplace les placeholders par les données JSON.
    """
    logger.info(f"[JSON-FIRST] Fusion simple pour {type_key}/{subtype_key}")
    logger.info(f"[JSON-FIRST] Model path: {model_path}")
    logger.info(f"[JSON-FIRST] Data JSON (preview): {data_json[:200]}...")
    
    try:
        # Lire le template
        with open(model_path, "r", encoding="utf-8") as f:
            template_content = f.read()
        
        logger.info(f"[JSON-FIRST] Template lu, taille: {len(template_content)} caractères")
        logger.info(f"[JSON-FIRST] Placeholder présent: {'<!--QCM_DATA_JSON-->' in template_content}")
        
        # Remplacer les placeholders selon le type
        if subtype_key.lower() == 'qcm':
            # Pour QCM : remplacer <!--QCM_DATA_JSON--> par les données
            html_content = template_content.replace('<!--QCM_DATA_JSON-->', data_json)
            logger.info(f"[JSON-FIRST] Remplacement effectué, placeholder encore présent: {'<!--QCM_DATA_JSON-->' in html_content}")
        elif subtype_key.lower() in ['champlex', 'champlex2']:
            # Pour Champlex : remplacer <!--CHAMPLEX_DATA_JSON--> par les données
            html_content = template_content.replace('<!--CHAMPLEX_DATA_JSON-->', data_json)
        else:
            # Fallback générique
            html_content = template_content.replace('<!--DATA_JSON-->', data_json)
        
        # Générer le nom de fichier de sortie
        timestamp = int(time.time())
        output_filename = f"runtime_{subtype_key}_{user_id}_{timestamp}.html"
        
        # Utiliser le même système que la fusion IA pour la cohérence
        # Créer le répertoire dans static/tmp comme les autres fichiers générés
        import os
        static_gen_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                      "static", "tmp", str(user_id))
        os.makedirs(static_gen_dir, exist_ok=True)
        
        # Chemin complet du fichier de sortie
        output_path = os.path.join(static_gen_dir, output_filename)
        
        # Écrire le fichier HTML final
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        logger.info(f"[JSON-FIRST] Fichier écrit: {output_path}")
        logger.info(f"[JSON-FIRST] Taille finale: {len(html_content)} caractères")
        
        # Construire l'URL relative (même format que la fusion IA)
        relative_url = f"/static/tmp/{user_id}/{output_filename}"
        
        logger.info(f"[JSON-FIRST] Fichier généré: {output_path}")
        logger.info(f"[JSON-FIRST] URL: {relative_url}")
        
        return output_path, relative_url
        
    except Exception as e:
        logger.error(f"[JSON-FIRST] Erreur lors de la fusion: {e}")
        raise


async def _merge_ai_template(
    type_key: str,
    subtype_key: str,
    data_json: str,
    model_path: str,
    user_id: int
) -> Tuple[str, str]:
    """
    Fusion via IA pour les templates classiques.
    """
    logger.info(f"[AI-FUSION] Début fusion IA. model_path reçu : {model_path}")
    logger.info(f"[AI-FUSION] Lancement fusion pour user {user_id}, modèle {model_path}")
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

        # Sanitation: suppression des scripts, attributs d'événements et balises <template>
        def sanitize_static_html(html: str) -> str:
            if not html:
                return html
            original = html
            # 1) Supprimer toutes les balises <script>...</script>
            html = re.sub(r"<script\b[\s\S]*?</script>", "", html, flags=re.IGNORECASE)
            # 2) Supprimer les attributs d'événements on*="..." ou on*='...'
            #    Exemple: onclick="...", onload='...'
            html = re.sub(r"\s+on[a-zA-Z]+\s*=\s*\"[\s\S]*?\"", "", html)
            html = re.sub(r"\s+on[a-zA-Z]+\s*=\s*'[^']*'", "", html)
            # 3) Supprimer les balises <template>...</template>
            html = re.sub(r"<template\b[\s\S]*?</template>", "", html, flags=re.IGNORECASE)
            # 4) Supprimer les marqueurs spéciaux éventuels (ex: <!--PROTECTED_SCRIPT_*-->)
            html = re.sub(r"<!--\s*PROTECTED_SCRIPT_[^>]*-->", "", html, flags=re.IGNORECASE)
            # 5) Trim basique
            html = html.strip()
            removed = len(original) - len(html)
            if removed > 0:
                logger.debug(f"[Fusion][Sanitize] Suppressions effectuées: -{removed} caractères")
            return html

        html_generated = sanitize_static_html(html_generated)
        
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
