# Matriz de Roles y Permisos (RBAC)

De acuerdo con las secciones 4 y 11 de `SKILL.md`, la aplicación cuenta con exactamente cuatro perfiles de usuario. Cada operación está restringida en el backend mediante control de acceso basado en roles.

---

## 1. Matriz Operacional

| Operación / Recurso | Administrador | Coordinador | Rector | Acudiente | Reglas de Ámbito y Restricciones |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Autenticación en el sistema** | ✅ | ✅ | ✅ | ✅ | Hash PBKDF2. Bloqueo temporal tras 5 fallos. |
| **Cambio de contraseña propio** | ✅ | ✅ | ✅ | ✅ | Obligatorio en primer acceso para Admin, Coord y Rector. |
| **CRUD de Usuarios y Roles** | ✅ | ❌ | ❌ | ❌ | Solo administrador. Borrado lógico. |
| **Carga de nuevos archivos Excel** | ✅ | ❌ | ❌ | ❌ | Validación previa de estructura y vista previa. |
| **Actualización de seriales** | ✅ | ❌ | ❌ | ❌ | Detección de duplicados, vista previa y trazabilidad. |
| **Generación masiva de documentos** | ✅ | ❌ | ❌ | ❌ | Batch individual o total con reporte de resultados. |
| **Consultar bitácora de auditoría** | ✅ | ❌ | ❌ | ❌ | Consulta integral inmutable de eventos del sistema. |
| **Configuración de Google Drive** | ✅ | ❌ | ❌ | ❌ | Configuración de credenciales y carpeta raíz. |
| **Ver estudiantes beneficiarios** | ✅ | ✅ | ✅ | ❌ | Coordinador: ámbito regional. Rector: solo sus sedes. |
| **Descargar LOG-007-F sin firmar** | ✅ | ✅ | ✅ | ✅ | Acudiente: solo su propio hijo/representado. |
| **Cargar LOG-007-F firmado** | ✅ | ✅ | ✅ | ✅ | Acudiente para su hijo. Rector/Coord en su nombre con motivo. |
| **Cargar LOG-007-F en nombre de acudiente** | ✅ | ✅ | ✅ | ❌ | Exige registrar motivo formal y usuario ejecutor. |
| **Revisar LOG-007-F (Aprobar / Devolver)** | ✅ | ❌ | ✅ | ❌ | Rector sobre documentos cargados por acudientes. |
| **Aprobar / Devolver LOG-007-F a nivel departamental** | ✅ | ✅ | ❌ | ❌ | Coordinador sobre documentos aprobados por rectores. |
| **Cargar LOG-007-F en nombre del rector** | ✅ | ✅ | ❌ | ❌ | Coordinador con motivo registrado por contingencia. |
| **Consultar LOG-026-F y LOG-029-F** | ✅ | ✅ | ✅ | ❌ | Rector: sus sedes. Coordinador: sedes asignadas. |
| **Completar y remitir LOG-026-F y LOG-029-F** | ✅ | ❌ | ✅ | ❌ | Rector envía al coordinador para revisión técnica. |
| **Aprobar / Devolver LOG-026-F y LOG-029-F** | ✅ | ✅ | ❌ | ❌ | Coordinador por inconsistencias con observaciones obligatorias. |
| **Descargar documentos individuales** | ✅ | ✅ | ✅ | ✅ | Restringido estrictamente a la institución o estudiante. |
| **Descargar paquetes ZIP con manifiesto** | ✅ | ✅ | ❌ | ❌ | Coordinador descarga paquetes por municipio/sede con XLSX/CSV. |

---

## 2. Definición Detallada de Perfiles

### 2.1 Administrador
- **Ámbito:** Global (todo el departamento de Caldas).
- **Responsabilidad:** Mantenimiento de la plataforma, importación de fuentes de datos, auditoría, seguridad y parametrización de Drive.
- **Credencial Inicial:** `gcaldas2026*` (debe cambiarse al primer inicio).

### 2.2 Coordinador Departamental
- **Ámbito:** Departamental o por municipios asignados.
- **Responsabilidad:** Aprobación final de actas e informes técnicos, gestión de devoluciones, emisión de paquetes documentales para Computadores para Educar y soporte a rectores en contingencias.
- **Credencial Inicial:** `gcaldas2026*` (debe cambiarse al primer inicio).

### 2.3 Rector de Institución Educativa
- **Ámbito:** Exclusivamente la Institución Educativa y sus sedes asociadas (identificadas por el código DANE).
- **Responsabilidad:** Revisión inicial de las actas de entrega a estudiantes, diligenciamiento y firma de las actas y validaciones de Bolsa Tecnológica, y remisión formal al Coordinador.
- **Credencial Inicial:** Código DANE de la Institución Educativa (ej. `117013000306`). Exige cambio en primer acceso.

### 2.4 Acudiente
- **Ámbito:** Exclusivamente el expediente del menor beneficiario a su cargo.
- **Responsabilidad:** Descarga del formato LOG-007-F, firma física y carga digital del documento firmado. En caso de devolución, consulta las observaciones y carga la versión corregida.
- **Credencial Inicial:** Número del documento de identidad del estudiante beneficiario.
