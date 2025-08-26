#!/usr/bin/env python3
"""
Script de test pour vérifier la correction des énumérations dans les schémas
"""

import json
import sys
from pathlib import Path

# Ajouter le répertoire backend au path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_cartemental_schema():
    """Teste que le schéma CARTEMENTAL génère correctement les énumérations"""
    print("🔍 Test du schéma CARTEMENTAL avec énumérations")
    
    try:
        from ai.prompts.prompt_generator import PromptGenerator
        
        # Charger le générateur de prompt
        generator = PromptGenerator("cartemental")
        
        print(f"✅ Prompt CARTEMENTAL chargé avec {len(generator.parameters)} paramètres")
        
        # Vérifier les paramètres avec énumérations
        enum_params = []
        for param in generator.parameters:
            print(f"\n📋 Paramètre: {param.get('name', 'N/A')}")
            print(f"   Type: {param.get('type', 'N/A')}")
            print(f"   Description: {param.get('description', 'N/A')}")
            
            if 'enum' in param:
                enum_params.append(param)
                print(f"   🎯 Énumération: {param['enum']}")
            else:
                print("   ⚪ Pas d'énumération")
        
        print(f"\n📊 Résumé: {len(enum_params)} paramètres avec énumération sur {len(generator.parameters)} total")
        
        # Simuler la logique du backend pour générer les champs de formulaire
        print("\n🔨 Simulation de la génération des champs de formulaire:")
        form_fields = []
        
        for p in generator.parameters:
            # Logique identique à celle du backend
            if "enum" in p:
                field_type = "enum"
            else:
                field_type = "number" if str(p.get("type")).lower() in ("int", "integer") else "string"
            
            validations = {}
            default = p.get("default")
            required = default is None
            
            if "enum" in p:
                validations["enum"] = p["enum"]
                form_fields.append({
                    "name": p["name"],
                    "label": p.get("label", p["name"]),
                    "description": p.get("description", ""),
                    "type": field_type,
                    "required": required,
                    "default": default,
                    "validations": validations,
                    "enum": p["enum"]
                })
            else:
                form_fields.append({
                    "name": p["name"],
                    "label": p.get("label", p["name"]),
                    "description": p.get("description", ""),
                    "type": field_type,
                    "required": required,
                    "default": default,
                    "validations": validations
                })
        
        # Afficher le résultat
        print(f"\n📋 Champs générés:")
        for field in form_fields:
            print(f"   - {field['name']} (type: {field['type']})")
            if 'enum' in field:
                print(f"     🎯 Options: {field['enum']}")
        
        # Vérifications
        profondeur_field = next((f for f in form_fields if f['name'] == 'profondeur'), None)
        type_contenu_field = next((f for f in form_fields if f['name'] == 'type_contenu'), None)
        niveau_field = next((f for f in form_fields if f['name'] == 'niveau_classe'), None)
        
        success = True
        
        if profondeur_field and profondeur_field.get('type') == 'enum' and 'enum' in profondeur_field:
            print("✅ Le champ 'profondeur' a le type 'enum' et contient des options")
        else:
            print("❌ Le champ 'profondeur' n'est pas correctement configuré")
            success = False
        
        if type_contenu_field and type_contenu_field.get('type') == 'enum' and 'enum' in type_contenu_field:
            print("✅ Le champ 'type_contenu' a le type 'enum' et contient des options")
        else:
            print("❌ Le champ 'type_contenu' n'est pas correctement configuré")
            success = False
        
        if niveau_field and niveau_field.get('type') == 'enum' and 'enum' in niveau_field:
            print("✅ Le champ 'niveau_classe' a le type 'enum' et contient des options")
        else:
            print("❌ Le champ 'niveau_classe' n'est pas correctement configuré")
            success = False
        
        return success
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_schema_consistency():
    """Teste la cohérence entre différents types de schémas"""
    print("\n🔍 Test de cohérence des schémas avec énumérations")
    
    try:
        from ai.prompts.prompt_generator import PromptGenerator
        
        # Tester plusieurs configurations
        configs_to_test = [
            "cartemental",
            "fichemethode", 
            "introsequence"
        ]
        
        results = {}
        
        for config in configs_to_test:
            try:
                generator = PromptGenerator(config)
                enum_count = sum(1 for p in generator.parameters if 'enum' in p)
                results[config] = {
                    'total_params': len(generator.parameters),
                    'enum_params': enum_count,
                    'success': True
                }
                print(f"✅ {config}: {enum_count}/{len(generator.parameters)} paramètres avec énumération")
            except Exception as e:
                results[config] = {
                    'error': str(e),
                    'success': False
                }
                print(f"❌ {config}: Erreur - {e}")
        
        success_count = sum(1 for r in results.values() if r.get('success', False))
        total_count = len(results)
        
        print(f"\n📊 Résultats: {success_count}/{total_count} configurations testées avec succès")
        return success_count == total_count
        
    except Exception as e:
        print(f"❌ Erreur lors du test de cohérence: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🚀 Test de correction des énumérations")
    print("=" * 50)
    
    tests = [
        ("Schéma CARTEMENTAL", test_cartemental_schema),
        ("Cohérence des schémas", test_schema_consistency)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        result = test_func()
        results.append(result)
    
    print("\n" + "=" * 50)
    print("📊 RÉSULTATS DES TESTS")
    print("=" * 50)
    
    success_count = sum(results)
    total_count = len(results)
    
    for i, (test_name, _) in enumerate(tests):
        status = "✅ RÉUSSI" if results[i] else "❌ ÉCHEC"
        print(f"{test_name}: {status}")
    
    print(f"\n🎯 Score: {success_count}/{total_count}")
    
    if success_count == total_count:
        print("🎉 Tous les tests sont réussis! Les énumérations fonctionnent correctement.")
        return True
    else:
        print(f"⚠️  {total_count - success_count} test(s) ont échoué.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)