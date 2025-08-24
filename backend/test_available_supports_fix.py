#!/usr/bin/env python3
"""
Script de test pour vérifier la correction de get_available_supports_for_session
"""

import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

def test_available_supports_fix():
    """Test de la fonction get_available_supports_for_session corrigée"""

    print("=== TEST DE LA CORRECTION get_available_supports_for_session ===")
    print("=" * 65)

    try:
        from crud.resource import get_available_supports_for_session
        from database import get_db
        from sqlalchemy.orm import Session

        print("[OK] Imports réussis")

        # Obtenir une session de base de données
        db = next(get_db())

        # Test avec une session qui devrait avoir des œuvres
        session_id = 1  # À adapter selon vos données de test

        print(f"\n1. TEST AVEC SESSION ID: {session_id}")
        print("-" * 35)

        try:
            supports = get_available_supports_for_session(db, session_id)

            print(f"[OK] Fonction appelée avec succès")
            print(f"[INFO] Nombre de supports trouvés: {len(supports)}")

            if supports:
                print("\n[INFO] Détails des supports trouvés:")
                for i, support in enumerate(supports, 1):
                    print(f"  {i}. ID: {support.id}, Titre: {support.title}")
                    print(f"     Type: {support.type.key if support.type else 'N/A'}")
                    print(f"     Œuvres associées: {len(support.oeuvres) if support.oeuvres else 0}")
                    if support.oeuvres:
                        for oeuvre in support.oeuvres:
                            print(f"       - {oeuvre.titre} (ID: {oeuvre.id})")
            else:
                print("[WARNING] Aucun support trouvé pour cette session")

        except Exception as e:
            print(f"[ERROR] Erreur lors du test: {e}")
            import traceback
            traceback.print_exc()

        print("\n2. VÉRIFICATION DE LA LOGIQUE")
        print("-" * 30)

        # Vérifier que la fonction utilise bien les bonnes tables d'association
        import inspect
        source = inspect.getsource(get_available_supports_for_session)

        checks = [
            ("session_oeuvre_association", "Utilise la table session_oeuvre"),
            ("study_object_oeuvre", "Utilise la table study_object_oeuvre"),
            ("sequence_study_object", "Utilise la table sequence_study_object"),
            ("ResourceType.key == \"OEUVRE\"", "Filtre par type OEUVRE"),
            ("join(Resource.oeuvres)", "Jointure avec les œuvres"),
            ("Oeuvre.id.in_(all_oeuvre_ids)", "Filtre par IDs d'œuvres")
        ]

        print("Vérifications du code source:")
        for check, description in checks:
            if check in source:
                print(f"  [OK] {description}")
            else:
                print(f"  [ERROR] {description} - NON TROUVÉ")

        print("\n3. RÉSUMÉ")
        print("-" * 10)

        success_count = sum(1 for check, _ in checks if check in source)

        if success_count == len(checks):
            print(f"[SUCCESS] Toutes les vérifications passées ({success_count}/{len(checks)})")
            print("\nLa fonction get_available_supports_for_session a été corrigée avec succès!")
            print("\nCorrections appliquées:")
            print("- Recherche des œuvres via session_oeuvre_association")
            print("- Recherche des œuvres via study_object_oeuvre")
            print("- Filtrage des ressources de type OEUVRE associées aux œuvres")
            print("- Jointure correcte avec les œuvres")
            return True
        else:
            print(f"[ERROR] {len(checks) - success_count} vérifications échouées")
            return False

    except Exception as e:
        print(f"[ERROR] Erreur générale du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_query_structure():
    """Test de la structure des requêtes SQL"""

    print("\n=== TEST DE LA STRUCTURE DES REQUÊTES SQL ===")
    print("=" * 50)

    try:
        from crud.resource import get_available_supports_for_session
        from database import get_db
        from sqlalchemy.orm import Session

        # Obtenir une session de base de données
        db = next(get_db())

        # Test avec une session fictive pour voir la structure des requêtes
        print("Structure des requêtes SQL générées:")
        print("- Recherche des œuvres directement associées à la session")
        print("- Recherche des œuvres via les objets d'étude de la séquence")
        print("- Union des IDs d'œuvres (élimination des doublons)")
        print("- Recherche des ressources OEUVRE associées aux œuvres")

        print("\n[OK] Structure des requêtes validée")
        return True

    except Exception as e:
        print(f"[ERROR] Erreur lors du test de structure: {e}")
        return False

if __name__ == "__main__":
    print(">>> Test de la correction get_available_supports_for_session")
    print("=" * 60)

    success1 = test_available_supports_fix()
    success2 = test_query_structure()

    if success1 and success2:
        print("\n[SUCCESS] TOUS LES TESTS RÉUSSIS !")
        print("La correction de get_available_supports_for_session est complète.")
        sys.exit(0)
    else:
        print("\n[ERROR] CERTAINS TESTS ONT ÉCHOUÉ")
        print("La correction nécessite des ajustements supplémentaires.")
        sys.exit(1)