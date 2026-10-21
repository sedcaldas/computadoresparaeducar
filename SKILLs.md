# SKILL.md — Aplicación web estática con GitHub Pages y Google Drive

## 1. Propósito

Desarrollar una aplicación web para generar, diligenciar, cargar, revisar, aprobar, devolver, consultar y descargar los formatos LOG-026-F (.docx), LOG-029-F (.xlsx) y LOG-007-F (.docx), utilizando exclusivamente:

- **GitHub Pages** para publicar el frontend estático.
- **Google Drive** como único almacenamiento remoto para archivos fuente, plantillas, documentos generados, documentos firmados, versiones e índices.

**Restricción obligatoria:** no crear ni utilizar servidores propios, backend, funciones serverless, API propia ni base de datos externa. La lógica se ejecutará en el navegador y la integración con Drive se hará directamente mediante Google OAuth y Google Drive API.

## 2. Arquitectura y límites técnicos

La aplicación será una SPA estática:

1. GitHub Pages entrega HTML, CSS, JavaScript y recursos estáticos.
2. El navegador procesa los Excel y genera los documentos con bibliotecas JavaScript compatibles con el entorno del navegador.
3. El usuario inicia sesión mediante Google OAuth.
4. El frontend consulta, descarga, crea y actualiza archivos directamente en Google Drive usando la identidad y los permisos reales del usuario.
5. Los archivos generados se cargan a Drive desde el navegador.

No usar Google Apps Script como backend, Cloud Functions, Cloud Run, proxies, servidores ni servicios equivalentes.

### Limitaciones que deben explicarse

Una aplicación estática no puede mantener secretos en el frontend ni garantizar por sí sola que una contraseña compartida o un rol guardado en JavaScript, `localStorage` o un JSON sea seguro. El código del frontend puede inspeccionarse y modificarse. Por tanto:

- No codificar contraseñas maestras, claves privadas, secretos OAuth ni tokens en el repositorio.
- Autenticar con Google OAuth y solicitar los scopes mínimos necesarios.
- Los permisos reales sobre documentos deben derivarse de los permisos de Google Drive de la cuenta autenticada.
- No considerar una comprobación de rol en el navegador como una barrera de seguridad inviolable.
- Los estados de aprobación y los historiales escritos desde el frontend ofrecen trazabilidad operativa, pero no son inalterables si un usuario tiene permiso de edición sobre esos archivos.
- Sin backend no pueden garantizarse controles de autorización de negocio inviolables, auditoría inmutable, transacciones entre varios archivos ni bloqueos de concurrencia fuertes. Documentar estas limitaciones sin simular garantías inexistentes.

## 3. Archivos fuente y plantillas

La aplicación debe utilizar estos archivos, seleccionados desde Google Drive o cargados por un usuario autorizado:

- `BOLSA TECNOLOGICA CALDAS.xlsx`: fuente para LOG-026-F y LOG-029-F.
- `BASE ESTUDIANTES CALDAS.xlsx`: fuente para LOG-007-F.
- `LOG-026-Acta de Verificacion y Legalizacion de para bolsa_V1.docx`: plantilla LOG-026-F.
- `LOG-029-F Formato Informe Validación Bolsa Tecnologica.xlsx`: plantilla LOG-029-F.
- `LOG-007-F LEGALIZACIO_N Y ENTREGA DIRECTA DE EQUIPOS.docx`: plantilla LOG-007-F.

Los nombres e ID de Drive deben poder configurarse. Antes de programar el mapeo, inspeccionar las hojas, columnas, tablas, marcadores y celdas reales. No asumir nombres ni posiciones sin verificarlos.

## 4. Requerimientos funcionales

