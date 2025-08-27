#!/usr/bin/env python3
"""
Test script to verify HTML editor prompt configuration
"""

from ai.prompts.prompt_generator import PromptGenerator

def test_html_editor_prompt():
    try:
        # Load the HTML editor prompt configuration
        pg = PromptGenerator('html_editor')
        print('✅ HTML editor prompt configuration loaded successfully')
        print(f'Description: {pg.config.get("description_courte", "N/A")}')
        
        # Test building a prompt
        system_prompt, user_prompt = pg.build(
            user_message='Add a paragraph about French literature',
            current_html='<div>Existing content</div>',
            conversation_history=[]
        )
        print('✅ Prompt building successful')
        print(f'System prompt length: {len(system_prompt)} chars')
        print(f'User prompt length: {len(user_prompt)} chars')
        
        # Show a snippet of the generated prompt
        print('\n--- System Prompt Preview ---')
        print(system_prompt[:200] + '...' if len(system_prompt) > 200 else system_prompt)
        
        print('\n--- User Prompt Preview ---')
        print(user_prompt[:300] + '...' if len(user_prompt) > 300 else user_prompt)
        
        return True
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    test_html_editor_prompt()