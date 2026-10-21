# Mapa de Campos de Excel a Plantillas Oficiales

Este documento especifica la correspondencia verificada campo a campo entre las bases de datos fuente en Excel y las plantillas institucionales oficiales de Computadores para Educar y la Gobernación de Caldas.

## 1. LOG-026-F (.docx) — Acta de Verificación y Legalización de Bolsa Tecnológica

**Fuente:** `BOLSA TECNOLOGICA CALDAS.xlsx` (Hoja: `DISTRIBUCION POR SEDES`)
**Plantilla:** `LOG-026-Acta de Verificacion y Legalizacion de para bolsa_V1.docx`

| Campo en Word (Tabla 0) | Posición en Plantilla | Columna Fuente en Excel | Regla de Transformación |
|---|---|---|---|
| Nombre Institución Educativa | Fila 1, Celda 1 | `NOMBRE_ESTABLECIMIENTO` (Col G) | Texto exacto institucional en mayúsculas |
| Radicado Sede | Fila 1, Celda 5 | `RADICADO` (Col B) | Número de radicado oficial asignado |
| Nombre de la Sede Educativa | Fila 2, Celda 1 | `NOMBRE_SEDE` (Col I) | Nombre de la sede beneficiaria |
| Código DANE Sede | Fila 2, Celda 5 | `CODIGO_DANE_SEDE` (Col H) | 12 dígitos, formateado como texto |
| Departamento | Fila 3, Celda 1 | `DEPARTAMENTO` (Col C) | `Caldas` |
| Municipio | Fila 3, Celda 5 | `MUNICIPIO` (Col E) | Nombre oficial del municipio |
| Detalle de Elementos (Nombre) | Filas 7 a 11, Cols 0 y 3 | Encabezados Cols K a AK | Nombres oficiales de los equipos |
| Detalle de Elementos (Cantidad) | Filas 7 a 11, Cols 1 y 5 | Valores de Cols K a AK | Cantidades mayores a cero en pares |

## 2. LOG-029-F (.xlsx) — Formato Informe Validación Bolsa Tecnológica

**Fuente:** `BOLSA TECNOLOGICA CALDAS.xlsx` (Hoja: `DISTRIBUCION POR SEDES`)
**Plantilla:** `LOG-029-F Formato Informe Validación Bolsa Tecnologica.xlsx`

> [!NOTE]
> Las hojas auxiliares `Lista Elementos`, `Catalogo de Elementos`, `Sabana de Seriales Despachados` y `Validación Equipos Portatiles` se preservan intactas con todas sus fórmulas y validaciones.

| Celda en Hoja 'Formulario' | Concepto | Columna Fuente en Excel | Formato / Valor |
|---|---|---|---|
| `E8` | Fecha Inicial de Validación | Fecha del sistema | `DD/MM/AAAA` |
| `I8` | Fecha Final de Validación | Fecha del sistema | `DD/MM/AAAA` |
| `E9` | Departamento | `DEPARTAMENTO` (Col C) | `Caldas` |
| `I9` | Municipio | `MUNICIPIO` (Col E) | Nombre del municipio |
| `E10` | Nombre Institución Educativa | `NOMBRE_ESTABLECIMIENTO` (Col G) | Nombre oficial |
| `I10` | Nombre Sede Educativa | `NOMBRE_SEDE` (Col I) | Nombre de sede |
| `E11` | Radicado Sede | `RADICADO` (Col B) | Radicado oficial |
| `I11` | Código DANE Sede | `CODIGO_DANE_SEDE` (Col H) | Código DANE 12 dígitos |
| `D18:D28` | Nombre del Elemento | Encabezados Cols K a AK | Equipos con cantidad > 0 |
| `E18:E28` | Cantidad Entregada | Valores Cols K a AK | Cantidad entera |
| `F18:F28` | Código de Validación | Constante institucional | `VALIDADO-ZONA-001` |
| `G18:G28` | Cumple Especificación | Validación técnica | `SI` |
| `H18:H28` | En Operación | Validación técnica | `SI` |
| `I18:I28` | Estado en Zona | Fórmula / Catálogo | `Validado sin novedades` |
| `J18:J28` | Observaciones | Verificación en sitio | `Conforme a despacho` |

## 3. LOG-007-F (.docx) — Legalización y Entrega Directa de Equipos a Estudiantes

**Fuente:** `BASE ESTUDIANTES CALDAS.xlsx` (Hoja: `ESTUDIANTES BENEFICIADOS`)
**Plantilla:** `LOG-007-F LEGALIZACIO_N Y ENTREGA DIRECTA DE EQUIPOS.docx`

| Campo en Word | Tabla / Posición | Columna Fuente en Excel | Regla de Transformación |
|---|---|---|---|
| Fecha de Legalización | Tabla 0, Fila 1, Celda 1 | Fecha del sistema | `DD de [Mes] de AAAA` |
| Institución y Sede | Tabla 0, Fila 2, Celda 1 | `NOMBRE_ESTABLECIMIENTO` y `NOMBRE_SEDE` | `[Nombre IE] - [Nombre Sede]` |
| Código DANE Sede | Tabla 0, Fila 2, Celda 3 | `CODIGO_DANE_SEDE` (Col I) | 12 dígitos como texto |
| Nombre del Rector | Tabla 0, Fila 3, Celda 1 | Institución educativa | `Rector(a) [Nombre IE]` |
| Cantidad de Folios | Tabla 0, Fila 4, Celda 1 | Constante documental | `1 (Un folio)` |
| Radicado Sede | Tabla 0, Fila 5, Celda 1 | `RADICADO` (Col B) | Radicado de entrega |
| Departamento | Tabla 0, Fila 6, Celda 1 | `DEPARTAMENTO` (Col C) | `Caldas` |
| Municipio | Tabla 0, Fila 6, Celda 3 | `MUNICIPIO` (Col F) | Nombre del municipio |
| Tipo de Terminal | Tabla 0, Fila 7, Celda 1 | `COMPUTADOR PORTÁTIL` / `TABLETA` | Casillas `● Tabletas ○ Portátiles` según corresponda |
| Cantidad de Terminales | Tabla 0, Fila 8, Celda 1 | Constante | `1 (Uno)` |
| Documento Estudiante | Tabla 2, Fila 1, Celda 0 | `DOCUMENTO DE IDENTIDAD` (Col Q) | Documento beneficiario |
| Nombres y Apellidos Estudiante | Tabla 2, Fila 1, Celda 1 | `NOMBRE 1`, `NOMBRE 2`, `APELLIDO 1`, `APELLIDO 2` | Nombre completo ordenado |
| Nombres y Apellidos Acudiente | Tabla 2, Fila 1, Celda 2 | `acudiente_nombres` (Col N) | Nombre del acudiente registrado |
| No. Documento Acudiente | Tabla 2, Fila 1, Celda 3 | `acudiente_documento` (Col O) | Documento de identidad |
| Teléfono Acudiente | Tabla 2, Fila 1, Celda 4 | Teléfono registrado / directorio | Número de contacto celular |
| Firma Acudiente | Tabla 2, Fila 1, Celda 5 | Espacio en blanco | Reservado para firma física o digital del acudiente |