- Generar LOG-026-F en Word desde `BOLSA TECNOLOGICA CALDAS.xlsx`.
- Diligenciar LOG-029-F en Excel desde el mismo archivo, preservando hojas, fórmulas, formatos, validaciones y catálogos.
- Generar LOG-007-F en Word desde `BASE ESTUDIANTES CALDAS.xlsx`.
- Permitir al acudiente descargar, firmar fuera de la aplicación y cargar LOG-007-F.
- Permitir al rector aprobar o devolver LOG-007-F con observaciones.
- Permitir al coordinador revisar el LOG-007-F aprobado por el rector y aprobarlo o devolverlo al rector.
- Permitir al rector consultar, descargar, diligenciar y cargar LOG-026-F y LOG-029-F, y enviarlos al coordinador.
- Permitir al coordinador aprobar o devolver LOG-026-F y LOG-029-F por inconsistencias, con observaciones.
- Permitir al rector cargar LOG-007-F en nombre del acudiente si este no puede hacerlo.
- Permitir al coordinador cargar LOG-007-F en nombre del rector cuando sea necesario, registrando actor y motivo.
- Permitir actualizar los Excel fuente y regenerar documentos a partir de nuevas versiones.
- Incorporar una función para actualizar los seriales de estudiantes/equipos.
- Ofrecer CRUD para el administrador, dentro de las limitaciones de una aplicación estática.
- Consultar, cargar y actualizar documentos directamente en Google Drive desde el frontend.
- Permitir al coordinador descargar documentos autorizados en su computador.
- Usar una interfaz sencilla para docentes y acudientes con poca experiencia tecnológica.
- Tomar como referencia visual https://educacion.caldas.gov.co/.
- Publicar en GitHub Pages bajo el usuario `sedcaldas`, con el proyecto previsto `computadoresparaeducar`. Verificar el nombre del repositorio, la configuración y la URL antes de publicar.

## 5. Perfiles y contraseñas iniciales

La aplicación tendrá cuatro perfiles: **administrador, coordinador, rector y acudiente**.

Contraseñas iniciales solicitadas:
- Rector: código DANE de la institución (`CODIGO_DANE`).
- Acudiente: documento de identidad del estudiante.
- Coordinador: `gcaldas2026*`.
- Administrador: `gcaldas2026*`.

### Autenticación

Estas contraseñas iniciales no deben ser el único mecanismo de protección. No codificar las contraseñas maestras ni validarlas contra valores incrustados en JavaScript como control de seguridad.

- Usar Google OAuth para autenticar a la persona.
- Relacionar la cuenta autenticada con un perfil/asignación mediante información ubicada en Drive con permisos restringidos a las cuentas autorizadas.
- No conceder permisos administrativos únicamente porque alguien escriba `gcaldas2026*`.
- Si las contraseñas iniciales se conservan para incorporación de usuarios, tratarlas como credenciales temporales o auxiliares, no como sustituto de OAuth y permisos de Drive.
- No almacenar contraseñas en texto plano, archivos públicos, GitHub ni `localStorage`.
- No guardar tokens OAuth en archivos ni en `localStorage`; seguir las recomendaciones vigentes de Google Identity Services para aplicaciones en navegador.
- La cuenta autenticada debe tener permisos reales de Drive sobre los archivos que consulta o modifica.

La cédula del estudiante y el documento del acudiente son datos diferentes. La relación debe validarse con la base oficial y no suponerse.

## 6. Google Drive como almacenamiento único

Carpeta compartida indicada por el usuario:

https://drive.google.com/drive/folders/1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51?usp=drive_link

ID de carpeta raíz: `1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51`.

La aplicación utilizará Google Drive como único almacenamiento remoto. No crear una base de datos externa. Los metadatos e índices podrán guardarse como archivos JSON/CSV dentro de Drive, con permisos apropiados; deben documentarse las limitaciones de concurrencia y consistencia de este enfoque.

Estructura sugerida:

```text
/Bolsa_Tecnologica_Caldas/
  /{CODIGO_MUNICIPIO}_{MUNICIPIO}/
    /{CODIGO_DANE_IE}_{NOMBRE_IE}/
      /{CODIGO_DANE_SEDE}_{NOMBRE_SEDE}/
        /LOG-026-F/{Borradores,En_revision,Aprobados,Devueltos}/
        /LOG-029-F/{Borradores,En_revision,Aprobados,Devueltos}/
        /LOG-007-F/
          /{DOCUMENTO_ESTUDIANTE}/{Generados,Firmados,En_revision,Aprobados,Devueltos}/
        /Indices/
        /Historial/
```

