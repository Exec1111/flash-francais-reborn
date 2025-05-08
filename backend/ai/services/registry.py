"""
Registre des prompts associés aux types/sous-types de ressources.
"""
import logging

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
    ("meta", "exercise_suggester"): "session_exercise_suggester",
    # Ajouter d'autres mappings ici au fur et à mesure
}

class ResourceGenerationError(Exception):
    """Exception levée en cas d'erreur lors de la génération de ressources."""
    pass

def get_available_ai_resource_types():
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
