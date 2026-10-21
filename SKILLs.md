# SKILL.md — Aplicación de gestión documental de equipos tecnológicos

## 1. Propósito

Desarrollar una aplicación web para generar, diligenciar, cargar, revisar, aprobar, devolver, consultar y descargar tres formatos institucionales:

1. **LOG-026-F (.docx):** acta de verificación y legalización de elementos de la Bolsa Tecnológica.
2. **LOG-029-F (.xlsx):** formato de informe de validación de la Bolsa Tecnológica.
3. **LOG-007-F (.docx):** acta de legalización y entrega directa de equipos a estudiantes.

La aplicación debe usar los archivos Excel de origen y las plantillas oficiales suministradas, conservar el contenido institucional de los formatos y permitir la trazabilidad de cada documento durante su ciclo de revisión y aprobación.

## 2. Archivos de entrada

La aplicación debe permitir cargar, validar y actualizar estos archivos:

- `BOLSA TECNOLOGICA CALDAS.xlsx`: fuente para generar y diligenciar LOG-026-F y LOG-029-F.
- `BASE ESTUDIANTES CALDAS.xlsx`: fuente para generar y diligenciar LOG-007-F.
- `LOG-026-Acta de Verificacion y Legalizacion de para bolsa_V1.docx`: plantilla oficial LOG-026-F.
- `LOG-029-F Formato Informe Validación Bolsa Tecnologica.xlsx`: plantilla oficial LOG-029-F.
- `LOG-007-F LEGALIZACIO_N Y ENTREGA DIRECTA DE EQUIPOS.docx`: plantilla oficial LOG-007-F.

Los nombres deben poder configurarse si la entidad cambia los archivos o sus versiones. Antes de programar el mapeo de campos, inspeccionar las hojas, columnas, tablas, marcadores y celdas reales de cada archivo. No asumir nombres de columnas ni posiciones de celdas sin verificarlos.

## 3. Objetivos funcionales

- Generar LOG-026-F en Word desde `BOLSA TECNOLOGICA CALDAS.xlsx`, por institución/sede según la estructura real de la fuente.
- Diligenciar LOG-029-F en Excel desde el mismo archivo, preservando las hojas, fórmulas, formatos, validaciones y catálogos de la plantilla.
- Generar LOG-007-F en Word desde `BASE ESTUDIANTES CALDAS.xlsx`, usando los datos disponibles de estudiante, acudiente, institución, sede y equipo.
- Permitir al acudiente descargar el LOG-007-F, firmarlo fuera de la aplicación y cargar la versión firmada.
- Permitir al rector aprobar o devolver el LOG-007-F con observaciones.
- Permitir al coordinador revisar el LOG-007-F aprobado por el rector y aprobarlo o devolverlo al rector con observaciones.
- Permitir al rector consultar, descargar, diligenciar y cargar LOG-026-F y LOG-029-F, y enviarlos al coordinador.
- Permitir al coordinador aprobar o devolver LOG-026-F y LOG-029-F por inconsistencias, registrando observaciones.
- Permitir al rector cargar LOG-007-F en nombre del acudiente si este no puede realizar la operación.
- Permitir al coordinador cargar LOG-007-F en nombre del rector cuando este no pueda realizar la operación, registrando actor y motivo.
- Permitir actualizar los Excel de origen y regenerar los documentos a partir de nuevas versiones.
- Incorporar una función para actualizar los seriales en la base de estudiantes/equipos, con validación y trazabilidad.
- Proporcionar al administrador operaciones CRUD sobre usuarios, datos y parámetros.
- Consultar los documentos generados y cargados en la carpeta compartida de Google Drive indicada en la sección 6.
- Permitir al coordinador descargar en su computador los documentos de su ámbito.
- Diseñar una interfaz sencilla, clara y adaptable para docentes y acudientes con poca experiencia tecnológica.
- Tomar como referencia visual el portal https://educacion.caldas.gov.co/.
- Publicar el frontend en GitHub Pages bajo el usuario `sedcaldas`, con el sitio/proyecto previsto `computadoresparaeducar`, verificando la URL y configuración reales antes del despliegue.

## 4. Perfiles y permisos

La aplicación debe tener exactamente cuatro perfiles: **administrador, coordinador, rector y acudiente**.

### 4.1 Administrador

