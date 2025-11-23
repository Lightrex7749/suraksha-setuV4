import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
print(f"API Key loaded: {GEMINI_API_KEY[:10]}..." if GEMINI_API_KEY else "No API key found")

try:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini configured successfully")
    
    # List available models
    print("\n📋 Available models:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"  - {m.name}")
    
    # Try gemini-2.0-flash-exp
    print("\n🧪 Testing gemini-2.0-flash-exp...")
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    print("✅ Model created successfully")
    
    # Test a simple query
    response = model.generate_content("What is an earthquake in one sentence?")
    print(f"✅ Response: {response.text}")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
