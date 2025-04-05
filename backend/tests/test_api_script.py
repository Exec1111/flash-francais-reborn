# Script principal pour exécuter tous les tests API CRUD

# --- Imports --- #
# Importer les fonctions de test spécifiques (avec import relatif)
from .api_tests.test_progressions import test_progressions
from .api_tests.test_objectives import test_objectives
from .api_tests.test_sequences import test_sequences
from .api_tests.test_sessions import test_sessions
from .api_tests.test_resources import test_resources
from .api_tests.test_links import test_session_objective_link
from .api_tests.cleanup import cleanup

print("--- DEBUG: Début du fichier test_api_script.py ---", flush=True)

def run_all_tests():
    """Exécute tous les tests API et affiche un résumé."""
    print("=== DÉMARRAGE DES TESTS API ===")

    # Dictionnaires pour stocker les IDs créés (passés par référence)
    progression_id_holder = {"id": None}
    sequence_id_holder = {"id": None}
    session_id_holder = {"id": None}
    resource_id_holder = {"id": None}
    objective_id_holder = {"id": None} # Pour le test CRUD et la liaison

    results = [] # Liste pour stocker les résultats (nom_test, succès, message_erreur)

    try:
        # --- Exécution des Tests ---
        # Chaque fonction de test retourne (True, None) en cas de succès,
        # ou (False, "message d'erreur") en cas d'échec.

        success, msg = test_progressions(progression_id_holder)
        results.append(("Progressions", success, msg))

        success, msg = test_objectives(objective_id_holder)
        results.append(("Objectives", success, msg))

        # Passer l'ID de la progression créée
        success, msg = test_sequences(progression_id_holder.get("id"), sequence_id_holder)
        results.append(("Séquences", success, msg))

        # Passer l'ID de la séquence créée
        success, msg = test_sessions(sequence_id_holder.get("id"), session_id_holder)
        results.append(("Sessions", success, msg))

        # Passer l'ID de la session créée
        success, msg = test_resources(session_id_holder.get("id"), resource_id_holder)
        results.append(("Resources", success, msg))

        # Passer les IDs de session et d'objectif créés
        success, msg = test_session_objective_link(session_id_holder.get("id"), objective_id_holder.get("id"))
        results.append(("Lien Session-Objective", success, msg))

    finally:
        # --- Nettoyage ---
        # Appelé même si une erreur survient pendant les tests
        cleanup(
            progression_id_holder,
            sequence_id_holder,
            session_id_holder,
            resource_id_holder,
            objective_id_holder
        )

    # --- Analyse des Résultats et Résumé Final ---
    print("\n=== FIN DES TESTS API ===")
    tests_ok_count = 0
    tests_ko_count = 0
    first_error = None

    print("\n--- Détail des Résultats ---")
    for name, success, msg in results:
        status = "OK" if success else "KO"
        print(f"- Test {name}: {status}")
        if not success:
            tests_ko_count += 1
            if first_error is None: # Garder seulement la première erreur rencontrée
                first_error = f"Premier échec [{name}]: {msg}"
        else:
            tests_ok_count += 1

    print("\n--- Statistiques ---")
    total_tests = tests_ok_count + tests_ko_count
    print(f"Total tests exécutés: {total_tests}")
    print(f"Tests OK: {tests_ok_count}")
    print(f"Tests KO: {tests_ko_count}")

    print("\n--- Résumé Final ---")
    if tests_ko_count == 0:
        print("✅ Succès global : Tous les tests sont passés.")
    else:
        print(f"❌ Échec global : {tests_ko_count} test(s) ont échoué.")
        if first_error:
            print(f"  {first_error}")

# --- Point d'entrée --- #
if __name__ == "__main__":
    print("--- DEBUG: Dans __main__, appel de run_all_tests() ---", flush=True)
    run_all_tests()
