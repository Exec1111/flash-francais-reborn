"""
Registre des prompts associés aux types/sous-types de ressources.
"""
import logging
from typing import List # Ajout pour le type hint de retour

logger = logging.getLogger(__name__)

import os

# Registre des prompts associés aux types/sous-types de ressources (nom des configs YAML)
PROMPT_REGISTRY = {
    ("exercice", "qcm"): "qcm",
    ("exercice", "dictee"): "dictee",
    ("exercice", "vocabulaire"): "vocabulaire",
    ("exercice", "champlex"): "champlex",
    ("exercice", "champlex2"): "champlex2",
    ("exercice", "mots-croises"): "mots_croises",
    ("exercice", "pendu"): "pendu",
    ("exercice", "quisuisje"): "quisuisje",
    ("oeuvre", "extrait"): "extrait_oeuvre",
    ("oeuvre", "oeuvrecomp"): "oeuvre_oeuvrecomp",
    ("seance", "generator"): "session_generator",
    ("meta", "exercise_suggester"): "session_exercise_suggester",
    ("lecon", "leconcomplete1"): "lecon_complete1",
    ("lecon", "sequence_summary"): "sequence_summary",
    # Ajouter d'autres mappings ici au fur et à mesure
}

# Répertoire de base pour les templates HTML par défaut
# Remonte de services -> ai -> backend -> racine du projet (flash-francais-reborn)
BASE_PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) 
DEFAULT_TEMPLATE_DIR = os.path.join(BASE_PROJECT_DIR, "backend", "ai", "template")

# Registre des chemins de modèles HTML par défaut
# Les clés sont (type_key.lower(), subtype_key.lower())
# Les valeurs sont les noms de fichiers des templates
TEMPLATE_REGISTRY = {
    ("oeuvre", "extrait"): "default_oeuvre_extrait.html",
    ("exercice", "qcm"): "default_exercice_qcm.html",
    ("exercice", "dictee"): "default_exercice_dictee.html",
    ("oeuvre", "oeuvrecomp"): "default_oeuvre_oeuvrecomp.html",
    ("exercice", "vocabulaire"): "default_exercice_vocabulaire.html",
    ("exercice", "champlex"): "default_exercice_champlex.html",
    ("exercice", "quisuisje"): "default_exercice_quisuisje.html",
    ("exercice", "pendu"): "default_exercice_pendu.html",
    ("exercice", "champlex2"): "default_exercice_champlex2.html", 
    ("exercice", "mots-croises"): "default_exercice_motscroises.html", 
    ("lecon", "leconcomplete1"): "default_lecon_complete1.html",
    ("lecon", "sequence_summary"): "default_lecon_sequencesummary.html",
    # Ajoutez d'autres mappings ici si nécessaire
}

class ResourceGenerationError(Exception):
    """Exception levée en cas d'erreur lors de la génération de ressources."""
    pass

from sqlalchemy.orm import Session
from backend.models import ResourceType, ResourceSubType # Assurez-vous que le chemin d'import est correct
from backend.ai.schemas import AITypeSchema, AISubTypeSchema

def get_available_ai_resource_types(db: Session) -> List[AITypeSchema]:
    """
    Retourne la liste des types/sous-types de ressources AI disponibles,
    en se basant sur PROMPT_REGISTRY et en récupérant les détails de la DB.

    Args:
        db: Session de base de données SQLAlchemy.

    Returns:
        Liste d'objets AITypeSchema avec leurs sous-types imbriqués.
    """
    ai_types_data = {}  # Utiliser un dictionnaire pour regrouper les sous-types par type

    for type_key_reg, subtype_key_reg in PROMPT_REGISTRY.keys():
        # Les clés dans PROMPT_REGISTRY sont en minuscules, celles en BDD sont attendues en MAJUSCULES
        db_type_key = type_key_reg.upper()
        db_subtype_key = subtype_key_reg.upper()

        # Récupérer ResourceType depuis la BDD
        db_type = db.query(ResourceType).filter(ResourceType.key == db_type_key).first()
        if not db_type:
            logger.warning(f"ResourceType avec la clé '{db_type_key}' (de PROMPT_REGISTRY) non trouvé en BDD. Ignoré.")
            continue

        # Récupérer ResourceSubType depuis la BDD
        db_subtype = db.query(ResourceSubType).filter(
            ResourceSubType.key == db_subtype_key,
            ResourceSubType.type_id == db_type.id
        ).first()

        if not db_subtype:
            logger.warning(f"ResourceSubType avec la clé '{db_subtype_key}' pour le type '{db_type_key}' (de PROMPT_REGISTRY) non trouvé en BDD. Ignoré.")
            continue

        # Si le type n'est pas encore dans notre dictionnaire de résultats, l'ajouter
        if db_type.key not in ai_types_data:
            ai_types_data[db_type.key] = AITypeSchema(
                id=db_type.id,
                key=db_type.key,
                value=db_type.value,
                subtypes=[]
            )
        
        # Ajouter le sous-type au type correspondant, en évitant les doublons (si jamais PROMPT_REGISTRY avait des redondances)
        current_subtypes_for_type = ai_types_data[db_type.key].subtypes
        if not any(st.key == db_subtype.key for st in current_subtypes_for_type):
            current_subtypes_for_type.append(
                AISubTypeSchema(
                    id=db_subtype.id,
                    key=db_subtype.key,
                    value=db_subtype.value
                )
            )
            # Optionnel: trier les sous-types par leur 'value' ou 'key'
            current_subtypes_for_type.sort(key=lambda st: st.value)

    # Convertir le dictionnaire de AITypeSchema en une liste et la trier (optionnel)
    final_list = sorted(list(ai_types_data.values()), key=lambda t: t.value)
    return final_list
