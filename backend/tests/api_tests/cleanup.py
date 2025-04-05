import requests
from ..utils import BASE_URL, HEADERS, print_status

def cleanup(progression_id_holder, sequence_id_holder, session_id_holder, resource_id_holder, objective_id_holder):
    """Supprime les données de test créées."""
    print("\n--- Nettoyage des données de test ---")
    cleaned_something = False

    # L'ordre est important à cause des dépendances (Resource dépend de Session, etc.)

    # Supprimer Resource
    resource_id = resource_id_holder.get("id")
    if resource_id:
        response_del = requests.delete(f"{BASE_URL}/resources/{resource_id}", headers=HEADERS)
        print_status(response_del, f"Supprimer Resource ID {resource_id}", expected_code=204) # Attendre 204
        cleaned_something = True

    # Supprimer Session
    session_id = session_id_holder.get("id")
    if session_id:
        response_del = requests.delete(f"{BASE_URL}/sessions/{session_id}", headers=HEADERS)
        print_status(response_del, f"Supprimer Session ID {session_id}", expected_code=204) # Attendre 204
        cleaned_something = True

    # Supprimer Séquence
    sequence_id = sequence_id_holder.get("id")
    if sequence_id:
        response_del = requests.delete(f"{BASE_URL}/sequences/{sequence_id}", headers=HEADERS)
        print_status(response_del, f"Supprimer Séquence ID {sequence_id}", expected_code=204) # Attendre 204
        cleaned_something = True

    # Supprimer Objective
    objective_id = objective_id_holder.get("id")
    if objective_id:
        response_del = requests.delete(f"{BASE_URL}/objectives/{objective_id}", headers=HEADERS)
        print_status(response_del, f"Supprimer Objective ID {objective_id}", expected_code=204) # Attendre 204
        cleaned_something = True

    # Supprimer Progression
    progression_id = progression_id_holder.get("id")
    if progression_id:
        response_del = requests.delete(f"{BASE_URL}/progressions/{progression_id}", headers=HEADERS)
        print_status(response_del, f"Supprimer Progression ID {progression_id}", expected_code=204) # Attendre 204
        cleaned_something = True

    if not cleaned_something:
        print("Aucune donnée de test à nettoyer (aucun ID trouvé).")

    # La fonction cleanup ne retourne pas de statut d'échec/succès, elle essaie juste de nettoyer.
