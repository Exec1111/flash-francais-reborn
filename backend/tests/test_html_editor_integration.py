#!/usr/bin/env python3
"""
Integration test to verify HTML editor AI service with centralized prompts
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

async def test_html_editor_integration():
    """Test the complete HTML editor AI service workflow"""
    try:
        from ai.services.html_editor_ai_service import HtmlEditorAIService
        
        print('🔧 Testing HTML Editor AI Service Integration...')
        
        # Check if we have the required environment variable
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print('⚠️  GOOGLE_API_KEY not found in environment, testing configuration only...')
            
            # Test just the prompt generation without API call
            service = HtmlEditorAIService()
            print('✅ Service initialized successfully')
            print(f'   Model: {service.model_name}')
            print(f'   Prompt generator loaded: {service.prompt_generator is not None}')
            
            # Test prompt building
            test_vars = {
                "user_message": "Make the title red",
                "current_html": "<h1>Welcome</h1><p>Content here</p>",
                "conversation_history": []
            }
            
            system_prompt, user_prompt = service.prompt_generator.build(**test_vars)
            print('✅ Prompt generation successful')
            print(f'   System prompt: {len(system_prompt)} chars')
            print(f'   User prompt: {len(user_prompt)} chars')
            
            return True
        else:
            print('🤖 API key found, testing full workflow...')
            
            # Test the complete service
            service = HtmlEditorAIService()
            
            result = await service.process_html_modification(
                user_message="Add a paragraph about French poetry",
                current_html="<div><h1>French Literature</h1></div>",
                conversation_history=[],
                user_id=1
            )
            
            print('✅ Full workflow test successful')
            print(f'   Response message: {result.get("message", "N/A")[:100]}...')
            print(f'   Modified HTML length: {len(result.get("modified_html", ""))} chars')
            
            return True
            
    except Exception as e:
        print(f'❌ Integration test failed: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    result = asyncio.run(test_html_editor_integration())
    print(f'\n{"✅ Integration test PASSED" if result else "❌ Integration test FAILED"}')