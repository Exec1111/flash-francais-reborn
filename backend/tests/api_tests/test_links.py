import requests
from ..utils import BASE_URL, HEADERS, print_status

def test_session_objective_link(session_id, objective_id):
    """Teste l'association et la dissociation d'un objectif à une session."""
    if session_id is None or objective_id is None:
        print("\n! Skipping Session-Objective Link tests: IDs manquants.")
        # Considérer False car le test n'a pas pu être exécuté
        return False, "IDs manquants pour le test de liaison Session-Objective."

    print(f"\n--- Test Lien Session ({session_id}) <-> Objective ({objective_id}) ---")
    session_url = f"{BASE_URL}/sessions/{session_id}"

    # 1. Vérifier avant liaison
    response_read = requests.get(session_url, headers=HEADERS)
    success, error_detail = print_status(response_read, f"Lire Session {session_id} avant liaison")
    if not success:
        return False, f"Lecture Session {session_id} avant liaison échouée: {error_detail}"

    initial_objectives = response_read.json().get("objectives", [])
    if any(obj.get('id') == objective_id for obj in initial_objectives):
        error_msg = f"Erreur Initiale: Objective {objective_id} déjà lié à Session {session_id}."
        print(f"! {error_msg}")
        return False, error_msg
    else:
        print(f"  Vérification initiale OK: Objective {objective_id} non lié.")

    # 2. Associer l'objectif
    link_data = {"objective_ids": [objective_id]}
    response_link = requests.put(session_url, headers=HEADERS, json=link_data)
    success, error_detail = print_status(response_link, f"Lier Objective {objective_id} à Session {session_id}")
    if not success:
        return False, f"Liaison Objective {objective_id} échouée: {error_detail}"

    # 3. Vérifier après liaison
    response_check_link = requests.get(session_url, headers=HEADERS)
    if response_check_link.status_code == 200:
        session_data_after = response_check_link.json()
        print(f"  Données Session après liaison: {session_data_after}")
        linked_objectives_after = session_data_after.get("objectives", [])
        if any(obj.get('id') == objective_id for obj in linked_objectives_after):
            print(f"  Vérification liaison OK: Objective {objective_id} trouvé dans la session.")
        else:
            error_msg = f"Échec Vérification Liaison: Objective {objective_id} non trouvé après tentative."
            print(f"! {error_msg}")
            return False, error_msg
    else:
        error_msg = f"Impossible de vérifier la liaison pour Session {session_id}. Statut: {response_check_link.status_code}"
        print(f"! {error_msg}")
        return False, error_msg

    # 4. Dissocier l'objectif
    unlink_data = {"objective_ids": []}
    response_unlink = requests.put(session_url, headers=HEADERS, json=unlink_data)
    success, error_detail = print_status(response_unlink, f"Délier Objective {objective_id} de Session {session_id}")
    if not success:
        return False, f"Dissociation Objective {objective_id} échouée: {error_detail}"

    # 5. Vérifier après dissociation
    response_check_unlink = requests.get(session_url, headers=HEADERS)
    success, error_detail = print_status(response_check_unlink, f"Lire Session {session_id} après dissociation")
    if not success:
         return False, f"Lecture Session {session_id} après dissociation échouée: {error_detail}"

    final_objectives = response_check_unlink.json().get("objectives", [])
    if not any(obj.get('id') == objective_id for obj in final_objectives):
        print(f"  Vérification dissociation OK: Objective {objective_id} n'est plus lié.")
    else:
        error_msg = f"Échec Vérification Dissociation: Objective {objective_id} toujours lié."
        print(f"! {error_msg}")
        return False, error_msg

    return True, None # Retourne succès
