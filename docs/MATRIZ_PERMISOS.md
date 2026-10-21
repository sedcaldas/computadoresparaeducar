# Matriz de Perfiles, Acciones y Permisos Reales en Google Drive

## 1. Perfiles Institucionales y Acciones en la Aplicación

| Perfil | Alcance | Credencial Auxiliar Inicial | Acciones Permitidas |
|---|---|---|---|
| **Administrador** | Nivel Departamental Completo | `gcaldas2026*` | - Importar archivos Excel versionados.<br>- Actualización masiva de seriales.<br>- CRUD de municipios, sedes, estudiantes y usuarios.<br>- Configurar Google Drive y sincronizar índices.<br>- Consultar bitácora completa de auditoría. |
| **Coordinador** | Nivel Departamental Completo | `gcaldas2026*` | - Revisar formatos LOG-007-F, LOG-026-F y LOG-029-F.<br>- Aprobar formalmente expedientes.<br>- Devolver expedientes al Rector con observaciones obligatorias.<br>- Cargar documentos en nombre del Rector (con justificación).<br>- Descargar paquetes masivos ZIP con manifiesto CSV. |
| **Rector** | Institución Educativa y sus Sedes | Código DANE de la Institución | - Generar y diligenciar LOG-026-F y LOG-029-F por sede.<br>- Remitir formatos de bolsa al Coordinador.<br>- Generar LOG-007-F para estudiantes de sus sedes.<br>- Aprobar o devolver LOG-007-F al acudiente.<br>- Cargar LOG-007-F en nombre del acudiente (con justificación). |
| **Acudiente** | Estudiante Beneficiario Específico | Documento del Estudiante | - Descargar formato LOG-007-F prellenado.<br>- Firmar formato físico o digital.<br>- Cargar formato firmado a revisión.<br>- Consultar estado simplificado del trámite. |

## 2. Permisos Reales Requeridos en Google Drive

La aplicación estática deriva la seguridad de la cuenta de Google autenticada:

| Carpeta / Recurso en Drive | Administrador | Coordinador | Rector | Acudiente / Tercero |
|---|---|---|---|---|
| `/Bolsa_Tecnologica_Caldas/` (Raíz) | Editor / Propietario | Editor | Lector | Sin acceso directo |
| `/Indices/` | Editor | Lector / Editor | Lector | Sin acceso |
| `/Historial/` | Editor | Lector / Editor | Lector | Sin acceso |
| Carpetas de Institución (`{DANE_IE}`) | Editor | Editor | Editor (su IE) | Sin acceso |
| Formatos LOG-007-F Estudiantes | Editor | Editor | Editor | Solo carga mediante formulario |

> [!IMPORTANT]
> **Principio de Mínimo Privilegio:** Ninguna carpeta institucional debe compartirse con la opción "Cualquier persona con el enlace". El acceso debe otorgarse explícitamente a las cuentas institucionales `@sedcaldas.gov.co` de rectores y coordinadores.
