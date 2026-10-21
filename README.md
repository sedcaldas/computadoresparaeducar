# Sistema de Gestión Documental de Dotación Tecnológica
### Secretaría de Educación de Caldas & Computadores para Educar

Aplicación web estática (SPA) para la generación, diligenciamiento, legalización, revisión, aprobación y consulta de los formatos institucionales oficiales de entrega de equipos tecnológicos:

- **LOG-026-F (.docx):** Acta de Verificación y Legalización de Bolsa Tecnológica.
- **LOG-029-F (.xlsx):** Formato Informe Validación Bolsa Tecnológica.
- **LOG-007-F (.docx):** Legalización y Entrega Directa de Equipos a Estudiantes Beneficiarios.

---

## 🏛️ Arquitectura 100% Estática (Sin Servidor / Sin Backend)

Cumpliendo rigurosamente con los requerimientos de `SKILLs.md`:

1. **GitHub Pages:** Entrega HTML5, CSS3, JavaScript y recursos estáticos.
2. **Google Drive:** Único almacenamiento remoto para plantillas oficiales, documentos generados, versiones e índices (`1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51`).
3. **Google Identity Services (GIS):** Autenticación directa en navegador mediante OAuth 2.0 (Token Client) sin secretos de servidor.
4. **Procesamiento Client-Side:** Generación de Word (.docx) y edición de Excel (.xlsx) ejecutada íntegramente en el navegador del usuario utilizando `JSZip` y `ExcelJS`.
5. **Almacenamiento Local y Caché:** Permite alta velocidad y funcionamiento offline mediante almacenamiento local e IndexedDB con datos oficiales precargados de 22 municipios, 59 sedes y 90 estudiantes beneficiarios de Caldas.

---

## 👥 Perfiles y Credenciales Institucionales de Acceso

| Perfil | Alcance | Credencial de Acceso | Funcionalidad Principal |
|---|---|---|---|
| **Administrador** | Departamental | Credencial Institucional Autorizada | Importación Excel versionada, gestión de seriales, CRUD y auditoría. |
| **Coordinador** | Departamental | Credencial Institucional Autorizada | Revisión, aprobación final, devoluciones y descarga masiva ZIP con manifiesto. |
| **Rector** | Institución Educativa | Código DANE de la Institución | Diligenciamiento de LOG-026/029 y aprobación de LOG-007 de sus sedes. |
| **Acudiente** | Estudiante Beneficiario | Documento del Estudiante | Descarga en 1 clic de LOG-007-F y carga del formato firmado. |

---

## 🚀 Despliegue y Ejecución

### Opción 1: GitHub Pages (Producción)
- **Repositorio:** `https://github.com/sedcaldas/computadoresparaeducar`
- **URL Desplegada:** `https://sedcaldas.github.io/computadoresparaeducar/`
- Despliegue directo desde la rama principal (`main`).

### Opción 2: Ejecución Local
Puede servirse con cualquier servidor estático HTTP local:

```bash
# Con Node.js npx serve
npx serve .

# O con Python
python -m http.server 8000
```

Abra su navegador en `http://localhost:8000` (o `http://127.0.0.1:8000`).

---

## 🧪 Pruebas Automatizadas

La aplicación cuenta con una suite completa de pruebas para los 20 criterios de aceptación de `SKILLs.md`:

```bash
# Ejecutar pruebas en terminal con Node.js
node tests/test_logic.js
```

También puede abrir el ejecutor interactivo en el navegador en:
`http://localhost:8000/tests/test_runner.html`

---

## 📚 Entregables y Documentación Técnica

Todos los entregables requeridos se encuentran documentados detalladamente en la carpeta `docs/`:

1. [Arquitectura Sin Servidor](file:///docs/ARQUITECTURA.md) — Diagrama de arquitectura y flujo sin backend.
2. [Modelo Lógico de Archivos e Índices](file:///docs/ENTIDAD_RELACION.md) — Jerarquía de carpetas en Google Drive y diccionario de datos.
3. [Matriz de Perfiles y Permisos](file:///docs/MATRIZ_PERMISOS.md) — Matriz de acciones y permisos reales en Drive.
4. [Mapa de Campos Excel a Plantillas](file:///docs/MAPA_CAMPOS.md) — Correspondencia exacta de celdas y tablas.
5. [Diagrama de Flujo de Estados](file:///docs/FLUJO_ESTADOS.md) — Ciclo de vida y diagrama de secuencia de aprobaciones.
6. [Guía de Despliegue y OAuth](file:///docs/GUIA_DESPLIEGUE.md) — Pasos para GitHub Pages y Google Cloud Console.
7. [Manual de Usuario por Roles](file:///docs/MANUAL_USUARIOS.md) — Guías paso a paso para acudientes, rectores y coordinadores.
8. [Procedimiento de Respaldo y Soporte](file:///docs/RESPALDO_SOPORTE.md) — Versionamiento en Drive y canales de soporte.
9. [Informe de Pruebas y Criterios de Aceptación](file:///docs/INFORME_PRUEBAS.md) — Resultados y evidencias de los 20 criterios.
