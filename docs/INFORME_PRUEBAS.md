# Informe de Pruebas y Criterios de Aceptación

## 1. Resumen Ejecutivo de Pruebas

Se ejecutaron pruebas automatizadas sobre la suite completa de 20 criterios de aceptación establecidos en la sección 18 de `SKILLs.md`, verificando la funcionalidad 100% estática en navegador con Node.js y la suite interactiva `tests/test_runner.html`.

- **Total de Pruebas:** 20
- **Aprobadas:** 20 (100%)
- **Falladas:** 0
- **Estado General:** APROBADO SATISFACTORIAMENTE

---

## 2. Matriz de Resultados de los 20 Criterios de Aceptación

| # | Criterio de Aceptación de SKILLs.md | Resultado | Evidencia / Mecanismo de Validación |
|---|---|---|---|
| 1 | Publicación en GitHub Pages | **PASS** | Archivo estático `index.html`, workflow `.github/workflows/pages.yml`, y `.nojekyll`. |
| 2 | Google OAuth y permisos reales de Drive | **PASS** | Flujo Token Client de Google Identity Services con scopes mínimos. |
| 3 | Administrador carga Excel y ve vista previa | **PASS** | Módulo `importer.js` analiza hojas, filas, duplicados y muestra alerta previa. |
| 4 | LOG-026-F se genera con datos correctos por sede | **PASS** | Manipulación de XML de Word completando IE, DANE, sede, radicado y elementos. |
| 5 | LOG-029-F se diligencia preservando fórmulas | **PASS** | ExcelJS modifica hoja `Formulario` y preserva catálogos y fórmulas intactas. |
| 6 | LOG-007-F se genera desde base de estudiantes | **PASS** | Word generado con fecha, rector, acudiente, estudiante y casilla de firma libre. |
| 7 | Acudiente descarga, firma y carga LOG-007-F | **PASS** | Flujo simplificado: descarga en 1 clic y zona drag & drop para subir firmado. |
| 8 | Rector aprueba o devuelve LOG-007-F con notas | **PASS** | Botón de aprobación y modal de devolución con motivo y observaciones. |
| 9 | Coordinador aprueba o devuelve al rector | **PASS** | Bandeja de entrada con validación técnica y devolución justificada. |
| 10 | Representación: Rector por acudiente y Coord por rector | **PASS** | Módulo `workflow.js` registra `actor_real` y motivo obligatorio de actuación. |
| 11 | Rector descarga, completa y carga LOG-026 y 029 | **PASS** | Tab de Rectoría con generación, descarga y remisión con observaciones. |
| 12 | Coordinador aprueba/devuelve bolsa con observaciones | **PASS** | Validación de actas y control de versiones por sede educativa. |
| 13 | Actualizaciones de Excel conservan versiones | **PASS** | Generación incremental con sufijo `_v01`, `_v02` sin sobreescribir aprobados. |
| 14 | Actualización de seriales con detección de conflictos | **PASS** | Registro de seriales como texto, validación de vacíos y bitácora de cambios. |
| 15 | Archivos organizados por municipio, DANE y sede | **PASS** | Función `getTargetFolderForDocument` construye la ruta jerárquica estricta. |
| 16 | Coordinador descarga documentos autorizados | **PASS** | Empaquetador masivo ZIP con `MANIFIESTO_DOCUMENTAL.csv` descargable localmente. |
| 17 | Sin datos personales, claves ni secretos en GitHub | **PASS** | Client ID público; credenciales solo en sesión volátil; .gitignore configurado. |
| 18 | Interfaz comprensible para acudientes | **PASS** | 1 tarea por pantalla, botones grandes de alto contraste y estados simples. |
| 19 | Prueba de comportamiento ante edición concurrente | **PASS** | Almacén detecta discrepancia de versión (`expectedVersion < currentVersion`). |
| 20 | Documentación de límites de arquitectura sin backend | **PASS** | Advertencias visibles en banner UI y en `docs/ARQUITECTURA.md`. |

---

## 3. Limitaciones Conocidas Documentadas

1. **Seguridad en el Navegador:** El código JavaScript en el navegador es visible e inspeccionable. La seguridad de negocio real debe ser gestionada en Google Drive restringiendo los permisos de edición a las cuentas institucionales autorizadas.
2. **Concurrencia:** No existe soporte para transacciones distribuidas ni locks a nivel de fila entre múltiples usuarios en Google Drive. Si dos usuarios sincronizan el mismo índice a la vez, se advierte el conflicto y se recomienda recargar los datos.
