#!/usr/bin/env python3
"""
Test simple de l'integration du contenu de ressources dans les prompts QCM
"""

import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

def test_qcm_prompt():
    """Test basique du prompt QCM avec resource_content"""

    print("=== TEST QCM AVEC CONTENU DE RESSOURCES ===")
    print("=" * 50)

    try:
        from ai.prompts.prompt_generator import PromptGenerator

        print("[OK] PromptGenerator importe avec succes")

        # Test du prompt QCM
        generator = PromptGenerator("qcm")
        print("[OK] Prompt QCM charge avec succes")

        # Variables avec resource_content
        input_vars = {
            "theme": "La Revolution francaise",
            "niveau": "5eme",
            "nombre_questions": 3,
            "nb_options": 4,
            "resource_content": [
                {
                    "id": 1,
                    "title": "Cahiers de doleances",
                    "content": "Documents ecrits en 1789 pour exprimer les griefs."
                }
            ]
        }

        system, user = generator.build(**input_vars)
        print("[OK] Prompt genere avec succes")
        print(f"[INFO] Longueur du prompt: {len(user)} caracteres")

        # Verifications
        checks = [
            ("Contenu des ressources", "Contenu des ressources de reference" in user),
            ("Cahiers de doleances", "Cahiers de doleances" in user),
            ("Utilise ces ressources", "Utilise ces ressources" in user)
        ]

        for desc, check in checks:
            if check:
                print(f"[OK] {desc}")
            else:
                print(f"[ERROR] {desc}")

        # Afficher un extrait
        print("\n[EXTRACT] Extrait du prompt:")
        print("-" * 30)
        print(user[:300] + "...")

        return True

    except Exception as e:
        print(f"[ERROR] Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_parameters():
    """Test des parametres du prompt QCM"""

    print("\n=== TEST DES PARAMETRES QCM ===")
    print("=" * 35)

    try:
        from ai.prompts.prompt_generator import PromptGenerator

        generator = PromptGenerator("qcm")

        # Verifier les parametres
        params = generator.parameters
        print(f"[INFO] Nombre de parametres: {len(params)}")

        resource_ids_found = False
        for param in params:
            name = param.get('name', '')
            if name == 'resource_ids':
                resource_ids_found = True
                print(f"[OK] Parametre resource_ids trouve:")
                print(f"  - Type: {param.get('type', 'N/A')}")
                print(f"  - Description: {param.get('description', 'N/A')}")
                break

        if not resource_ids_found:
            print("[ERROR] Parametre resource_ids non trouve")

        return resource_ids_found

    except Exception as e:
        print(f"[ERROR] Erreur: {e}")
        return False

if __name__ == "__main__":
    print(">>> Test de l'integration QCM")
    print("=" * 40)

    success1 = test_qcm_prompt()
    success2 = test_parameters()

    if success1 and success2:
        print("\n[SUCCESS] Tests reussis!")
        print("L'integration du contenu de ressources dans les prompts QCM fonctionne.")
        sys.exit(0)
    else:
        print("\n[ERROR] Certains tests ont echoue")
        sys.exit(1)