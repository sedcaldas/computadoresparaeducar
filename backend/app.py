import os
import sys
import shutil
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from pydantic import BaseModel

from database import get_db_connection, DB_PATH
from security import (
    hash_password, verify_password, generate_salt,
    create_access_token, verify_access_token
)
from document_generator import DocumentGenerator
from approval_workflow import ApprovalWorkflowEngine
from serial_manager import SerialManager
from coordinator_service import CoordinatorExportService
from drive_service import drive_service

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
UPLOADS_DIR = os.path.join(BASE_DIR, "generated_documents", "uploads")
TEMP_DIR = os.path.join(BASE_DIR, "generated_documents", "temp")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

app = FastAPI(
    title="Sistema de Gestión Documental - Computadores para Educar Caldas",
    description="Aplicación de gestión documental, legalización y trazabilidad según especificación SKILL.md",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- MODELOS PYDANTIC -----------------

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ReviewDocumentRequest(BaseModel):
    documento_id: int
    accion: str  # 'aprobar_rector', 'devolver_acudiente', 'aprobar_coordinador', 'devolver_rector', 'enviar_coordinador'
    comentarios: str = ""

class OnBehalfActionRequest(BaseModel):
    documento_id: int
    accion: str
    on_behalf_of: str
    motivo: str
    comentarios: str = ""

class SerialUpdateRequest(BaseModel):
    registros: List[Dict[str, Any]]
    motivo: str = "Actualización masiva de seriales"

# ----------------- MIDDLEWARE DE AUTENTICACIÓN -----------------

def get_current_user(request: Request) -> Dict[str, Any]:
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales no suministradas o sesión expirada."
        )

    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado."
        )

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM usuarios WHERE id = ? AND active = 1", (payload["user_id"],))
    user = c.fetchone()
    conn.close()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo."
        )

    return dict(user)

def require_role(roles: List[str]):
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)):
        if user["rol"] not in roles and "administrador" not in roles:
            if user["rol"] != "administrador":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Acceso denegado: se requiere rol {', '.join(roles)}."
                )
        return user
    return role_checker

# ----------------- ENDPOINTS DE AUTENTICACIÓN -----------------

@app.post("/api/auth/login")
def login(req: LoginRequest, request: Request):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM usuarios WHERE username = ? AND active = 1", (req.username.strip(),))
    user = c.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos.")

    if user["is_locked"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Usuario bloqueado por intentos fallidos. Contacte al administrador.")

    if not verify_password(req.password, user["salt"], user["password_hash"]):
        # Incrementar intentos fallidos
        new_attempts = user["failed_attempts"] + 1
        is_locked = 1 if new_attempts >= 5 else 0
        c.execute("UPDATE usuarios SET failed_attempts = ?, is_locked = ? WHERE id = ?", (new_attempts, is_locked, user["id"]))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos.")

    # Restablecer intentos fallidos
    c.execute("UPDATE usuarios SET failed_attempts = 0 WHERE id = ?", (user["id"],))

    # Registrar auditoría de inicio de sesión
    ip = request.client.host if request.client else "127.0.0.1"
    c.execute("""
        INSERT INTO auditoria (actor_id, username, rol, accion, entidad, ip)
        VALUES (?, ?, ?, 'LOGIN', 'usuarios', ?)
    """, (user["id"], user["username"], user["rol"], ip))
    conn.commit()
    conn.close()

    token_data = {
        "user_id": user["id"],
        "username": user["username"],
        "rol": user["rol"],
        "dane_ie": user["codigo_dane_ie"],
        "dane_sede": user["codigo_dane_sede"],
        "documento_estudiante": user["documento_estudiante"]
    }
    token = create_access_token(token_data)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "rol": user["rol"],
            "nombre_completo": user["nombre_completo"],
            "email": user["email"],
            "codigo_dane_ie": user["codigo_dane_ie"],
            "codigo_dane_sede": user["codigo_dane_sede"],
            "documento_estudiante": user["documento_estudiante"],
            "must_change_password": bool(user["must_change_password"])
        }
    }

@app.get("/api/auth/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "id": user["id"],
        "username": user["username"],
        "rol": user["rol"],
        "nombre_completo": user["nombre_completo"],
        "email": user["email"],
        "codigo_dane_ie": user["codigo_dane_ie"],
        "codigo_dane_sede": user["codigo_dane_sede"],
        "documento_estudiante": user["documento_estudiante"],
        "must_change_password": bool(user["must_change_password"])
    }

