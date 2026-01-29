
try:
    print("Attempting to import app.services.visuals...")
    from app.services.visuals import extract_visuals
    print("Import successful.")
except Exception as e:
    import traceback
    traceback.print_exc()
