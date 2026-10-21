import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "gestion_documental.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    -- Tabla de Usuarios
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        rol TEXT NOT NULL CHECK(rol IN ('administrador', 'coordinador', 'rector', 'acudiente')),
        nombre_completo TEXT NOT NULL,
        email TEXT,
        telefono TEXT,
        codigo_dane_ie TEXT,
        codigo_dane_sede TEXT,
        documento_estudiante TEXT,
        must_change_password INTEGER DEFAULT 0,
        failed_attempts INTEGER DEFAULT 0,
        is_locked INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabla de Municipios
    CREATE TABLE IF NOT EXISTS municipios (
        codigo_municipio TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        departamento TEXT NOT NULL DEFAULT 'Caldas'
    );

    -- Tabla de Instituciones Educativas
    CREATE TABLE IF NOT EXISTS instituciones (
        codigo_dane TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        codigo_municipio TEXT NOT NULL,
        rector_nombre TEXT,
        FOREIGN KEY (codigo_municipio) REFERENCES municipios(codigo_municipio)
    );

    -- Tabla de Sedes Educativas
    CREATE TABLE IF NOT EXISTS sedes (
        codigo_dane_sede TEXT PRIMARY KEY,
        codigo_dane_ie TEXT NOT NULL,
        nombre TEXT NOT NULL,
        zona TEXT,
        radicado TEXT,
        FOREIGN KEY (codigo_dane_ie) REFERENCES instituciones(codigo_dane)
    );

    -- Tabla de Estudiantes Beneficiarios
    CREATE TABLE IF NOT EXISTS estudiantes (
        documento_identidad TEXT PRIMARY KEY,
        tipo_documento TEXT DEFAULT 'T.I.',
        nombres TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        nombre_completo TEXT NOT NULL,
        curso TEXT,
        fecha_nacimiento TEXT,
        codigo_dane_sede TEXT NOT NULL,
        acudiente_documento TEXT,
        acudiente_nombres TEXT,
        acudiente_parentesco TEXT,
        acudiente_telefono TEXT,
        FOREIGN KEY (codigo_dane_sede) REFERENCES sedes(codigo_dane_sede)
    );

    -- Tabla de Asignaciones de Equipos a Estudiantes
    CREATE TABLE IF NOT EXISTS asignaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estudiante_documento TEXT NOT NULL,
        codigo_dane_sede TEXT NOT NULL,
        tipo_terminal TEXT NOT NULL,
        serial_asignado TEXT DEFAULT '0',
        estado_despacho TEXT DEFAULT 'Despacho Programado',
        radicado TEXT,
        convocatoria TEXT,
        FOREIGN KEY (estudiante_documento) REFERENCES estudiantes(documento_identidad),
        FOREIGN KEY (codigo_dane_sede) REFERENCES sedes(codigo_dane_sede)
    );

    -- Tabla de Dotaciones de Bolsa Tecnológica
    CREATE TABLE IF NOT EXISTS bolsa_elementos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_dane_sede TEXT NOT NULL,
        radicado TEXT,
        elemento_nombre TEXT NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (codigo_dane_sede) REFERENCES sedes(codigo_dane_sede)
    );

    -- Tabla de Documentos
    CREATE TABLE IF NOT EXISTS documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_documento TEXT NOT NULL CHECK(tipo_documento IN ('LOG-007-F', 'LOG-026-F', 'LOG-029-F')),
        codigo_dane_sede TEXT NOT NULL,
        estudiante_documento TEXT,
        radicado TEXT,
        version_actual INTEGER DEFAULT 1,
        estado TEXT NOT NULL DEFAULT 'Generado' CHECK(estado IN (
            'Borrador',
            'Generado',
            'Pendiente de firma/carga',
            'En revisión del rector',
            'Devuelto al acudiente',
            'En revisión del coordinador',
            'Devuelto al rector',
            'Aprobado'
        )),
        ruta_archivo TEXT NOT NULL,
        drive_id TEXT,
        drive_folder_id TEXT,
        hash_sha256 TEXT,
        autor_carga_id INTEGER,
        on_behalf_of_id INTEGER,
        motivo_on_behalf TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (codigo_dane_sede) REFERENCES sedes(codigo_dane_sede),
        FOREIGN KEY (autor_carga_id) REFERENCES usuarios(id)
    );

    -- Tabla de Versiones de Documentos
    CREATE TABLE IF NOT EXISTS documento_versiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        documento_id INTEGER NOT NULL,
        version_num INTEGER NOT NULL,
        estado TEXT NOT NULL,
        ruta_archivo TEXT NOT NULL,
        drive_id TEXT,
        actor_id INTEGER,
        comentarios TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (documento_id) REFERENCES documentos(id),
        FOREIGN KEY (actor_id) REFERENCES usuarios(id)
    );

    -- Tabla de Observaciones / Tareas de Revisión
    CREATE TABLE IF NOT EXISTS observaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        documento_id INTEGER NOT NULL,
        version_num INTEGER NOT NULL,
        autor_id INTEGER NOT NULL,
        rol_autor TEXT NOT NULL,
        tipo_accion TEXT NOT NULL CHECK(tipo_accion IN ('devolucion', 'aprobacion', 'carga', 'comentario', 'generacion')),
        comentarios TEXT NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (documento_id) REFERENCES documentos(id),
        FOREIGN KEY (autor_id) REFERENCES usuarios(id)
    );

    -- Tabla de Auditoría
    CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id INTEGER,
        username TEXT,
        rol TEXT,
        accion TEXT NOT NULL,
        entidad TEXT NOT NULL,
        entidad_id TEXT,
        detalles_json TEXT,
        ip TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabla de Historial de Seriales
    CREATE TABLE IF NOT EXISTS seriales_historial (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estudiante_documento TEXT NOT NULL,
        serial_anterior TEXT,
        serial_nuevo TEXT NOT NULL,
        usuario_id INTEGER,
        motivo TEXT NOT NULL,
        archivo_fuente TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (estudiante_documento) REFERENCES estudiantes(documento_identidad)
    );

    -- Tabla de Importaciones de Archivos
    CREATE TABLE IF NOT EXISTS importaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_archivo TEXT NOT NULL,
        nombre_archivo TEXT NOT NULL,
        version_fuente TEXT,
        usuario_id INTEGER,
        total_registros INTEGER DEFAULT 0,
        registros_nuevos INTEGER DEFAULT 0,
        registros_modificados INTEGER DEFAULT 0,
        detalles_json TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabla de Parámetros y Configuración
    CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL,
        descripcion TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
