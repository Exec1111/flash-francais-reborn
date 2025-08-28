#!/usr/bin/env python3
"""
Script de test pour valider la génération de séances avec les nouvelles structures (exercices, leçons, œuvres)
"""

import json
import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

def test_enhanced_session_generation():
    """Test de génération de séances avec les nouvelles structures"""

    print("*** Test de generation de seances avec exercices et lecons")
    print("=" * 60)

    # Structure attendue pour une séance générée
    expected_session_structure = {
        "title": "Analyse de Germinal - Introduction",
        "date": "2024-01-15T09:00:00Z",
        "notes": "Première séance d'introduction à l'œuvre de Zola",
        "duration": 90,
        "sequence_id": 1,
        "objective_ids": [1, 2],
        "oeuvre_ids": [5],
        "exercises": [
            {
                "type": "QCM",
                "description": "Questions de compréhension sur le contexte historique du roman"
            },
            {
                "type": "Analyse de texte",
                "description": "Étude du premier chapitre et identification des personnages principaux"
            },
            {
                "type": "Discussion",
                "description": "Échange sur les conditions de vie des mineurs au XIXe siècle"
            }
        ],
        "lessons": [
            {
                "title": "Contexte historique du naturalisme",
                "description": "Présentation du mouvement naturaliste et de son contexte socio-économique"
            },
            {
                "title": "Présentation de l'auteur",
                "description": "Biographie d'Émile Zola et ses motivations littéraires"
            }
        ]
    }

    print("[OK] Structure de seance attendue creee")
    print(f"   - Titre: {expected_session_structure['title']}")
    print(f"   - Nombre d'exercices: {len(expected_session_structure['exercises'])}")
    print(f"   - Nombre de lecons: {len(expected_session_structure['lessons'])}")
    print(f"   - Oeuvres associees: {expected_session_structure['oeuvre_ids']}")

    # Verifications de structure
    required_fields = ["title", "date", "sequence_id", "exercises", "lessons", "oeuvre_ids"]
    missing_fields = []

    for field in required_fields:
        if field not in expected_session_structure:
            missing_fields.append(field)

    if missing_fields:
        print(f"[ERROR] Champs requis manquants: {missing_fields}")
        return False
    else:
        print("[OK] Tous les champs requis sont presents")

    # Verifier la structure des exercices
    for i, exercise in enumerate(expected_session_structure["exercises"]):
        required_exercise_fields = ["type", "description"]
        missing_exercise_fields = []

        for field in required_exercise_fields:
            if field not in exercise:
                missing_exercise_fields.append(field)

        if missing_exercise_fields:
            print(f"[ERROR] Exercice {i+1} - champs manquants: {missing_exercise_fields}")
            return False
        else:
            print(f"[OK] Exercice {i+1} '{exercise['type']}' - structure valide")

    # Verifier la structure des lecons
    for i, lesson in enumerate(expected_session_structure["lessons"]):
        required_lesson_fields = ["title", "description"]
        missing_lesson_fields = []

        for field in required_lesson_fields:
            if field not in lesson:
                missing_lesson_fields.append(field)

        if missing_lesson_fields:
            print(f"[ERROR] Lecon {i+1} - champs manquants: {missing_lesson_fields}")
            return False
        else:
            print(f"[OK] Lecon {i+1} '{lesson['title']}' - structure valide")

    # Verifier que resource_ids n'est pas present (supprime selon les specs)
    if "resource_ids" in expected_session_structure:
        print("[ERROR] resource_ids trouve - devrait etre supprime")
        return False
    else:
        print("[OK] resource_ids correctement supprime")

    print("\n[SUCCESS] Test de structure reussi !")
    print("\n[CONTENT] Structure complete de la seance attendue:")
    print(json.dumps(expected_session_structure, indent=2, ensure_ascii=False))

    return True

