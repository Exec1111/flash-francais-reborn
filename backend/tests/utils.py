import requests
import json
import uuid
from datetime import datetime, timedelta

# --- Configuration --- #
BASE_URL = "http://localhost:10000/api/v1"
HEADERS = {"Content-Type": "application/json"}
# Générer un suffixe unique pour cette exécution de test
UNIQUE_SUFFIX = str(uuid.uuid4())[:8]

# --- Fonctions Utilitaires --- #
def print_status(response, action="Action", expected_code=200):
    """Affiche le statut d'une requête API et retourne True si le code est celui attendu."""
    status_code = response.status_code
    result = "OK" if status_code == expected_code else "Échec"
    print(f"- {action}: {result} (Code: {status_code})", end="")
    error_detail = None
    if result == "Échec":
        try:
            error_detail = response.json().get("detail", response.text)
            print(f" - Détail: {error_detail}")
        except json.JSONDecodeError:
            error_detail = f"Réponse non-JSON: {response.text[:100]}..." # Stocker pour le retour
            print(f" - {error_detail}")
    else:
        print()
    # Retourne le statut de succès et le détail de l'erreur si applicable
    return result == "OK", error_detail
