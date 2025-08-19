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

# Normalisation légère des clés pour comparer type/subtype de manière robuste
def _norm_key(value: str) -> str:
    """Normalise une clé en minuscules et remplace '-' par '_' pour éviter les mismatches."""
    return (value or "").strip().lower().replace('-', '_')

async def suggest_exercise_types_for_session(
    session_title: str,
    session_description: str,
    session_objectives: List[str],
    sequence_study_objects: List[str],
    existing_resources_summary: List[str],
    niveau_classe: str = None,
    nombre_ressources: int = None,
    type_resources: List[Dict[str, str]] = None,
    support: Dict[str, Any] = None,
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
        # Déterminer si cette ressource doit être incluse
        include_resource = False
        
        # Si l'utilisateur a spécifié des types/sous-types précis
        if type_resources:
            # Vérifier si ce type/sous-type est dans la liste des types demandés (avec normalisation -/_)
            for type_resource in type_resources:
                tr_type = _norm_key(type_resource.get("type_key", ""))
                tr_sub = _norm_key(type_resource.get("subtype_key", ""))
                if (_norm_key(type_key) == tr_type and _norm_key(subtype_key) == tr_sub):
                    include_resource = True
                    break
        # Sinon utiliser la liste blanche par défaut
        elif type_key.lower() in EXERCISE_TYPES:
            include_resource = True
            
        # Si cette ressource ne doit pas être incluse, passer à la suivante
        if not include_resource:
            continue
        
        try:
            # Support du format dict: {"config": "nom_du_yaml"}
            prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
            generator = PromptGenerator(prompt_config)
            # Récupérer la structure des paramètres directement depuis la config du prompt
            params_config = generator.config.get("parameters", [])
                
            available_exercise_types.append({
                "type_key": type_key,
                "subtype_key": subtype_key,
                "name_fr": generator.config.get("name_fr", prompt_config), # Pour affichage si besoin
                "description_courte": generator.config.get("description_courte", ""),
                "parameters": params_config # Passe la liste des paramètres telle quelle
            })
        except Exception as e:
            logger.warning(f"Impossible de charger/parser le prompt '{prompt_name}' (type: {type_key}, subtype: {subtype_key}) pour la liste des exercices disponibles : {e}")
    
    if not available_exercise_types:
        if type_resources:
            logger.warning("Aucun type d'exercice ne correspond aux 'type_resources' fournis après normalisation. Repli sur la liste blanche par défaut.")
            # Repli: inclure tous les types de la liste blanche
            for (type_key, subtype_key), prompt_name in PROMPT_REGISTRY.items():
                if type_key.lower() not in EXERCISE_TYPES:
                    continue
                try:
                    prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
                    generator = PromptGenerator(prompt_config)
                    params_config = generator.config.get("parameters", [])
                    available_exercise_types.append({
                        "type_key": type_key,
                        "subtype_key": subtype_key,
                        "name_fr": generator.config.get("name_fr", prompt_config),
                        "description_courte": generator.config.get("description_courte", ""),
                        "parameters": params_config
                    })
                except Exception as e:
                    logger.warning(f"Impossible de charger/parser le prompt de repli '{prompt_name}' (type: {type_key}, subtype: {subtype_key}) : {e}")
        else:
            logger.warning("Aucun type d'exercice disponible n'a pu être chargé depuis PROMPT_REGISTRY pour la suggestion.")

    logger.info(f"Nombre de types d'exercices disponibles pour la suggestion: {len(available_exercise_types)}")
    if available_exercise_types:
        logger.debug(f"Aperçu premiers types: {[ (t['type_key'], t['subtype_key']) for t in available_exercise_types[:5] ]}")
    
    input_vars_for_suggester = {
        "session_title": session_title,
        "session_description": session_description,
        "session_objectives": session_objectives,
        "sequence_study_objects": sequence_study_objects,
        "existing_resources_summary": existing_resources_summary,
        "available_exercise_types": available_exercise_types
    }
    
    # Ajout d'informations sur le support sélectionné, si disponible
    if support:
        input_vars_for_suggester["support"] = {
            "title": support.get("title", ""),
            "content": support.get("content", "")
        }
        logger.info(f"DEBUG SUPPORT: Support '{support.get('title')}' ajouté à la génération")
        logger.info(f"DEBUG SUPPORT: Structure du support: {input_vars_for_suggester['support']}")
        logger.info(f"DEBUG SUPPORT: Extrait du contenu: {support.get('content', '')[:100]}...")
    else:
        logger.info("DEBUG SUPPORT: Aucun support fourni pour la génération")
    
    
    # Ajouter les nouveaux paramètres s'ils sont fournis
    if niveau_classe:
        input_vars_for_suggester["niveau_classe"] = niveau_classe
        logger.info(f"Niveau de classe spécifié pour la suggestion: {niveau_classe}")
        
    if nombre_ressources:
        input_vars_for_suggester["nombre_ressources"] = nombre_ressources
        logger.info(f"Nombre de ressources demandé pour la suggestion: {nombre_ressources}")
        
    # Ajouter les types d'exercices spécifiquement sélectionnés par l'utilisateur
    logger.info("================== DÉBOGAGE TYPE_RESOURCES ==================")
    logger.info(f"type_resources reçu: {type_resources}")
    logger.info(f"Type de la variable: {type(type_resources)}")
    
    if type_resources is not None:
        logger.info(f"Est un tableau: {isinstance(type_resources, list)}")
        logger.info(f"Longueur: {len(type_resources) if isinstance(type_resources, list) else 'N/A'}")
        try:
            logger.info(f"Format JSON: {json.dumps(type_resources)}")
        except Exception as e:
            logger.error(f"Impossible de convertir type_resources en JSON: {e}")
    
    if type_resources and len(type_resources) > 0:
        logger.info("Traitement des types d'exercices sélectionnés...")
        # Convertir la liste en format approprié pour le prompt YAML
        selected_types = []
        for i, type_resource in enumerate(type_resources):
            logger.info(f"Analyse de l'élément {i}: {type_resource}")
            logger.info(f"Type de l'élément: {type(type_resource)}")
            
            if isinstance(type_resource, dict) and "type_key" in type_resource and "subtype_key" in type_resource:
                selected_types.append({
                    "type_key": type_resource["type_key"],
                    "subtype_key": type_resource["subtype_key"]
                })
                logger.info(f"Elément {i} ajouté à selected_types: {type_resource['type_key']}/{type_resource['subtype_key']}")
            else:
                logger.warning(f"Elément {i} ignoré, format incorrect: {type_resource}")
        
        # Ajouter au dictionnaire des variables d'entrée sous le paramètre 'selected_exercise_types'
        if selected_types:
            input_vars_for_suggester["selected_exercise_types"] = selected_types
            logger.info(f"Types d'exercices spécifiquement sélectionnés pour la suggestion: {selected_types}")
            logger.info(f"input_vars_for_suggester['selected_exercise_types'] défini avec {len(selected_types)} éléments")
        else:
            logger.warning("Les types d'exercices fournis ne contiennent pas les clés attendues (type_key, subtype_key).")
    else:
        logger.info("Aucun type d'exercice spécifique sélectionné.")
    
    logger.info("===========================================================")

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