- Crear, consultar, actualizar y desactivar usuarios, instituciones, sedes, estudiantes, asignaciones, seriales, documentos, plantillas y parámetros.
- Cargar nuevas versiones de los archivos Excel de origen.
- Validar la estructura de los archivos antes de importar datos.
- Ejecutar la generación y regeneración individual o masiva de documentos.
- Administrar las asociaciones entre coordinadores, rectores, instituciones y sedes.
- Configurar la integración con Google Drive de manera segura.
- Consultar inconsistencias, estados, errores e historial de auditoría.
- No eliminar silenciosamente documentos firmados o aprobados; conservar el historial de versiones.

### 4.2 Coordinador

- Consultar las instituciones y sedes que tenga asignadas.
- Consultar, descargar y revisar LOG-007-F remitidos por los rectores después de su aprobación inicial.
- Aprobar el LOG-007-F o devolverlo al rector con observaciones.
- Consultar, descargar y revisar LOG-026-F y LOG-029-F remitidos por el rector.
- Aprobar o devolver LOG-026-F y LOG-029-F por inconsistencias, con observaciones.
- Cargar LOG-007-F en nombre del rector cuando sea necesario; registrar motivo, fecha y usuario que ejecutó la carga.
- Descargar documentos individuales o paquetes por municipio, institución, sede, tipo de formato y estado.
- Consultar el historial de revisión y aprobación.
- No acceder a instituciones o sedes fuera de su ámbito autorizado.

### 4.3 Rector

- Acceder únicamente a las instituciones y sedes asignadas.
- Consultar estudiantes beneficiarios asociados a sus sedes.
- Descargar y revisar LOG-026-F y LOG-029-F generados a partir de los archivos de origen.
- Completar los campos que correspondan al rector y cargar los formatos diligenciados.
- Enviar LOG-026-F y LOG-029-F al coordinador para aprobación.
- Revisar LOG-007-F cargados por los acudientes y aprobarlos o devolverlos con observaciones.
- Cargar LOG-007-F en nombre del acudiente cuando este no pueda hacerlo.
- Consultar estados, observaciones, versiones y fechas de sus documentos.

### 4.4 Acudiente

- Ingresar con credenciales vinculadas al estudiante beneficiario.
- Consultar únicamente los documentos del estudiante asociado a su acceso.
- Descargar el LOG-007-F generado a partir de la base de estudiantes.
- Firmar el documento fuera de la aplicación y cargarlo de nuevo.
- Consultar el estado del documento y las observaciones de devolución.
- Reemplazar el documento devuelto y enviarlo nuevamente al rector.
- No consultar expedientes de otros estudiantes ni aprobar documentos.

La aplicación debe distinguir el documento de identidad del estudiante del documento del acudiente. La relación entre ambos debe provenir de la base oficial o de un procedimiento institucional validado.

## 5. Autenticación y contraseñas iniciales

Configurar las siguientes contraseñas iniciales solicitadas:

- **Rector:** código DANE de la institución educativa (`CODIGO_DANE`).
- **Acudiente:** número de cédula/documento del estudiante beneficiario, conforme al requerimiento.
- **Coordinador:** `gcaldas2026*`.
- **Administrador:** `gcaldas2026*`.

Medidas de seguridad obligatorias:

- Almacenar contraseñas mediante un algoritmo seguro de hash con sal; nunca en texto plano.
- Exigir cambio de contraseña en el primer acceso para administrador, coordinador y rector.
- Proporcionar un mecanismo seguro para cambiar y recuperar contraseñas.
- Limitar intentos de acceso y aplicar bloqueo temporal ante intentos repetidos.
- No incluir credenciales, claves de Google, tokens ni secretos en el frontend, repositorio ni archivos de configuración públicos.
- Aplicar autorización en backend para cada operación y cada recurso; ocultar botones en la interfaz no es suficiente.
- Proteger las sesiones y utilizar HTTPS.
- No registrar contraseñas, tokens ni datos personales innecesarios en logs.

Las contraseñas iniciales son temporales y deben sustituirse antes de operar con datos reales. No publicar las credenciales por defecto en el repositorio público ni en documentación accesible sin autorización.

## 6. Google Drive: almacenamiento y consulta de documentos

Carpeta compartida suministrada por el usuario:

https://drive.google.com/drive/folders/1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51?usp=drive_link

ID de carpeta raíz identificado en el enlace: `1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51`.

