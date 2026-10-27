# Manual de Usuario Final
## Sistema de Gestión Documental de Dotación Tecnológica
### Secretaría de Educación de Caldas & Computadores para Educar

**Versión:** 2.1.0  
**Dirigido a:** Rectores(as), Directivos Docentes, Equipo Departamental de Computadores para Educar (CPE) y Administradores del Sistema.

---

## 📑 Tabla de Contenido
1. [Introducción y Objetivos](#1-introducción-y-objetivos)
2. [Requisitos y Acceso a la Plataforma](#2-requisitos-y-acceso-a-la-plataforma)
3. [Guía para Rectores y Directivos Docentes](#3-guía-para-rectores-y-directivos-docentes)
   - 3.1 [Ingreso al Portal Institucional de Rectoría](#31-ingreso-al-portal-institucional-de-rectoría)
   - 3.2 [Gestión de Formatos de Bolsa Tecnológica (LOG-026-F y LOG-029-F)](#32-gestión-de-formatos-de-bolsa-tecnológica-log-026-f-y-log-029-f)
   - 3.3 [Legalización de Equipos para Estudiantes (LOG-007-F)](#33-legalización-de-equipos-para-estudiantes-log-007-f)
   - 3.4 [Procedimiento de Descarga, Firma Física y Carga de Actas de Estudiantes](#34-procedimiento-de-descarga-firma-física-y-carga-de-actas-de-estudiantes)
   - 3.5 [Atención a Devoluciones y Corrección de Expedientes](#35-atención-a-devoluciones-y-corrección-de-expedientes)
   - 3.6 [Descarga de Acta Consolidada LOG-007 en Excel](#36-descarga-de-acta-consolidada-log-007-en-excel)
4. [Guía para el Equipo de Computadores para Educar (CPE)](#4-guía-para-el-equipo-de-computadores-para-educar-cpe)
   - 4.1 [Acceso Oficial CPE](#41-acceso-oficial-cpe)
   - 4.2 [Bandeja de Revisión y Filtros de Búsqueda](#42-bandeja-de-revisión-y-filtros-de-búsqueda)
   - 4.3 [Aprobación Formal y Devolución a Rectoría](#43-aprobación-formal-y-devolución-a-rectoría)
   - 4.4 [Descarga de Paquetes ZIP Masivos con Manifiesto CSV](#44-descarga-de-paquetes-zip-masivos-con-manifiesto-csv)
5. [Guía para el Administrador del Sistema](#5-guía-para-el-administrador-del-sistema)
   - 5.1 [Panel General de Control y Métricas Departamentales](#51-panel-general-de-control-y-métricas-departamentales)
   - 5.2 [Importación de Archivos Fuente Excel](#52-importación-de-archivos-fuente-excel)
   - 5.3 [Actualización Individual y Masiva de Seriales](#53-actualización-individual-y-masiva-de-seriales)
   - 5.4 [Auditoría, Copias de Respaldo y Google Drive](#54-auditoría-copias-de-respaldo-y-google-drive)
6. [Preguntas Frecuentes y Soporte](#6-preguntas-frecuentes-y-soporte)

---

## 1. Introducción y Objetivos

El **Sistema de Gestión Documental** fue desarrollado para agilizar, transparentar y estandarizar la entrega y legalización de tecnología educativa en los municipios del departamento de Caldas en el marco del programa **Computadores para Educar (CPE)**.

### Modelo Operativo Centralizado en Rectoría
Para garantizar el éxito del proceso y evitar barreras por falta de conectividad o dispositivos en los hogares rurales y urbanos, **el Rector(a) y su equipo administrativo centralizan la totalidad de la gestión documental en la plataforma**:
- **Sin cuentas ni trámites digitales para acudientes:** Los acudientes únicamente acuden a la institución educativa para recibir el equipo tecnológico y firmar el acta física correspondiente.
- **Carga directa por Rectoría:** El rector descarga el formato prellenado, formaliza la entrega física, escanea o fotografía el documento firmado y lo carga directamente en el sistema institucional.
- **Sin errores de digitación:** Todos los formatos se pregeneran automáticamente con los datos oficiales de la institución, la sede, el radicado, el estudiante focalizado, el acudiente y el serial exacto asignado.
- **Custodia y preservación de expediente:** Cada archivo cargado o subsanado actualiza el expediente original (`v01`, `v02`, `v03`...), preservando el historial completo para auditorías del Ministerio de Educación, MinTIC o entes de control, sincronizándose con la carpeta compartida oficial de Google Drive.

---

## 2. Requisitos y Acceso a la Plataforma

### Requisitos Técnicos
- Navegador web moderno: **Google Chrome**, **Microsoft Edge**, **Mozilla Firefox** o **Safari**.
- Conexión a internet básica para la carga y descarga de formatos.
- Visor de archivos Word (.docx), Excel (.xlsx) o PDF para abrir y verificar los documentos descargados.

### Dirección de Acceso
Abra su navegador web e ingrese a la dirección oficial asignada en GitHub Pages o el servidor institucional:
`https://sedcaldas.github.io/ComputadoresParaEducar/` (o la URL local asignada en su red).

---

## 3. Guía para Rectores y Directivos Docentes

El Portal de Rectoría es el punto neurálgico donde el rector o directivo docente gestiona tanto la dotación institucional de la sede (Bolsa Tecnológica) como la legalización de los equipos individuales entregados a los estudiantes.

### 3.1 Ingreso al Portal Institucional de Rectoría

1. Al abrir la aplicación, observará la pantalla principal con el título **"Portal Institucional de Rectoría"**.
2. **Paso 1 - Municipio:** Seleccione en la lista desplegable el municipio donde se encuentra su establecimiento educativo (ej. *Aguadas*, *Anserma*, *Chinchiná*, *La Dorada*, *Manizales*, *Riosucio*, *Salamina*, etc.).
3. **Paso 2 - Institución Educativa:** El sistema filtrará automáticamente y listará las instituciones educativas en **estricto orden alfabético (A-Z)**. Seleccione su institución. Junto al nombre aparece el código DANE oficial entre paréntesis.
4. **Paso 3 - Contraseña Institucional:** Ingrese la clave asignada a su institución o el código DANE de su establecimiento.
5. Haga clic en el botón azul **"Ingresar al Portal de Rectoría"**.

---

### 3.2 Gestión de Formatos de Bolsa Tecnológica (LOG-026-F y LOG-029-F)

Al autenticarse, la primera pestaña activa es **"📦 Formatos Bolsa Tecnológica (LOG-026 / LOG-029)"**.

Aquí encontrará una tarjeta por cada sede beneficiaria de su institución con dotación de bolsa tecnológica:

1. **Datos de la Sede:**
   - Nombre de la sede y código DANE de la sede.
   - Número de **Radicado Sede** oficial (asignado por CPE).
   - Zona (Rural / Urbana).
2. **Inventario de Elementos Asignados:**
   - Visualización del inventario dotado (computadores de diseño, impresoras 3D, pantallas interactivas, kits de robótica, sensores) junto con su **Serial Oficial** verificado.
3. **Acciones para LOG-026-F (Acta de Legalización en Word):**
   - Haga clic en **"Descargar Word"** para obtener el documento prellenado con los datos del acta, señor(a) profesional de logística de CPE y la cuadrícula exacta de elementos y seriales ajustada a márgenes oficiales.
   - Una vez firmado en la institución, haga clic en **"Remitir al Coordinador"** para adjuntar el archivo firmado y remitirlo al equipo de CPE.
4. **Acciones para LOG-029-F (Informe de Validación Técnica en Excel):**
   - Haga clic en **"Descargar Excel"** para obtener la plantilla oficial del informe de validación con las fórmulas y hojas protegidas de catálogo intactas.
   - Una vez validado en campo, use el botón **"Remitir al Coordinador"** para cargar la versión final.

---

### 3.3 Legalización de Equipos para Estudiantes (LOG-007-F)

Haga clic en la segunda pestaña: **"🎓 Legalización Equipos Estudiantes (LOG-007)"**.

En esta sección se listan todos los estudiantes focalizados de su institución que reciben una terminal (tableta o computador portátil):
- **Nombre Completo y Documento de Identidad del Estudiante.**
- **Tipo de Terminal y Serial Oficial Asignado.**
- **Nombre y Documento del Acudiente Registrado.**
- **Estado Documental:** Muestra el estado del trámite (*Generado*, *En revisión del coordinador*, *Devuelto al rector* o *Aprobado*).

---

### 3.4 Procedimiento de Descarga, Firma Física y Carga de Actas de Estudiantes

Dado que el rector centraliza la carga, el flujo de trabajo para cada estudiante es el siguiente:

1. **Descargar Formato Prellenado:**
   - En la fila del estudiante beneficiario, haga clic en **"Descargar Word"**.
   - El sistema genera de forma instantánea el documento **LOG-007-F** con los datos del estudiante, acudiente, código DANE de la sede y el serial oficial exacto de la terminal.
2. **Impresión y Firma Física en Sede:**
   - Imprima el acta formal de entrega.
   - En el momento de la entrega de la terminal en la institución educativa, el acudiente firma físicamente en la casilla correspondiente a *Firma Acudiente* y el rector en la casilla de *Rectoría*.
3. **Digitalización y Carga por el Rector:**
   - Tome una fotografía clara o escanee el documento firmado en formato `.pdf`, `.docx`, `.jpg` o `.png`.
   - En la fila del estudiante, haga clic en el botón **"Cargar por Acudiente"** (o en el botón de carga del documento).
   - En la ventana modal, registre una breve observación (ej. *"Acta formal física firmada en sede durante jornada de entrega de equipos"*).
   - Adjunte el archivo escaneado y haga clic en **"Confirmar Carga"**.
4. **Envío Automático a Coordinación:**
   - El documento pasa de inmediato al estado **"En revisión del coordinador"** y queda a disposición del equipo de CPE para su validación y aprobación final.

---

### 3.5 Atención a Devoluciones y Corrección de Expedientes

Si el Coordinador Departamental de CPE detecta inconsistencias en algún documento (por ejemplo, firma cortada, documento borroso o error en algún anexo):
- El documento pasará al estado **"Devuelto al rector"**.
- En la tabla de estudiantes se mostrará el motivo y las observaciones técnicas ingresadas por el coordinador de CPE.
- Para corregirlo:
  1. El rector revisa la observación.
  2. Obtiene la nueva copia legible o corregida.
  3. Hace clic nuevamente en el botón de carga sobre el mismo documento.
  4. El sistema actualizará el expediente original a una nueva versión (`v02`, `v03`), conservando todo el historial de auditoría y remitiéndolo de nuevo a revisión de CPE.

---

### 3.6 Descarga de Acta Consolidada LOG-007 en Excel

En la parte superior derecha de la tabla de estudiantes, haga clic en el botón verde:  
**"📊 Descargar Acta Consolidada LOG-007 (Excel)"**

El sistema generará al instante un archivo oficial de Excel con el consolidado completo de todos los beneficiarios de su institución educativa (estudiante, acudiente, serial, radicado y estado), listo para archivo o reporte oficial.

---

## 4. Guía para el Equipo de Computadores para Educar (CPE)

El perfil de **Coordinación CPE** tiene la potestad de validar, devolver a los rectores y aprobar formalmente la totalidad de expedientes de los municipios de Caldas.

### 4.1 Acceso Oficial CPE
1. En el encabezado superior de la aplicación, haga clic en el botón con ícono de templo: **"🏛️ CPE"** (o en el pie del formulario de inicio de sesión: *"Entrar como CPE"*).
2. Se abrirá la ventana modal **"Acceso Oficial CPE"**.
3. Ingrese la contraseña institucional asignada al equipo de coordinación y haga clic en **"Ingresar"**.
4. En el encabezado observará la insignia dorada **"CPE"** y el indicador de sincronización en tiempo real con Google Drive.

---

### 4.2 Bandeja de Revisión y Filtros de Búsqueda
La pestaña **"📥 Bandeja de Revisión y Aprobación CPE"** presenta:
- **Tarjetas de Métricas:** Conteo total de formatos pregenerados, pendientes de revisión, aprobados formalmente y devueltos con novedades.
- **Barra de Filtros Multicriterio:**
  - **Filtrar por Municipio:** Seleccione cualquiera de los municipios para aislar sus expedientes.
  - **Institución Educativa (A-Z):** Lista desplegable ordenada alfabéticamente.
  - **Tipo de Formato:** Filtre por *LOG-026-F (Bolsa Word)*, *LOG-029-F (Bolsa Excel)* o *LOG-007-F (Estudiantes Word)*.
  - **Estado Documental:** Filtre por *En revisión del coordinador*, *Aprobado*, *Devuelto al rector*, etc.

---

### 4.3 Aprobación Formal y Devolución a Rectoría
Por cada documento en la tabla:
- **Descargar:** Permite descargar el documento en su estado actual (Word o Excel) para auditoría minuciosa.
- **Historial:** Muestra la ventana modal con todas las versiones anteriores, quién las subió, la fecha y los comentarios registrados.
- **Aprobar (Botón Azul):** Legaliza formalmente el documento. El estado pasa a **"Aprobado"**, se genera la copia definitiva y se sincroniza automáticamente con la carpeta compartida institucional de Google Drive.
- **Devolver (Botón Rojo):** Permite devolver el expediente a rectoría seleccionando el motivo y redactando las instrucciones técnicas requeridas para que el rector subsane el archivo.
- **Cargar por Rector (Botón Naranja):** Si el rector remitió un archivo por canal alternativo, el coordinador puede cargarlo en su nombre con la debida justificación de auditoría.

---

### 4.4 Descarga de Paquetes ZIP Masivos con Manifiesto CSV
En la pestaña **"📦 Descargas Masivas ZIP CPE con Manifiesto"**:
1. Seleccione los criterios de consolidación deseados (por Municipio, Tipo de Formato o Estado).
2. Haga clic en **"📦 Descargar Paquete ZIP Consolidado"**.
3. El sistema empaquetará en un solo archivo comprimido (.zip) todos los documentos solicitados junto con el archivo oficial **`MANIFIESTO_DOCUMENTAL.csv`**, el cual contiene la tabla de metadatos completa requerida para interventorías y entes de control.
4. También puede usar el botón **"📊 Descargar Acta Consolidada LOG-007 (Excel)"** para generar la sábana departamental de estudiantes.

---

## 5. Guía para el Administrador del Sistema

El rol de **Administrador General** está destinado al equipo de tecnología de la Secretaría de Educación Departamental para parametrización, importación masiva y mantenimiento de datos.

### 5.1 Panel General de Control y Métricas Departamentales
Al ingresar como Administrador:
- Visualiza el total de **Municipios**, **Instituciones**, **Sedes Beneficiarias** y **Estudiantes Focalizados**.
- **Pregenerar Formatos en Drive:** Dispara el proceso de pregeneración y sincronización masiva de todos los formatos hacia Google Drive.
- **Configurar Drive & OAuth:** Permite ajustar el Client ID de Google Cloud OAuth y la URL del Web App de Apps Script.
- **Descargar Respaldo JSON:** Genera una copia de seguridad íntegra de la base de datos del navegador en formato `.json`.
- **Restaurar Datos Iniciales:** Restablece los datos semilla oficiales en caso de pruebas o contingencias.

### 5.2 Importación de Archivos Fuente Excel
En la pestaña **"📁 Importación Excel Versionada"**:
- **Cargar Bolsa Tecnológica (`BOLSA TECNOLOGICA CALDAS.xlsx`):** Lee y valida la hoja `DISTRIBUCION POR SEDES`, detecta duplicados en códigos DANE, valida los 27 tipos de elementos tecnológicos y actualiza las asignaciones de las sedes.
- **Cargar Base de Estudiantes (`BASE ESTUDIANTES CALDAS.xlsx`):** Valida radicados, documentos de identidad, nombres de estudiantes y datos de acudientes, actualizando el censo focalizado para LOG-007-F.

### 5.3 Actualización Individual y Masiva de Seriales
En la pestaña **"🔢 Actualización de Seriales"**:
- **Edición en Línea:** Modifique directamente el serial asignado a cualquier estudiante en la tabla. El cambio se guarda inmediatamente y se audita.
- **Importar Lote de Seriales:** Suba un archivo Excel o CSV con las columnas de documento y serial para actualizar de forma masiva terminales despachadas.

### 5.4 Auditoría Inmutable
En la pestaña **"📋 Bitácora de Auditoría"**:
- Consulte el registro cronológico completo de accesos, aprobaciones, devoluciones y cambios de seriales, garantizando el principio de no repudio en la gestión documental.

---

## 6. Preguntas Frecuentes y Soporte

### ¿Los acudientes tienen usuario o contraseña en la plataforma?
**No.** Para agilizar el proceso y no depender de la conectividad en los hogares, los acudientes no requieren crear usuarios ni contraseñas. El acudiente acude a la institución educativa para recibir el equipo y firmar el acta impresa; es el **Rector(a)** quien se encarga de digitalizar y cargar el documento en el sistema institucional.

### ¿Qué pasa si se va la conexión a internet mientras trabajo en el portal?
La aplicación es **Offline-Resilient**. Puede seguir consultando datos y generando documentos localmente. Las acciones que requieran sincronización con Google Drive quedarán guardadas en la cola del navegador y se enviarán automáticamente tan pronto regrese la conexión.

### ¿Se pueden subir fotos tomadas con el teléfono celular?
**Sí.** El sistema acepta archivos con extensiones `.pdf`, `.docx`, `.jpg` y `.png`. Al tomar la fotografía del acta firmada, asegúrese de que la imagen sea nítida, bien iluminada y que tanto la firma del acudiente como la del rector sean completamente legibles.

### ¿Un documento cargado borra el documento anterior?
**No.** El sistema cumple la directriz estricta de **preservación de expediente**: el archivo nuevo incrementa la versión (`v02`, `v03`...) y se conserva el historial completo accesible desde el botón **"Historial"**.

### ¿A quién contactar en caso de dudas sobre los seriales asignados?
Para inconsistencias en seriales de equipos o radicados de sede, comuníquese con la mesa de ayuda de la **Secretaría de Educación de Caldas** o con el **Coordinador Departamental de Computadores para Educar**.
