# Procedimiento de Respaldo, Restauración y Soporte Técnico

## 1. Estrategia de Respaldo en Google Drive

Dado que la arquitectura no utiliza servidores ni bases de datos relacionales externas, el almacenamiento de respaldo se gestiona en dos niveles:

### Nivel 1: Versionamiento Nativo de Google Drive
- Google Drive mantiene automáticamente el historial de revisiones de cada archivo (`uploadType=multipart` con el mismo ID o nuevo versionamiento con nombre `_v01`, `_v02`).
- Las versiones previas pueden consultarse y restaurarse en cualquier momento desde la interfaz web de Drive haciendo clic derecho sobre el archivo > **Historial de versiones**.

### Nivel 2: Respaldos Lógicos de Índices JSON
- Periódicamente, o tras cada importación masiva de Excel, el Administrador debe exportar el estado completo de la aplicación.
- En la pestaña **Panel General & CRUD**, haga clic en **💾 Descargar Respaldo JSON**.
- Se generará un archivo `backup_ceducar_YYYY-MM-DD.json` con todos los municipios, sedes, estudiantes, asignaciones, estados documentales y bitácora de auditoría.
- Este archivo puede guardarse en la carpeta `/Bolsa_Tecnologica_Caldas/Indices/` en Google Drive.

---

## 2. Procedimiento de Restauración

En caso de pérdida de datos en el almacenamiento local del navegador (por ejemplo, limpieza de caché o cambio de dispositivo de cómputo):

1. **Restauración Automática desde Google Drive:**
   - Si la cuenta de Google tiene configurado el token OAuth, la aplicación leerá los archivos de la carpeta compartida y reconstruirá el estado.
2. **Restauración Manual mediante Respaldo JSON:**
   - Ingrese como Administrador.
   - En la consola del navegador o panel de mantenimiento, cargue el archivo `backup_ceducar_YYYY-MM-DD.json`.
   - El sistema validará la estructura e importará íntegramente los datos y versiones previas.
3. **Restauración a Datos Semilla Oficiales:**
   - En el panel de Administrador, haga clic en el botón rojo **♻️ Restaurar Datos Iniciales**.
   - Esto recargará los 22 municipios, 59 sedes y 90 estudiantes originales de las fuentes oficiales de Caldas.

---

## 3. Canales Institucionales de Soporte Técnico

Para resolver dudas sobre asignación de equipos, inconsistencias en seriales o permisos en Google Drive:

- **Entidad Responsable:** Secretaría de Educación Departamental de Caldas
- **Programa:** Computadores para Educar (CPE) & Subdirección de Calidad Educativa
- **Soporte Técnico:** `soporte.sistemas@sedcaldas.gov.co`
- **Atención Institucional:** Gobernación de Caldas, Manizales, Caldas.
- **Horario de Atención:** Lunes a Viernes de 8:00 a.m. a 5:00 p.m.
