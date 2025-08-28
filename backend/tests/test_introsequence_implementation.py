#!/usr/bin/env python3
"""
Test script to verify the INTROSEQUENCE implementation.
This script tests the complete workflow of the new INTROSEQUENCE lesson type.
"""

import os
import sys
import json
from pathlib import Path

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

def test_prompt_config():
    """Test that the YAML prompt configuration exists and is valid."""
    print("🔍 Testing YAML prompt configuration...")
    
    yaml_path = Path("ai/prompts/config/prompts/introsequence.yaml")
    if not yaml_path.exists():
        print(f"❌ YAML file not found: {yaml_path}")
        return False
    
    try:
        import yaml
        with open(yaml_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        required_keys = ['system_prompt', 'user_prompt_template', 'parameters', 'constraints', 'response_schema']
        for key in required_keys:
            if key not in config:
                print(f"❌ Missing required key in YAML: {key}")
                return False
        
        print("✅ YAML prompt configuration is valid")
        return True
    except Exception as e:
        print(f"❌ Error loading YAML: {e}")
        return False

def test_json_schema():
    """Test that the JSON schema exists and is valid."""
    print("🔍 Testing JSON schema...")
    
    schema_path = Path("ai/prompts/config/schemas/introsequence.schema.json")
    if not schema_path.exists():
        print(f"❌ Schema file not found: {schema_path}")
        return False
    
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)
        
        required_keys = ['title', 'type', 'properties', 'required']
        for key in required_keys:
            if key not in schema:
                print(f"❌ Missing required key in schema: {key}")
                return False
        
        # Check required properties
        required_props = ['title', 'subtitle', 'introduction', 'literary_references', 
                         'artistic_references', 'cultural_context', 'opening_questions', 
                         'conclusion', 'highlight_keywords']
        
        if 'required' in schema:
            for prop in required_props:
                if prop not in schema['required']:
                    print(f"❌ Missing required property in schema: {prop}")
                    return False
        
        print("✅ JSON schema is valid")
        return True
    except Exception as e:
        print(f"❌ Error loading JSON schema: {e}")
        return False

def test_html_template():
    """Test that the HTML template exists."""
    print("🔍 Testing HTML template...")
    
    template_path = Path("ai/template/default_lecon_introsequence.html")
    if not template_path.exists():
        print(f"❌ Template file not found: {template_path}")
        return False
    
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Check for key template variables
        required_vars = ['{{ title }}', '{{ subtitle }}', '{{ introduction', 
                        '{{ literary_references', '{{ artistic_references',
                        '{{ cultural_context', '{{ opening_questions', '{{ conclusion']
        
        for var in required_vars:
            if var not in template_content:
                print(f"❌ Missing template variable: {var}")
                return False
        
        print("✅ HTML template is valid")
        return True
    except Exception as e:
        print(f"❌ Error loading HTML template: {e}")
        return False

def test_registry_update():
    """Test that the registry has been updated correctly."""
    print("🔍 Testing registry update...")
    
    try:
        from ai.services.registry import PROMPT_REGISTRY, TEMPLATE_REGISTRY
        
        # Check PROMPT_REGISTRY
        prompt_key = ("lecon", "introsequence")
        if prompt_key not in PROMPT_REGISTRY:
            print(f"❌ Missing entry in PROMPT_REGISTRY: {prompt_key}")
            return False
        
        if PROMPT_REGISTRY[prompt_key] != "introsequence":
            print(f"❌ Incorrect value in PROMPT_REGISTRY: {PROMPT_REGISTRY[prompt_key]}")
            return False
        
        # Check TEMPLATE_REGISTRY
        template_key = ("lecon", "introsequence")
        if template_key not in TEMPLATE_REGISTRY:
            print(f"❌ Missing entry in TEMPLATE_REGISTRY: {template_key}")
            return False
        
        if TEMPLATE_REGISTRY[template_key] != "default_lecon_introsequence.html":
            print(f"❌ Incorrect value in TEMPLATE_REGISTRY: {TEMPLATE_REGISTRY[template_key]}")
            return False
        
        print("✅ Registry update is correct")
        return True
    except Exception as e:
        print(f"❌ Error testing registry: {e}")
        return False

def test_prompt_generator():
    """Test that the prompt generator can load the new configuration."""
    print("🔍 Testing prompt generator...")
    
    try:
        from ai.prompts.prompt_generator import PromptGenerator
        
        generator = PromptGenerator()
        
        # Test loading the prompt configuration
        test_variables = {
            "titre_sequence": "Le héros romantique",
            "description_sequence": "Étude des caractéristiques du héros romantique dans la littérature du XIXe siècle",
            "problematique": "Comment le héros romantique incarne-t-il les aspirations et les contradictions de son époque ?",
            "niveau_classe": "4ème"
        }
        
        system_prompt, user_prompt = generator.generate_prompts(
            "lecon", "introsequence", test_variables
        )
        
        if not system_prompt or not user_prompt:
            print("❌ Failed to generate prompts")
            return False
        
        # Check that variables were injected
        if "Le héros romantique" not in user_prompt:
            print("❌ Variables not properly injected into user prompt")
            return False
        
        print("✅ Prompt generator works correctly")
        return True
    except Exception as e:
        print(f"❌ Error testing prompt generator: {e}")
        return False

def test_database_schema():
    """Test that the database schema includes the new subtype."""
    print("🔍 Testing database schema update...")
    
    try:
        # Check that init_db.py has been updated
        init_db_path = Path("init_db.py")
        if not init_db_path.exists():
            print("❌ init_db.py not found")
            return False
        
        with open(init_db_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if "'INTROSEQUENCE'" not in content:
            print("❌ INTROSEQUENCE not found in init_db.py")
            return False
        
        if "'Introduction de séquence'" not in content:
            print("❌ INTROSEQUENCE description not found in init_db.py")
            return False
        
        print("✅ Database schema update is correct")
        return True
    except Exception as e:
        print(f"❌ Error testing database schema: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Testing INTROSEQUENCE implementation...\n")
    
    tests = [
        test_prompt_config,
        test_json_schema,
        test_html_template,
        test_registry_update,
        test_prompt_generator,
        test_database_schema
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
    
    print("="*50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! INTROSEQUENCE implementation is ready.")
        print("\n📝 Next steps:")
        print("1. Run 'python init_db.py' to update the database")
        print("2. Test the AI generation through the API or frontend")
        return True
    else:
        print(f"❌ {total - passed} test(s) failed. Please fix the issues before proceeding.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)