Reglas:
- La carpeta del código DANE de institución debe reunir los formatos de todas sus sedes, con subcarpetas por sede.
- Guardar los ID de Drive de archivos y carpetas en los índices.
- Registrar tipo documental, municipio, DANE de institución, DANE de sede, estudiante cuando aplique, versión, estado, autor y fecha de carga.
- No hacer públicas las carpetas ni compartir documentos mediante “cualquier persona con el enlace” salvo autorización institucional expresa.
- La aplicación no puede acceder a una carpeta privada solo por conocer su ID; la cuenta OAuth debe tener permisos reales.
- Verificar que la cuenta de Google autenticada tenga acceso a la carpeta raíz y a sus subcarpetas.

## 7. GitHub Pages y configuración de Google

El repositorio contendrá únicamente código estático, recursos autorizados, configuración pública no secreta, documentación y pruebas. No almacenar en GitHub archivos reales de estudiantes, documentos firmados, expedientes, contraseñas, tokens, claves privadas ni copias de seguridad.

Configurar en Google Cloud:
1. Proyecto de Google Cloud para la aplicación.
2. Google Drive API habilitada.
3. Cliente OAuth para aplicación web y orígenes autorizados del sitio GitHub Pages.
4. Pantalla de consentimiento y usuarios de prueba/publicación según las políticas de la organización.
5. Scopes mínimos para listar, leer, crear y actualizar archivos autorizados.

El ID de cliente OAuth para una aplicación web es público por diseño; no incorporar un secreto OAuth de tipo servidor. No usar servicios de backend. La aplicación debe funcionar como frontend estático más Google Drive.

## 8. Generación documental en el navegador

Usar bibliotecas JavaScript que funcionen en el navegador para leer Excel y generar Word/Excel. Verificar que la biblioteca elegida pueda conservar las características requeridas de las plantillas y documentar cualquier limitación.

### 8.1 LOG-026-F (.docx)
- Usar `BOLSA TECNOLOGICA CALDAS.xlsx` como fuente y LOG-026-F como plantilla.
- Generar un documento por institución/sede según los registros reales.
- Completar solo los campos con correspondencia verificada: radicado, institución, sede, DANE, municipio, departamento, elementos y cantidades.
- Dejar editables o en blanco los campos que requieran intervención humana.
- Conservar contenido institucional, diseño, firmas y anexos.
- No inventar datos ni alterar cláusulas.

### 8.2 LOG-029-F (.xlsx)
- Usar `BOLSA TECNOLOGICA CALDAS.xlsx` como fuente y LOG-029-F como plantilla.
- Inspeccionar hojas, celdas, fórmulas, validaciones y catálogos antes de escribir.
- Conservar hojas, fórmulas, formatos, validaciones y hojas auxiliares.
- Completar únicamente celdas de entrada identificadas.
- No reemplazar fórmulas por valores ni eliminar hojas.
- Mostrar inconsistencias antes de permitir el envío al coordinador.

### 8.3 LOG-007-F (.docx)
- Usar `BASE ESTUDIANTES CALDAS.xlsx` como fuente y LOG-007-F como plantilla.
- Generar un documento por estudiante beneficiario o según la unidad que determinen la plantilla y los datos.
- Completar únicamente los datos verificados de institución, sede, códigos DANE, rector, municipio, radicado, estudiante, acudiente y equipo.
- Conservar contenido institucional, observaciones, firmas y anexos.
- No insertar ni simular firmas.
- Usar nombres consistentes, por ejemplo `LOG-007-F_{DANE_SEDE}_{ID_ESTUDIANTE}_v01.docx`.
- Registrar en índices de Drive la versión de la base fuente utilizada.
- Si cambia la fuente, crear una nueva versión; no reemplazar silenciosamente documentos firmados o aprobados.

Antes de generar documentos masivamente, construir y probar el mapa exacto de columnas/celdas y campos de destino.

