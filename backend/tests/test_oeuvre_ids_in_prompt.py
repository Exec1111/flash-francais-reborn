#!/usr/bin/env python3
"""
Script de test pour valider que les IDs des œuvres sont bien inclus dans le prompt
"""

import json
import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

def test_oeuvre_ids_in_prompt():
    """Test que les IDs des œuvres sont bien inclus dans le prompt"""

    print("*** Test des IDs d'oeuvres dans le prompt")
    print("=" * 50)

    # Créer des données d'exemple avec des IDs
    sample_oeuvres = [
        {
            "id": 5,
            "titre": "Germinal",
            "auteur_complet": "Émile Zola",
            "type": "roman",
            "genre": "naturaliste",
            "date_publication": 1885,
            "mouvement_litteraire": "Naturalisme",
            "langue_originale": "Français",
            "resume": "Roman sur la vie des mineurs dans le nord de la France au XIXe siècle",
            "themes": "conditions de travail, lutte sociale, misère, exploitation",
            "mots_cles": "mine, grève, pauvreté, solidarité",
            "niveau_recommande": "B1",
            "domaines_programme": "littérature, histoire, sociologie",
            "difficulte": "intermédiaire",
            "extrait": "Les mineurs descendaient dans la fosse...",
            "tags": ["naturalisme", "19ème siècle", "conditions sociales", "lutte ouvrière"]
        },
        {
            "id": 8,
            "titre": "Le Père Goriot",
            "auteur_complet": "Honoré de Balzac",
            "type": "roman",
            "genre": "réaliste",
            "date_publication": 1835,
            "mouvement_litteraire": "Réalisme",
            "langue_originale": "Français",
            "resume": "Histoire d'un père sacrifiant tout pour ses filles ingrates",
            "themes": "ambition, argent, famille, société parisienne",
            "mots_cles": "père, sacrifice, ingratitude, ascension sociale",
            "niveau_recommande": "B1",
            "domaines_programme": "littérature, société, psychologie",
            "difficulte": "intermédiaire",
            "extrait": "Le père Goriot, vieil homme usé par les sacrifices...",
            "mots_cles": "père, sacrifice, ingratitude, ascension sociale",
            "tags": ["réalisme", "19ème siècle", "famille", "argent"]
        }
    ]

    sample_study_objects = [
        {
            "id": 1,
            "title": "Le Naturalisme en littérature",
            "description": "Étude du mouvement naturaliste à travers ses œuvres représentatives et son contexte historique",
            "oeuvres": sample_oeuvres[:1]  # Germinal seulement
        },
        {
            "id": 2,
            "title": "La société française du XIXe siècle",
            "description": "Analyse de la société française à travers les romans du XIXe siècle",
            "oeuvres": sample_oeuvres  # Les deux œuvres
        }
    ]

    # Paramètres de génération
    params = {
        "nombre_seances": "2",
        "niveau": "5ème",
        "titre_sequence": "Le roman français du XIXe siècle",
        "description_sequence": "Découverte des grands romans français du XIXe siècle",
        "study_objects": sample_study_objects,
        "objectifs": [
            {"id": 1, "title": "Analyser les personnages", "description": "Identifier et caractériser les personnages principaux"},
            {"id": 2, "title": "Comprendre le contexte historique", "description": "Situer l'œuvre dans son contexte socio-historique"}
        ],
        "instructions_personnalisees": "Mettre l'accent sur l'analyse des conditions sociales"
    }

    try:
        # Générer le prompt
        from ai.prompts.prompt_generator import PromptGenerator

        prompt_gen = PromptGenerator("session_generator")
        system_prompt, user_prompt = prompt_gen.build(**params)

        print("[OK] Prompt genere avec succes !")
        print("\n[CONTENT] Contenu du prompt utilisateur :")
        print("-" * 40)
        print(user_prompt)
        print("-" * 40)

        # Verifications des IDs
        print("\n[CHECK] Verifications des IDs d'oeuvres :")

        # Verifier que les IDs des oeuvres sont presents
        oeuvre_id_checks = []
        for oeuvre in sample_oeuvres:
            oeuvre_id = oeuvre["id"]
            oeuvre_title = oeuvre["titre"]
            expected_text = f"{oeuvre_title} par {oeuvre['auteur_complet']} (ID: {oeuvre_id})"

            if expected_text in user_prompt:
                print(f"[OK] Oeuvre {oeuvre_id} '{oeuvre_title}' - ID correctement inclus")
                oeuvre_id_checks.append(True)
            else:
                print(f"[ERROR] Oeuvre {oeuvre_id} '{oeuvre_title}' - ID manquant")
                oeuvre_id_checks.append(False)

        # Verifier que les IDs des objets d'etude sont presents
        study_object_checks = []
        for study_object in sample_study_objects:
            study_object_id = study_object["id"]
            study_object_title = study_object["title"]
            expected_text = f"{study_object_title} (ID: {study_object_id})"

            if expected_text in user_prompt:
                print(f"[OK] Objet d'etude {study_object_id} '{study_object_title}' - ID correctement inclus")
                study_object_checks.append(True)
            else:
                print(f"[ERROR] Objet d'etude {study_object_id} '{study_object_title}' - ID manquant")
                study_object_checks.append(False)

        # Verifier que les IDs des objectifs sont presents
        objective_checks = []
        for objectif in params["objectifs"]:
            objectif_id = objectif["id"]
            objectif_title = objectif["title"]
            # Le format dans le prompt est : - titre (ID: id, Description: description)
            expected_text = f"{objectif_title} (ID: {objectif_id}, Description:"

            if expected_text in user_prompt:
                print(f"[OK] Objectif {objectif_id} '{objectif_title}' - ID correctement inclus")
                objective_checks.append(True)
            else:
                print(f"[ERROR] Objectif {objectif_id} '{objectif_title}' - ID manquant")
                print(f"      Recherché: '{expected_text}'")
                objective_checks.append(False)

        # Verifier la section des oeuvres dans la sortie attendue
        if "La liste des IDs des œuvres qui seront exploitées" in user_prompt:
            print("[OK] Section 'oeuvre_ids' presente dans les instructions")
        else:
            print("[ERROR] Section 'oeuvre_ids' manquante dans les instructions")

        # Résumé
        all_checks = oeuvre_id_checks + study_object_checks + objective_checks
        success_count = sum(all_checks)
        total_checks = len(all_checks)

        print(f"\n[SUMMARY] Resume : {success_count}/{total_checks} verifications reussies")

        if success_count == total_checks:
            print("\n[SUCCESS] Test reussi ! Tous les IDs sont correctement inclus dans le prompt.")
            print("\n[EXAMPLE] Exemple de ce que l'IA verra :")
            print("- Germinal par Emile Zola (ID: 5)")
            print("- Le Pere Goriot par Honore de Balzac (ID: 8)")
            print("- Et pourra repondre avec : oeuvre_ids: [5, 8]")
            return True
        else:
            print(f"\n[ERROR] Test echoue : {total_checks - success_count} IDs manquants")
            return False

    except Exception as e:
        print(f"[ERROR] Erreur lors de la generation du prompt : {e}")
        import traceback
        traceback.print_exc()
        return False

