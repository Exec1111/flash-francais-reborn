"""
Utilitaires pour la manipulation des schémas JSON utilisés avec l'API Gemini.
"""
from typing import Dict, Any, List
import logging
from pydantic import BaseModel
import json
from pydantic.json_schema import model_json_schema

logger = logging.getLogger(__name__)

def clean_schema(node: Dict[str, Any]) -> None:
    """
    Nettoie un schéma JSON en supprimant les clés non compatibles avec l'API Gemini.
    Modifie le schéma en place.
    
    Args:
        node: Le nœud de schéma à nettoyer
    """
    if isinstance(node, dict):
        node.pop('$schema', None)
        node.pop('additionalProperties', None)
        for v in node.values(): 
            clean_schema(v)
    elif isinstance(node, list):
        for item in node: 
            clean_schema(item)

def flatten_schema(node: Dict[str, Any]) -> None:
    """
    Aplatit les listes de types dans un schéma JSON en ne conservant que le premier type.
    Modifie le schéma en place.
    
    Args:
        node: Le nœud de schéma à aplatir
    """
    if isinstance(node, dict):
        t = node.get('type')
        if isinstance(t, list) and t:
            node['type'] = t[0]
        for v in node.values(): 
            flatten_schema(v)
    elif isinstance(node, list):
        for item in node: 
            flatten_schema(item)

def remove_defaults_from_schema(schema: Dict[str, Any]) -> None:
    """
    Supprime toutes les clés 'default' d'un schéma JSON pour compatibilité Gemini.
    Modifie le schéma en place.
    
    Args:
        schema: Le schéma à modifier
    """
    if isinstance(schema, dict):
        schema.pop('default', None)
        for value in schema.values():
            remove_defaults_from_schema(value)
    elif isinstance(schema, list):
        for item in schema:
            remove_defaults_from_schema(item)

def get_session_json_schema() -> Dict[str, Any]:
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
