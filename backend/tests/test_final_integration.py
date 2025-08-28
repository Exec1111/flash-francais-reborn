#!/usr/bin/env python3
"""
Script de test final pour vérifier l'intégration complète des œuvres dans les séances
"""

import json
import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

def test_final_integration():
    """Test complet de l'intégration des œuvres dans les séances"""

    print("=== TEST FINAL D'INTEGRATION ===")
    print("Verification de l'integration complete des oeuvres dans les seances")
    print("=" * 70)

    # 1. Vérifier que les œuvres existent
    print("\n1. VERIFICATION DES OEUVRES DANS LA BASE")
    print("-" * 40)

    from database import SessionLocal
    from models.oeuvre import Oeuvre
    from models.session import Session as SessionModel

    db = SessionLocal()

    try:
        oeuvres = db.query(Oeuvre).all()
        print(f"Nombre d'oeuvres trouvees: {len(oeuvres)}")

        expected_ids = [22, 23, 24]
        found_ids = [o.id for o in oeuvres if o.id in expected_ids]

        print(f"IDs attendus: {expected_ids}")
        print(f"IDs trouves: {found_ids}")

        if set(expected_ids).issubset(set(found_ids)):
            print("[OK] Toutes les oeuvres attendues sont presentes")
        else:
            print("[ERROR] Certaines oeuvres sont manquantes")
            return False

        # 2. Vérifier les détails des œuvres
        print("\n2. DETAILS DES OEUVRES")
        print("-" * 40)

        for oeuvre in oeuvres:
            if oeuvre.id in expected_ids:
                print(f"ID {oeuvre.id}: {oeuvre.titre} - {oeuvre.auteur_complet}")
                print(f"  Type: {oeuvre.type}, Genre: {oeuvre.genre}")
                print(f"  Date: {oeuvre.date_publication}")
                print(f"  User ID: {oeuvre.user_id}")
                print()

        # 3. Vérifier les modèles et schémas
        print("\n3. VERIFICATION DES MODELES ET SCHEMAS")
        print("-" * 40)

        # Vérifier que les modèles ont les bonnes relations
        from models.session import Session
        from models.oeuvre import Oeuvre

        # Vérifier les relations
        session_relations = [rel for rel in Session.__mapper__.relationships.keys()]
        oeuvre_relations = [rel for rel in Oeuvre.__mapper__.relationships.keys()]

        print(f"Relations de Session: {session_relations}")
        print(f"Relations d'Oeuvre: {oeuvre_relations}")

        if 'oeuvres' in session_relations:
            print("[OK] Relation 'oeuvres' presente dans Session")
        else:
            print("[ERROR] Relation 'oeuvres' manquante dans Session")
            return False

        if 'sessions' in oeuvre_relations:
            print("[OK] Relation 'sessions' presente dans Oeuvre")
        else:
            print("[ERROR] Relation 'sessions' manquante dans Oeuvre")
            return False

        # 4. Vérifier les schémas Pydantic
        print("\n4. VERIFICATION DES SCHEMAS PYDANTIC")
        print("-" * 40)

        from schemas.session import SessionCreate, SessionRead
        from schemas.oeuvre import OeuvreWithAuthor

        # Vérifier que SessionCreate accepte oeuvre_ids
        session_create_fields = SessionCreate.model_fields.keys()
        if 'oeuvre_ids' in session_create_fields:
            print("[OK] SessionCreate accepte oeuvre_ids")
        else:
            print("[ERROR] SessionCreate n'accepte pas oeuvre_ids")
            return False

        # Vérifier que SessionRead inclut oeuvres
        session_read_fields = SessionRead.model_fields.keys()
        if 'oeuvres' in session_read_fields:
            print("[OK] SessionRead inclut oeuvres")
        else:
            print("[ERROR] SessionRead n'inclut pas oeuvres")
            return False

        # 5. Vérifier le prompt de génération
        print("\n5. VERIFICATION DU PROMPT DE GENERATION")
        print("-" * 40)

        try:
            from ai.prompts.prompt_generator import PromptGenerator

            # Créer un générateur de prompt
            prompt_gen = PromptGenerator("session_generator")

            # Paramètres de test
            params = {
                "nombre_seances": "1",
                "niveau": "5ème",
                "titre_sequence": "Test séquence",
                "description_sequence": "Séquence de test",
                "study_objects": [{
                    "id": 11,
                    "title": "Test objet d'étude",
                    "description": "Description de test",
                    "oeuvres": [
                        {"id": 22, "titre": "La Peur", "auteur_complet": "Guy de Maupassant"},
                        {"id": 23, "titre": "Dr Jekyll", "auteur_complet": "Robert Louis Stevenson"}
                    ]
                }],
                "objectifs": [{"id": 1, "title": "Test objectif", "description": "Description test"}],
                "ressources_disponibles": [],
                "instructions_personnalisees": "Test"
            }

            system_prompt, user_prompt = prompt_gen.build(**params)

            # Vérifier que les IDs des œuvres sont dans le prompt
            if "(ID: 22)" in user_prompt and "(ID: 23)" in user_prompt:
                print("[OK] IDs des oeuvres presentes dans le prompt")
            else:
                print("[ERROR] IDs des oeuvres manquantes dans le prompt")
                return False

            # Vérifier que la section oeuvre_ids est présente
            if "La liste des IDs des œuvres" in user_prompt:
                print("[OK] Section oeuvre_ids presente dans le prompt")
            else:
                print("[ERROR] Section oeuvre_ids manquante dans le prompt")
                return False

        except Exception as e:
            print(f"[ERROR] Erreur lors du test du prompt: {e}")
            return False

        # 6. Vérifier les routes API
        print("\n6. VERIFICATION DES ROUTES API")
        print("-" * 40)

        from routers.session import session_router

        # Vérifier que les routes existent
        routes = [route.path for route in session_router.routes]
        print(f"Routes de session disponibles: {routes}")

        expected_routes = ["/", "/{session_id}", "/by_sequence/{sequence_id}"]
        for route in expected_routes:
            if any(route in r.path for r in session_router.routes):
                print(f"[OK] Route {route} presente")
            else:
                print(f"[ERROR] Route {route} manquante")
                return False

        # 7. Résumé final
        print("\n7. RESUME FINAL")
        print("-" * 40)

        print("[SUCCESS] INTEGRATION COMPLETE REUSSIE !")
        print("\nFonctionnalites verifiees:")
        print("  [OK] Oeuvres presentes dans la base de donnees")
        print("  [OK] Relations entre modeles configurees")
        print("  [OK] Schemas Pydantic mis a jour")
        print("  [OK] Prompt de generation inclut les IDs d'oeuvres")
        print("  [OK] Routes API disponibles")
        print("\nLe systeme est pret pour:")
        print("  - Generer des seances avec des oeuvres via IA")
        print("  - Sauvegarder les associations session-oeuvre")
        print("  - Recuperer les seances avec leurs oeuvres associees")

        return True

    except Exception as e:
        print(f"[ERROR] Erreur lors du test d'integration: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print(">>> Test d'integration finale des oeuvres dans les seances")
    print("=" * 70)

    success = test_final_integration()

    if success:
        print("\n[SUCCESS] TOUS LES TESTS REUSSIS !")
        print("L'integration des oeuvres dans les seances est COMPLETE et FONCTIONNELLE")
        sys.exit(0)
    else:
        print("\n[ERROR] CERTAINS TESTS ONT ECHOUE")
        print("L'integration des oeuvres dans les seances n'est pas complete")
        sys.exit(1)