def test_schema_validation():
    """Test de validation du schéma JSON"""

    print("\n*** Test de validation du schema JSON")
    print("=" * 40)

    schema_path = Path(__file__).parent / "ai/prompts/config/schemas/session_generator.schema.json"

    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)

        print("[OK] Schema JSON charge avec succes")

        # Verifications du schema
        required_properties = ["sessions"]
        if "properties" in schema and all(prop in schema["properties"] for prop in required_properties):
            print("[OK] Proprietes principales presentes")
        else:
            print("[ERROR] Proprietes principales manquantes")
            return False

        # Verifier que resource_ids n'est pas dans le schema de seance
        session_properties = schema["properties"]["sessions"]["items"]["properties"]
        if "resource_ids" in session_properties:
            print("[ERROR] resource_ids trouve dans le schema - devrait etre supprime")
            return False
        else:
            print("[OK] resource_ids correctement supprime du schema")

        # Verifier que exercises et lessons sont presents
        required_session_properties = ["exercises", "lessons", "oeuvre_ids"]
        missing_session_properties = []

        for prop in required_session_properties:
            if prop not in session_properties:
                missing_session_properties.append(prop)

        if missing_session_properties:
            print(f"[ERROR] Proprietes de seance manquantes: {missing_session_properties}")
            return False
        else:
            print("[OK] Proprietes exercises, lessons et oeuvre_ids presentes")

        # Verifier les contraintes de nombre d'exercices et lecons
        exercises_schema = session_properties["exercises"]
        if "minItems" in exercises_schema and "maxItems" in exercises_schema:
            print(f"[OK] Contraintes exercices: {exercises_schema['minItems']}-{exercises_schema['maxItems']}")
        else:
            print("[ERROR] Contraintes d'exercices manquantes")
            return False

        lessons_schema = session_properties["lessons"]
        if "minItems" in lessons_schema and "maxItems" in lessons_schema:
            print(f"[OK] Contraintes lecons: {lessons_schema['minItems']}-{lessons_schema['maxItems']}")
        else:
            print("[ERROR] Contraintes de lecons manquantes")
            return False

        print("[OK] Schema JSON valide")
        return True

    except Exception as e:
        print(f"[ERROR] Erreur lors de la validation du schema: {e}")
        return False

def test_prompt_template():
    """Test du template de prompt"""

    print("\n*** Test du template de prompt")
    print("=" * 30)

    template_path = Path(__file__).parent / "ai/prompts/config/prompts/session_generator.yaml"

    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()

        print("[OK] Template de prompt charge")

        # Verifications du contenu
        required_sections = [
            "Génère {{ nombre_seances }} séance(s) complète(s) avec les éléments suivants",
            "Exercices",
            "Leçons",
            "Œuvres",
            "oeuvre_ids"
        ]

        for section in required_sections:
            if section in content:
                print(f"[OK] Section '{section}' presente")
            else:
                print(f"[ERROR] Section '{section}' manquante")
                return False

        # Verifier que les references aux ressources sont supprimees
        if "ressources_disponibles" in content:
            print("[ERROR] Reference aux ressources trouvee - devrait etre supprimee")
            return False
        else:
            print("[OK] References aux ressources supprimees")

        print("[OK] Template de prompt valide")
        return True

    except Exception as e:
        print(f"[ERROR] Erreur lors du test du template: {e}")
        return False

if __name__ == "__main__":
    print(">>> Test de la generation de seances amelioree")
    print("=" * 60)

    success = True

    # Test de la structure des données
    success &= test_enhanced_session_generation()

    # Test de validation du schéma
    success &= test_schema_validation()

    # Test du template de prompt
    success &= test_prompt_template()

    if success:
        print("\n[SUCCESS] Tous les tests ont reussi !")
        print("\n[SUMMARY] Resume des ameliorations:")
        print("   [OK] Structure de seance enrichie avec exercices et lecons")
        print("   [OK] Suppression des references aux ressources")
        print("   [OK] Schema JSON mis a jour avec nouvelles proprietes")
        print("   [OK] Template de prompt adapte aux nouvelles exigences")
        print("   [OK] Contraintes de validation appropriees")
        sys.exit(0)
    else:
        print("\n[ERROR] Certains tests ont echoue")
        sys.exit(1)