## 9. Actualización de Excel y seriales

### 9.1 Archivos fuente

El administrador podrá cargar nuevas versiones de:
- `BOLSA TECNOLOGICA CALDAS.xlsx`
- `BASE ESTUDIANTES CALDAS.xlsx`
- Plantillas oficiales actualizadas.

Al importar:
1. Validar extensión, tamaño, hojas y encabezados.
2. Mostrar vista previa de filas, sedes, estudiantes, duplicados, registros nuevos/modificados y campos incompletos.
3. Permitir confirmar o cancelar.
4. Subir la nueva versión a Drive y conservar la anterior.
5. Actualizar índices de metadatos.
6. Permitir regeneración individual o masiva e indicar documentos afectados.
7. No reemplazar documentos aprobados sin crear una nueva versión.

### 9.2 Seriales

- Implementar una pantalla para importar y actualizar seriales.
- Inspeccionar los encabezados reales antes de definir el mapeo.
- Validar seriales vacíos, duplicados, cambios, elementos no asociados y conflictos.
- Mostrar vista previa y pedir confirmación.
- Guardar historial de valor anterior/nuevo, fecha, usuario, motivo y archivo fuente.
- Almacenar seriales como texto.
- No asumir reglas de unicidad que no estén confirmadas por las fuentes.
- Como Drive no ofrece transacciones sobre varios archivos, detectar conflictos de edición concurrente, advertir al usuario y pedir volver a cargar o combinar los cambios. No prometer bloqueo transaccional.

## 10. Flujos de aprobación

Estados sugeridos:

`Borrador → Generado → Pendiente de firma/carga → En revisión del rector → Devuelto al acudiente → En revisión del coordinador → Devuelto al rector → Aprobado`

### LOG-007-F
1. Generar el documento desde la base de estudiantes.
2. El acudiente descarga, firma fuera de la aplicación y carga el documento.
3. El rector aprueba o devuelve con observaciones.
4. Si se devuelve, el acudiente corrige y vuelve a cargarlo; si no puede, el rector puede cargarlo en su nombre.
5. Tras la aprobación del rector, queda disponible para el coordinador.
6. El coordinador aprueba o devuelve al rector con observaciones.
7. Conservar versiones y registrar eventos en el historial de Drive.

### LOG-026-F y LOG-029-F
1. El rector descarga los formatos generados, los revisa y completa la información faltante.
2. El rector carga los formatos diligenciados y los envía al coordinador.
3. El coordinador aprueba o devuelve por inconsistencias con comentarios.
4. El rector corrige, carga una nueva versión y vuelve a enviar.
5. Conservar versiones anteriores e identificar la versión vigente y la aprobada.

Reglas comunes:
- Cargar un archivo no equivale a aprobarlo.
- La devolución requiere motivo y comentario.
- Mostrar acciones según el perfil reconocido, sin presentar esto como seguridad inviolable.
- Registrar documento, estado anterior/nuevo, actor, rol, fecha/hora, comentario y versión en el historial de Drive.
- Cuando alguien actúe en nombre de otra persona, registrar actor real y motivo.
- Los historiales guardados en Drive pueden ser editados por usuarios con permisos de escritura; limitar esos permisos y documentar esta limitación.

## 11. CRUD del administrador

Implementar una interfaz CRUD para:
- Usuarios y perfiles.
- Municipios, instituciones y sedes.
- Estudiantes y relaciones con acudientes.
- Asignaciones de equipos y seriales.
- Plantillas y versiones.
- Archivos fuente.
- Documentos, índices y versiones.
- Observaciones y tareas de revisión.
- Parámetros y configuración de Drive.

Guardar registros e índices como archivos dentro de Drive. Aplicar borrado lógico a registros relacionados con expedientes. No eliminar silenciosamente documentos firmados o aprobados. Sin backend no hay integridad referencial transaccional ni permisos por fila independientes de los permisos de Drive; detectar inconsistencias y explicar esta limitación.

## 12. Interfaz y facilidad de uso

Tomar como referencia visual https://educacion.caldas.gov.co/, usando solo recursos autorizados.

