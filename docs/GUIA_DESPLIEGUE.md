# Guía de Publicación en GitHub Pages y Configuración de Google Cloud OAuth

## 1. Publicación en GitHub Pages

La aplicación está preparada para desplegarse como sitio web estático bajo la organización de la Secretaría de Educación de Caldas.

- **Usuario / Organización GitHub:** `sedcaldas`
- **Nombre del Repositorio:** `computadoresparaeducar`
- **URL Prevista:** `https://sedcaldas.github.io/computadoresparaeducar/`

### Pasos para Activar GitHub Pages en el Repositorio

1. Ingrese a GitHub en el repositorio `sedcaldas/computadoresparaeducar`.
2. Vaya a la pestaña **Settings** (Configuración) > **Pages**.
3. En la sección **Build and deployment**:
   - **Source:** Seleccione `Deploy from a branch` (o `GitHub Actions`).
   - **Branch:** Seleccione la rama `main` y carpeta `/ (root)`.
   - Haga clic en **Save**.
4. En pocos minutos el sitio estará disponible públicamente en la URL indicada.

> [!TIP]
> El archivo `.nojekyll` ya está incluido en la raíz del repositorio para garantizar que todos los archivos estáticos y carpetas sean servidos correctamente sin procesamiento de Jekyll.

---

## 2. Configuración de Google Cloud Platform (OAuth 2.0 & Drive API)

Para habilitar la sincronización real con Google Drive sin servidores intermedios, siga estos pasos en la consola de Google Cloud:

### Paso 1: Crear o Seleccionar Proyecto
1. Acceda a [Google Cloud Console](https://console.cloud.google.com/).
2. Cree un nuevo proyecto, por ejemplo: `sedcaldas-cpe-documental`.

### Paso 2: Habilitar Google Drive API
1. En el menú de navegación, vaya a **APIs & Services** > **Library** (Biblioteca).
2. Busque **Google Drive API** y haga clic en **Enable** (Habilitar).

### Paso 3: Configurar la Pantalla de Consentimiento OAuth
1. Vaya a **APIs & Services** > **OAuth consent screen** (Pantalla de consentimiento).
2. Seleccione el tipo de usuario:
   - **Internal:** Recomendado si todos los funcionarios usan Google Workspace de `@sedcaldas.gov.co`.
   - **External:** Si participan acudientes o rectores con cuentas de correo de otros dominios.
3. Complete los campos obligatorios:
   - Nombre de la aplicación: `Sistema de Gestión Documental CPE Caldas`
   - Correo de soporte del desarrollador.
4. En la sección **Scopes** (Permisos), agregue:
   - `https://www.googleapis.com/auth/drive.file` (Crear y editar archivos creados por la app)
   - `https://www.googleapis.com/auth/drive` (Gestión de la carpeta compartida oficial)
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`

### Paso 4: Crear Credencial OAuth Client ID para Aplicación Web
1. Vaya a **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth Client ID**.
2. Tipo de aplicación: **Web application** (Aplicación web).
3. Nombre: `Cliente GitHub Pages SED Caldas`.
4. En **Authorized JavaScript origins** (Orígenes de JavaScript autorizados), agregue:
   - `https://sedcaldas.github.io`
   - `http://localhost:8000` (para pruebas locales)
   - `http://127.0.0.1:8000`
5. Haga clic en **Create**.
6. Copie el **Client ID** generado: `145744770636-qt8k12nfam0fmjfkpi66ct0fkq9b9n9j.apps.googleusercontent.com`.

> [!IMPORTANT]
> **Sin Secreto en Repositorio:** Para aplicaciones web estáticas en navegador, el Client ID es el identificador público autorizado. Los secretos de cliente (Client Secrets) jamás deben exponerse ni incluirse en el código ni en el repositorio de GitHub.

---

## 3. Configuración en la Aplicación

1. Abra la aplicación en GitHub Pages o servidor local.
2. Haga clic en el botón superior **Google Drive Activo** o vaya al panel de Administrador > Parámetros.
3. El **Google Cloud Client ID** oficial (`145744770636-qt8k12nfam0fmjfkpi66ct0fkq9b9n9j.apps.googleusercontent.com`) se encuentra preconfigurado en la aplicación.
4. Verifique que el ID de la carpeta raíz sea el oficial: `1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51`.
5. Haga clic en **Guardar Configuración**.
6. A partir de ese momento, al hacer clic en **Iniciar sesión con Google OAuth**, los usuarios podrán autenticarse con sus cuentas institucionales y los archivos se subirán directamente a Google Drive.