La aplicación debe permitir consultar los documentos de esta carpeta mediante una integración autorizada de Google Drive. Antes de implementar, comprobar que la cuenta/identidad de servicio utilizada tenga permisos suficientes sobre la carpeta y sus subcarpetas.

Estructura sugerida:

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

Reglas de almacenamiento:

- La carpeta del código DANE de la institución debe agrupar los formatos de todas sus sedes, manteniendo subcarpetas por sede.
- Organizar los expedientes por municipio, código DANE de institución y sede; no mezclar documentos de estudiantes distintos.
- Guardar en la base de datos el ID de Drive de cada archivo y carpeta.
- Registrar tipo documental, municipio, DANE de institución, DANE de sede, estudiante cuando aplique, versión, estado, autor de carga y fecha.
- No hacer públicas las carpetas ni utilizar enlaces permanentes sin control de acceso.
- La integración con Drive debe ejecutarse desde un backend seguro con una identidad institucional autorizada.
- Los permisos de Drive deben alinearse con los permisos de la aplicación.
- Mostrar al usuario enlaces de consulta/descarga solo después de verificar su autorización.

## 7. Arquitectura y publicación en GitHub Pages

Separar la solución en los siguientes componentes:

1. **Frontend:** aplicación web responsive, accesible y en español, con diseño inspirado en https://educacion.caldas.gov.co/.
2. **Backend/API:** autenticación, autorización, procesamiento de Excel/Word, generación de documentos, flujos de aprobación, auditoría e integración con Drive.
3. **Base de datos:** usuarios, roles, municipios, instituciones, sedes, estudiantes, acudientes, asignaciones, seriales, documentos, versiones, estados y observaciones.
4. **Google Drive:** almacenamiento de archivos generados y cargados.
5. **GitHub:** control de versiones y publicación del frontend.

GitHub Pages aloja sitios estáticos y no proporciona por sí solo autenticación segura, base de datos privada, secretos ni acceso seguro a Drive. Por ello, el frontend puede publicarse en GitHub Pages, pero las operaciones protegidas deben ejecutarse en un backend seguro. Documentar la tecnología elegida, variables de entorno, configuración de despliegue y procedimiento de actualización.

Usar el usuario `sedcaldas` y el nombre previsto `computadoresparaeducar` según la configuración institucional. Verificar si se trata del nombre del repositorio, proyecto o sitio antes de fijar la URL definitiva. No colocar credenciales de Google ni secretos en archivos públicos del repositorio.

## 8. Generación de documentos

### 8.1 LOG-026-F (.docx)

- Utilizar `BOLSA TECNOLOGICA CALDAS.xlsx` como fuente y LOG-026-F como plantilla.
- Generar un documento por institución/sede, de acuerdo con los registros reales del Excel.
- Completar solo los campos cuya correspondencia pueda verificarse: radicado, institución, sede, código DANE, municipio, departamento, elementos y cantidades, según las columnas disponibles.
- Dejar editables o en blanco los campos no presentes en la fuente que requieren intervención humana, como firmas u observaciones.
- Conservar el diseño, contenido institucional, secciones de firmas y anexos del formato oficial.
- No inventar datos ni alterar el contenido del documento.

### 8.2 LOG-029-F (.xlsx)

- Utilizar `BOLSA TECNOLOGICA CALDAS.xlsx` como fuente y el archivo LOG-029-F como plantilla.
- Inspeccionar y documentar las hojas, celdas, encabezados, fórmulas, validaciones y catálogos antes de escribir.
- Conservar las hojas, fórmulas, formatos, validaciones, rangos con nombre y hojas auxiliares.
- Completar únicamente las celdas de entrada verificadas.
- No reemplazar fórmulas por valores ni eliminar hojas auxiliares.
- Mostrar al rector campos faltantes e inconsistencias antes de permitir el envío al coordinador.

### 8.3 LOG-007-F (.docx)

- Utilizar `BASE ESTUDIANTES CALDAS.xlsx` como fuente y LOG-007-F como plantilla.
- Generar el documento por estudiante beneficiario o según la unidad de entrega establecida por la plantilla y la estructura de los datos.
- Completar institución, sede, códigos DANE, rector, municipio, radicado, estudiante, acudiente y datos del equipo únicamente cuando estén disponibles en la base.
- Conservar el contenido institucional, observaciones, espacios de firma y anexos.
- No insertar ni simular firmas. El acudiente debe descargar, firmar y cargar el documento.
- Usar un nombre consistente, por ejemplo `LOG-007-F_{DANE_SEDE}_{ID_ESTUDIANTE}_v01.docx`.
- Registrar la versión del Excel utilizada para generar cada documento.
- Si cambia la fuente, generar una nueva versión. No reemplazar silenciosamente un documento firmado o aprobado.

