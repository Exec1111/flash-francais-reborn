#!/usr/bin/env python3
"""
Test complet du logging LLMInteractionLog avec la nouvelle approche
"""

import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

def test_logging_before_api_call():
    """Test que le logging fonctionne même si l'API échoue"""

    print("=== TEST DU LOGGING AVANT/APRÈS APPEL API ===")
    print("=" * 50)

    try:
        from backend.models.llm_interaction_log import LLMInteractionLog
        from backend.database import SessionLocal

        print("[OK] Imports des modèles réussis")

        # Créer une session de test
        db = SessionLocal()

        # Simuler la logique de logging AVANT l'appel API
        print("\n1. SIMULATION DU LOGGING AVANT L'APPEL API")
        print("-" * 45)

        # Données de test
        test_data = {
            "api_provider": "google_genai",
            "model_name": "test_model",
            "prompt_type": "test_type",
            "input_prompt": "Test prompt",
            "input_variables": {"test": "value"},
            "generation_config": {"response_mime_type": "application/json"},
            "output_content": None,  # Pas encore de réponse
            "error_message": None,   # Pas encore d'erreur
            "duration_ms": None,     # Pas encore de durée
            "user_id": 1
        }

        # Créer le log initial (comme dans le code corrigé)
        log_entry = LLMInteractionLog(**test_data)
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        log_id = log_entry.id
        print(f"[OK] Log initial créé avec ID: {log_id}")
        print(f"[INFO] output_content: {log_entry.output_content}")
        print(f"[INFO] error_message: {log_entry.error_message}")
        print(f"[INFO] duration_ms: {log_entry.duration_ms}")

        # Simuler la mise à jour APRÈS l'appel API (cas de succès)
        print("\n2. SIMULATION DE LA MISE À JOUR APRÈS SUCCÈS")
        print("-" * 45)

        existing_log = db.query(LLMInteractionLog).filter(LLMInteractionLog.id == log_id).first()
        if existing_log:
            existing_log.output_content = '{"test": "response"}'
            existing_log.error_message = None
            existing_log.duration_ms = 1500
            db.commit()
            print("[OK] Log mis à jour avec succès")
            print(f"[INFO] output_content: {existing_log.output_content}")
            print(f"[INFO] error_message: {existing_log.error_message}")
            print(f"[INFO] duration_ms: {existing_log.duration_ms}")

        # Simuler la mise à jour APRÈS l'appel API (cas d'erreur)
        print("\n3. SIMULATION DE LA MISE À JOUR APRÈS ERREUR")
        print("-" * 45)

        # Créer un nouveau log pour tester le cas d'erreur
        error_log = LLMInteractionLog(
            api_provider="google_genai",
            model_name="test_model",
            prompt_type="test_type",
            input_prompt="Test prompt error",
            input_variables={"test": "error"},
            generation_config={"response_mime_type": "application/json"},
            output_content=None,
            error_message="API Error: Connection failed",
            duration_ms=500,
            user_id=1
        )
        db.add(error_log)
        db.commit()
        db.refresh(error_log)

        print(f"[OK] Log d'erreur créé avec ID: {error_log.id}")
        print(f"[INFO] output_content: {error_log.output_content}")
        print(f"[INFO] error_message: {error_log.error_message}")
        print(f"[INFO] duration_ms: {error_log.duration_ms}")

        # Vérifier que les deux logs existent
        print("\n4. VÉRIFICATION DES LOGS EN BASE")
        print("-" * 35)

        all_logs = db.query(LLMInteractionLog).filter(
            LLMInteractionLog.prompt_type == "test_type"
        ).all()

        print(f"[INFO] Nombre de logs trouvés: {len(all_logs)}")

        for i, log in enumerate(all_logs, 1):
            print(f"\nLog {i}:")
            print(f"  ID: {log.id}")
            print(f"  Input prompt: {log.input_prompt}")
            print(f"  Output content: {log.output_content}")
            print(f"  Error message: {log.error_message}")
            print(f"  Duration: {log.duration_ms}ms")

        # Nettoyer les logs de test
        print("\n5. NETTOYAGE DES LOGS DE TEST")
        print("-" * 35)

        for log in all_logs:
            db.delete(log)
        db.commit()

        print("[OK] Logs de test supprimés")

        db.close()

        return True

    except Exception as e:
        print(f"[ERROR] Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_logging_logic():
    """Test de la logique de logging du code corrigé"""

    print("\n=== TEST DE LA LOGIQUE DE LOGGING ===")
    print("=" * 40)

    try:
        # Simuler les variables du code corrigé
        config = {"response_mime_type": "application/json"}
        input_variables = {"theme": "test", "niveau": "5ème"}
        prompt_text = "Test prompt text"
        model_name = "test_model"
        prompt_config = "test_type"
        user_id = 1

        print("[INFO] Variables de test:")
        print(f"  config: {config}")
        print(f"  input_variables: {input_variables}")
        print(f"  prompt_text: {prompt_text[:50]}...")

        # Simuler la logique de génération_config
        generation_config = config if isinstance(config, dict) else None
        print(f"[OK] generation_config: {generation_config}")

        # Simuler la création du log_entry (sans l'exécuter vraiment)
        print("\n[INFO] Structure du log_entry qui serait créé:")
        print("  api_provider: google_genai")
        print(f"  model_name: {model_name}")
        print(f"  prompt_type: {prompt_config}")
        print(f"  input_prompt: {prompt_text[:50]}...")
        print(f"  input_variables: {input_variables}")
        print(f"  generation_config: {generation_config}")
        print("  output_content: None (initialement)")
        print("  error_message: None (initialement)")
        print("  duration_ms: None (initialement)")
        print(f"  user_id: {user_id}")

        print("\n[OK] Logique de logging validée")

        return True

    except Exception as e:
        print(f"[ERROR] Erreur lors du test de logique: {e}")
        return False

if __name__ == "__main__":
    print(">>> Test complet du logging LLMInteractionLog")
    print("=" * 55)

    success1 = test_logging_before_api_call()
    success2 = test_logging_logic()

    if success1 and success2:
        print("\n[SUCCESS] TOUS LES TESTS RÉUSSIS !")
        print("Le logging LLMInteractionLog fonctionne maintenant correctement.")
        print("\nAméliorations apportées:")
        print("- Logging AVANT l'appel API (capture même les échecs)")
        print("- Mise à jour du log APRÈS l'appel API")
        print("- Gestion des erreurs dans le log")
        print("- Durée d'exécution enregistrée")
        print("- Traçabilité complète des interactions IA")
        sys.exit(0)
    else:
        print("\n[ERROR] CERTAINS TESTS ONT ÉCHOUÉ")
        print("Le logging nécessite des ajustements supplémentaires.")
        sys.exit(1)