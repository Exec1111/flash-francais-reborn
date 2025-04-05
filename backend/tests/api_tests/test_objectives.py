import requests
from ..utils import BASE_URL, HEADERS, UNIQUE_SUFFIX, print_status

def test_objectives(objective_id_holder):
    """Teste les endpoints CRUD pour Objective et met à jour objective_id_holder."""
    print("\n--- Test des Objectives (CRUD de base) ---")
    objective_data = {
        "title": f"Objectif de Test - {UNIQUE_SUFFIX}",
        "description": "Tester la compréhension orale A1"
    }
    response_create = requests.post(f"{BASE_URL}/objectives", headers=HEADERS, json=objective_data)
    # Utiliser le code 201 pour la création d'objectif
    success, error_detail = print_status(response_create, "Créer Objective", expected_code=201)
    if not success:
        return False, f"Création Objective échouée: {error_detail}"
    objective_id = response_create.json().get("id")
    objective_id_holder["id"] = objective_id
    print(f"  ID Objective créé: {objective_id}")

    # Lire Objective
    response_get = requests.get(f"{BASE_URL}/objectives/{objective_id}")
    success, error_detail = print_status(response_get, f"Lire Objective ID {objective_id}")
    if success:
        print(f"  Données reçues: {response_get.json()}")
    else:
        return False, f"Lecture Objective {objective_id} échouée: {error_detail}"

    # Lire tous les Objectives
    response_get_all = requests.get(f"{BASE_URL}/objectives")
    success, error_detail = print_status(response_get_all, "Lire tous les Objectives")
    if success:
        all_objectives = response_get_all.json()
        found = any(o.get('id') == objective_id for o in all_objectives)
        print(f"  Objective {objective_id} trouvée dans la liste: {found}")
        if not found:
            return False, f"Objective {objective_id} non trouvé dans la liste après création."
    else:
        return False, f"Lecture de tous les objectifs échouée: {error_detail}"

    # Mettre à jour Objective
    update_data = {"description": f"Tester la compréhension orale A1 - Modifié - {UNIQUE_SUFFIX}"}
    response_update = requests.put(f"{BASE_URL}/objectives/{objective_id}", headers=HEADERS, json=update_data)
    success, error_detail = print_status(response_update, f"Mettre à jour Objective ID {objective_id}")
    if not success:
        return False, f"Mise à jour Objective {objective_id} échouée: {error_detail}"

    # Vérifier la mise à jour
    response_check = requests.get(f"{BASE_URL}/objectives/{objective_id}")
    if response_check.status_code == 200:
        updated_desc = response_check.json().get('description')
        if updated_desc == update_data["description"]:
            print(f"  Nouvelle description vérifiée: {updated_desc}")
        else:
            error_msg = f"Échec vérification MàJ Objective {objective_id}. Attendu: {update_data['description']}, Reçu: {updated_desc}"
            print(f"! {error_msg}")
            return False, error_msg
    else:
        error_msg = f"Impossible de vérifier la MàJ Objective {objective_id}. Statut: {response_check.status_code}"
        print(f"! {error_msg}")
        return False, error_msg

    return True, None # Retourne succès
