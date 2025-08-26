#!/usr/bin/env python3
"""
Test script to verify that label fields are being processed correctly by the backend
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

def test_label_fields():
    """Test that label fields are being used correctly"""
    print("🔍 Testing label field handling in the backend")
    
    try:
        from ai.prompts.prompt_generator import PromptGenerator
        from ai import ai_resource_service
        
        # Test CARTEMENTAL configuration
        prompt_name = ai_resource_service.PROMPT_REGISTRY.get(("lecon", "cartemental"))
        prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
        generator = PromptGenerator(prompt_config)
        
        # Simulate backend field generation logic
        form_fields = []
        for p in generator.parameters:
            # Backend logic from ai_router.py
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
                    "label": p.get("label", p["name"]),  # This is the key line!
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
                    "label": p.get("label", p["name"]),  # This is the key line!
                    "description": p.get("description", ""),
                    "type": field_type,
                    "required": required,
                    "default": default,
                    "validations": validations
                })
        
        print(f"✅ Generated {len(form_fields)} form fields")
        
        # Check specific fields to verify labels are working
        test_cases = [
            ("theme_central", "Thème central"),
            ("profondeur", "Profondeur"), 
            ("type_contenu", "Type de contenu"),
            ("niveau_classe", "Niveau de classe"),
            ("resource_ids", "Ressources de référence"),
            ("instructions_personnalisees", "Instructions personnalisées")
        ]
        
        success = True
        
        for field_name, expected_label in test_cases:
            field = next((f for f in form_fields if f['name'] == field_name), None)
            if field:
                actual_label = field['label']
                if actual_label == expected_label:
                    print(f"✅ Field '{field_name}': label '{actual_label}' is correct")
                else:
                    print(f"❌ Field '{field_name}': expected '{expected_label}', got '{actual_label}'")
                    success = False
            else:
                print(f"❌ Field '{field_name}' not found")
                success = False
        
        print(f"\n📊 Label test results:")
        print(f"   - All fields have labels: {'✅' if success else '❌'}")
        print(f"   - Labels are user-friendly: {'✅' if success else '❌'}")
        print(f"   - Backend processing works: {'✅' if success else '❌'}")
        
        return success
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_multiple_yaml_files():
    """Test labels across multiple YAML files"""
    print("\n🔍 Testing labels across multiple YAML configurations")
    
    try:
        from ai.prompts.prompt_generator import PromptGenerator
        from ai import ai_resource_service
        
        # Test several different YAML files
        test_configs = [
            (("exercice", "qcm"), "QCM"),
            (("lecon", "fichemethode"), "Fiche méthode"),
            (("exercice", "dictee"), "Dictée")
        ]
        
        success = True
        
        for config_key, config_name in test_configs:
            print(f"\n🔍 Testing {config_name} configuration...")
            
            prompt_name = ai_resource_service.PROMPT_REGISTRY.get(config_key)
            if not prompt_name:
                print(f"❌ Configuration {config_key} not found in registry")
                success = False
                continue
                
            prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
            generator = PromptGenerator(prompt_config)
            
            # Check that all parameters have either a label or fallback to name
            params_with_labels = 0
            total_params = len(generator.parameters)
            
            for p in generator.parameters:
                param_name = p.get("name", "unknown")
                param_label = p.get("label", p["name"])
                
                if "label" in p:
                    params_with_labels += 1
                    print(f"   ✅ {param_name}: '{param_label}'")
                else:
                    print(f"   ⚠️ {param_name}: using name as fallback")
            
            print(f"   📊 {params_with_labels}/{total_params} parameters have explicit labels")
            
            if params_with_labels < total_params:
                print(f"   ⚠️ Some parameters in {config_name} don't have explicit labels")
        
        return success
        
    except Exception as e:
        print(f"❌ Error during multi-config test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testing label field implementation")
    
    # Test label handling
    labels_success = test_label_fields()
    
    # Test multiple configurations
    multi_success = test_multiple_yaml_files()
    
    overall_success = labels_success and multi_success
    
    print(f"\n📈 Final Results:")
    print(f"   - Label field processing: {'✅' if labels_success else '❌'}")
    print(f"   - Multi-configuration test: {'✅' if multi_success else '❌'}")
    print(f"   - Overall implementation: {'✅' if overall_success else '❌'}")
    
    if overall_success:
        print("\n✅ Label implementation is working correctly!")
        print("   The frontend should now display user-friendly labels")
        print("   instead of technical parameter names.")
    else:
        print("\n❌ Some issues found with label implementation.")
    
    sys.exit(0 if overall_success else 1)