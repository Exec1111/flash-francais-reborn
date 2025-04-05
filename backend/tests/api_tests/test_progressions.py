import requests
from ..utils import BASE_URL, HEADERS, UNIQUE_SUFFIX, print_status

def test_progressions(progression_id_holder):
    """Teste les endpoints CRUD pour Progression et met à jour progression_id_holder."""
    print("\n--- Test des Progressions ---")
    progression_data = {
        "title": f"Test Progression A1 - {UNIQUE_SUFFIX}",
        "description": "Progression de test pour le niveau A1"
    }
    response_create = requests.post(f"{BASE_URL}/progressions", headers=HEADERS, json=progression_data)
    success, error_detail = print_status(response_create, "Créer Progression")
    if not success:
        return False, f"Création Progression échouée: {error_detail}" # Retourne échec et détail
    progression_id = response_create.json().get("id")
    progression_id_holder["id"] = progression_id
    print(f"  ID Progression créée: {progression_id}")

    # Lire Progression
    response_get = requests.get(f"{BASE_URL}/progressions/{progression_id}")
    success, error_detail = print_status(response_get, f"Lire Progression ID {progression_id}")
    if success:
        print(f"  Données reçues: {response_get.json()}")
    else:
        return False, f"Lecture Progression {progression_id} échouée: {error_detail}"

    # Lire toutes les Progressions
    response_get_all = requests.get(f"{BASE_URL}/progressions")
    success, error_detail = print_status(response_get_all, "Lire toutes les Progressions")
    if success:
        all_progressions = response_get_all.json()
        found = any(p.get('id') == progression_id for p in all_progressions)
        print(f"  Progression {progression_id} trouvée dans la liste: {found}")
        if not found:
             return False, f"Progression {progression_id} non trouvée dans la liste après création."
    else:
        return False, f"Lecture de toutes les progressions échouée: {error_detail}"

    # Mettre à jour Progression
    update_data = {"title": f"Test Progression A1 - Modifié - {UNIQUE_SUFFIX}"}
    response_update = requests.put(f"{BASE_URL}/progressions/{progression_id}", headers=HEADERS, json=update_data)
    success, error_detail = print_status(response_update, f"Mettre à jour Progression ID {progression_id}")
    if not success:
         return False, f"Mise à jour Progression {progression_id} échouée: {error_detail}"

    # Vérifier la mise à jour
    response_check = requests.get(f"{BASE_URL}/progressions/{progression_id}")
    if response_check.status_code == 200:
        updated_title = response_check.json().get('title')
        if updated_title == update_data["title"]:
            print(f"  Nouveau titre vérifié: {updated_title}")
        else:
            error_msg = f"Échec vérification MàJ Progression {progression_id}. Attendu: {update_data['title']}, Reçu: {updated_title}"
            print(f"! {error_msg}")
            return False, error_msg
    else:
        error_msg = f"Impossible de vérifier la MàJ Progression {progression_id}. Statut: {response_check.status_code}"
        print(f"! {error_msg}")
        return False, error_msg

    return True, None # Retourne succès si tout s'est bien passé
