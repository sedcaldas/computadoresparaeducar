# Mapa de Correspondencia de Campos entre Archivos Excel y Plantillas Oficiales

Este documento formaliza la correspondencia exacta entre las fuentes de datos Excel suministradas por la Secretaría de Educación de Caldas y las plantillas oficiales institucionales de Computadores para Educar.

---

## 1. Mapeo para Formato LOG-026-F (.docx)
**Nombre Oficial:** Acta de Verificación y Legalización de Elementos de Bolsa Tecnológica  
**Fuente:** `BOLSA TECNOLOGICA CALDAS.xlsx`, Hoja `DISTRIBUCION POR SEDES`  
**Plantilla:** `LOG-026-Acta de Verificacion y Legalizacion de para bolsa_V1.docx`

| Campo en Plantilla Word | Ubicación en Tabla 0 | Columna Origen Excel | Tipo de Dato | Observaciones de Formato |
| :--- | :--- | :--- | :--- | :--- |
| **Nombre de la Institución Educativa** | Fila 1, Celda 1-2 | `NOMBRE_ESTABLECIMIENTO` | Texto | Se preserva nombre completo oficial |
| **Radicado Sede** | Fila 1, Celda 5 | `RADICADO` | Texto | Tratado como texto para evitar truncado |
| **Nombre de la sede Educativa** | Fila 2, Celda 1-2 | `NOMBRE_SEDE` | Texto | Nombre de sede beneficiaria directa |
| **Código DANE Sede** | Fila 2, Celda 5 | `CODIGO_DANE_SEDE` | Texto (12 dígitos) | Preserva ceros iniciales |
| **Departamento** | Fila 3, Celda 1-2 | `DEPARTAMENTO` | Texto | Fijo: "Caldas" |
| **Municipio** | Fila 3, Celda 5 | `MUNICIPIO` | Texto | Nombre del municipio oficial |
| **Modalidad de Legalización** | Fila 4, Celda 1 | Constante institucional | Texto | Valor institucional por defecto |
| **Nombre del Elemento (Izquierda)** | Filas 7-11, Celda 0 | Columnas 11 a 37 con `Cantidad > 0` | Texto | Nombre del elemento según catálogo |
| **Cantidad (Izquierda)** | Filas 7-11, Celda 1-2 | Valor numérico del elemento | Entero | Cantidad asignada a la sede |
| **Nombre del Elemento (Derecha)** | Filas 7-11, Celda 3-4 | Columnas 11 a 37 con `Cantidad > 0` | Texto | Elemento subsecuente |
| **Cantidad (Derecha)** | Filas 7-11, Celda 5 | Valor numérico del elemento | Entero | Cantidad asignada a la sede |
| **Observaciones** | Fila 19 | Intervención de rector | Texto | Editable por el rector |
| **Firmas** | Fila 21 en adelante | Espacio de suscripción | Firma | No se simula firma; suscripción física |

---

## 2. Mapeo para Formato LOG-029-F (.xlsx)
**Nombre Oficial:** Formato Informe Validación Bolsa Tecnológica  
**Fuente:** `BOLSA TECNOLOGICA CALDAS.xlsx`, Hoja `DISTRIBUCION POR SEDES`  
**Plantilla:** `LOG-029-F Formato Informe Validación Bolsa Tecnologica.xlsx` (Hoja `Formulario`)

> [!IMPORTANT]
> Se preservan intactas las fórmulas, tablas auxiliares y validaciones en las hojas: `Lista Elementos`, `Catalogo de Elementos`, `Sabana de Seriales Despachados` y `Validación Equipos Portatiles`.

