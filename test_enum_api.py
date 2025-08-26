#!/usr/bin/env python3
"""
Test script to verify enum parameters are handled correctly in the AI router
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

def test_cartemental_schema_api():
    """Test the actual schema generation for CARTEMENTAL type"""
    print("🔍 Testing CARTEMENTAL schema generation (simulating API call)")
    
    try:
        from ai.prompts.prompt_generator import PromptGenerator
        from ai import ai_resource_service
        
        # Get the prompt configuration for CARTEMENTAL
        prompt_name = ai_resource_service.PROMPT_REGISTRY.get(("lecon", "cartemental"))
        print(f"📋 Prompt found in registry: {prompt_name}")
        
        if not prompt_name:
            print("❌ CARTEMENTAL not found in prompt registry")
            return False
        
        # Create the prompt generator
        prompt_config = prompt_name.get("config") if isinstance(prompt_name, dict) else prompt_name
        generator = PromptGenerator(prompt_config)
        
        # Simulate the exact logic from the API endpoint
        form_fields = []
        for p in generator.parameters:
            print(f"\n📝 Processing parameter: {p.get('name', 'N/A')}")
            print(f"   Type: {p.get('type', 'N/A')}")
            print(f"   Enum: {p.get('enum', 'N/A')}")
            
            # Determine field type - use 'enum' for fields with enumeration
            if "enum" in p:
                field_type = "enum"  # Use enum type for fields with enumeration
                print(f"   ✅ Setting field type to 'enum'")
            else:
                field_type = "number" if str(p.get("type")).lower() in ("int", "integer") else "string"
                print(f"   ➡️ Setting field type to '{field_type}'")
            
            # Validations and default values
            validations = {}
            default = p.get("default")
            required = default is None
            
            if "enum" in p:
                validations["enum"] = p["enum"]
                # Add enumeration directly as field attribute for easier frontend access
                form_fields.append({
                    "name": p["name"],
                    "label": p.get("label", p["name"]),
                    "description": p.get("description", ""),
                    "type": field_type,
                    "required": required,
                    "default": default,
                    "validations": validations,
                    "enum": p["enum"]  # Add enumeration directly here
                })
                print(f"   📦 Field created with enum options: {p['enum']}")
                continue
            
            form_fields.append({
                "name": p["name"],
                "label": p.get("label", p["name"]),
                "description": p.get("description", ""),
                "type": field_type,
                "required": required,
                "default": default,
                "validations": validations
            })
            print(f"   📦 Field created without enum")
        
        # Display results
        print(f"\n📊 Generated form fields: {len(form_fields)}")
        
        enum_fields = []
        for field in form_fields:
            print(f"\n🔹 Field: {field['name']}")
            print(f"   Type: {field['type']}")
            print(f"   Required: {field['required']}")
            print(f"   Default: {field.get('default', 'None')}")
            
            if field.get('enum'):
                enum_fields.append(field)
                print(f"   ✅ Enum options: {field['enum']}")
            else:
                print(f"   ⚪ No enum options")
            
            if field.get('validations', {}).get('enum'):
                print(f"   ✅ Validations enum: {field['validations']['enum']}")
        
        print(f"\n📈 Summary: {len(enum_fields)} fields with enums out of {len(form_fields)} total")
        
        # Specific checks for expected enum fields
        profondeur_field = next((f for f in form_fields if f['name'] == 'profondeur'), None)
        type_contenu_field = next((f for f in form_fields if f['name'] == 'type_contenu'), None)
        niveau_field = next((f for f in form_fields if f['name'] == 'niveau_classe'), None)
        
        success = True
        
        if profondeur_field:
            if profondeur_field.get('type') == 'enum' and profondeur_field.get('enum'):
                print("✅ 'profondeur' field is correctly configured as enum")
                print(f"   Options: {profondeur_field['enum']}")
            else:
                print("❌ 'profondeur' field is not correctly configured")
                print(f"   Type: {profondeur_field.get('type')}")
                print(f"   Enum: {profondeur_field.get('enum')}")
                success = False
        else:
            print("❌ 'profondeur' field not found")
            success = False
        
        if type_contenu_field:
            if type_contenu_field.get('type') == 'enum' and type_contenu_field.get('enum'):
                print("✅ 'type_contenu' field is correctly configured as enum")
                print(f"   Options: {type_contenu_field['enum']}")
            else:
                print("❌ 'type_contenu' field is not correctly configured")
                print(f"   Type: {type_contenu_field.get('type')}")
                print(f"   Enum: {type_contenu_field.get('enum')}")
                success = False
        else:
            print("❌ 'type_contenu' field not found")
            success = False
        
        if niveau_field:
            if niveau_field.get('type') == 'enum' and niveau_field.get('enum'):
                print("✅ 'niveau_classe' field is correctly configured as enum")
                print(f"   Options: {niveau_field['enum']}")
            else:
                print("❌ 'niveau_classe' field is not correctly configured")
                print(f"   Type: {niveau_field.get('type')}")
                print(f"   Enum: {niveau_field.get('enum')}")
                success = False
        else:
            print("❌ 'niveau_classe' field not found")
            success = False
        
        return success
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testing enum parameter handling in AI router")
    success = test_cartemental_schema_api()
    
    if success:
        print("\n✅ All tests passed! Enum parameters should be working correctly.")
    else:
        print("\n❌ Some tests failed. There may be an issue with enum parameter handling.")
    
    sys.exit(0 if success else 1)