@app.post("/api/auth/change-password")
def change_password(req: ChangePasswordRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener mínimo 6 caracteres.")

    if not verify_password(req.current_password, user["salt"], user["password_hash"]):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta.")

    new_salt = generate_salt()
    new_hash = hash_password(req.new_password, new_salt)

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        UPDATE usuarios
        SET password_hash = ?, salt = ?, must_change_password = 0
        WHERE id = ?
    """, (new_hash, new_salt, user["id"]))

    c.execute("""
        INSERT INTO auditoria (actor_id, username, rol, accion, entidad, detalles_json)
        VALUES (?, ?, ?, 'CAMBIO_PASSWORD', 'usuarios', '{"mensaje": "Contraseña cambiada exitosamente"}')
    """, (user["id"], user["username"], user["rol"]))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Contraseña actualizada exitosamente."}

# ----------------- DASHBOARD Y ESTADÍSTICAS -----------------

@app.get("/api/stats")
def get_dashboard_stats(user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()

    stats = {}

    # Filtros según rol
    filter_clause = "WHERE 1=1"
    params = []
    if user["rol"] == "rector" and user["codigo_dane_ie"]:
        filter_clause += " AND s.codigo_dane_ie = ?"
        params.append(user["codigo_dane_ie"])
    elif user["rol"] == "acudiente" and user["documento_estudiante"]:
        filter_clause += " AND d.estudiante_documento = ?"
        params.append(user["documento_estudiante"])

    c.execute(f"""
        SELECT d.estado, count(*) as cantidad
        FROM documentos d
        JOIN sedes s ON d.codigo_dane_sede = s.codigo_dane_sede
        {filter_clause}
        GROUP BY d.estado
    """, params)
    estados = {r["estado"]: r["cantidad"] for r in c.fetchall()}

    c.execute(f"""
        SELECT d.tipo_documento, count(*) as cantidad
        FROM documentos d
        JOIN sedes s ON d.codigo_dane_sede = s.codigo_dane_sede
        {filter_clause}
        GROUP BY d.tipo_documento
    """, params)
    formatos = {r["tipo_documento"]: r["cantidad"] for r in c.fetchall()}

    # Totales generales
    c.execute("SELECT count(*) FROM estudiantes")
    stats["total_estudiantes"] = c.fetchone()[0]

    c.execute("SELECT count(*) FROM sedes")
    stats["total_sedes"] = c.fetchone()[0]

    c.execute("SELECT count(*) FROM instituciones")
    stats["total_instituciones"] = c.fetchone()[0]

    c.execute("SELECT count(*) FROM documentos")
    stats["total_documentos"] = c.fetchone()[0]

    stats["por_estado"] = estados
    stats["por_formato"] = formatos

    conn.close()
    return stats

# ----------------- PORTAL ACUDIENTE -----------------

@app.get("/api/acudiente/expediente")
def get_acudiente_expediente(user: Dict[str, Any] = Depends(get_current_user)):
    doc_est = user.get("documento_estudiante")
    if not doc_est:
        raise HTTPException(status_code=400, detail="El usuario no tiene estudiante asociado.")

    conn = get_db_connection()
    c = conn.cursor()

    # Datos estudiante
    c.execute("""
        SELECT e.*, s.nombre as nombre_sede, s.codigo_dane_sede,
               i.nombre as nombre_ie, i.codigo_dane as dane_ie,
               m.nombre as nombre_mpio,
               a.tipo_terminal, a.serial_asignado, a.estado_despacho
        FROM estudiantes e
        JOIN sedes s ON e.codigo_dane_sede = s.codigo_dane_sede
        JOIN instituciones i ON s.codigo_dane_ie = i.codigo_dane
        JOIN municipios m ON i.codigo_municipio = m.codigo_municipio
        LEFT JOIN asignaciones a ON e.documento_identidad = a.estudiante_documento
        WHERE e.documento_identidad = ?
    """, (doc_est,))
    estudiante = c.fetchone()
    if not estudiante:
        conn.close()
        raise HTTPException(status_code=404, detail="Estudiante no encontrado.")

    # Buscar documento LOG-007-F actual
    c.execute("""
        SELECT * FROM documentos
        WHERE tipo_documento = 'LOG-007-F' AND estudiante_documento = ?
    """, (doc_est,))
    doc = c.fetchone()

    # Si no existe, generarlo automáticamente para el acudiente
    if not doc:
        conn.close()
        gen_res = DocumentGenerator.generate_log_007(doc_est, version=1, estado="Generado")
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM documentos WHERE id = ?", (gen_res["documento_id"],))
        doc = c.fetchone()

    # Historial de observaciones para este documento
    c.execute("""
        SELECT o.*, u.nombre_completo as autor_nombre
        FROM observaciones o
        JOIN usuarios u ON o.autor_id = u.id
        WHERE o.documento_id = ?
        ORDER BY o.fecha DESC
    """, (doc["id"],))
    observaciones = [dict(r) for r in c.fetchall()]

    conn.close()

    return {
        "estudiante": dict(estudiante),
        "documento": dict(doc),
        "observaciones": observaciones
    }

@app.post("/api/acudiente/cargar-firmado")
async def acudiente_upload_signed(
    file: UploadFile = File(...),
    comentario: str = Form(""),
    user: Dict[str, Any] = Depends(get_current_user)
):
    doc_est = user.get("documento_estudiante")
    if not doc_est:
        raise HTTPException(status_code=400, detail="El usuario no tiene estudiante asociado.")

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, estado FROM documentos WHERE tipo_documento = 'LOG-007-F' AND estudiante_documento = ?", (doc_est,))
    doc = c.fetchone()
    conn.close()

    if not doc:
        raise HTTPException(status_code=404, detail="No se encontró documento para este estudiante.")

    # Guardar archivo temporal
    ext = os.path.splitext(file.filename)[1]
    safe_name = f"uploaded_signed_{doc_est}_{int(os.times()[4])}{ext}"
    temp_file_path = os.path.join(UPLOADS_DIR, safe_name)
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        res = ApprovalWorkflowEngine.transition_document(
            documento_id=doc["id"],
            action="cargar_firmado",
            actor_id=user["id"],
            actor_role=user["rol"],
            actor_username=user["username"],
            comentario=comentario or "Documento firmado cargado por acudiente",
            uploaded_file_path=temp_file_path
        )
        return res
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- PORTAL RECTOR -----------------

@app.get("/api/rector/estudiantes")
def get_rector_estudiantes(user: Dict[str, Any] = Depends(require_role(["rector", "coordinador", "administrador"]))):
    conn = get_db_connection()
    c = conn.cursor()

    query = """
        SELECT e.*, s.nombre as nombre_sede, i.nombre as nombre_ie,
               a.tipo_terminal, a.serial_asignado,
               d.id as doc_id, d.estado as doc_estado, d.version_actual, d.updated_at as doc_fecha
        FROM estudiantes e
        JOIN sedes s ON e.codigo_dane_sede = s.codigo_dane_sede
        JOIN instituciones i ON s.codigo_dane_ie = i.codigo_dane
        LEFT JOIN asignaciones a ON e.documento_identidad = a.estudiante_documento
        LEFT JOIN documentos d ON d.tipo_documento = 'LOG-007-F' AND d.estudiante_documento = e.documento_identidad
        WHERE 1=1
    """
    params = []
    if user["rol"] == "rector" and user["codigo_dane_ie"]:
        query += " AND i.codigo_dane = ?"
        params.append(user["codigo_dane_ie"])

    query += " ORDER BY s.nombre, e.apellidos, e.nombres"
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.get("/api/rector/documentos-bolsa")
def get_rector_bolsa(user: Dict[str, Any] = Depends(require_role(["rector", "coordinador", "administrador"]))):
    conn = get_db_connection()
    c = conn.cursor()

    query = """
        SELECT s.codigo_dane_sede, s.nombre as nombre_sede, s.radicado,
               i.codigo_dane as dane_ie, i.nombre as nombre_ie,
               m.nombre as nombre_mpio,
               d26.id as doc26_id, d26.estado as doc26_estado, d26.version_actual as doc26_version,
               d29.id as doc29_id, d29.estado as doc29_estado, d29.version_actual as doc29_version
        FROM sedes s
        JOIN instituciones i ON s.codigo_dane_ie = i.codigo_dane
        JOIN municipios m ON i.codigo_municipio = m.codigo_municipio
        LEFT JOIN documentos d26 ON d26.tipo_documento = 'LOG-026-F' AND d26.codigo_dane_sede = s.codigo_dane_sede
        LEFT JOIN documentos d29 ON d29.tipo_documento = 'LOG-029-F' AND d29.codigo_dane_sede = s.codigo_dane_sede
        WHERE EXISTS (SELECT 1 FROM bolsa_elementos b WHERE b.codigo_dane_sede = s.codigo_dane_sede AND b.cantidad > 0)
    """
    params = []
    if user["rol"] == "rector" and user["codigo_dane_ie"]:
        query += " AND i.codigo_dane = ?"
        params.append(user["codigo_dane_ie"])

    query += " ORDER BY s.nombre"
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.post("/api/rector/generar-bolsa")
def rector_generate_bolsa(dane_sede: str = Form(...), user: Dict[str, Any] = Depends(require_role(["rector", "coordinador", "administrador"]))):
    try:
        r26 = DocumentGenerator.generate_log_026(dane_sede, version=1, estado="Borrador")
        r29 = DocumentGenerator.generate_log_029(dane_sede, version=1, estado="Borrador")
        return {"success": True, "log_026": r26, "log_029": r29}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/rector/revisar-documento")
def rector_review_document(
    req: ReviewDocumentRequest,
    user: Dict[str, Any] = Depends(require_role(["rector", "coordinador", "administrador"]))
):
    try:
        res = ApprovalWorkflowEngine.transition_document(
            documento_id=req.documento_id,
            action=req.accion,
            actor_id=user["id"],
            actor_role=user["rol"],
            actor_username=user["username"],
            comentario=req.comentarios
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/rector/cargar-en-nombre-acudiente")
async def rector_upload_on_behalf(
    documento_id: int = Form(...),
    motivo: str = Form(...),
    comentario: str = Form(""),
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(require_role(["rector", "coordinador", "administrador"]))
):
    if not motivo or len(motivo.strip()) < 5:
        raise HTTPException(status_code=400, detail="Debe justificar el motivo por el cual carga en nombre del acudiente.")

    safe_name = f"rector_on_behalf_{documento_id}_{int(os.times()[4])}_{file.filename}"
    temp_file_path = os.path.join(UPLOADS_DIR, safe_name)
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        res = ApprovalWorkflowEngine.transition_document(
            documento_id=documento_id,
            action="cargar_firmado",
            actor_id=user["id"],
            actor_role=user["rol"],
            actor_username=user["username"],
            comentario=comentario or f"Carga realizada por rector en nombre del acudiente. Motivo: {motivo}",
            uploaded_file_path=temp_file_path,
            on_behalf_of_role="acudiente",
            on_behalf_motive=motivo
        )
        return res
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- PORTAL COORDINADOR -----------------

@app.get("/api/coordinador/documentos-revision")
def get_coordinador_docs(
    municipio: Optional[str] = None,
    formato: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_role(["coordinador", "administrador"]))
):
    docs = CoordinatorExportService.get_documents_query(
        codigo_mpio=municipio,
        tipo_documento=formato
    )
    return docs

@app.post("/api/coordinador/revisar-documento")
def coordinador_review_document(
    req: ReviewDocumentRequest,
    user: Dict[str, Any] = Depends(require_role(["coordinador", "administrador"]))
):
    try:
        res = ApprovalWorkflowEngine.transition_document(
            documento_id=req.documento_id,
            action=req.accion,
            actor_id=user["id"],
            actor_role=user["rol"],
            actor_username=user["username"],
            comentario=req.comentarios
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/coordinador/cargar-en-nombre-rector")
async def coordinador_upload_on_behalf(
    documento_id: int = Form(...),
    accion: str = Form(...),
    motivo: str = Form(...),
    comentario: str = Form(""),
    file: Optional[UploadFile] = File(None),
    user: Dict[str, Any] = Depends(require_role(["coordinador", "administrador"]))
):
    if not motivo or len(motivo.strip()) < 5:
        raise HTTPException(status_code=400, detail="Debe especificar el motivo por el cual actúa en nombre del rector.")

    temp_file_path = None
    if file:
        safe_name = f"coord_on_behalf_{documento_id}_{int(os.times()[4])}_{file.filename}"
        temp_file_path = os.path.join(UPLOADS_DIR, safe_name)
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    try:
        res = ApprovalWorkflowEngine.transition_document(
            documento_id=documento_id,
            action=accion,
            actor_id=user["id"],
            actor_role=user["rol"],
            actor_username=user["username"],
            comentario=comentario or f"Acción realizada por coordinador en nombre del rector. Motivo: {motivo}",
            uploaded_file_path=temp_file_path,
            on_behalf_of_role="rector",
            on_behalf_motive=motivo
        )
        return res
    except Exception as e:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/coordinador/descargar-lote-zip")
def coordinador_download_zip(
    municipio: Optional[str] = None,
    dane_ie: Optional[str] = None,
    dane_sede: Optional[str] = None,
    formato: Optional[str] = None,
    estado: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_role(["coordinador", "administrador"]))
):
    docs = CoordinatorExportService.get_documents_query(
        codigo_mpio=municipio,
        codigo_dane_ie=dane_ie,
        codigo_dane_sede=dane_sede,
        tipo_documento=formato,
        estado=estado
    )
    if not docs:
        raise HTTPException(status_code=404, detail="No se encontraron documentos con los filtros seleccionados.")

    zip_filename = f"Paquete_Documentos_Caldas_{int(os.times()[4])}.zip"
    zip_path = os.path.join(TEMP_DIR, zip_filename)
    package_res = CoordinatorExportService.generate_zip_package(docs, zip_path)

    # Registrar descarga en auditoría
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO auditoria (actor_id, username, rol, accion, entidad, detalles_json)
        VALUES (?, ?, ?, 'EXPORTAR_LOTE_ZIP', 'documentos', ?)
    """, (user["id"], user["username"], user["rol"], json.dumps({
        "filtros": {"municipio": municipio, "formato": formato, "estado": estado},
        "total_documentos": package_res["total_documentos"]
    })))
    conn.commit()
    conn.close()

    return FileResponse(
        path=zip_path,
        filename=zip_filename,
        media_type="application/zip"
    )