Antes de implementar generación masiva, construir y probar un mapa exacto de columnas/celdas de origen y campos de destino. No inferir posiciones sin inspeccionar los archivos reales.

## 9. Actualización de Excel y seriales

### 9.1 Actualización de archivos de origen

El administrador podrá cargar nuevas versiones de:
- `BOLSA TECNOLOGICA CALDAS.xlsx`
- `BASE ESTUDIANTES CALDAS.xlsx`
- Plantillas oficiales cuando exista una versión actualizada autorizada.

Al importar:

1. Validar extensión, tamaño, hojas y encabezados esperados.
2. Mostrar una vista previa con filas, sedes, estudiantes, duplicados, registros nuevos/modificados y campos incompletos.
3. Permitir confirmar o cancelar la importación.
4. Conservar la versión anterior y registrar usuario, fecha, archivo y resultado.
5. Validar relaciones entre municipio, institución, sede, estudiante y equipo.
6. Permitir regeneración individual o masiva y mostrar qué documentos serán afectados.
7. No reemplazar documentos aprobados sin versionamiento e historial.

### 9.2 Actualización de seriales

- Implementar una función específica para importar y actualizar seriales relacionados con estudiantes/equipos.
- Inspeccionar los encabezados reales antes de definir el mapeo.
- Validar seriales vacíos, duplicados, cambios de serial, elementos no asociados y conflictos.
- Mostrar una vista previa y pedir confirmación antes de aplicar los cambios.
- Mantener historial de valor anterior/nuevo, fecha, usuario, motivo y archivo fuente.
- Almacenar los seriales como texto para preservar ceros iniciales y evitar alteraciones.
- No asumir reglas de unicidad que no estén confirmadas por los archivos y el proceso institucional.

## 10. Flujos de aprobación

Cada documento debe tener estado, versiones y trazabilidad propios.

Estados sugeridos:

`Borrador → Generado → Pendiente de firma/carga → En revisión del rector → Devuelto al acudiente → En revisión del coordinador → Devuelto al rector → Aprobado`

### 10.1 LOG-007-F

1. El sistema genera el documento desde la base de estudiantes.
2. El acudiente descarga, firma fuera de la aplicación y carga el documento firmado.
3. El rector revisa y aprueba o devuelve con observaciones.
4. Si se devuelve, el acudiente corrige y vuelve a cargarlo. Si no puede hacerlo, el rector puede cargarlo en su nombre.
5. Una vez aprobado por el rector, el documento queda disponible para el coordinador.
6. El coordinador aprueba o devuelve al rector con observaciones.
7. Se conservan todas las versiones y acciones.

### 10.2 LOG-026-F y LOG-029-F

1. El rector descarga los formatos generados, los revisa y completa la información pendiente.
2. El rector carga los archivos diligenciados y los envía al coordinador.
3. El coordinador revisa y aprueba o devuelve por inconsistencias, indicando los motivos.
4. El rector corrige, carga una nueva versión y vuelve a remitirla.
5. Se conservan versiones anteriores y se identifica claramente la versión vigente y la aprobada.

### Reglas comunes

- Cargar un archivo no equivale a aprobarlo.
- La devolución exige motivo y comentario.
- Solo el perfil autorizado puede ejecutar cada transición.
- Registrar documento, estado anterior/nuevo, actor, rol, fecha/hora, comentario y versión.
- Cuando un rector o coordinador actúe en nombre de otro usuario, registrar quién ejecutó la acción y el motivo.

## 11. CRUD del administrador

Implementar operaciones de crear, consultar, actualizar y eliminar/desactivar, según corresponda, para:

- Usuarios y roles.
- Municipios.
- Instituciones educativas y sedes.
- Estudiantes y relaciones con acudientes.
- Asignaciones de equipos.
- Seriales.
- Plantillas y versiones.
- Archivos fuente e importaciones.
- Documentos y versiones.
- Observaciones y tareas de revisión.
- Configuración de Drive y parámetros de la aplicación.

