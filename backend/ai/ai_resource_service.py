"""
Service pour la génération de ressources IA à partir de prompts.
Ce fichier sert de point d'entrée compatible avec les importations existantes.
Il réexporte les fonctions des sous-modules spécialisés dans le package backend.ai.services.
"""

# Imports depuis les services restructurés
from backend.ai.services.registry import (
    PROMPT_REGISTRY,
    ResourceGenerationError,
    get_available_ai_resource_types
)

from backend.ai.services.resource_generator import generate_ai_resource_content
from backend.ai.services.content_merger import merge_ai_resource_content
from backend.ai.services.session_generator import generate_ai_sessions
from backend.ai.services.exercise_suggester import suggest_exercise_types_for_session
from backend.ai.services.schema_utils import (
    get_session_json_schema,
    remove_defaults_from_schema,
    clean_schema,
    flatten_schema
)

# Exportation des noms pour maintenir la compatibilité avec les imports existants
__all__ = [
    'PROMPT_REGISTRY',
    'ResourceGenerationError',
    'generate_ai_resource_content',
    'merge_ai_resource_content',
    'generate_ai_sessions',
    'suggest_exercise_types_for_session',
    'get_available_ai_resource_types',
    'get_session_json_schema',
    'remove_defaults_from_schema'
]