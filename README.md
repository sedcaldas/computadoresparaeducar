# Aplicación de Gestión Documental de Equipos Tecnológicos
### Secretaría de Educación Departamental de Caldas & Asociación Computadores para Educar

Sistema web de gestión, generación oficial, diligenciamiento, carga, revisión, aprobación, devolución, trazabilidad y exportación documental para los tres formatos oficiales del programa:

1. **LOG-026-F (.docx):** Acta de verificación y legalización de elementos de la Bolsa Tecnológica.
2. **LOG-029-F (.xlsx):** Formato de informe de validación de la Bolsa Tecnológica.
3. **LOG-007-F (.docx):** Acta de legalización y entrega directa de equipos a estudiantes beneficiarios.

Desarrollado en estricta conformidad con la especificación integral descrita en [`SKILL.md`](file:///c:/Users/hadiaz/Downloads/RV__Reporte_despacho_equipos_para_Estudiantes/SKILLs.md).

---

## 🚀 Inicio Rápido

### Requisitos
- Python 3.12+
- Navegador web moderno (Chrome, Edge, Firefox)

### Ejecución
```powershell
# En la raíz del proyecto
python run_server.py
```

Acceda en su navegador a:
- **Portal Web Principal:** [http://127.0.0.1:8050/](http://127.0.0.1:8050/)
- **Documentación Swagger OpenAPI:** [http://127.0.0.1:8050/docs](http://127.0.0.1:8050/docs)

---

## 👥 Credenciales Iniciales y Perfiles de Acceso (Sección 5)

La plataforma cuenta con una barra superior de **Acceso Rápido para Demostración / Evaluación**, permitiendo cambiar instantáneamente entre roles con un solo clic. También admite inicio de sesión tradicional con las credenciales formales:

| Perfil | Usuario | Contraseña Inicial | Ámbito / Alcance |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `gcaldas2026*` | Global: métricas, seriales, CRUD, auditoría, Drive |
| **Coordinador** | `coordinador_caldas` | `gcaldas2026*` | Departamental: revisión final, exportación ZIP con manifiesto |
| **Rector (Aguadas)** | `117013000306` | `117013000306` | Sede / IE: revisión LOG-007, diligenciamiento LOG-026/029 |
| **Rector (Belalcázar)** | `117088000255` | `117088000255` | Sede / IE: revisión LOG-007, diligenciamiento LOG-026/029 |
| **Acudiente (Estudiante 1)**| `1059812839` | `1059812839` | Expediente propio del menor en 3 pasos simples |

*Nota de Seguridad:* Todas las contraseñas se almacenan mediante algoritmo seguro **PBKDF2-HMAC-SHA256 con sal individual**. No se almacenan contraseñas en texto plano.

---

## 📂 Estructura del Proyecto

```text
RV__Reporte_despacho_equipos_para_Estudiantes/
├── backend/                                # Capa de servicios y API REST
│   ├── app.py                             # API FastAPI con rutas RBAC completas
│   ├── database.py                        # Esquema SQLite, llaves foráneas y restricciones
│   ├── security.py                        # Criptografía PBKDF2, tokens firmados y verificación
│   ├── seed_data.py                       # Ingesta inicial de los Excel y usuarios oficiales
│   ├── document_generator.py              # Generador Word (LOG-026/007) y Excel (LOG-029)
│   ├── approval_workflow.py               # Máquina de estados, devoluciones y trazabilidad
│   ├── serial_manager.py                  # Gestor de seriales con detección de conflictos
│   ├── coordinator_service.py             # Exportador ZIP por lotes con manifiesto XLSX/CSV
│   ├── drive_service.py                   # Jerarquía Google Drive y adaptador de almacenamiento
│   └── tests/                             # Batería de pruebas automatizadas
│       ├── test_documents.py              # Pruebas de generación documental
│       ├── test_workflow.py               # Pruebas del motor de estados y roles
│       └── test_acceptance.py             # Pruebas de aceptación según Sección 18
├── docs/                                  # Entregables formales de documentación
│   ├── ARQUITECTURA.md                    # Diagrama de arquitectura y componentes
│   ├── ENTIDAD_RELACION.md                # Diagrama ER y diccionario de datos
│   ├── MATRIZ_PERMISOS.md                 # Matriz de roles y permisos (RBAC)
│   ├── MAPA_CAMPOS.md                     # Mapeo exacto entre Excel y plantillas
│   ├── FLUJO_ESTADOS.md                   # Diagrama de estados del flujo de aprobación
│   ├── GUIA_DESPLIEGUE.md                 # Guía para GitHub Pages y backend de producción
│   ├── MANUAL_USUARIOS.md                 # Manuales breves para Admin, Coord, Rector, Acudiente
│   ├── RESPALDO_SOPORTE.md                # Respaldo, contingencia y canales de soporte
│   └── INFORME_PRUEBAS.md                 # Informe de pruebas con evidencias anonimizadas
├── frontend/                              # Aplicación web lista para GitHub Pages
│   ├── index.html                         # Estructura semántica accesible con diseño Caldas
│   ├── css/
│   │   └── styles.css                     # Diseño institucional, paleta verde/oro, responsive
│   └── js/
│       ├── api.js                         # Cliente HTTP y gestión de tokens
│       └── app.js                         # Enrutamiento dinámico, vistas reactivas y modales
├── generated_documents/                   # Archivos generados organizados según Google Drive
│   └── Bolsa_Tecnologica_Caldas/          # Jerarquía de carpetas por municipio, IE y sede
├── run_server.py                          # Script de lanzamiento directo
├── SKILLs.md                              # Especificación técnica oficial
└── README.md                              # Documentación general de la solución
```

---

## 🌐 Estructura de Carpetas en Google Drive (Sección 6)

La aplicación almacena y sincroniza los expedientes bajo la carpeta raíz oficial:
- **Carpeta Raíz Asignada:** [`1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51`](https://drive.google.com/drive/folders/1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51)

Estructura jerárquica respetada:
```text
/Bolsa_Tecnologica_Caldas/
  /{CODIGO_MUNICIPIO}_{MUNICIPIO}/
    /{CODIGO_DANE_IE}_{NOMBRE_IE}/
      /{CODIGO_DANE_SEDE}_{NOMBRE_SEDE}/
        /LOG-026-F/
          /Borradores/
          /En_revision/
          /Aprobados/
          /Devueltos/
        /LOG-029-F/
          /Borradores/
          /En_revision/
          /Aprobados/
          /Devueltos/
        /LOG-007-F/
          /{DOCUMENTO_ESTUDIANTE}/
            /Generados/
            /Firmados/
            /En_revision/
            /Aprobados/
            /Devueltos/
        /Historial/
```

---

## 🧪 Ejecución de Pruebas Automatizadas

Para ejecutar la suite completa de pruebas:
```powershell
python -m unittest discover -s backend/tests -p "test_*.py"
```
**Resultado:** 15 pruebas ejecutadas exitosamente (100% Satisfactorio).

---

## 🏛️ Despliegue en GitHub Pages (Sección 7)

El frontend está optimizado para publicarse en **GitHub Pages** bajo el usuario `sedcaldas` y el proyecto `computadoresparaeducar`:
- URL prevista: `https://sedcaldas.github.io/computadoresparaeducar/`
- El procedimiento detallado de GitHub Actions se encuentra en [`docs/GUIA_DESPLIEGUE.md`](file:///c:/Users/hadiaz/Downloads/RV__Reporte_despacho_equipos_para_Estudiantes/docs/GUIA_DESPLIEGUE.md).

---

## 📞 Soporte Institucional
- **Secretaría de Educación de Caldas:** `educacion@caldas.gov.co` | Tel: `(606) 8982444`
- **Computadores para Educar:** `info@cpe.gov.co` | WhatsApp: `318 548 1149`
