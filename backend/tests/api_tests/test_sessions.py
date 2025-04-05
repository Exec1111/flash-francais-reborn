import requests
from datetime import datetime
from ..utils import BASE_URL, HEADERS, UNIQUE_SUFFIX, print_status

def test_sessions(sequence_id, session_id_holder):
    """Teste les endpoints CRUD pour Session et met à jour session_id_holder."""
    if sequence_id is None:
        print("\n! Skipping Session tests: Sequence ID manquant.")
        return False, "Sequence ID manquant pour tester les sessions."

    print(f"\n--- Test des Sessions (pour Séquence ID: {sequence_id}) ---")
    session_data = {
        "title": f"Test Session 1 - {UNIQUE_SUFFIX}",
        "date": datetime.now().isoformat(),
        "notes": "Première session de test",
        "sequence_id": sequence_id
    }
    response_create = requests.post(f"{BASE_URL}/sessions", headers=HEADERS, json=session_data)
    success, error_detail = print_status(response_create, "Créer Session")
    if not success:
        return False, f"Création Session échouée: {error_detail}"
    session_id = response_create.json().get("id")
    session_id_holder["id"] = session_id
    print(f"  ID Session créée: {session_id}")

    # Lire Session
    response_get = requests.get(f"{BASE_URL}/sessions/{session_id}")
    success, error_detail = print_status(response_get, f"Lire Session ID {session_id}")
    if success:
        print(f"  Données reçues: {response_get.json()}")
        if response_get.json().get("sequence_id") != sequence_id:
            error_msg = f"Erreur Lecture Session {session_id}: sequence_id ({response_get.json().get('sequence_id')}) != attendu ({sequence_id})"
            print(f"! {error_msg}")
            return False, error_msg
    else:
        return False, f"Lecture Session {session_id} échouée: {error_detail}"

    # Lire toutes les Sessions
    response_get_all = requests.get(f"{BASE_URL}/sessions") # TODO: Filtrer par séquence?
    success, error_detail = print_status(response_get_all, "Lire toutes les Sessions")
    if success:
        all_sessions = response_get_all.json()
        found = any(s.get('id') == session_id for s in all_sessions)
        print(f"  Session {session_id} trouvée dans la liste: {found}")
        if not found:
            return False, f"Session {session_id} non trouvée dans la liste après création."
    else:
        return False, f"Lecture de toutes les sessions échouée: {error_detail}"

    # Mettre à jour Session
    update_data = {"notes": f"Notes de la session de test modifiées - {UNIQUE_SUFFIX}"}
    response_update = requests.put(f"{BASE_URL}/sessions/{session_id}", headers=HEADERS, json=update_data)
    success, error_detail = print_status(response_update, f"Mettre à jour Session ID {session_id}")
    if not success:
        return False, f"Mise à jour Session {session_id} échouée: {error_detail}"

    # Vérifier la mise à jour
    response_check = requests.get(f"{BASE_URL}/sessions/{session_id}")
    if response_check.status_code == 200:
        updated_notes = response_check.json().get('notes')
        if updated_notes == update_data["notes"]:
            print(f"  Nouvelles notes vérifiées: {updated_notes}")
        else:
            error_msg = f"Échec vérification MàJ Session {session_id}. Attendu: {update_data['notes']}, Reçu: {updated_notes}"
            print(f"! {error_msg}")
            return False, error_msg
    else:
        error_msg = f"Impossible de vérifier la MàJ Session {session_id}. Statut: {response_check.status_code}"
        print(f"! {error_msg}")
        return False, error_msg

    return True, None # Retourne succès
