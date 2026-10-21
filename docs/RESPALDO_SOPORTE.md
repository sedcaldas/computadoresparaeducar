# Procedimiento de Respaldo, Restauración y Soporte Institucional

Este documento define la política de respaldos, planes de contingencia y canales de atención institucional, conforme a las secciones 14, 17 y 19 de `SKILL.md`.

---

## 1. Política de Copias de Seguridad (Backups)

### 1.1 Elementos Sujetos a Respaldo
1. **Base de Datos Relacional (`gestion_documental.db`):** Contiene usuarios, sedes, estudiantes, asignaciones, estados, versiones, observaciones y bitácora de auditoría.
2. **Repositorio de Archivos Generados y Espejo de Drive (`generated_documents/`):** Almacena las versiones Word y Excel generadas, archivos cargados firmados y metadatos JSON.
3. **Archivos Fuente Oficiales y Plantillas:** Copia inmutable de las plantillas LOG-007-F, LOG-026-F, LOG-029-F y los Excel de origen.

### 1.2 Frecuencia de Respaldo
- **Respaldo Completo Diario (02:00 AM):** Exportación completa de la base de datos y compresión del directorio de documentos con cifrado AES-256.
- **Respaldo Incremental / Transaccional (Cada 4 Horas):** Respaldo de base de datos usando `sqlite3 backup API` sin interrumpir la operación.

### 1.3 Script Automatizado de Respaldo (`backup.py`)
```python
import os
import sqlite3
import datetime
import shutil

BACKUP_DIR = "/var/backups/gestion_documental"
DB_PATH = "backend/gestion_documental.db"
os.makedirs(BACKUP_DIR, exist_ok=True)

date_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
target_db = os.path.join(BACKUP_DIR, f"db_backup_{date_str}.db")

# Respaldo en caliente seguro de SQLite
source = sqlite3.connect(DB_PATH)
dest = sqlite3.connect(target_db)
with dest:
    source.backup(dest)
dest.close()
source.close()
print(f"Respaldo generado exitosamente: {target_db}")
```

---

## 2. Procedimiento de Restauración ante Desastres

### 2.1 Tiempo Objetivo de Recuperación (RTO y RPO)
- **RTO (Recovery Time Objective):** Menor a 2 horas.
- **RPO (Recovery Point Objective):** Menor a 4 horas de pérdida de datos.

### 2.2 Pasos para la Restauración
1. **Detener el servicio de backend:**
   ```bash
   sudo systemctl stop gestion-documental
   ```
2. **Restaurar la base de datos:**
   ```bash
   cp /var/backups/gestion_documental/db_backup_ULTIMO.db backend/gestion_documental.db
   ```
3. **Verificar la integridad con SQLite:**
   ```bash
   sqlite3 backend/gestion_documental.db "PRAGMA integrity_check;"
   ```
4. **Sincronizar la jerarquía de Google Drive:**
   - Si se requiere revalidar archivos desde Google Drive, ejecutar el script de comprobación de huellas SHA-256.
5. **Reiniciar el servicio y comprobar bitácora:**
   ```bash
   sudo systemctl start gestion-documental
   sudo journalctl -u gestion-documental -f
   ```

---

## 3. Canales de Soporte y Mesa de Ayuda Institucional

Para reportar fallas técnicas, solicitar desbloqueo de usuarios o registrar incidencias con terminales:

- **Secretaría de Educación de Caldas:**
  - Correo: `educacion@caldas.gov.co`
  - Teléfono Conmutador: `(606) 8982444 Ext. 1204 / 1205`
  - Dirección: Edificio de la Gobernación de Caldas, Calle 21 # 23-22, Manizales.
- **Centro de Contacto Computadores para Educar:**
  - Línea Nacional Gratuita: `018000 949596` o `018000 919275`
  - WhatsApp de Soporte: `318 548 1149`
  - Correo Electrónico: `info@cpe.gov.co`
  - Horario de Atención: Lunes a viernes de 7:00 a.m. a 4:00 p.m.
