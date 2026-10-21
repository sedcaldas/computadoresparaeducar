import os
import shutil
from typing import Dict, Any, Optional
from database import get_db_connection
from drive_service import drive_service

VALID_TRANSITIONS = {
    # LOG-007-F
    ("LOG-007-F", "Generado", "cargar_firmado"): "En revisión del rector",
    ("LOG-007-F", "Pendiente de firma/carga", "cargar_firmado"): "En revisión del rector",
    ("LOG-007-F", "Devuelto al acudiente", "cargar_firmado"): "En revisión del rector",
    ("LOG-007-F", "En revisión del rector", "aprobar_rector"): "En revisión del coordinador",
    ("LOG-007-F", "En revisión del rector", "devolver_acudiente"): "Devuelto al acudiente",
    ("LOG-007-F", "En revisión del coordinador", "aprobar_coordinador"): "Aprobado",
    ("LOG-007-F", "En revisión del coordinador", "devolver_rector"): "Devuelto al rector",
    ("LOG-007-F", "Devuelto al rector", "aprobar_rector"): "En revisión del coordinador",

    # LOG-026-F & LOG-029-F
    ("LOG-026-F", "Borrador", "enviar_coordinador"): "En revisión del coordinador",
    ("LOG-026-F", "Generado", "enviar_coordinador"): "En revisión del coordinador",
    ("LOG-026-F", "Devuelto al rector", "enviar_coordinador"): "En revisión del coordinador",
    ("LOG-026-F", "En revisión del coordinador", "aprobar_coordinador"): "Aprobado",
    ("LOG-026-F", "En revisión del coordinador", "devolver_rector"): "Devuelto al rector",

    ("LOG-029-F", "Borrador", "enviar_coordinador"): "En revisión del coordinador",
    ("LOG-029-F", "Generado", "enviar_coordinador"): "En revisión del coordinador",
    ("LOG-029-F", "Devuelto al rector", "enviar_coordinador"): "En revisión del coordinador",
    ("LOG-029-F", "En revisión del coordinador", "aprobar_coordinador"): "Aprobado",
    ("LOG-029-F", "En revisión del coordinador", "devolver_rector"): "Devuelto al rector",
}

