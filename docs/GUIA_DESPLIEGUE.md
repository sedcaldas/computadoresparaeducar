# Guía de Despliegue en GitHub Pages y Servidor Backend

Este documento detalla los pasos para publicar el frontend en **GitHub Pages** bajo la cuenta institucional `sedcaldas` y desplegar el **Backend API** en un entorno de producción seguro, de conformidad con la Sección 7 de `SKILL.md`.

---

## 1. Despliegue del Frontend en GitHub Pages

### 1.1 Configuración Institucional
- **Organización / Usuario:** `sedcaldas`
- **Nombre del Proyecto / Repositorio:** `computadoresparaeducar`
- **URL Prevista:** `https://sedcaldas.github.io/computadoresparaeducar/`

### 1.2 Flujo de Despliegue Automatizado (GitHub Actions)
Crear el archivo `.github/workflows/deploy.yml`:

```yaml
name: Despliegue Frontend GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout del repositorio
        uses: actions/checkout@v4

      - name: Configurar GitHub Pages
        uses: actions/configure-pages@v4

      - name: Subir artefacto del Frontend
        uses: actions/upload-pages-artifact@v3
        with:
          path: './frontend'

      - name: Desplegar en GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

> [!IMPORTANT]
> GitHub Pages aloja únicamente archivos estáticos públicos (HTML/CSS/JS). No almacena secretos, certificados de servicio ni credenciales de base de datos. Todas las operaciones autenticadas se comunican vía HTTPS con la API segura del backend.

---

## 2. Despliegue del Backend API

### 2.1 Requisitos de Sistema
- Sistema Operativo: Linux (Ubuntu 22.04 LTS / Debian 12) o Windows Server 2022.
- Python 3.12 o superior.
- Gestor de procesos: `systemd` o Docker.
- Proxy inverso: Nginx / Caddy con terminación TLS (HTTPS).

### 2.2 Variables de Entorno
Configurar las siguientes variables en el archivo `.env`:

```bash
PORT=8050
HOST=0.0.0.0
GESTION_DOC_SECRET="clave-super-secreta-institucional-caldas-2026"
GOOGLE_DRIVE_ROOT_FOLDER="1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51"
GOOGLE_APPLICATION_CREDENTIALS="/etc/gestion_doc/credentials.json"
ALLOWED_ORIGINS="https://sedcaldas.github.io,http://127.0.0.1:8050"
```

### 2.3 Servicio Systemd en Linux
Crear `/etc/systemd/system/gestion-documental.service`:

```ini
[Unit]
Description=Servicio API Gestion Documental CPE Caldas
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/gestion_documental/backend
EnvironmentFile=/var/www/gestion_documental/.env
ExecStart=/usr/local/bin/python3 -m uvicorn app:app --host 127.0.0.1 --port 8050 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 2.4 Configuración de Nginx con HTTPS
```nginx
server {
    listen 443 ssl http2;
    server_name api.cpe.educacion.caldas.gov.co;

    ssl_certificate /etc/letsencrypt/live/api.cpe.educacion.caldas.gov.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.cpe.educacion.caldas.gov.co/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 3. Modo de Demostración Local
Para ejecutar y evaluar la solución en entorno local:
```powershell
# En la raíz del proyecto
python run_server.py
```
Acceder en el navegador a: `http://127.0.0.1:8050/`.