- Interfaz en español y adaptable a celular, tableta y computador.
- Botones grandes: “Descargar formato”, “Subir formato firmado”, “Enviar al rector” y “Corregir documento”.
- Una tarea principal por pantalla para acudientes.
- Instrucciones cortas: 1) descargar, 2) firmar, 3) subir.
- No pedir datos que ya estén en los archivos fuente.
- Mostrar estados simples: “Pendiente de revisión”, “Necesita corrección” y “Aprobado”.
- Explicar qué corregir cuando se devuelve un documento.
- Confirmar antes de enviar, reemplazar o regenerar archivos.
- Facilitar navegación por teclado, contraste, etiquetas y mensajes de error claros.
- Incluir ayuda y canal institucional de soporte configurable.

## 13. Validación de datos

Validar:
- Códigos DANE y correspondencia institución/sede.
- Existencia del estudiante beneficiario.
- Relación estudiante/acudiente/sede.
- Campos obligatorios de cada formato.
- Radicados, elementos y cantidades según las fuentes.
- Seriales vacíos, duplicados o inconsistentes.
- Tipo, extensión y tamaño de archivos cargados.
- Correspondencia del documento firmado con el estudiante y sede.
- Permisos de Drive de la cuenta autenticada.

Tratar códigos DANE, documentos de identidad, teléfonos y seriales como texto. Reportar inconsistencias sin alterar automáticamente los datos originales.

## 14. Privacidad y seguridad

- Usar OAuth y permisos reales de Drive.
- Solicitar únicamente scopes necesarios.
- No publicar datos de estudiantes en GitHub ni incluir documentos firmados en el repositorio.
- No guardar contraseñas ni tokens en archivos públicos o `localStorage`.
- Enmascarar documentos de identidad cuando no sea necesario mostrarlos completos.
- Validar archivos cargados y restringir extensiones/tamaños.
- Definir respaldo y recuperación en Drive.
- Registrar descargas y exportaciones cuando la aplicación tenga permiso para escribir el historial.
- No compartir carpetas con acceso abierto sin autorización institucional.

## 15. Descargas del coordinador

El coordinador podrá:
- Descargar documentos individuales.
- Filtrar por municipio, institución, sede, estudiante, tipo, estado y fecha.
- Descargar paquetes ZIP por municipio, institución o sede.
- Generar un manifiesto CSV/XLSX con los archivos incluidos.
- Descargar solo documentos accesibles para su cuenta de Google.
- Consultar cantidades de documentos generados, pendientes, aprobados, devueltos y con errores.

Las descargas se realizarán mediante Drive API con la identidad OAuth del usuario.

## 16. Auditoría y monitoreo

Registrar en archivos de historial de Drive:
- Accesos que el frontend pueda observar.
- Cambios de perfiles y asignaciones.
- Importaciones de Excel y actualizaciones de seriales.
- Generación y regeneración documental.
- Cargas, descargas, aprobaciones, devoluciones y comentarios.
- Errores de procesamiento y operaciones de Drive.

No guardar contraseñas, tokens ni datos personales innecesarios. No describir la bitácora como inalterable: usuarios con permisos de edición podrían modificarla.

## 17. Requisitos no funcionales

- Sin servidor propio, backend, funciones serverless ni base de datos externa.
- Frontend estático publicable en GitHub Pages.
- Google Drive como único almacenamiento remoto.
- Diseño responsive y accesible.
- Compatibilidad con navegadores modernos.
- Procesamiento en navegador, con mensajes claros para archivos demasiado grandes.
- Versionamiento de archivos fuente, plantillas y documentos.
- Detección de conflictos de edición concurrente.
- Código modular y documentado.
- Configuración sin secretos por ambiente.
- Procedimiento de respaldo y recuperación en Drive.
- Documentación explícita de las limitaciones de seguridad y concurrencia de una solución sin backend.

## 18. Pruebas de aceptación