| Celda en Hoja `Formulario` | Etiqueta / Descripción | Columna Origen Excel | Formato / Valor |
| :--- | :--- | :--- | :--- |
| **E8:F8** (combinada) | Fecha Inicial de validación | Generación / Inspección | `DD/MM/YYYY` |
| **I8:J8** (combinada) | Fecha Final de validación | Generación / Inspección | `DD/MM/YYYY` |
| **E9:F9** (combinada) | Departamento | `DEPARTAMENTO` | Texto ("Caldas") |
| **I9:J9** (combinada) | Municipio | `MUNICIPIO` | Texto |
| **E10:F10** (combinada) | Nombre de la IE / Entidad Territorial | `NOMBRE_ESTABLECIMIENTO` | Texto |
| **I10:J10** (combinada) | Nombre de la Sede Educativa | `NOMBRE_SEDE` | Texto |
| **E11:F11** (combinada) | Radicado | `RADICADO` | Texto |
| **I11:J11** (combinada) | Código Dane Sede | `CODIGO_DANE_SEDE` | Texto (12 dígitos) |
| **Columna D (Filas 18-28)** | NOMBRE DEL ELEMENTO DESPACHADO | Columnas 11 a 37 con cantidad > 0 | Texto según catálogo |
| **Columna E (Filas 18-28)** | CANTIDAD | Cantidad no nula | Entero |
| **Columna F (Filas 18-28)** | SERIAL | Base de seriales | Texto |
| **Columna G (Filas 18-28)** | ¿Elemento Funcional? | Validación en sitio | "SI" / "NO" |
| **Columna H (Filas 18-28)** | ¿Coincide serial despachado? | Verificación | "SI" / "NO" |
| **Columna I (Filas 18-28)** | ESTADO DE VALIDACIÓN | Resultado técnico | "Elemento validado sin novedades" |
| **Columna J (Filas 18-28)** | OBSERVACIONES | Observación técnica | Texto |

---

## 3. Mapeo para Formato LOG-007-F (.docx)
**Nombre Oficial:** Acta de Legalización y Entrega Directa de Equipos a Estudiantes  
**Fuente:** `BASE ESTUDIANTES CALDAS.xlsx`, Hoja `ESTUDIANTES BENEFICIADOS`  
**Plantilla:** `LOG-007-F LEGALIZACIO_N Y ENTREGA DIRECTA DE EQUIPOS.docx`

| Campo en Plantilla Word | Ubicación en Tabla | Columna Origen Excel | Transformación / Valor |
| :--- | :--- | :--- | :--- |
| **Fecha de Legalización** | Tabla 0, Fila 1, Celda 1 | Fecha del sistema | `DD de Mes de YYYY` |
| **Institución y Sede Educativa** | Tabla 0, Fila 2, Celda 1 | `NOMBRE_ESTABLECIMIENTO` + `NOMBRE_SEDE` | Concatenación: `{IE} - {SEDE}` |
| **Código DANE Sede** | Tabla 0, Fila 2, Celda 3 | `CODIGO_DANE_SEDE` | Texto (12 dígitos) |
| **Nombre del Rector** | Tabla 0, Fila 3, Celda 1 | Registro rector / IE | `Rector(a) {NOMBRE_ESTABLECIMIENTO}` |
| **Folios Anexos** | Tabla 0, Fila 4, Celda 1 | Conteo | "1 (Un folio)" |
| **Radicado Sede** | Tabla 0, Fila 5, Celda 1 | `RADICADO` | Texto |
| **Departamento** | Tabla 0, Fila 6, Celda 1 | `DEPARTAMENTO` | "Caldas" |
| **Municipio** | Tabla 0, Fila 6, Celda 3 | `MUNICIPIO` | Texto |
| **Tipo de terminal** | Tabla 0, Fila 7, Celda 1 | `COMPUTADOR PORTÁTIL` / `TABLETA` | Si Tableta: `● Tabletas ○ Portátiles`, Si Portátil: `○ Tabletas ● Portátiles` |
| **Cantidad de terminales** | Tabla 0, Fila 8, Celda 1 | Cantidad asignada | "1 (Uno)" |
| **Documento Estudiante** | Tabla 2, Fila 1, Celda 0 | `DOCUMENTO DE IDENTIDAD` | Texto (preserva ceros) |
| **Nombres y Apellidos Estudiante** | Tabla 2, Fila 1, Celda 1 | `NOMBRE 1` + `NOMBRE 2` + `APELLIDO 1` + `APELLIDO 2` | Concatenación limpia de nombres y apellidos |
| **Nombres y Apellidos Acudiente** | Tabla 2, Fila 1, Celda 2 | `acudiente_nombres` | Texto en mayúsculas |
| **Documento Acudiente** | Tabla 2, Fila 1, Celda 3 | `acudiente_documento` | Texto |
| **Celular Acudiente** | Tabla 2, Fila 1, Celda 4 | `acudiente_telefono` | Número telefónico de contacto |
| **Firma Acudiente** | Tabla 2, Fila 1, Celda 5 | Espacio en blanco | Firma manuscrita presencial del acudiente |
