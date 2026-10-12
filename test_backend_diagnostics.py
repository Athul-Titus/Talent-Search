import sys
import os
import traceback

sys.path.insert(0, os.path.abspath('backend'))

print("--- Testing Python Environment and Imports ---")
try:
    import fastapi
    print("FastAPI:", fastapi.__version__)
    import sqlalchemy
    print("SQLAlchemy:", sqlalchemy.__version__)
    import openai
    print("OpenAI:", openai.__version__)
    import pdfplumber
    print("pdfplumber:", pdfplumber.__version__)
    import docx
    print("python-docx: OK")
except Exception as e:
    print("Import error in dependencies:", e)
    traceback.print_exc()

print("\n--- Testing Backend App and Routers ---")
try:
    from backend.main import app
    print("Successfully imported FastAPI app:", app.title)
    
    # List all registered routes
    print("\n--- Registered Routes ---")
    for route in app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)
        print(f"{list(methods) if methods else 'ANY'} {path}")
except Exception as e:
    print("Error importing app:", e)
    traceback.print_exc()
