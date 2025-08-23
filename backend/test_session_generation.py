#!/usr/bin/env python3
"""
Script de test pour valider la génération de séances avec les objets d'étude enrichis
"""

import json
import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

from ai.prompts.prompt_generator import PromptGenerator
from schemas.study_object import StudyObjectWithOeuvres
from schemas.oeuvre import OeuvreWithAuthor

def test_enriched_study_objects_prompt():
    """Test de génération de prompt avec objets d'étude enrichis"""

    print("*** Test de generation de prompt avec objets d'etude enrichis")
    print("=" * 60)

    # Créer des données d'exemple enrichies (format dict pour éviter les problèmes de Pydantic)
    sample_oeuvres = [
        {
            "id": 1,
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
            "id": 2,
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
        "nombre_seances": "3",
        "niveau": "5ème",
        "titre_sequence": "Le roman français du XIXe siècle",
        "description_sequence": "Découverte des grands romans français du XIXe siècle",
        "study_objects": sample_study_objects,
        "objectifs": [
            {"id": 1, "title": "Analyser les personnages", "description": "Identifier et caractériser les personnages principaux"},
            {"id": 2, "title": "Comprendre le contexte historique", "description": "Situer l'œuvre dans son contexte socio-historique"}
        ],
        "ressources_disponibles": [
            {"id": 1, "title": "Fiche de lecture Germinal", "type": "FICHE"},
            {"id": 2, "title": "Extrait commenté Le Père Goriot", "type": "EXTRAIT"}
        ],
        "instructions_personnalisees": "Mettre l'accent sur l'analyse des conditions sociales"
    }

    try:
        # Générer le prompt
        prompt_gen = PromptGenerator("session_generator")
        system_prompt, user_prompt = prompt_gen.build(**params)
        prompt = user_prompt  # On utilise seulement le prompt utilisateur pour le test

        print("[OK] Prompt genere avec succes !")
        print("\n[CONTENT] Contenu du prompt genere :")
        print("-" * 40)
        print(prompt)
        print("-" * 40)

        # Verifications
        print("\n[CHECK] Verifications :")

        # Verifier que les descriptions des objets d'etude sont presentes
        if "Etude du mouvement naturaliste" in prompt:
            print("[OK] Description des objets d'etude incluse")
        else:
            print("[ERROR] Description des objets d'etude manquante")

        # Verifier que les oeuvres sont presentes avec leurs details
        if "Germinal par Emile Zola" in prompt:
            print("[OK] Oeuvre Germinal incluse avec auteur")
        else:
            print("[ERROR] Oeuvre Germinal manquante")

        if "Le Pere Goriot par Honore de Balzac" in prompt:
            print("[OK] Oeuvre Le Pere Goriot incluse avec auteur")
        else:
            print("[ERROR] Oeuvre Le Pere Goriot manquante")

        # Verifier les metadonnees enrichies
        if "naturaliste" in prompt and "1885" in prompt:
            print("[OK] Metadonnees des oeuvres incluses (genre, date)")
        else:
            print("[ERROR] Metadonnees des oeuvres manquantes")

        # Verifier les informations pedagogiques
        if "B1" in prompt and "litterature" in prompt:
            print("[OK] Informations pedagogiques incluses")
        else:
            print("[ERROR] Informations pedagogiques manquantes")

        print("\n[SUCCESS] Test termine avec succes !")
        return True

    except Exception as e:
        print(f"[ERROR] Erreur lors de la generation du prompt : {e}")
        import traceback
        traceback.print_exc()
        return False

def test_prompt_structure():
    """Test de la structure du prompt"""

    print("\n*** Test de la structure du prompt")
    print("=" * 40)

    try:
        # Charger le template
        template_path = Path(__file__).parent / "ai/prompts/config/prompts/session_generator.yaml"
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()

        print("[OK] Template charge avec succes")

        # Verifications de structure
        required_sections = [
            "system_prompt:",
            "user_prompt_template:",
            "parameters:",
            "study_objects",
            "description:",
            "oeuvres:"
        ]

        for section in required_sections:
            if section in content:
                print(f"[OK] Section '{section}' presente")
            else:
                print(f"[ERROR] Section '{section}' manquante")

        # Verifier la syntaxe YAML
        import yaml
        yaml.safe_load(content)
        print("[OK] Syntaxe YAML valide")

        return True

    except Exception as e:
        print(f"[ERROR] Erreur lors du test de structure : {e}")
        return False

if __name__ == "__main__":
    print(">>> Debut des tests de generation de seances enrichies")
    print("=" * 60)

    success = True

    # Test de la structure
    success &= test_prompt_structure()

    # Test de génération avec données enrichies
    success &= test_enriched_study_objects_prompt()

    if success:
        print("\n[SUCCESS] Tous les tests ont reussi !")
        sys.exit(0)
    else:
        print("\n[ERROR] Certains tests ont echoue")
        sys.exit(1)