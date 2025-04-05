import requests
from ..utils import BASE_URL, HEADERS, UNIQUE_SUFFIX, print_status

def test_resources(session_id, resource_id_holder):
    """Teste les endpoints CRUD pour Resource et met à jour resource_id_holder."""
    if session_id is None:
        print("\n! Skipping Resource tests: Session ID manquant.")
        return False, "Session ID manquant pour tester les ressources."

    print(f"\n--- Test des Resources (pour Session ID: {session_id}) ---")
    resource_data = {
        "title": f"Ressource de Test Texte - {UNIQUE_SUFFIX}",
        "type": "text",
        "content": "Contenu de test pour la ressource texte",
        "session_id": session_id
    }
    response_create = requests.post(f"{BASE_URL}/resources", headers=HEADERS, json=resource_data)
    success, error_detail = print_status(response_create, "Créer Resource")
    if not success:
        return False, f"Création Resource échouée: {error_detail}"
    resource_id = response_create.json().get("id")
    resource_id_holder["id"] = resource_id
    print(f"  ID Resource créée: {resource_id}")

    # Lire Resource
    response_get = requests.get(f"{BASE_URL}/resources/{resource_id}")
    success, error_detail = print_status(response_get, f"Lire Resource ID {resource_id}")
    if success:
        print(f"  Données reçues: {response_get.json()}")
        if response_get.json().get("session_id") != session_id:
            error_msg = f"Erreur Lecture Resource {resource_id}: session_id ({response_get.json().get('session_id')}) != attendu ({session_id})"
            print(f"! {error_msg}")
            return False, error_msg
    else:
        return False, f"Lecture Resource {resource_id} échouée: {error_detail}"

    # Lire toutes les Resources
    response_get_all = requests.get(f"{BASE_URL}/resources") # TODO: Filtrer par session?
    success, error_detail = print_status(response_get_all, "Lire toutes les Resources")
    if success:
        all_resources = response_get_all.json()
        found = any(r.get('id') == resource_id for r in all_resources)
        print(f"  Resource {resource_id} trouvée dans la liste: {found}")
        if not found:
             return False, f"Resource {resource_id} non trouvée dans la liste après création."
    else:
        return False, f"Lecture de toutes les ressources échouée: {error_detail}"

    # Mettre à jour Resource
    update_data = {"content": f"Contenu de la ressource texte mis à jour - {UNIQUE_SUFFIX}."}
    response_update = requests.put(f"{BASE_URL}/resources/{resource_id}", headers=HEADERS, json=update_data)
    success, error_detail = print_status(response_update, f"Mettre à jour Resource ID {resource_id}")
    if not success:
        return False, f"Mise à jour Resource {resource_id} échouée: {error_detail}"

    # Vérifier la mise à jour
    response_check = requests.get(f"{BASE_URL}/resources/{resource_id}")
    if response_check.status_code == 200:
        updated_content = response_check.json().get('content')
        if updated_content == update_data["content"]:
            print(f"  Nouveau contenu vérifié: {updated_content}")
        else:
            error_msg = f"Échec vérification MàJ Resource {resource_id}. Attendu: {update_data['content']}, Reçu: {updated_content}"
            print(f"! {error_msg}")
            return False, error_msg
    else:
        error_msg = f"Impossible de vérifier la MàJ Resource {resource_id}. Statut: {response_check.status_code}"
        print(f"! {error_msg}")
        return False, error_msg

    return True, None # Retourne succès
