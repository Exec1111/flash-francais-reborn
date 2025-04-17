"""
Test du service de génération de ressource AI, notamment pour le type QCM.
"""
import requests
import json
import pytest
from ...utils import BASE_URL, UNIQUE_SUFFIX, print_status

# --- Authentification dynamique ---
LOGIN_EMAIL = "julien.vachey@gmail.com"
LOGIN_PASSWORD = "aaaaaaaa"

def get_jwt_token():
    """Obtient un JWT valide via l'API de login."""
    login_url = f"{BASE_URL}/auth/token"
    payload = {
        "username": LOGIN_EMAIL,
        "password": LOGIN_PASSWORD
    }
    # Pour OAuth2PasswordRequestForm, il faut envoyer les données en x-www-form-urlencoded
    response = requests.post(login_url, data=payload)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception(f"Échec de l'authentification ({response.status_code}): {response.text}")

def get_auth_headers():
    token = get_jwt_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_ai_resource_types():
    """Teste l'endpoint qui liste les types de ressources AI disponibles."""
    print("\n--- Test de listage des types de ressources AI ---")
    
    headers = get_auth_headers()
    response = requests.get(f"{BASE_URL}/ai/resource-types", headers=headers)
    success, error_detail = print_status(response, "Lister les types de ressources AI")
    
    if not success:
        return False, f"Échec de récupération des types de ressources AI: {error_detail}"
    
    # Vérification que la réponse contient la structure attendue
    data = response.json()
    assert "types" in data, "La réponse devrait contenir un champ 'types'"
    
    # Vérification que le type 'exercice' et le sous-type 'qcm' sont disponibles
    assert "exercice" in data["types"], "Le type 'exercice' devrait être disponible"
    assert "subtypes" in data["types"]["exercice"], "Le type 'exercice' devrait avoir des sous-types"
    assert "qcm" in data["types"]["exercice"]["subtypes"], "Le sous-type 'qcm' devrait être disponible sous 'exercice'"
    
    print("  Types de ressources AI vérifiés avec succès")
    return True, None

def test_generate_qcm():
    """Teste la génération d'un QCM via l'API."""
    print("\n--- Test de génération d'un QCM via l'API ---")
    
    # Données pour la requête de génération
    qcm_request = {
        "type_key": "exercice",
        "subtype_key": "qcm",
        "variables": {
            "theme": "Les verbes du premier groupe au présent",
            "niveau": "A2",
            "objectif_pedagogique": "Maîtriser la conjugaison des verbes en -er",
            "nombre_questions": 3  # Limité à 3 pour réduire le temps de test
        }
    }
    
    headers = get_auth_headers()
    response = requests.post(
        f"{BASE_URL}/ai/generate-resource", 
        headers=headers, 
        json=qcm_request
    )
    
    success, error_detail = print_status(response, "Générer un QCM via l'API")
    
    if not success:
        return False, f"Échec de génération du QCM: {error_detail}"
    
    # Vérification que la réponse contient la structure attendue
    data = response.json()
    assert "content" in data, "La réponse devrait contenir un champ 'content'"
    
    # Vérification de la structure du QCM généré
    content = data["content"]
    assert "titre" in content, "Le QCM généré devrait avoir un titre"
    assert "description" in content, "Le QCM généré devrait avoir une description"
    assert "niveau" in content, "Le QCM généré devrait contenir le niveau"
    assert "questions" in content, "Le QCM généré devrait contenir des questions"
    assert len(content["questions"]) == 3, f"Le QCM devrait contenir 3 questions, mais en contient {len(content['questions'])}"
    
    # Vérification d'une question au hasard
    question = content["questions"][0]
    assert "id" in question, "La question devrait avoir un ID"
    assert "texte" in question, "La question devrait avoir un texte"
    assert "options" in question, "La question devrait avoir des options"
    assert len(question["options"]) == 4, "La question devrait avoir exactement 4 options"
    assert "reponse_correcte" in question, "La question devrait avoir une réponse correcte"
    
    print("  QCM généré et vérifié avec succès")
    print(f"  Titre du QCM: {content['titre']}")
    print(f"  Description: {content['description']}")
    print(f"  Nombre de questions: {len(content['questions'])}")
    
    return True, None

