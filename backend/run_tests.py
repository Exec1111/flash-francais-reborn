import sys
import os

# Assurer que le répertoire 'backend' est dans le PYTHONPATH
# (Normalement géré par Python si on exécute depuis 'backend', mais soyons explicites)
backend_dir = os.path.dirname(__file__)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

print(f"--- DEBUG: Lancement via run_tests.py ---", flush=True)

try:
    # Importer le module principal des tests
    from tests.test_api_script import run_all_tests
    print(f"--- DEBUG: Import de run_all_tests réussi ---", flush=True)
    
    # Appeler la fonction principale
    print(f"--- DEBUG: Appel de run_all_tests() ---", flush=True)
    run_all_tests()
    print(f"--- DEBUG: Appel de run_all_tests() terminé ---", flush=True)
except ImportError as e:
    print(f"ERREUR D'IMPORT: {e}", flush=True)
    print("Assurez-vous que vous lancez ce script depuis le dossier 'backend'", flush=True)
    print(f"PYTHONPATH actuel: {sys.path}", flush=True)
except Exception as e:
    print(f"ERREUR INATTENDUE: {e}", flush=True)
    import traceback
    traceback.print_exc()

print(f"--- DEBUG: Fin de run_tests.py ---", flush=True)