Aplicar borrado lógico a registros asociados a expedientes. No eliminar silenciosamente registros o documentos que tengan firmas o aprobaciones; las anulaciones deben quedar auditadas.

## 12. Interfaz y facilidad de uso

Tomar como referencia visual https://educacion.caldas.gov.co/. Verificar colores, logotipo, tipografía y recursos institucionales autorizados antes de reutilizarlos.

La aplicación debe ser especialmente sencilla para docentes y acudientes:

- Interfaz en español, adaptable a celular, tableta y computador.
- Botones grandes y claros: “Descargar formato”, “Subir formato firmado”, “Enviar al rector” y “Corregir documento”.
- Una tarea principal por pantalla para acudientes.
- Instrucciones breves y numeradas: 1) descargar, 2) firmar, 3) subir.
- Evitar solicitar datos que ya estén en la base.
- Mostrar estados comprensibles: “Pendiente de revisión”, “Necesita corrección” y “Aprobado”.
- Explicar claramente qué se debe corregir cuando un documento sea devuelto.
- Confirmar antes de enviar, reemplazar o regenerar archivos.
- Soportar navegación por teclado, contraste suficiente, etiquetas visibles y mensajes de error útiles.
- Incluir ayuda y un canal de soporte institucional configurable.

## 13. Validación y calidad de datos

Validar como mínimo:

- Códigos DANE y correspondencia entre institución y sede.
- Existencia del estudiante en la base de beneficiarios.
- Relación entre estudiante, acudiente y sede.
- Campos obligatorios de cada formato.
- Radicados, elementos y cantidades según las fuentes.
- Seriales vacíos, duplicados o inconsistentes.
- Extensión, tamaño y tipo de archivos cargados.
- Correspondencia del documento firmado con el estudiante y sede correctos.
- Permisos del usuario para consultar o modificar el expediente.

Tratar códigos DANE, documentos de identidad, teléfonos y seriales como texto, preservando ceros iniciales. Reportar inconsistencias sin alterar automáticamente los datos originales.

## 14. Privacidad y seguridad

La aplicación puede procesar datos personales y de menores de edad:

- Aplicar mínimo privilegio y autorización por rol, institución, sede y estudiante.
- Cumplir la normativa de protección de datos aplicable y las políticas institucionales.
- No incluir datos reales de estudiantes en el repositorio, pruebas públicas, capturas ni incidencias de GitHub.
- Enmascarar documentos de identidad cuando no sea necesario mostrarlos completos.
- Usar HTTPS, sesiones protegidas y almacenamiento seguro de contraseñas.
- Validar archivos cargados y restringir extensiones y tamaños.
- Definir copias de seguridad, restauración y conservación documental.
- Registrar las descargas y exportaciones de expedientes.
- No publicar documentos ni carpetas de Drive con acceso abierto.

## 15. Descargas y exportaciones del coordinador

El coordinador podrá:

- Descargar documentos individuales.
- Filtrar por municipio, institución, sede, estudiante, tipo de formato, estado y fecha.
- Descargar paquetes ZIP por municipio, institución o sede.
- Obtener un manifiesto CSV/XLSX con documentos incluidos, estado, versión y fecha.
- Descargar solo los expedientes de su ámbito autorizado.
- Consultar cantidades de documentos generados, pendientes, aprobados, devueltos y con errores.

Las descargas deben estar autenticadas o usar enlaces temporales de duración limitada. No crear enlaces públicos permanentes.

## 16. Auditoría y monitoreo

Registrar como mínimo:

- Inicios de sesión y bloqueos.
- Creación y modificación de usuarios, roles y asignaciones.
- Importaciones y actualizaciones de Excel.
- Actualizaciones de seriales.
- Generación y regeneración de documentos.
- Cargas y descargas.
- Aprobaciones, devoluciones y comentarios.
- Cambios de configuración.
- Errores de procesamiento e integración con Drive.

Incluir un tablero administrativo con documentos por estado, pendientes por institución/sede, inconsistencias de importación, últimas actividades y errores. No guardar contraseñas, tokens ni datos personales innecesarios en la bitácora.

## 17. Requisitos no funcionales

- Seguridad por defecto y autorización en backend.
- Interfaz responsive y accesible.
- Compatibilidad con navegadores modernos.
- Procesamiento por lotes con reintentos seguros.
- Idempotencia para evitar duplicados.
- Versionamiento de archivos de origen, plantillas y documentos.
- Trazabilidad desde el dato fuente hasta el documento final.
- Manejo de errores sin pérdida de archivos cargados.
- Código modular y documentado.
- Configuración separada para desarrollo, pruebas y producción.
- Respaldos y procedimiento probado de recuperación.