def test_ai_resource_integration(resource_id_holder):
    """
    Teste l'intégration de la génération de QCM avec la création de ressource.
    
    Cette fonction teste le workflow complet:
    1. Générer un QCM avec l'IA
    2. Créer une ressource avec le contenu généré
    3. Vérifier que la ressource a été créée correctement
    """
    print("\n--- Test d'intégration: génération de QCM + création de ressource ---")
    
    # 1. Générer un QCM avec l'IA
    qcm_request = {
        "type_key": "exercice",
        "subtype_key": "qcm",
        "variables": {
            "theme": "Les articles définis et indéfinis",
            "niveau": "A1",
            "objectif_pedagogique": "Comprendre l'utilisation des articles en français",
            "nombre_questions": 2  # Limité pour le test
        }
    }
    
    response_gen = requests.post(
        f"{BASE_URL}/ai/generate-resource", 
        headers=get_auth_headers(), 
        json=qcm_request
    )
    
    success, error_detail = print_status(response_gen, "Générer un QCM pour intégration")
    if not success:
        return False, f"Échec de génération du QCM pour intégration: {error_detail}"
    
    qcm_data = response_gen.json()["content"]
    
    # 2. Créer une ressource avec le contenu généré
    resource_form_data = {
        "title": f"QCM sur {qcm_data['theme']} - {UNIQUE_SUFFIX}",
        "description": qcm_data['description'],
        "type_id": 1,  # ID du type 'exercice' (à adapter selon votre base)
        "sub_type_id": 1,  # ID du sous-type 'qcm' (à adapter selon votre base)
        "source_type": "ai",
        "session_ids_json": "[]",
        "objective_ids_json": "[]",
        "ai_content_json": json.dumps(qcm_data)  # Stockage du contenu généré
    }
    
    response_create = requests.post(
        f"{BASE_URL}/resources/", 
        headers=get_auth_headers(), 
        data=resource_form_data, 
        files={'file': (None, '')}
    )
    
    success, error_detail = print_status(response_create, "Créer ressource avec contenu QCM généré")
    if not success:
        return False, f"Échec de création de ressource avec QCM: {error_detail}"
    
    # Récupérer l'ID de la ressource créée
    resource_id = response_create.json().get("id")
    resource_id_holder["id"] = resource_id
    print(f"  ID Ressource QCM créée: {resource_id}")
    
    # 3. Vérifier que la ressource a été créée correctement
    response_get = requests.get(f"{BASE_URL}/resources/{resource_id}")
    success, error_detail = print_status(response_get, f"Lire la ressource QCM {resource_id}")
    if not success:
        return False, f"Échec de lecture de la ressource QCM: {error_detail}"
    
    # Vérifier que le contenu AI a été correctement stocké
    resource_data = response_get.json()
    assert resource_data["source_type"] == "ai", "La ressource devrait être de source_type 'ai'"
    assert resource_data["title"].startswith(f"QCM sur {qcm_data['theme']}"), "Le titre de la ressource ne correspond pas"
    
    print("  Intégration QCM + ressource vérifiée avec succès")
    return True, None

if __name__ == "__main__":
    # Exécution manuelle des tests (utile pour le débogage)
    resource_id_holder = {"id": None}
    success, error = test_ai_resource_types()
    if success:
        success, error = test_generate_qcm()
    if success:
        success, error = test_ai_resource_integration(resource_id_holder)
    
    if error:
        print(f"\n! Erreur lors des tests: {error}")
    else:
        print("\n✓ Tous les tests ont réussi!")