def test_prompt_structure():
    """Test de la structure du prompt"""

    print("\n*** Test de la structure du prompt")
    print("=" * 40)

    template_path = Path(__file__).parent / "ai/prompts/config/prompts/session_generator.yaml"

    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()

        print("[OK] Template de prompt charge")

        # Verifications de structure
        required_sections = [
            "(ID: {{ oeuvre.id }})",
            "oeuvre_ids",
            "La liste des IDs des œuvres"
        ]

        for section in required_sections:
            if section in content:
                print(f"[OK] Section '{section}' presente")
            else:
                print(f"[ERROR] Section '{section}' manquante")
                return False

        print("[OK] Template de prompt valide")
        return True

    except Exception as e:
        print(f"[ERROR] Erreur lors du test du template: {e}")
        return False

if __name__ == "__main__":
    print(">>> Test de l'inclusion des IDs d'oeuvres dans le prompt")
    print("=" * 60)

    success = True

    # Test de la structure du template
    success &= test_prompt_structure()

    # Test de génération avec IDs
    success &= test_oeuvre_ids_in_prompt()

    if success:
        print("\n[SUCCESS] Tous les tests ont reussi !")
        print("\n[SUMMARY] Resume des ameliorations:")
        print("   [OK] IDs d'oeuvres inclus dans le prompt")
        print("   [OK] IDs d'objets d'etude inclus")
        print("   [OK] IDs d'objectifs inclus")
        print("   [OK] IA peut referencer les oeuvres par leur ID")
        print("   [OK] Structure coherente pour oeuvre_ids en sortie")
        sys.exit(0)
    else:
        print("\n[ERROR] Certains tests ont echoue")
        sys.exit(1)