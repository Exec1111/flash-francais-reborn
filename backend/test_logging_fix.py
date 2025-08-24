#!/usr/bin/env python3
"""
Script de test pour vérifier que le logging LLMInteractionLog fonctionne correctement
"""

import asyncio
import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

from ai.services.resource_generator import generate_ai_resource_content
from database import SessionLocal
from models.llm_interaction_log import LLMInteractionLog
from ai.prompts.prompt_generator import PromptGenerator

async def test_logging_functionality():
    """Test que le logging fonctionne pour session_exercise_suggester"""

    print("🧪 Test du logging LLMInteractionLog pour session_exercise_suggester")
    print("=" * 70)

    # Variables de test pour session_exercise_suggester
    test_input_variables = {
        "session_title": "Test Session",
        "session_description": "Description de test",
        "session_objectives": ["Objectif 1", "Objectif 2"],
        "sequence_study_objects": ["Objet d'étude 1"],
        "existing_resources_summary": ["Ressource 1"],
        "available_exercise_types": [
            {
                "type_key": "exercice",
                "subtype_key": "qcm",
                "name_fr": "QCM",
                "description_courte": "Questionnaire à choix multiples",
                "parameters": [
                    {"name": "nombre_questions", "type": "integer", "default": 5},
                    {"name": "niveau_difficulte", "type": "string", "enum": ["facile", "moyen", "difficile"]}
                ]
            }
        ]
    }

    try:
        print("📤 Appel de generate_ai_resource_content avec session_exercise_suggester...")

        # Appel de la fonction
        result = await generate_ai_resource_content(
            type_key="meta",
            subtype_key="exercise_suggester",
            input_variables=test_input_variables,
            user_id=1  # User ID de test
        )

        print("✅ Fonction appelée avec succès")
        print(f"📊 Résultat: {result}")

        # Vérifier que le log a été créé en base
        print("\n🔍 Vérification des logs en base de données...")

        db = SessionLocal()
        try:
            # Récupérer les logs récents pour session_exercise_suggester
            recent_logs = db.query(LLMInteractionLog).filter(
                LLMInteractionLog.prompt_type == "session_exercise_suggester"
            ).order_by(LLMInteractionLog.created_at.desc()).limit(5).all()

            print(f"📋 Nombre de logs trouvés: {len(recent_logs)}")

            for i, log in enumerate(recent_logs):
                print(f"\n--- Log #{i+1} ---")
                print(f"ID: {log.id}")
                print(f"Prompt Type: {log.prompt_type}")
                print(f"API Provider: {log.api_provider}")
                print(f"Model: {log.model_name}")
                print(f"User ID: {log.user_id}")
                print(f"Duration: {log.duration_ms}ms")
                print(f"Error: {log.error_message}")
                print(f"Created: {log.created_at}")
                print(f"Input Variables: {log.input_variables}")
                print(f"Output Content: {log.output_content[:100] if log.output_content else None}...")

            if len(recent_logs) > 0:
                print("\n✅ SUCCÈS: Les logs sont bien créés en base de données!")
                return True
            else:
                print("\n❌ ÉCHEC: Aucun log trouvé en base de données")
                return False

        finally:
            db.close()

    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_logging_with_error():
    """Test que le logging capture aussi les erreurs"""

    print("\n🧪 Test du logging avec erreur simulée")
    print("=" * 50)

    # Variables qui vont causer une erreur (prompt vide)
    test_input_variables = {
        "session_title": "",
        "session_description": "",
        "session_objectives": [],
        "sequence_study_objects": [],
        "existing_resources_summary": [],
        "available_exercise_types": []
    }

    try:
        print("📤 Test avec des variables vides (devrait générer une erreur)...")

        result = await generate_ai_resource_content(
            type_key="meta",
            subtype_key="exercise_suggester",
            input_variables=test_input_variables,
            user_id=1
        )

        print("⚠️  Fonction terminée (peut-être avec une erreur)")
        print(f"📊 Résultat: {result}")

    except Exception as e:
        print(f"✅ Erreur capturée comme attendu: {e}")

    # Vérifier que l'erreur a été loggée
    print("\n🔍 Vérification que l'erreur a été loggée...")

    db = SessionLocal()
    try:
        # Récupérer le log le plus récent
        recent_log = db.query(LLMInteractionLog).filter(
            LLMInteractionLog.prompt_type == "session_exercise_suggester"
        ).order_by(LLMInteractionLog.created_at.desc()).first()

        if recent_log:
            print("📋 Dernier log trouvé:")
            print(f"ID: {recent_log.id}")
            print(f"Error Message: {recent_log.error_message}")
            print(f"Duration: {recent_log.duration_ms}ms")

            if recent_log.error_message:
                print("✅ SUCCÈS: L'erreur a été capturée dans les logs!")
                return True
            else:
                print("⚠️  Log trouvé mais pas d'erreur enregistrée")
                return False
        else:
            print("❌ Aucun log trouvé")
            return False

    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Début des tests de logging LLMInteractionLog")
    print("=" * 70)

    async def run_tests():
        success1 = await test_logging_functionality()
        success2 = await test_logging_with_error()

        if success1 and success2:
            print("\n🎉 TOUS LES TESTS RÉUSSIS!")
            print("✅ Le logging LLMInteractionLog fonctionne correctement")
            return 0
        else:
            print("\n❌ CERTAINS TESTS ONT ÉCHOUÉ")
            print("⚠️  Vérifiez les logs pour diagnostiquer le problème")
            return 1

    exit_code = asyncio.run(run_tests())
    sys.exit(exit_code)