# ----------------- PORTAL ADMINISTRADOR -----------------

@app.get("/api/admin/usuarios")
def admin_get_users(user: Dict[str, Any] = Depends(require_role(["administrador"]))):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT id, username, rol, nombre_completo, email, telefono,
               codigo_dane_ie, codigo_dane_sede, documento_estudiante,
               must_change_password, is_locked, active, created_at
        FROM usuarios
        ORDER BY rol, username
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.post("/api/admin/serials/preview")
def admin_preview_serials(
    req: SerialUpdateRequest,
    user: Dict[str, Any] = Depends(require_role(["administrador"]))
):
    res = SerialManager.preview_serial_updates(req.registros)
    return res

@app.post("/api/admin/serials/apply")
def admin_apply_serials(
    req: SerialUpdateRequest,
    user: Dict[str, Any] = Depends(require_role(["administrador"]))
):
    preview = SerialManager.preview_serial_updates(req.registros)
    if not preview["listo_para_aplicar"]:
        raise HTTPException(
            status_code=400,
            detail=f"Hay {preview['total_conflictos']} conflictos que impiden aplicar la actualización de seriales."
        )

    res = SerialManager.apply_serial_updates(
        valid_updates=preview["actualizaciones_validas"],
        usuario_id=user["id"],
        username=user["username"],
        rol=user["rol"],
        motivo=req.motivo
    )
    return res

