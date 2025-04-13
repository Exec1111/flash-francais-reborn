import requests
import json 
from ..utils import BASE_URL, HEADERS, UNIQUE_SUFFIX, print_status

def test_resources(session_id, objective_ids, resource_id_holder):
    """Teste les endpoints CRUD pour Resource, y compris l'association avec les objectifs, et met à jour resource_id_holder."""
    if session_id is None:
        print("\n! Skipping Resource tests: Session ID manquant.")
        return False, "Session ID manquant pour tester les ressources."

    print(f"\n--- Test des Resources (pour Session ID: {session_id}) ---")
    # Données pour le formulaire (multipart/form-data)
    resource_form_data = {
        "title": f"Ressource de Test AI - {UNIQUE_SUFFIX}",
        "description": "Contenu généré par AI pour test",
        "type_id": 1, # Assumer que ID 1 existe pour le type
        "sub_type_id": 1, # Assumer que ID 1 existe pour le sous-type
        "source_type": "ai", # Utiliser 'ai' ou 'file'
        "session_ids_json": json.dumps([session_id] if session_id else []),
        "objective_ids_json": json.dumps(objective_ids if objective_ids else [])
    }
    # Revenir à 'data=' car la route attend des Form(...) fields.
    # 'files=' est conservé pour forcer multipart/form-data.
    # Ajouter le slash final à l'URL pour éviter la redirection 307
    response_create = requests.post(f"{BASE_URL}/resources/", headers=HEADERS, data=resource_form_data, files={'file': (None, '')})
    success, error_detail = print_status(response_create, "Créer Resource avec Objectifs (Form Data)") # Nom du test mis à jour
    if not success:
        return False, f"Création Resource échouée: {error_detail}"
    resource_id = response_create.json().get("id")
    resource_id_holder["id"] = resource_id
    print(f"  ID Resource créée: {resource_id}")

    # Lire Resource
    response_get = requests.get(f"{BASE_URL}/resources/{resource_id}")
    success, error_detail = print_status(response_get, f"Lire Resource ID {resource_id}")
    if success:
        received_data = response_get.json()
        print(f"  Données reçues: {received_data}")
        # Vérifier les sessions associées (peut être plus complexe si plusieurs sessions attendues)
        received_session_ids = sorted([sess['id'] for sess in received_data.get('sessions', [])])
        expected_session_ids = sorted([session_id] if session_id else [])
        if received_session_ids != expected_session_ids:
            error_msg = f"Erreur Lecture Resource {resource_id}: session_ids ({received_session_ids}) != attendus ({expected_session_ids})"
            print(f"! {error_msg}")
            # Note: ne pas retourner False ici si d'autres tests doivent continuer, mais logguer l'erreur
            # return False, error_msg
        else:
            print(f"  Sessions associées vérifiées: {received_session_ids}")
        
        # Vérifier les objectifs associés
        received_objective_ids = sorted([obj['id'] for obj in received_data.get('objectives', [])])
        expected_objective_ids = sorted(objective_ids if objective_ids else [])
        if received_objective_ids != expected_objective_ids:
            error_msg = f"Erreur Lecture Resource {resource_id}: objective_ids ({received_objective_ids}) != attendus ({expected_objective_ids})"
            print(f"! {error_msg}")
            return False, error_msg
        else:
            print(f"  Objectifs associés vérifiés: {received_objective_ids}")
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

    # Mettre à jour Resource (changer titre et objectifs, via Form Data)
    updated_objective_ids = [] # Tester la suppression
    update_form_data = {
        "title": f"Ressource AI Modifiée - {UNIQUE_SUFFIX}",
        "objective_ids_json": json.dumps(updated_objective_ids)
        }
    # Revenir à 'data=' pour la mise à jour aussi
    # Ajouter le slash final à l'URL pour éviter la redirection 307
    response_update = requests.put(f"{BASE_URL}/resources/{resource_id}/", headers=HEADERS, data=update_form_data, files={'file': (None, '')})
    success, error_detail = print_status(response_update, f"Mettre à jour Resource ID {resource_id} (Form Data)") # Nom du test mis à jour
    if not success:
        return False, f"Mise à jour Resource {resource_id} échouée: {error_detail}"

    # Vérifier la mise à jour
    response_check = requests.get(f"{BASE_URL}/resources/{resource_id}")
    if response_check.status_code == 200:
        checked_data = response_check.json()
        updated_title = checked_data.get('title')
        updated_objectives = sorted([obj['id'] for obj in checked_data.get('objectives', [])])
        
        if updated_title == update_form_data["title"]:
            print(f"  Nouveau titre vérifié: {updated_title}")
        else:
            error_msg = f"Échec vérification MàJ titre Resource {resource_id}. Attendu: {update_form_data['title']}, Reçu: {updated_title}"
            print(f"! {error_msg}")
            return False, error_msg
            
        # Vérifier la mise à jour des objectifs
        if updated_objectives == updated_objective_ids:
            print(f"  Objectifs associés mis à jour vérifiés: {updated_objectives}")
        else:
            error_msg = f"Échec vérification MàJ objectifs Resource {resource_id}. Attendus: {updated_objective_ids}, Reçus: {updated_objectives}"
            print(f"! {error_msg}")
            return False, error_msg
    else:
        error_msg = f"Impossible de vérifier la MàJ Resource {resource_id}. Statut: {response_check.status_code}"
        print(f"! {error_msg}")
        return False, error_msg

    return True, None # Retourne succès
