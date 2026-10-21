import os
import sys
import uvicorn

# Agregar el directorio backend al path de Python
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(BASE_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("=" * 70)
    print("SISTEMA DE GESTIÓN DOCUMENTAL - COMPUTADORES PARA EDUCAR CALDAS")
    print("Secretaría de Educación Departamental de Caldas")
    print("=" * 70)
    print("Iniciando servidor web en: http://127.0.0.1:8050")
    print("Documentación Swagger API: http://127.0.0.1:8050/docs")
    print("=" * 70)
    uvicorn.run("app:app", app_dir=backend_dir, host="127.0.0.1", port=8050, reload=False)
