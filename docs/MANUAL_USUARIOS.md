# Manual de Usuario del Sistema de Gestión Documental

Guía breve de operación para los cuatro perfiles institucionales: **Administrador**, **Coordinador**, **Rector** y **Acudiente**.

---

## 1. Perfil Acudiente (Diseño Simplificado en 3 Pasos)

El portal para acudientes está diseñado para personas con baja familiaridad tecnológica. Presenta únicamente el expediente de su hijo(a) beneficiario(a).

### Paso 1: Ingreso al Sistema
1. Digite el **número del documento de identidad del estudiante beneficiario** tanto en el campo *Usuario* como en el campo *Contraseña*.
2. Haga clic en **Ingresar**.

### Paso 2: Descargar el Formato
1. En pantalla observará los datos del estudiante, la sede educativa y el equipo asignado (Portátil o Tableta).
2. Presione el botón verde grande **1. Descargar Formato Oficial (LOG-007-F)**.
3. El archivo Word se descargará en su computador o celular.

### Paso 3: Firma y Carga del Documento
1. Imprima el documento (o acérquese a la sede educativa si no dispone de impresora).
2. Firme en el recuadro correspondiente a la fila del estudiante y acudiente.
3. Tome una fotografía clara y legible con su celular, o escanéelo en formato PDF o imagen.
4. En el portal, presione **2. Seleccionar archivo firmado**.
5. Presione el botón **3. Enviar al Rector para Aprobación**.

### ¿Qué hacer si el documento es devuelto?
- El estado cambiará a una alerta color ámbar: **"Necesita corrección"**.
- En pantalla aparecerá el motivo exacto indicado por el rector (por ejemplo: *"Firma ilegible"* o *"Falta número de teléfono"*).
- Corrija el documento y repita el Paso 3.

---

## 2. Perfil Rector de Institución Educativa

### Ingreso
- **Usuario:** Código DANE de la Institución Educativa (ej. `117013000306`).
- **Contraseña Inicial:** Código DANE de la Institución Educativa. En el primer acceso se le solicitará actualizar su contraseña.

### Funciones Principales:
1. **Revisión de Actas de Estudiantes (LOG-007-F):**
   - Ingrese a la pestaña **Estudiantes Beneficiarios**.
   - Revise el estado de cada estudiante.
   - Cuando un acudiente cargue su acta, aparecerá el botón **Revisar Documento**.
   - Puede presionar **Aprobar** (el documento pasará a revisión del Coordinador) o **Devolver** (debe digitar el motivo detallado de la corrección).
2. **Carga en Nombre del Acudiente:**
   - Si un acudiente en zona rural no tiene conectividad o celular, el rector puede recibir el acta en papel, digitalizarla y cargarla usando la opción **Cargar en nombre del acudiente**, digitando la justificación formal.
3. **Gestión de Bolsa Tecnológica (LOG-026-F y LOG-029-F):**
   - Ingrese a la pestaña **Bolsa Tecnológica**.
   - Descargue el acta Word (LOG-026-F) y el informe Excel (LOG-029-F) generados para sus sedes.
   - Complete la verificación en zona y cargue los archivos diligenciados con el botón **Remitir al Coordinador**.

---

## 3. Perfil Coordinador Departamental

### Ingreso
- **Usuario:** `coordinador_caldas`
- **Contraseña Inicial:** `gcaldas2026*`

### Funciones Principales:
1. **Centro de Revisión y Aprobación:**
   - Visualice todos los documentos remitidos por los rectores de los 27 municipios de Caldas.
   - Filtre por municipio, institución educativa, tipo de formato o estado.
   - Revise el contenido y emita la decisión formal: **Aprobar** o **Devolver al Rector con observaciones**.
2. **Descarga Masiva en Paquetes ZIP:**
   - En la sección **Exportación de Expedientes**, aplique los filtros requeridos (ej. Municipio Riosucio, Aprobados).
   - Presione **Descargar Paquete ZIP con Manifiesto**.
   - El sistema empaquetará los documentos organizados en carpetas e incluirá automáticamente un manifiesto en **Excel (.xlsx)** y **CSV** con el inventario completo.
3. **Carga en Nombre del Rector:**
   - En casos excepcionales de ausencia justificada del rector, puede cargar o remitir formatos registrando el motivo.

---

## 4. Perfil Administrador del Sistema

### Ingreso
- **Usuario:** `admin`
- **Contraseña Inicial:** `gcaldas2026*`

### Funciones Principales:
1. **Tablero de Control:** Métricas en tiempo real de avance departamental por municipio, formato y estado.
2. **Carga y Actualización de Archivos Fuente:** Importación controlada de nuevas versiones de `BOLSA TECNOLOGICA CALDAS.xlsx` y `BASE ESTUDIANTES CALDAS.xlsx` con validación previa de columnas.
3. **Gestión de Seriales:** Importación y asignación de seriales con detección automática de duplicados o conflictos y vista previa antes de aplicar.
4. **Generación Masiva:** Disparo de generación por lotes de LOG-026-F, LOG-029-F y LOG-007-F.
5. **Auditoría Integral:** Consulta de la bitácora con registro inmutable de IPs, usuarios, marcas de tiempo y detalles de cada operación.
6. **Integración con Google Drive:** Verificación del estado de sincronización con la carpeta raíz `1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51`.