class ApprovalWorkflowEngine:
    """
    Motor de flujos de aprobación y control de cambios para documentos institucionales
    conforme a la Sección 10 de SKILL.md.
    """

    @staticmethod
    def transition_document(
        documento_id: int,
        action: str,
        actor_id: int,
        actor_role: str,
        actor_username: str,
        comentario: str = "",
        uploaded_file_path: Optional[str] = None,
        on_behalf_of_role: Optional[str] = None,
        on_behalf_motive: Optional[str] = None,
        ip_address: Optional[str] = "127.0.0.1"
    ) -> Dict[str, Any]:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT d.id, d.tipo_documento, d.codigo_dane_sede, d.estudiante_documento,
                   d.version_actual, d.estado, d.ruta_archivo, d.radicado,
                   s.nombre as nombre_sede, s.codigo_dane_ie,
                   i.nombre as nombre_ie, i.codigo_municipio,
                   m.nombre as nombre_mpio
            FROM documentos d
            JOIN sedes s ON d.codigo_dane_sede = s.codigo_dane_sede
            JOIN instituciones i ON s.codigo_dane_ie = i.codigo_dane
            JOIN municipios m ON i.codigo_municipio = m.codigo_municipio
            WHERE d.id = ?
        """, (documento_id,))
        doc = c.fetchone()
        if not doc:
            conn.close()
            raise ValueError(f"Documento #{documento_id} no encontrado.")

        tipo_doc = doc["tipo_documento"]
        estado_actual = doc["estado"]

        # Validar permisos por rol y acción
        if action == "cargar_firmado":
            if actor_role not in ["acudiente", "rector", "coordinador", "administrador"]:
                conn.close()
                raise PermissionError("Rol no autorizado para cargar documentos firmados.")
        elif action in ["aprobar_rector", "devolver_acudiente"]:
            if actor_role not in ["rector", "coordinador", "administrador"]:
                conn.close()
                raise PermissionError("Solo el rector (o coordinador/admin autorizado) puede revisar en esta etapa.")
        elif action in ["aprobar_coordinador", "devolver_rector"]:
            if actor_role not in ["coordinador", "administrador"]:
                conn.close()
                raise PermissionError("Solo el coordinador (o administrador) puede aprobar o devolver al rector.")
        elif action == "enviar_coordinador":
            if actor_role not in ["rector", "coordinador", "administrador"]:
                conn.close()
                raise PermissionError("Solo el rector o coordinador/administrador autorizado puede remitir formatos.")

        # Validar motivo obligatorio en devoluciones
        if "devolver" in action and (not comentario or len(comentario.strip()) < 5):
            conn.close()
            raise ValueError("La devolución exige un motivo y observaciones claras de corrección.")

        # Validar transición válida
        key = (tipo_doc, estado_actual, action)
        nuevo_estado = VALID_TRANSITIONS.get(key)
        if not nuevo_estado:
            conn.close()
            raise ValueError(f"Transición no permitida: {tipo_doc} en estado '{estado_actual}' no permite acción '{action}'.")

        nueva_version = doc["version_actual"]
        nueva_ruta = doc["ruta_archivo"]
        drive_file_id = None

        # Si se subió un nuevo archivo físico (por ejemplo, firmado o corregido)
        if uploaded_file_path and os.path.exists(uploaded_file_path):
            nueva_version += 1
            ext = os.path.splitext(uploaded_file_path)[1]
            if tipo_doc == "LOG-007-F":
                nuevo_nombre = f"LOG-007-F_{doc['codigo_dane_sede']}_{doc['estudiante_documento']}_v{nueva_version:02d}{ext}"
            else:
                nuevo_nombre = f"{tipo_doc}_{doc['codigo_dane_sede']}_v{nueva_version:02d}{ext}"

            storage_res = drive_service.store_file(
                src_file_path=uploaded_file_path,
                target_filename=nuevo_nombre,
                codigo_mpio=doc["codigo_municipio"],
                nombre_mpio=doc["nombre_mpio"],
                dane_ie=doc["codigo_dane_ie"],
                nombre_ie=doc["nombre_ie"],
                dane_sede=doc["codigo_dane_sede"],
                nombre_sede=doc["nombre_sede"],
                tipo_documento=tipo_doc,
                estado=nuevo_estado,
                documento_estudiante=doc["estudiante_documento"]
            )
            nueva_ruta = storage_res["dest_file_path"]
            drive_file_id = storage_res["drive_file_id"]

        # Actualizar tabla de documentos
        c.execute("""
            UPDATE documentos
            SET estado = ?, version_actual = ?, ruta_archivo = ?,
                drive_id = COALESCE(?, drive_id),
                on_behalf_of_id = CASE WHEN ? IS NOT NULL THEN ? ELSE on_behalf_of_id END,
                motivo_on_behalf = CASE WHEN ? IS NOT NULL THEN ? ELSE motivo_on_behalf END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (nuevo_estado, nueva_version, nueva_ruta, drive_file_id,
              on_behalf_of_role, actor_id, on_behalf_motive, on_behalf_motive, documento_id))

        # Registrar historial de versión
        c.execute("""
            INSERT INTO documento_versiones (
                documento_id, version_num, estado, ruta_archivo, drive_id, actor_id, comentarios
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (documento_id, nueva_version, nuevo_estado, nueva_ruta, drive_file_id, actor_id, comentario))

        # Normalizar tipo_accion para la tabla de observaciones
        tipo_accion_norm = (
            'aprobacion' if 'aprobar' in action
            else ('devolucion' if 'devolver' in action
            else ('carga' if 'cargar' in action or 'enviar' in action
            else 'comentario'))
        )

        # Registrar observación/tarea
        c.execute("""
            INSERT INTO observaciones (
                documento_id, version_num, autor_id, rol_autor, tipo_accion, comentarios
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (documento_id, nueva_version, actor_id, actor_role, tipo_accion_norm, comentario))

        # Registrar en bitácora de auditoría
        audit_details = {
            "documento_id": documento_id,
            "tipo_documento": tipo_doc,
            "estado_anterior": estado_actual,
            "nuevo_estado": nuevo_estado,
            "accion": action,
            "version": nueva_version,
            "comentario": comentario,
            "en_nombre_de": on_behalf_of_role,
            "motivo_en_nombre_de": on_behalf_motive
        }
        import json
        c.execute("""
            INSERT INTO auditoria (actor_id, username, rol, accion, entidad, entidad_id, detalles_json, ip)
            VALUES (?, ?, ?, ?, 'documentos', ?, ?, ?)
        """, (actor_id, actor_username, actor_role, f"TRANSICION_{action.upper()}", str(documento_id), json.dumps(audit_details), ip_address))

        conn.commit()
        conn.close()

        return {
            "success": True,
            "documento_id": documento_id,
            "estado_anterior": estado_actual,
            "nuevo_estado": nuevo_estado,
            "version": nueva_version,
            "accion": action
        }
