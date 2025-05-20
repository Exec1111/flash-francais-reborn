"""
Utilitaire pour convertir les chaînes numériques en valeurs numériques réelles
dans les réponses de l'API Gemini.
"""
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

def convert_numeric_string_values(content: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convertit les valeurs numériques encadrées par des guillemets en valeurs numériques réelles
    en se basant sur le type déclaré dans chaque paramètre.
    
    Cette fonction est utilisée pour post-traiter les réponses de l'API Gemini qui retourne
    parfois des valeurs numériques sous forme de chaînes.
    """
    try:
        # Version simplifiée pour éviter les bugs
        logger.info("Début du post-traitement des valeurs numériques")
        
        # Liste des paramètres numériques connus pour garantir la conversion
        numeric_param_names = [
            "nombre_questions", "nb_options", "nombre_champs", "nombre_mots", 
            "min_mots_par_champ", "max_mots_par_champ", "proportion_hors_champ"
        ]
        
        if not isinstance(content, dict):
            logger.warning("Le contenu n'est pas un dictionnaire, impossible de convertir les valeurs numériques")
            return content
            
        if "suggestions" not in content:
            logger.warning("Aucune suggestion dans le contenu, impossible de convertir les valeurs numériques")
            return content
        
        # Debug
        logger.info(f"Nombre de suggestions trouvées : {len(content.get('suggestions', []))}")
        
        for suggestion_idx, suggestion in enumerate(content.get("suggestions", [])):
            if "parameters" not in suggestion or not isinstance(suggestion["parameters"], list):
                logger.warning(f"Suggestion {suggestion_idx} : pas de paramètres ou format invalide")
                continue
                
            logger.info(f"Suggestion {suggestion_idx} : traitement de {len(suggestion['parameters'])} paramètres")
            
            for param_idx, param in enumerate(suggestion["parameters"]):
                try:
                    # S'assurer que nous avons les clés nécessaires
                    if "name" not in param or "value" not in param:
                        logger.warning(f"Paramètre {param_idx} incomplet, ignore")
                        continue
                        
                    # Nettoyer d'abord les valeurs de type string
                    if isinstance(param["value"], str):
                        original = param["value"]
                        param["value"] = param["value"].strip().replace("\n", "")
                        if original != param["value"]:
                            logger.info(f"Nettoyé '{original}' en '{param['value']}' pour '{param.get('name', 'inconnu')}'")
                    
                    # Convertir spécifiquement les paramètres numériques connus si leur valeur est une chaîne
                    if param.get("name") in numeric_param_names and isinstance(param.get("value"), str):
                        # Nettoyer les données binaires qui pourraient être présentes dans la chaîne
                        val = param["value"].strip()
                        
                        # Table des valeurs par défaut pour chaque paramètre numérique
                        default_values = {
                            'nombre_questions': 5,
                            'nb_options': 4,
                            'nombre_champs': 3,
                            'min_mots_par_champ': 5,
                            'max_mots_par_champ': 10,
                            'nombre_mots': 10,
                            'proportion_hors_champ': 30
                        }
                        
                        # CAS 1: Gérer le cas spécial 'default'
                        if val.lower() == 'default':
                            if param["name"] in default_values:
                                default_val = default_values[param["name"]]
                                logger.info(f"Valeur 'default' remplacée par {default_val} pour '{param['name']}'")
                                param["value"] = default_val
                                continue
                        
                        # CAS 2: Valeur = nom du paramètre (ex: 'nombre_questions' = 'nombre_questions')
                        if val.lower() == param["name"].lower():
                            if param["name"] in default_values:
                                default_val = default_values[param["name"]]
                                logger.info(f"Valeur '{val}' (nom du paramètre) remplacée par {default_val} pour '{param['name']}'")
                                param["value"] = default_val
                                continue
                        
                        if "><<binary data" in val:
                            # Extraire les chiffres de la chaîne qui contient des données binaires
                            import re
                            digits = re.findall(r'\d+', val)
                            if digits:
                                clean_val = digits[-1]  # Prendre le dernier nombre trouvé (généralement ce que nous voulons)
                                logger.info(f"Nettoyé '{val}' en '{clean_val}' pour '{param['name']}'")
                                val = clean_val
                        
                        logger.info(f"Tentative de conversion numérique pour '{param['name']}' = '{val}'")
                        
                        if val.isdigit():
                            param["value"] = int(val)
                            logger.info(f"Converti '{val}' en entier {param['value']}")
                except Exception as inner_err:
                    logger.error(f"Erreur lors du traitement du paramètre {param_idx}: {str(inner_err)}")
                    # Continuer avec le paramètre suivant
        
        logger.info("Post-traitement des valeurs numériques terminé")
        return content
    except Exception as e:
        logger.warning(f"Erreur lors de la conversion des valeurs numériques: {str(e)}")
        return content  # Retourner le contenu original en cas d'erreur
