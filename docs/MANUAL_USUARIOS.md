# Manual de Usuario por Perfiles Institucionales

## 1. Guía Rápida para el Acudiente (Firma de LOG-007-F)

La interfaz del acudiente está diseñada para una **tarea principal por pantalla**, con botones grandes y lenguaje claro.

### Paso 1: Ingreso al Sistema
1. En la pantalla inicial, seleccione la tarjeta **Acudiente**.
2. Ingrese el **Documento de Identidad del Estudiante Beneficiario** (ejemplo: `1059812839`).
3. Haga clic en **Ingresar al Sistema**.

### Paso 2: Descargar el Formato Prellenado
1. En el **Paso 1**, haga clic en el botón azul **📥 Descargar Formato Word (.docx)**.
2. El archivo se descargará a su computador o teléfono con el nombre `LOG-007-F_[SEDE]_[DOCUMENTO]_v01.docx`.
3. Verifique que los datos del estudiante y acudiente sean correctos.

### Paso 3: Firmar el Documento
- **Opción A (Física):** Imprima el formato y firme a mano con bolígrafo negro en la casilla **Firma Acudiente**.
- **Opción B (Digital):** Si dispone de firma electrónica o digital, insértela en el archivo.
- **Opción C (En Sede Educativa):** Si no cuenta con impresora o internet, acérquese a la sede de la institución donde el rector le imprimirá el formato para su firma.

### Paso 4: Subir el Formato Firmado
1. Tome una foto clara con buena luz o escanee el documento firmado (en formato PDF, Word o Imagen).
2. En el **Paso 3**, haga clic en la casilla de carga y seleccione el archivo.
3. El estado cambiará automáticamente a `En revisión del rector`.

---

## 2. Guía para el Rector(a)

### Gestión de Formatos de Bolsa Tecnológica (LOG-026-F y LOG-029-F)
1. Ingrese con el perfil **Rector**, seleccionando su Institución Educativa e ingresando el Código DANE como contraseña.
2. En la pestaña **Formatos Bolsa Tecnológica**, verá el listado de las sedes asignadas.
3. Haga clic en **Generar** frente a cada formato:
   - `LOG-026-F`: Genera el acta formal en Word con los elementos y cantidades exactas.
   - `LOG-029-F`: Genera el informe técnico de validación en Excel preservando las fórmulas.
4. Descargue los formatos, verifique la entrega física de los equipos en la sede y firme el acta.
5. Haga clic en **Remitir** para enviar los expedientes diligenciados al Coordinador Departamental.

### Aprobación de Formatos LOG-007-F de Estudiantes
1. En la pestaña **Legalización Equipos Estudiantes**, verá los estudiantes beneficiarios.
2. Puede descargar el formato, revisarlo y:
   - **Aprobar:** Si la firma es correcta, para que pase a revisión del Coordinador.
   - **Devolver:** Si la firma es ilegible o faltan datos, indicando el motivo y la corrección requerida.
   - **Cargar por Acudiente:** Si el acudiente es de zona rural y entregó el documento en físico en la sede, cargue el documento registrando la justificación.

---

## 3. Guía para el Coordinador Departamental

### Revisión y Aprobación de Expedientes
1. Ingrese con el perfil **Coordinador** y la clave institucional `gcaldas2026*` (o mediante Google OAuth).
2. En la **Bandeja de Revisión**, consulte los documentos en trámite.
3. Acciones disponibles por expediente:
   - **Descargar:** Obtiene el archivo vigente generado o firmado.
   - **Historial:** Muestra la línea de tiempo completa de versiones y comentarios.
   - **Aprobar:** Aprueba formalmente el documento, cerrando el ciclo.
   - **Devolver:** Devuelve el expediente al Rector con observaciones obligatorias.
   - **Cargar por Rector:** Permite subsanar actas institucionales en representación.

### Descargas Masivas en ZIP con Manifiesto
1. Vaya a la pestaña **Descargas Masivas ZIP con Manifiesto**.
2. Aplique los filtros deseados (Municipio, Formato o Estado).
3. Haga clic en **Descargar Paquete ZIP Consolidado**.
4. Se descargará un archivo `.zip` que contiene los documentos organizados por carpeta y el archivo `MANIFIESTO_DOCUMENTAL.csv` con todos los metadatos de auditoría.

---

## 4. Guía para el Administrador

### Importación de Nuevas Versiones de Excel
1. En la pestaña **Importación Excel Versionada**, seleccione el archivo actualizado (`BOLSA TECNOLOGICA CALDAS.xlsx` o `BASE ESTUDIANTES CALDAS.xlsx`).
2. El sistema analizará las hojas, columnas, duplicados y diferencias.
3. Se mostrará una ventana de confirmación indicando cuántos registros nuevos o modificados se detectaron.
4. Al confirmar, los datos se aplicarán sin sobreescribir expedientes ya aprobados.

### Actualización de Seriales
1. En la pestaña **Actualización de Seriales**, puede editar los seriales directamente en la tabla o importar un archivo por lote.
2. Cada cambio registrará automáticamente el valor anterior, el nuevo valor, el autor, la fecha y el motivo en la bitácora de auditoría.
