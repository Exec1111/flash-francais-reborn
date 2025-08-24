#!/usr/bin/env python3
"""
Script de test pour vérifier la génération de séances simplifiée
"""

import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

def test_simplified_session_generation():
    """Test de la génération de séances avec la structure simplifiée"""

    print("=== TEST DE GÉNÉRATION DE SÉANCES SIMPLIFIÉE ===")
    print("=" * 60)

    try:
        from ai.prompts.prompt_generator import PromptGenerator

        # Créer un générateur de prompt
        prompt_gen = PromptGenerator("session_generator")

        # Paramètres de test
        params = {
            "nombre_seances": "2",
            "niveau": "5ème",
            "titre_sequence": "Test séquence simplifiée",
            "description_sequence": "Séquence de test pour la structure simplifiée",
            "study_objects": [{
                "id": 11,
                "title": "Test objet d'étude",
                "description": "Description de test",
                "oeuvres": [
                    {"id": 22, "titre": "La Peur", "auteur_complet": "Guy de Maupassant"},
                    {"id": 23, "titre": "Dr Jekyll", "auteur_complet": "Robert Louis Stevenson"}
                ]
            }],
            "objectifs": [
                {"id": 1, "title": "Test objectif 1", "description": "Description test 1"},
                {"id": 2, "title": "Test objectif 2", "description": "Description test 2"}
            ],
            "instructions_personnalisees": "Test de la structure simplifiée"
        }

        print("\n1. GÉNÉRATION DU PROMPT")
        print("-" * 30)

        system_prompt, user_prompt = prompt_gen.build(**params)

        print("[OK] Prompt genere avec succes")
        print(f"Longueur du prompt utilisateur: {len(user_prompt)} caracteres")

        # Verifications du prompt
        checks = []

        # Verifier que les IDs des oeuvres sont presents
        if "(ID: 22)" in user_prompt and "(ID: 23)" in user_prompt:
            print("[OK] IDs des oeuvres presentes dans le prompt")
            checks.append(True)
        else:
            print("[ERROR] IDs des oeuvres manquantes dans le prompt")
            checks.append(False)

        # Verifier que les instructions simplifiees sont presentes
        if "Génère 2 séance(s) avec les informations essentielles" in user_prompt:
            print("[OK] Instructions simplifiees presentes")
            checks.append(True)
        else:
            print("[ERROR] Instructions simplifiees manquantes")
            print("Contenu du prompt (extrait):")
            # Chercher la partie qui contient les instructions
            lines = user_prompt.split('\n')
            for i, line in enumerate(lines):
                if "Génère" in line and "séance" in line:
                    print(f"  Ligne {i}: {line}")
                    break

            # Afficher plus de contexte autour de cette zone
            print("Contexte autour de la generation:")
            for i, line in enumerate(lines):
                if "Génère" in line or "séance" in line or "essentielles" in line:
                    print(f"  Ligne {i}: {line}")

            checks.append(False)

        # Verifier que les exercices et lecons ne sont plus demandes
        if "exercices" not in user_prompt.lower() and "lecons" not in user_prompt.lower():
            print("[OK] Plus de demande d'exercices ou lecons detailles")
            checks.append(True)
        else:
            print("[ERROR] Exercices ou lecons encore presents dans le prompt")
            checks.append(False)

        print("\n2. VALIDATION DU SCHÉMA JSON")
        print("-" * 30)

        # Vérifier que le schéma ne demande plus exercises et lessons
        import json
        schema_path = Path(__file__).parent / "ai/prompts/config/schemas/session_generator.schema.json"
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)

        # Vérifier la structure du schéma
        session_props = schema['properties']['sessions']['items']['properties']
        required_fields = schema['properties']['sessions']['items']['required']

        print(f"Propriétés de session: {list(session_props.keys())}")
        print(f"Champs requis: {required_fields}")

        # Verifications du schema
        if 'exercises' not in session_props and 'lessons' not in session_props:
            print("[OK] Schema ne demande plus exercises et lessons")
            checks.append(True)
        else:
            print("[ERROR] Schema contient encore exercises ou lessons")
            checks.append(False)

        if 'notes' in session_props and 'notes' in required_fields:
            print("[OK] Schema inclut notes comme champ requis")
            checks.append(True)
        else:
            print("[ERROR] Schema ne gere pas correctement le champ notes")
            checks.append(False)

        if 'oeuvre_ids' in session_props and 'oeuvre_ids' in required_fields:
            print("[OK] Schema inclut oeuvre_ids comme champ requis")
            checks.append(True)
        else:
            print("[ERROR] Schema ne gere pas correctement oeuvre_ids")
            checks.append(False)

        print("\n3. RÉSUMÉ DES VÉRIFICATIONS")
        print("-" * 30)

        success_count = sum(checks)
        total_checks = len(checks)

        print(f"Résultat: {success_count}/{total_checks} vérifications réussies")

        if success_count == total_checks:
            print("\n[SUCCESS] SUCCES ! La structure de generation de seances a ete simplifiee avec succes.")
            print("\n[OK] Modifications appliquees :")
            print("   - Suppression des exercices detailles")
            print("   - Suppression des lecons detailles")
            print("   - Focus sur les informations essentielles")
            print("   - Structure JSON simplifiee")
            print("   - Prompt plus concis et direct")

            return True
        else:
            print(f"\n[ERROR] ECHEC : {total_checks - success_count} verifications ont echoue")
            return False

    except Exception as e:
        print(f"[ERROR] Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print(">>> Test de la génération de séances simplifiée")
    print("=" * 55)

    success = test_simplified_session_generation()

    if success:
        print("\n[SUCCESS] TOUS LES TESTS REUSSIS !")
        print("La generation de seances est maintenant simplifiee et optimisee.")
        sys.exit(0)
    else:
        print("\n[ERROR] CERTAINS TESTS ONT ECHOUE")
        print("La simplification de la generation de seances n'est pas complete.")
        sys.exit(1)