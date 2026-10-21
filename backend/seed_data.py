import os
import sys
import openpyxl
import pandas as pd
from database import get_db_connection, init_db
from security import generate_salt, hash_password

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE_BOLSA = os.path.join(BASE_DIR, "BOLSA TECNOLOGICA CALDAS.xlsx")
FILE_ESTUDIANTES = os.path.join(BASE_DIR, "BASE ESTUDIANTES CALDAS.xlsx")

def clean_code(val) -> str:
    if val is None or pd.isna(val):
        return ""
    s = str(val).strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s

def seed_database():
    print("Iniciando inicialización de la base de datos...")
    from database import DB_PATH
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception as e:
            print("Warning removing db:", e)
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Configuración por defecto
    configs = [
        ("google_drive_root_folder_id", "1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51", "ID de carpeta raíz en Google Drive"),
        ("entidad_nombre", "Gobernación de Caldas - Secretaría de Educación", "Nombre institucional"),
        ("proyecto_nombre", "Computadores para Educar - Caldas", "Programa institucional"),
        ("github_pages_url", "https://sedcaldas.github.io/computadoresparaeducar/", "URL de despliegue en GitHub Pages"),
        ("soporte_correo", "educacion@caldas.gov.co", "Correo de soporte institucional"),
        ("soporte_telefono", "(606) 8982444", "Línea de atención institucional")
    ]
    for k, v, d in configs:
        cursor.execute("INSERT OR REPLACE INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)", (k, v, d))

    # 2. Cargar BOLSA TECNOLOGICA CALDAS.xlsx
    print(f"Cargando datos desde {FILE_BOLSA}...")
    if os.path.exists(FILE_BOLSA):
        df_bolsa = pd.read_excel(FILE_BOLSA, sheet_name="DISTRIBUCION POR SEDES")
        
        for _, row in df_bolsa.iterrows():
            cod_mpio = clean_code(row["CÓDIGO MUNICIPIO"])
            nom_mpio = str(row["MUNICIPIO"]).strip()
            dpto = str(row["DEPARTAMENTO"]).strip()
            cursor.execute("""
                INSERT OR IGNORE INTO municipios (codigo_municipio, nombre, departamento)
                VALUES (?, ?, ?)
            """, (cod_mpio, nom_mpio, dpto))

            dane_ie = clean_code(row["CODIGO_DANE"])
            nom_ie = str(row["NOMBRE_ESTABLECIMIENTO"]).strip()
            cursor.execute("""
                INSERT OR IGNORE INTO instituciones (codigo_dane, nombre, codigo_municipio)
                VALUES (?, ?, ?)
            """, (dane_ie, nom_ie, cod_mpio))

            dane_sede = clean_code(row["CODIGO_DANE_SEDE"])
            nom_sede = str(row["NOMBRE_SEDE"]).strip()
            zona = str(row["ZONA"]).strip() if pd.notna(row["ZONA"]) else "RURAL"
            radicado = clean_code(row["RADICADO"])
            cursor.execute("""
                INSERT OR IGNORE INTO sedes (codigo_dane_sede, codigo_dane_ie, nombre, zona, radicado)
                VALUES (?, ?, ?, ?, ?)
            """, (dane_sede, dane_ie, nom_sede, zona, radicado))

            # Guardar elementos entregados en bolsa
            for col_name in df_bolsa.columns[10:37]:
                val = row[col_name]
                try:
                    qty = int(float(val)) if pd.notna(val) else 0
                except (ValueError, TypeError):
                    qty = 0
                if qty > 0:
                    cursor.execute("""
                        INSERT INTO bolsa_elementos (codigo_dane_sede, radicado, elemento_nombre, cantidad)
                        VALUES (?, ?, ?, ?)
                    """, (dane_sede, radicado, col_name.strip(), qty))

    # 3. Cargar BASE ESTUDIANTES CALDAS.xlsx
    print(f"Cargando datos desde {FILE_ESTUDIANTES}...")
    if os.path.exists(FILE_ESTUDIANTES):
        df_est = pd.read_excel(FILE_ESTUDIANTES, sheet_name="ESTUDIANTES BENEFICIADOS", skiprows=1)
        
        for _, row in df_est.iterrows():
            cod_mpio = clean_code(row["CODIGO_DANE_MUNICIPIO"])
            nom_mpio = str(row["MUNICIPIO"]).strip()
            dpto = str(row["DEPARTAMENTO"]).strip()
            cursor.execute("""
                INSERT OR IGNORE INTO municipios (codigo_municipio, nombre, departamento)
                VALUES (?, ?, ?)
            """, (cod_mpio, nom_mpio, dpto))

            dane_ie = clean_code(row["CODIGO_DANE"])
            nom_ie = str(row["NOMBRE_ESTABLECIMIENTO"]).strip()
            cursor.execute("""
                INSERT OR IGNORE INTO instituciones (codigo_dane, nombre, codigo_municipio)
                VALUES (?, ?, ?)
            """, (dane_ie, nom_ie, cod_mpio))

            dane_sede = clean_code(row["CODIGO_DANE_SEDE"])
            nom_sede = str(row["NOMBRE_SEDE"]).strip()
            zona = str(row["ZONA"]).strip() if pd.notna(row["ZONA"]) else "URBANA"
            radicado = clean_code(row["RADICADO"])
            cursor.execute("""
                INSERT OR IGNORE INTO sedes (codigo_dane_sede, codigo_dane_ie, nombre, zona, radicado)
                VALUES (?, ?, ?, ?, ?)
            """, (dane_sede, dane_ie, nom_sede, zona, radicado))

            doc_est = clean_code(row["DOCUMENTO DE IDENTIDAD"])
            
            n1 = str(row["NOMBRE 1"]).strip() if pd.notna(row["NOMBRE 1"]) else ""
            n2 = str(row["NOMBRE 2"]).strip() if pd.notna(row["NOMBRE 2"]) else ""
            a1 = str(row["APELLIDO 1"]).strip() if pd.notna(row["APELLIDO 1"]) else ""
            a2 = str(row["APELLIDO 2"]).strip() if pd.notna(row["APELLIDO 2"]) else ""
            nombres = f"{n1} {n2}".strip()
            apellidos = f"{a1} {a2}".strip()
            nombre_completo = f"{nombres} {apellidos}".strip()

            acud_doc = clean_code(row["acudiente_documento"])
            acud_nom = str(row["acudiente_nombres"]).strip() if pd.notna(row["acudiente_nombres"]) else ""
            acud_par = str(row["acudiente_parentesco"]).strip() if pd.notna(row["acudiente_parentesco"]) else ""

            cursor.execute("""
                INSERT OR REPLACE INTO estudiantes (
                    documento_identidad, tipo_documento, nombres, apellidos, nombre_completo,
                    codigo_dane_sede, acudiente_documento, acudiente_nombres, acudiente_parentesco
                ) VALUES (?, 'T.I.', ?, ?, ?, ?, ?, ?, ?)
            """, (doc_est, nombres, apellidos, nombre_completo, dane_sede, acud_doc, acud_nom, acud_par))

            # Tipo de terminal
            es_portatil = str(row["COMPUTADOR PORTÁTIL"]).strip() != "-" and str(row["COMPUTADOR PORTÁTIL"]).strip() != "0"
            es_tableta = str(row["TABLETA"]).strip() != "-" and str(row["TABLETA"]).strip() != "0"
            tipo_term = "Portátil" if es_portatil else ("Tableta" if es_tableta else "Portátil")
            
            serial = clean_code(row["Serial Asignado"])
            if not serial:
                serial = "0"
            estado_desp = str(row["Estado Despacho"]).strip() if pd.notna(row["Estado Despacho"]) else "Despacho Programado"
            convocatoria = str(row["Convocatoria"]).strip() if pd.notna(row["Convocatoria"]) else ""

            cursor.execute("""
                INSERT INTO asignaciones (
                    estudiante_documento, codigo_dane_sede, tipo_terminal, serial_asignado,
                    estado_despacho, radicado, convocatoria
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (doc_est, dane_sede, tipo_term, serial, estado_desp, radicado, convocatoria))

    # 4. Crear Usuarios iniciales según sección 5 de SKILLs.md
    print("Creando usuarios iniciales...")
    
    # Administrador: gcaldas2026*
    salt_admin = generate_salt()
    hash_admin = hash_password("gcaldas2026*", salt_admin)
    cursor.execute("""
        INSERT OR REPLACE INTO usuarios (username, password_hash, salt, rol, nombre_completo, email, must_change_password)
        VALUES ('admin', ?, ?, 'administrador', 'Administrador del Sistema', 'admin.tecnologia@caldas.gov.co', 0)
    """, (hash_admin, salt_admin))

    # Coordinador: gcaldas2026*
    salt_coord = generate_salt()
    hash_coord = hash_password("gcaldas2026*", salt_coord)
    cursor.execute("""
        INSERT OR REPLACE INTO usuarios (username, password_hash, salt, rol, nombre_completo, email, must_change_password)
        VALUES ('coordinador_caldas', ?, ?, 'coordinador', 'Coordinador Departamental Caldas', 'coordinador.caldas@cpe.gov.co', 0)
    """, (hash_coord, salt_coord))

    # Rectores: username = CODIGO_DANE, password = CODIGO_DANE
    cursor.execute("SELECT codigo_dane, nombre FROM instituciones")
    instituciones = cursor.fetchall()
    for ie in instituciones:
        dane_ie = str(ie["codigo_dane"])
        salt_r = generate_salt()
        hash_r = hash_password(dane_ie, salt_r)
        nom_rector = f"Rector(a) - {ie['nombre']}"
        cursor.execute("""
            INSERT OR REPLACE INTO usuarios (
                username, password_hash, salt, rol, nombre_completo, codigo_dane_ie, must_change_password
            ) VALUES (?, ?, ?, 'rector', ?, ?, 1)
        """, (dane_ie, hash_r, salt_r, nom_rector, dane_ie))

    # Acudientes: username = DOCUMENTO_ESTUDIANTE, password = DOCUMENTO_ESTUDIANTE
    cursor.execute("SELECT documento_identidad, nombre_completo, acudiente_nombres, codigo_dane_sede FROM estudiantes")
    estudiantes = cursor.fetchall()
    for est in estudiantes:
        doc_est = str(est["documento_identidad"])
        salt_a = generate_salt()
        hash_a = hash_password(doc_est, salt_a)
        acud_nombre = est["acudiente_nombres"] if est["acudiente_nombres"] else f"Acudiente de {est['nombre_completo']}"
        cursor.execute("""
            INSERT OR REPLACE INTO usuarios (
                username, password_hash, salt, rol, nombre_completo, codigo_dane_sede, documento_estudiante, must_change_password
            ) VALUES (?, ?, ?, 'acudiente', ?, ?, ?, 0)
        """, (doc_est, hash_a, salt_a, acud_nombre, est["codigo_dane_sede"], doc_est))

    # Auditoría inicial
    cursor.execute("""
        INSERT INTO auditoria (actor_id, username, rol, accion, entidad, detalles_json)
        VALUES (1, 'admin', 'administrador', 'INICIALIZACION_SISTEMA', 'BASE_DE_DATOS', '{"mensaje": "Base de datos inicializada y cargada desde archivos Excel oficiales"}')
    """)

    conn.commit()
    conn.close()
    print("Inicialización y carga de datos completada exitosamente.")

if __name__ == "__main__":
    seed_database()