@app.post("/api/admin/generar-masivo")
def admin_generate_bulk(
    tipo_formato: str = Form(...),  # 'LOG-007-F', 'LOG-026-F', 'LOG-029-F', 'TODOS'
    user: Dict[str, Any] = Depends(require_role(["administrador"]))
):
    conn = get_db_connection()
    c = conn.cursor()

    generated_count = 0
    errors = []

    if tipo_formato in ["LOG-026-F", "TODOS"]:
        c.execute("""
            SELECT DISTINCT s.codigo_dane_sede
            FROM sedes s
            JOIN bolsa_elementos b ON s.codigo_dane_sede = b.codigo_dane_sede
            WHERE b.cantidad > 0
        """)
        sedes_bolsa = c.fetchall()
        for s in sedes_bolsa:
            try:
                DocumentGenerator.generate_log_026(s["codigo_dane_sede"], version=1, estado="Borrador")
                generated_count += 1
            except Exception as e:
                errors.append(f"LOG-026 {s['codigo_dane_sede']}: {str(e)}")

    if tipo_formato in ["LOG-029-F", "TODOS"]:
        c.execute("""
            SELECT DISTINCT s.codigo_dane_sede
            FROM sedes s
            JOIN bolsa_elementos b ON s.codigo_dane_sede = b.codigo_dane_sede
            WHERE b.cantidad > 0
        """)
        sedes_bolsa = c.fetchall()
        for s in sedes_bolsa:
            try:
                DocumentGenerator.generate_log_029(s["codigo_dane_sede"], version=1, estado="Borrador")
                generated_count += 1
            except Exception as e:
                errors.append(f"LOG-029 {s['codigo_dane_sede']}: {str(e)}")

    if tipo_formato in ["LOG-007-F", "TODOS"]:
        c.execute("SELECT documento_identidad FROM estudiantes")
        estudiantes = c.fetchall()
        for e in estudiantes:
            try:
                DocumentGenerator.generate_log_007(e["documento_identidad"], version=1, estado="Generado")
                generated_count += 1
            except Exception as e:
                errors.append(f"LOG-007 {e['documento_identidad']}: {str(e)}")

    c.execute("""
        INSERT INTO auditoria (actor_id, username, rol, accion, entidad, detalles_json)
        VALUES (?, ?, ?, 'GENERACION_MASIVA', 'documentos', ?)
    """, (user["id"], user["username"], user["rol"], json.dumps({
        "tipo_formato": tipo_formato,
        "generados": generated_count,
        "errores": len(errors)
    })))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "tipo_formato": tipo_formato,
        "generados": generated_count,
        "errores": errors
    }

