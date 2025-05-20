"""
Service pour la suggestion de types d'exercices appropriés à une séance.
"""
from typing import Dict, Any, List
import logging
import json

from backend.ai.prompts.prompt_generator import PromptGenerator
from backend.ai.services.registry import PROMPT_REGISTRY, ResourceGenerationError
from backend.ai.services.resource_generator import generate_ai_resource_content

logger = logging.getLogger(__name__)

import time
import json
from backend.models.llm_interaction_log import LLMInteractionLog
from backend.database import SessionLocal

async def suggest_exercise_types_for_session(
    session_title: str,
    session_description: str,
    session_objectives: List[str],
    sequence_study_objects: List[str],
    existing_resources_summary: List[str],
    niveau_classe: str = None,
    nombre_ressources: int = None,
    user_id: int = None
) -> Dict[str, Any]:
    """
    Suggère des types d'exercices pertinents pour une session donnée en utilisant l'IA.
    Récupère dynamiquement les descriptions et paramètres des prompts d'exercices disponibles.
    
    Args:
        session_title: Titre de la séance
        session_description: Description de la séance
        session_objectives: Liste des objectifs pédagogiques de la séance
        sequence_study_objects: Liste des objets d'étude de la séquence
        existing_resources_summary: Résumé des ressources existantes pour la séance
        
    Returns:
        Dictionnaire contenant les suggestions d'exercices
    """
 
    # Liste blanche des types de prompts considérés comme de vrais exercices
    EXERCISE_TYPES = ["exercice", "oeuvre", "lecon"]
    
    available_exercise_types = []
    # Parcourir PROMPT_REGISTRY pour trouver les prompts d'exercices
    for (type_key, subtype_key), prompt_name in PROMPT_REGISTRY.items():
        # N'inclure que les prompts dont le type est dans la liste blanche des exercices
        if type_key in EXERCISE_TYPES:
            try:
                generator = PromptGenerator(prompt_name)
                # Récupérer la structure des paramètres directement depuis la config du prompt
                params_config = generator.config.get("parameters", [])
                
                available_exercise_types.append({
                    "type_key": type_key,
                    "subtype_key": subtype_key,
                    "name_fr": generator.config.get("name_fr", prompt_name), # Pour affichage si besoin
                    "description_courte": generator.config.get("description_courte", ""),
                    "parameters": params_config # Passe la liste des paramètres telle quelle
                })
            except Exception as e:
                logger.warning(f"Impossible de charger/parser le prompt '{prompt_name}' (type: {type_key}, subtype: {subtype_key}) pour la liste des exercices disponibles : {e}")
    
    if not available_exercise_types:
        logger.warning("Aucun type d'exercice disponible n'a pu être chargé depuis PROMPT_REGISTRY pour la suggestion.")
    
    input_vars_for_suggester = {
        "session_title": session_title,
        "session_description": session_description,
        "session_objectives": session_objectives,
        "sequence_study_objects": sequence_study_objects,
        "existing_resources_summary": existing_resources_summary,
        "available_exercise_types": available_exercise_types
    }
    
    # Ajouter les nouveaux paramètres s'ils sont fournis
    if niveau_classe:
        input_vars_for_suggester["niveau_classe"] = niveau_classe
        logger.info(f"Niveau de classe spécifié pour la suggestion: {niveau_classe}")
        
    if nombre_ressources:
        input_vars_for_suggester["nombre_ressources"] = nombre_ressources
        logger.info(f"Nombre de ressources demandé pour la suggestion: {nombre_ressources}")

    try:
        # Appel à la fonction de génération
        start_time = time.perf_counter()
        suggestions = await generate_ai_resource_content(
            type_key="meta",
            subtype_key="exercise_suggester",
            input_variables=input_vars_for_suggester
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)    

        logger.info(f"Suggestions d'exercices générées avec succès pour la session '{session_title}'.")
        return suggestions
    except ResourceGenerationError as e:
        logger.error(f"Erreur (ResourceGenerationError) lors de la génération des suggestions d'exercices pour la session '{session_title}': {e}", exc_info=True)
        raise # Re-lever pour que l'appelant puisse gérer
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la tentative de suggestion d'exercices pour la session '{session_title}': {e}", exc_info=True)
        raise ResourceGenerationError(f"Erreur inattendue lors de la suggestion d'exercices : {str(e)}")
