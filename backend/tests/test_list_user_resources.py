#!/usr/bin/env python
import requests
import json

# --- Configuration ---
BASE_URL = "http://127.0.0.1:10000"  # Mise à jour du port
TOKEN_URL = f"{BASE_URL}/api/v1/auth/token" # Ajout du préfixe /api/v1/auth
RESOURCES_URL = f"{BASE_URL}/api/v1/resources/" # Ajout du préfixe /api/v1

USERNAME = "student2@example.com"
PASSWORD = "aa"
# ---------------------

def authenticate_user(username, password):
    """Authentifie l'utilisateur et retourne le jeton d'accès."""
    print(f"Attempting authentication for user: {username}...")
    try:
        response = requests.post(
            TOKEN_URL,
            data={"username": username, "password": password} # FastAPI attend les données du formulaire ici
        )
        response.raise_for_status()  # Lève une exception pour les codes d'erreur HTTP (4xx ou 5xx)
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            print("Error: 'access_token' not found in response.")
            return None
            
        print("Authentication successful!")
        return access_token
        
    except requests.exceptions.RequestException as e:
        print(f"Authentication failed: {e}")
        if response is not None:
            try:
                print(f"Server response: {response.json()}")
            except json.JSONDecodeError:
                print(f"Server response (non-JSON): {response.text}")
        return None

def get_user_resources(token):
    """Récupère les ressources de l'utilisateur authentifié."""
    print("Fetching resources...")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(RESOURCES_URL, headers=headers)
        response.raise_for_status()
        
        resources = response.json()
        print(f"Found {len(resources)} resources.")
        return resources
        
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch resources: {e}")
        if response is not None:
            try:
                print(f"Server response: {response.json()}")
            except json.JSONDecodeError:
                print(f"Server response (non-JSON): {response.text}")
        return None

if __name__ == "__main__":
    access_token = authenticate_user(USERNAME, PASSWORD)
    
    if access_token:
        user_resources = get_user_resources(access_token)
        
        if user_resources is not None:
            if user_resources:
                print("\n--- User Resources ---")
                for resource in user_resources:
                    # Afficher quelques informations clés (adaptez selon le schéma ResourceResponse)
                    print(f"- ID: {resource.get('id')}, Title: {resource.get('title')}, Source: {resource.get('source_type')}")
                    # print(json.dumps(resource, indent=2)) # Décommentez pour voir le JSON complet
                print("--------------------")
            else:
                print("No resources found for this user.")