@app.get("/api/admin/auditoria")
def admin_get_audit_logs(
    limit: int = 100,
    user: Dict[str, Any] = Depends(require_role(["administrador"]))
):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM auditoria
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.get("/api/admin/drive-status")
def admin_get_drive_status(user: Dict[str, Any] = Depends(require_role(["administrador"]))):
    return {
        "root_folder_id": drive_service.root_folder_id,
        "has_real_credentials": drive_service.has_real_drive,
        "mirror_path": drive_service.mirror_base,
        "status": "Conectado a estructura institucional /Bolsa_Tecnologica_Caldas/"
    }

# ----------------- DESCARGA DE DOCUMENTOS -----------------

@app.get("/api/documentos/{doc_id}/descargar")
def download_document(doc_id: int, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT d.*, s.codigo_dane_ie
        FROM documentos d
        JOIN sedes s ON d.codigo_dane_sede = s.codigo_dane_sede
        WHERE d.id = ?
    """, (doc_id,))
    doc = c.fetchone()

    if not doc:
        conn.close()
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    # Control de acceso por rol
    if user["rol"] == "acudiente":
        if doc["estudiante_documento"] != user["documento_estudiante"]:
            conn.close()
            raise HTTPException(status_code=403, detail="No autorizado para descargar este expediente.")
    elif user["rol"] == "rector":
        if doc["codigo_dane_ie"] != user["codigo_dane_ie"]:
            conn.close()
            raise HTTPException(status_code=403, detail="No autorizado para acceder a documentos fuera de su institución.")

    # Registrar descarga en auditoría
    c.execute("""
        INSERT INTO auditoria (actor_id, username, rol, accion, entidad, entidad_id)
        VALUES (?, ?, ?, 'DESCARGA_DOCUMENTO', 'documentos', ?)
    """, (user["id"], user["username"], user["rol"], str(doc_id)))
    conn.commit()
    conn.close()

    file_path = doc["ruta_archivo"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archivo físico no encontrado en almacenamiento.")

    filename = os.path.basename(file_path)
    return FileResponse(path=file_path, filename=filename)

# ----------------- SERVIR FRONTEND -----------------

if os.path.exists(FRONTEND_DIR):
    css_dir = os.path.join(FRONTEND_DIR, "css")
    js_dir = os.path.join(FRONTEND_DIR, "js")
    assets_dir = os.path.join(FRONTEND_DIR, "assets")

    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_frontend_root():
        index_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "API de Gestión Documental activa. Frontend en preparación."}

if __name__ == "__main__":
    import uvicorn
    print("Iniciando servidor de Gestión Documental en http://127.0.0.1:8050")
    uvicorn.run("app:app", host="127.0.0.1", port=8050, reload=False)