1. La aplicación se publica correctamente en GitHub Pages.
2. OAuth permite consultar únicamente archivos para los que la cuenta tiene permisos.
3. El administrador carga Excel y ve una vista previa de validación.
4. LOG-026-F se genera con datos correctos por institución/sede.
5. LOG-029-F se diligencia sin destruir fórmulas, hojas auxiliares, validaciones ni formatos.
6. LOG-007-F se genera desde la base de estudiantes y conserva la plantilla.
7. El acudiente descarga, firma y carga LOG-007-F.
8. El rector aprueba o devuelve LOG-007-F con observaciones.
9. El coordinador aprueba o devuelve LOG-007-F al rector.
10. El rector puede cargar LOG-007-F por el acudiente y el coordinador por el rector, con historial.
11. El rector descarga, completa y carga LOG-026-F y LOG-029-F.
12. El coordinador aprueba o devuelve LOG-026-F y LOG-029-F con observaciones.
13. Nuevas versiones de Excel se guardan en Drive y permiten regeneración controlada.
14. La actualización de seriales detecta conflictos y guarda historial.
15. Los archivos se organizan por municipio, DANE y sede en la carpeta indicada.
16. El coordinador descarga documentos autorizados en su computador.
17. No se publican datos personales, contraseñas ni secretos en GitHub.
18. La interfaz se entiende en pruebas con acudientes de baja experiencia tecnológica.
19. Se prueba el comportamiento cuando dos usuarios actualizan el mismo índice.
20. La documentación explica que la autorización de negocio y la auditoría no pueden hacerse inviolables solo con frontend estático.

## 19. Entregables

1. Código fuente estático y README.
2. Este archivo `SKILL.md`.
3. Diagrama de arquitectura sin servidor.
4. Modelo lógico de archivos/índices de Drive y diccionario de datos.
5. Matriz de perfiles, acciones y permisos reales de Drive.
6. Mapa de campos de Excel a plantillas.
7. Diagrama de estados de aprobación.
8. Módulos JavaScript de importación, validación y generación documental.
9. Integración OAuth/Drive API sin secretos.
10. Pruebas de generación e integración con Drive.
11. Guía de publicación en GitHub Pages y configuración de Google Cloud OAuth.
12. Manual para administrador, coordinador, rector y acudiente.
13. Procedimiento de respaldo y restauración.
14. Informe de pruebas con datos anonimizados y limitaciones conocidas.

## 20. Fases de implementación

**Fase 1 — Inspección y mapeo:** revisar los archivos reales y documentar columnas, celdas, plantillas y reglas de generación.

**Fase 2 — GitHub Pages y OAuth:** configurar frontend estático, proyecto de Google Cloud, Drive API y permisos.

**Fase 3 — Drive:** implementar navegación de carpetas, selección, carga, descarga e índices.

**Fase 4 — Generación documental:** implementar y probar LOG-026-F, LOG-029-F y LOG-007-F en el navegador.

**Fase 5 — Aprobaciones:** implementar estados, observaciones, versiones e historial en Drive, documentando las limitaciones de seguridad.

**Fase 6 — Administración y seriales:** implementar CRUD e importaciones con detección de conflictos.

**Fase 7 — Pruebas y publicación:** ejecutar pruebas, corregir errores, publicar en GitHub Pages y entregar manuales.

## 21. Instrucción para el agente de desarrollo

Actúa como arquitecto y desarrollador frontend especializado en aplicaciones estáticas, JavaScript, procesamiento de Word/Excel en navegador, Google OAuth y Google Drive API. Respeta la restricción de no utilizar ningún servidor, backend, función serverless ni base de datos externa. Antes de programar, inspecciona los archivos reales y documenta el mapa de campos. No inventes datos, no alteres el contenido institucional de las plantillas, no publiques datos personales ni secretos y no marques como aprobado un documento sin una acción explícita del perfil autorizado. Implementa la consulta y el almacenamiento directamente en Google Drive y publica el frontend en GitHub Pages. Explica con claridad las limitaciones de seguridad y concurrencia inherentes a una arquitectura sin backend. Entrega código ejecutable, pruebas, documentación y evidencias de aceptación.
