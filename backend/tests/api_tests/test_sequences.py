import requests
from ..utils import BASE_URL, HEADERS, UNIQUE_SUFFIX, print_status

def test_sequences(progression_id, objective_ids, sequence_id_holder):
    """Teste les endpoints CRUD pour Sequence, y compris l'association avec les objectifs, et met à jour sequence_id_holder."""
    if progression_id is None:
        print("\n! Skipping Sequence tests: Progression ID manquant.")
        return False, "Progression ID manquant pour tester les séquences."

    print(f"\n--- Test des Séquences (pour Progression ID: {progression_id}) ---")
    sequence_data = {
        "title": f"Test Séquence 1 - {UNIQUE_SUFFIX}",
        "description": "Première séquence de test avec objectifs",
        "progression_id": progression_id,
        "objective_ids": objective_ids if objective_ids else [] # Ajouter les IDs d'objectifs
    }
    response_create = requests.post(f"{BASE_URL}/sequences", headers=HEADERS, json=sequence_data)
    success, error_detail = print_status(response_create, "Créer Séquence avec Objectifs")
    if not success:
        return False, f"Création Séquence échouée: {error_detail}"
    sequence_id = response_create.json().get("id")
    sequence_id_holder["id"] = sequence_id
    print(f"  ID Séquence créée: {sequence_id}")

    # Lire Séquence
    response_get = requests.get(f"{BASE_URL}/sequences/{sequence_id}")
    success, error_detail = print_status(response_get, f"Lire Séquence ID {sequence_id}")
    if success:
        received_data = response_get.json()
        print(f"  Données reçues: {received_data}")
        if received_data.get("progression_id") != progression_id:
             error_msg = f"Erreur Lecture Séquence {sequence_id}: progression_id ({received_data.get('progression_id')}) != attendu ({progression_id})"
             print(f"! {error_msg}")
             return False, error_msg
        # Vérifier les objectifs associés
        received_objective_ids = sorted([obj['id'] for obj in received_data.get('objectives', [])])
        expected_objective_ids = sorted(objective_ids if objective_ids else [])
        if received_objective_ids != expected_objective_ids:
            error_msg = f"Erreur Lecture Séquence {sequence_id}: objective_ids ({received_objective_ids}) != attendus ({expected_objective_ids})"
            print(f"! {error_msg}")
            return False, error_msg
        else:
            print(f"  Objectifs associés vérifiés: {received_objective_ids}")
    else:
        return False, f"Lecture Séquence {sequence_id} échouée: {error_detail}"

    # Lire toutes les Séquences
    response_get_all = requests.get(f"{BASE_URL}/sequences") # TODO: Filtrer par progression?
    success, error_detail = print_status(response_get_all, "Lire toutes les Séquences")
    if success:
        all_sequences = response_get_all.json()
        found = any(s.get('id') == sequence_id for s in all_sequences)
        print(f"  Séquence {sequence_id} trouvée dans la liste: {found}")
        if not found:
            return False, f"Séquence {sequence_id} non trouvée dans la liste après création."
    else:
        return False, f"Lecture de toutes les séquences échouée: {error_detail}"

    # Mettre à jour Séquence (changer le titre et les objectifs associés)
    updated_objective_ids = [] # Tester la suppression des objectifs
    update_data = {
        "title": f"Test Séquence 1 - Modifiée - {UNIQUE_SUFFIX}",
        "objective_ids": updated_objective_ids
        }
    response_update = requests.put(f"{BASE_URL}/sequences/{sequence_id}", headers=HEADERS, json=update_data)
    success, error_detail = print_status(response_update, f"Mettre à jour Séquence ID {sequence_id} (sans objectifs)")
    if not success:
        return False, f"Mise à jour Séquence {sequence_id} échouée: {error_detail}"

    # Vérifier la mise à jour
    response_check = requests.get(f"{BASE_URL}/sequences/{sequence_id}")
    if response_check.status_code == 200:
        updated_title = response_check.json().get('title')
        updated_objectives = sorted([obj['id'] for obj in response_check.json().get('objectives', [])])
        if updated_title == update_data["title"]:
            print(f"  Nouveau titre vérifié: {updated_title}")
        else:
            error_msg = f"Échec vérification MàJ titre Séquence {sequence_id}. Attendu: {update_data['title']}, Reçu: {updated_title}"
            print(f"! {error_msg}")
            return False, error_msg
        # Vérifier la mise à jour des objectifs
        if updated_objectives == updated_objective_ids:
            print(f"  Objectifs associés mis à jour vérifiés: {updated_objectives}")
        else:
            error_msg = f"Échec vérification MàJ objectifs Séquence {sequence_id}. Attendus: {updated_objective_ids}, Reçus: {updated_objectives}"
            print(f"! {error_msg}")
            return False, error_msg
    else:
        error_msg = f"Impossible de vérifier la MàJ Séquence {sequence_id}. Statut: {response_check.status_code}"
        print(f"! {error_msg}")
        return False, error_msg

    return True, None # Retourne succès