## 18. Pruebas de aceptación

La aplicación estará lista cuando se demuestre que:

1. El administrador carga cada Excel y revisa una vista previa de validación.
2. LOG-026-F se genera con datos correctos por institución/sede.
3. LOG-029-F se diligencia sin destruir fórmulas, hojas auxiliares, validaciones ni formatos.
4. LOG-007-F se genera desde la base de estudiantes y conserva el contenido de la plantilla.
5. El acudiente puede descargar, firmar y cargar LOG-007-F.
6. El rector puede aprobar o devolver LOG-007-F con observaciones.
7. El coordinador puede aprobar o devolver LOG-007-F al rector.
8. El rector puede cargar LOG-007-F en nombre del acudiente con trazabilidad.
9. El coordinador puede cargar LOG-007-F en nombre del rector con trazabilidad.
10. El rector puede descargar, completar y cargar LOG-026-F y LOG-029-F.
11. El coordinador puede aprobar o devolver LOG-026-F y LOG-029-F con observaciones.
12. Las actualizaciones de Excel conservan versiones previas y permiten regeneración controlada.
13. La actualización de seriales detecta conflictos y conserva historial.
14. Los documentos quedan en las carpetas correctas de Drive y no son públicos.
15. El coordinador descarga solo información de su ámbito.
16. Un usuario no puede acceder a expedientes de otra institución cambiando manualmente una URL o identificador.
17. Las credenciales y secretos no aparecen en el frontend, repositorio ni logs.
18. La interfaz resulta comprensible en pruebas con usuarios de baja experiencia tecnológica.
19. Se comprueba la restauración de respaldos y el comportamiento ante fallos parciales.

## 19. Entregables

1. Código fuente y README.
2. Este archivo `SKILL.md`.
3. Diagrama de arquitectura.
4. Diagrama entidad-relación y diccionario de datos.
5. Matriz de roles y permisos.
6. Mapa de campos entre Excel y plantillas.
7. Diagrama de estados del flujo de aprobación.
8. Módulos de importación, validación y generación de documentos.
9. Integración segura con Google Drive.
10. Pruebas unitarias, de integración, seguridad y aceptación.
11. Guía de despliegue en GitHub Pages y del backend.
12. Manual breve para administrador, coordinador, rector y acudiente.
13. Procedimiento de respaldo, restauración y soporte.
14. Informe de pruebas con evidencias anonimizadas.

## 20. Fases de implementación

**Fase 1 — Inspección y mapeo:** revisar los archivos reales, identificar hojas, columnas, celdas y campos; entregar mapa de correspondencias y lista de inconsistencias.

**Fase 2 — Modelo y seguridad:** diseñar base de datos, perfiles, asignaciones, autenticación y auditoría antes de usar datos reales.

**Fase 3 — Generación documental:** implementar y probar LOG-026-F, LOG-029-F y LOG-007-F usando copias de las plantillas.

**Fase 4 — Flujos de aprobación:** implementar cargas, devoluciones, aprobaciones, comentarios, versiones y notificaciones.

**Fase 5 — Google Drive y descargas:** configurar la carpeta compartida, permisos, consulta y exportaciones del coordinador.

**Fase 6 — Administración y seriales:** implementar CRUD, importaciones versionadas y actualización de seriales.

**Fase 7 — Pruebas y despliegue:** ejecutar pruebas de aceptación, corregir hallazgos, desplegar frontend y backend y documentar la operación.

## 21. Instrucción para el agente de desarrollo

Actúa como arquitecto de software y desarrollador full-stack con experiencia en gestión documental, procesamiento de Excel/Word, control de acceso por roles y Google Drive API. Implementa esta especificación de forma incremental. Antes de programar, inspecciona los archivos reales y documenta el mapa de campos. No inventes datos, no alteres el contenido institucional de las plantillas, no expongas datos personales ni secretos y no marques como aprobado un documento sin una acción explícita del rol autorizado. Cuando falte una regla institucional, registra la pregunta y evita resolverla por suposición. Entrega código ejecutable, pruebas, documentación y evidencias de aceptación; no te limites a describir una solución.
