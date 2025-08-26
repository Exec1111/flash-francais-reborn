#!/usr/bin/env python3
"""
Test script to verify the TEXTERECONSTITUE implementation.
This script tests the complete workflow of the new TEXTERECONSTITUE exercise type.
"""

import os
import sys
import json
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_files_exist():
    """Test that all required files exist."""
    print("🔍 Testing file existence...")
    
    files_to_check = [
        "ai/prompts/config/prompts/textereconstitue.yaml",
        "ai/prompts/config/schemas/textereconstitue.schema.json",
        "ai/template/default_exercice_textereconstitue.html"
    ]
    
    all_exist = True
    for file_path in files_to_check:
        if Path(file_path).exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} not found")
            all_exist = False
    
    return all_exist

def test_yaml_configuration():
    """Test that the YAML configuration is valid."""
    print("\n🔍 Testing YAML configuration...")
    
    try:
        import yaml
        with open("ai/prompts/config/prompts/textereconstitue.yaml", 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        required_keys = ['system_prompt', 'user_prompt_template', 'parameters', 'constraints', 'response_schema']
        for key in required_keys:
            if key in config:
                print(f"✅ {key}")
            else:
                print(f"❌ Missing key: {key}")
                return False
        
        # Check parameters include mandatory ones
        params = {p['name']: p for p in config.get('parameters', [])}
        mandatory_params = ['niveau_classe', 'resource_ids', 'instructions_personnalisees']
        for param in mandatory_params:
            if param in params:
                print(f"✅ Mandatory parameter: {param}")
            else:
                print(f"❌ Missing mandatory parameter: {param}")
                return False
        
        print("✅ YAML configuration is valid")
        return True
    except Exception as e:
        print(f"❌ Error loading YAML: {e}")
        return False

def test_json_schema():
    """Test that the JSON schema is valid."""
    print("\n🔍 Testing JSON schema...")
    
    try:
        with open("ai/prompts/config/schemas/textereconstitue.schema.json", 'r', encoding='utf-8') as f:
            schema = json.load(f)
        
        # Check schema structure
        if schema.get('type') == 'object' and 'properties' in schema:
            print("✅ Schema has correct structure")
        else:
            print("❌ Invalid schema structure")
            return False
        
        # Check required properties
        exercice_props = schema.get('properties', {}).get('exercice', {}).get('properties', {})
        required_props = ['titre', 'consigne', 'texte_original', 'elements_melanges', 'ordre_correct', 'indices', 'explication']
        
        for prop in required_props:
            if prop in exercice_props:
                print(f"✅ Required property: {prop}")
            else:
                print(f"❌ Missing required property: {prop}")
                return False
        
        print("✅ JSON schema is valid")
        return True
    except Exception as e:
        print(f"❌ Error loading JSON schema: {e}")
        return False

def test_html_template():
    """Test that the HTML template contains required elements."""
    print("\n🔍 Testing HTML template...")
    
    try:
        with open("ai/template/default_exercice_textereconstitue.html", 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Check for key template variables and elements
        required_elements = [
            '{{ exercice.titre }}',
            '{{ exercice.consigne }}',
            '{{ exercice.theme }}',
            '{{ exercice.elements_melanges }}',
            '{{ exercice.ordre_correct }}',
            'elementsContainer',
            'checkOrder()',
            'showSolution()',
            'drag'
        ]
        
        for element in required_elements:
            if element in template_content:
                print(f"✅ Template element: {element}")
            else:
                print(f"❌ Missing template element: {element}")
                return False
        
        print("✅ HTML template is valid")
        return True
    except Exception as e:
        print(f"❌ Error loading HTML template: {e}")
        return False

def test_registry_entries():
    """Test that registry entries are correct."""
    print("\n🔍 Testing registry entries...")
    
    try:
        # Check registry file content
        with open("ai/services/registry.py", 'r', encoding='utf-8') as f:
            registry_content = f.read()
        
        # Check for PROMPT_REGISTRY entry
        if '("exercice", "textereconstitue"): "textereconstitue"' in registry_content:
            print("✅ PROMPT_REGISTRY entry found")
        else:
            print("❌ PROMPT_REGISTRY entry missing")
            return False
        
        # Check for TEMPLATE_REGISTRY entry
        if '("exercice", "textereconstitue"): "default_exercice_textereconstitue.html"' in registry_content:
            print("✅ TEMPLATE_REGISTRY entry found")
        else:
            print("❌ TEMPLATE_REGISTRY entry missing")
            return False
        
        print("✅ Registry entries are correct")
        return True
    except Exception as e:
        print(f"❌ Error checking registry: {e}")
        return False

def test_database_entry():
    """Test that database entry is correct."""
    print("\n🔍 Testing database entry...")
    
    try:
        with open("init_db.py", 'r', encoding='utf-8') as f:
            init_db_content = f.read()
        
        # Check for database entry
        if "'TEXTERECONSTITUE'" in init_db_content and "'Reconstitution de texte'" in init_db_content:
            print("✅ Database entry found")
            return True
        else:
            print("❌ Database entry missing")
            return False
    except Exception as e:
        print(f"❌ Error checking database entry: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Testing TEXTERECONSTITUE implementation...\n")
    
    tests = [
        test_files_exist,
        test_yaml_configuration,
        test_json_schema,
        test_html_template,
        test_registry_entries,
        test_database_entry
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print()  # Add space between tests
        except Exception as e:
            print(f"❌ Test failed with exception: {e}\n")
    
    print("="*60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! TEXTERECONSTITUE implementation is ready.")
        print("\n📝 Next steps:")
        print("1. Run 'python init_db.py' to update the database")
        print("2. Test the AI generation through the API:")
        print("   POST /api/v1/ai/generate")
        print("   {")
        print('     "type_key": "exercice",')
        print('     "subtype_key": "textereconstitue",')
        print('     "variables": {')
        print('       "theme": "Les aventures de Robinson Crusoé",')
        print('       "type_texte": "narratif",')
        print('       "nombre_elements": 5,')
        print('       "difficulte": "moyen",')
        print('       "niveau_classe": "4ème"')
        print('     }')
        print("   }")
        return True
    else:
        print(f"❌ {total - passed} test(s) failed. Please fix the issues before proceeding.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)