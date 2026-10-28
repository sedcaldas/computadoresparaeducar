# Puente de almacenamiento en Google Drive (Apps Script)

Permite que **todos** los usuarios (acudientes, rectores, CPE, administrador) guarden
archivos y acciones en la carpeta compartida oficial **sin iniciar sesión con Google** y
**sin ver el enlace de la carpeta**. El script se ejecuta con la cuenta dueña de la carpeta.

## Qué se guarda en la carpeta

| Qué | Dónde |
|---|---|
| Formatos generados y archivos firmados cargados | `/{Municipio}/{IE}/{Sede}/{Formato}/[{Estudiante}/]{Estado}/` |
| Bitácora de todas las acciones (inicios de sesión, cargas, aprobaciones, devoluciones, importaciones…) | `/Historial/Bitacora_Auditoria` (hoja de cálculo) |
| Estado general (sedes, estudiantes, documentos, versiones) | `/Indices/indice_general.json` |

Si no hay conexión, las acciones quedan en cola en el navegador y se envían solas
cuando vuelve la conexión (o al hacer clic en el indicador "Sincronizando" como CPE/Administrador).

## Despliegue (una sola vez, ~5 minutos)

1. Con la cuenta **dueña o editora** de la carpeta, entre a <https://script.google.com> → **Nuevo proyecto**.
2. Pegue el contenido de `Code.gs` y guarde.
3. (Opcional) Defina `RELAY_KEY` con una clave aleatoria.
4. **Implementar → Nueva implementación → Tipo: Aplicación web**
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier persona**
5. Autorice los permisos de Drive y Hojas de cálculo y copie la URL que termina en `/exec`.
6. Pegue la URL en `js/drive.js`, constante `DRIVE_RELAY_URL` (y la clave en `DRIVE_RELAY_KEY` si la definió),
   haga commit y publique. Así todos los navegadores la usan sin configurar nada y sin pedir datos de conexión.
   - URL actual: `https://script.google.com/macros/s/AKfycbzBUqW45Fc36cxzOSySvRnUY8Eh0ELbrOe18G1QvbxHbdbyA-UH26J8InM5dxXZLDZZ/exec`
   - La URL de `js/drive.js` tiene prioridad sobre la que se guarde en *Administrador → ⚙️ Configurar Drive & OAuth*.
   - Mientras el puente esté configurado, la app siempre lo usa (aunque alguien inicie sesión con Google),
     porque el token de Google caduca en ~1 hora y el puente no.

Al cambiar `Code.gs`, use **Implementar → Administrar implementaciones → Editar → Nueva versión**
para conservar la misma URL.

## Seguridad

- El script solo escribe dentro de la carpeta raíz configurada y solo descarga archivos que estén dentro de ella.
- La URL y la clave quedan en el código del navegador; evitan el uso casual pero no son un secreto fuerte.
  La carpeta en sí sigue siendo privada: nadie puede listarla ni abrirla a través del puente.
