#!/usr/bin/env python3
"""
Test script to verify the FICHEMETHODE implementation.
This script tests the complete workflow of the new FICHEMETHODE lesson type.
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
        "ai/prompts/config/prompts/fichemethode.yaml",
        "ai/prompts/config/schemas/fichemethode.schema.json",
        "ai/template/default_lecon_fichemethode.html"
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
        with open("ai/prompts/config/prompts/fichemethode.yaml", 'r', encoding='utf-8') as f:
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
        
        # Check specific FICHEMETHODE parameters
        fichemethode_params = ['methode_type', 'objectif_specifique', 'exemples_souhaites']
        for param in fichemethode_params:
            if param in params:
                print(f"✅ FICHEMETHODE parameter: {param}")
            else:
                print(f"❌ Missing FICHEMETHODE parameter: {param}")
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
        with open("ai/prompts/config/schemas/fichemethode.schema.json", 'r', encoding='utf-8') as f:
            schema = json.load(f)
        
        # Check schema structure
        if schema.get('type') == 'object' and 'properties' in schema:
            print("✅ Schema has correct structure")
        else:
            print("❌ Invalid schema structure")
            return False
        
        # Check required properties
        fiche_props = schema.get('properties', {}).get('fiche', {}).get('properties', {})
        required_props = ['titre', 'objectif', 'methode_type', 'etapes', 'exemples', 'pieges_eviter', 'checklist', 'ressources_complementaires']
        
        for prop in required_props:
            if prop in fiche_props:
                print(f"✅ Required property: {prop}")
            else:
                print(f"❌ Missing required property: {prop}")
                return False
        
        # Check etapes structure
        etapes_schema = fiche_props.get('etapes', {})
        if etapes_schema.get('type') == 'array' and 'items' in etapes_schema:
            etape_props = etapes_schema['items'].get('properties', {})
            if all(prop in etape_props for prop in ['numero', 'titre', 'description', 'conseils']):
                print("✅ Etapes structure is correct")
            else:
                print("❌ Invalid etapes structure")
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
        with open("ai/template/default_lecon_fichemethode.html", 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Check for key template variables and elements
        required_elements = [
            '{{ fiche.titre }}',
            '{{ fiche.objectif }}',
            '{{ fiche.methode_type }}',
            '{{ fiche.etapes }}',
            '{{ fiche.exemples }}',
            '{{ fiche.pieges_eviter }}',
            '{{ fiche.checklist }}',
            '{{ fiche.ressources_complementaires }}',
            'etape-card',
            'exemple-card',
            'checklist-item',
            'print-button'
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
        if '("lecon", "fichemethode"): "fichemethode"' in registry_content:
            print("✅ PROMPT_REGISTRY entry found")
        else:
            print("❌ PROMPT_REGISTRY entry missing")
            return False
        
        # Check for TEMPLATE_REGISTRY entry
        if '("lecon", "fichemethode"): "default_lecon_fichemethode.html"' in registry_content:
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
        if "'FICHEMETHODE'" in init_db_content and "'Fiche méthodologique'" in init_db_content:
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
    print("🚀 Testing FICHEMETHODE implementation...\n")
    
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
        print("🎉 All tests passed! FICHEMETHODE implementation is ready.")
        print("\n📝 Next steps:")
        print("1. Run 'python init_db.py' to update the database")
        print("2. Test the AI generation through the API:")
        print("   POST /api/v1/ai/generate")
        print("   {")
        print('     "type_key": "lecon",')
        print('     "subtype_key": "fichemethode",')
        print('     "variables": {')
        print('       "methode_type": "commentaire",')
        print('       "objectif_specifique": "Apprendre à analyser un texte littéraire",')
        print('       "exemples_souhaites": "extraits de romans du XIXe siècle",')
        print('       "niveau_classe": "3ème"')
        print('     }')
        print("   }")
        return True
    else:
        print(f"❌ {total - passed} test(s) failed. Please fix the issues before proceeding.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)