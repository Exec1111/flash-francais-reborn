"""
Constantes globales pour l'application Flash Français Reborn
"""

# Types d'exercices JSON-first (ressources dynamiques avec data_json et runtime_html)
# Ces exercices utilisent un système où les données sont stockées en JSON
# et fusionnées avec un template runtime HTML au moment de l'affichage
JSON_FIRST_SUBTYPES = [
    'champlex2',
    'champlex',
    'qcm',
    'pendu',
    'quisuisje',
    'textereconstitue',
    'vocabulaire'
]

# Set pour une recherche plus rapide
JSON_FIRST_SUBTYPES_SET = set(JSON_FIRST_SUBTYPES)


def is_json_first_resource(type_key: str, subtype_key: str) -> bool:
    """
    Détermine si une ressource est de type JSON-first (dynamique)
    
    Args:
        type_key: Clé du type de ressource (ex: 'exercice')
        subtype_key: Clé du sous-type de ressource (ex: 'qcm', 'champlex')
    
    Returns:
        True si la ressource est JSON-first, False sinon
    """
    return (
        type_key.lower().strip() == 'exercice' and 
        subtype_key.lower().strip() in JSON_FIRST_SUBTYPES_SET
    )


# Placeholders JSON-first pour la détection lors de la création
JSON_FIRST_PLACEHOLDERS = [
    '/api/v1/ai/champlex2-json-placeholder',
    '/api/v1/ai/champlex-json-placeholder',
    '/api/v1/ai/qcm-json-placeholder',
    '/api/v1/ai/pendu-json-placeholder',
    '/api/v1/ai/quisuisje-json-placeholder',
    '/api/v1/ai/textereconstitue-json-placeholder',
    '/api/v1/ai/vocabulaire-json-placeholder'
]

# Set pour une recherche plus rapide
JSON_FIRST_PLACEHOLDERS_SET = set(JSON_FIRST_PLACEHOLDERS)
