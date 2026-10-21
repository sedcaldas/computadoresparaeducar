import os
import pandas as pd
from typing import Dict, Any, List, Optional
from database import get_db_connection

class SerialManager:
    """
    Gestión de seriales conforme a la sección 9.2 de SKILL.md:
    - Validación de formato, unicidad y conflictos.
    - Vista previa (dry run) antes de aplicar cambios.
    - Historial de cambios con usuario, motivo, fecha y archivo fuente.
    - Preservación de ceros iniciales como texto.
    """

    @staticmethod
    def preview_serial_updates(records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Valida una lista de registros {'documento_estudiante': str, 'nuevo_serial': str}
        y devuelve una vista previa con clasificaciones: válidos, duplicados, sin cambio, errores.
        """
        conn = get_db_connection()
        c = conn.cursor()

        valid_updates = []
        conflicts = []
        unchanged = []
        seen_serials = set()

        for item in records:
            doc = str(item.get("documento_estudiante", "")).strip()
            nuevo_serial = str(item.get("nuevo_serial", "")).strip()

            if not doc:
                conflicts.append({"documento": doc, "serial": nuevo_serial, "error": "Documento de estudiante vacío"})
                continue

            if not nuevo_serial or nuevo_serial == "0":
                conflicts.append({"documento": doc, "serial": nuevo_serial, "error": "Serial vacío o inválido"})
                continue

            # Detectar duplicados en el mismo lote
            if nuevo_serial in seen_serials:
                conflicts.append({"documento": doc, "serial": nuevo_serial, "error": f"Serial duplicado en el lote: {nuevo_serial}"})
                continue
            seen_serials.add(nuevo_serial)

            # Buscar estudiante y asignación actual
            c.execute("""
                SELECT a.id, a.serial_asignado, a.tipo_terminal, e.nombre_completo, s.nombre as nombre_sede
                FROM estudiantes e
                JOIN sedes s ON e.codigo_dane_sede = s.codigo_dane_sede
                LEFT JOIN asignaciones a ON e.documento_identidad = a.estudiante_documento
                WHERE e.documento_identidad = ?
            """, (doc,))
            row = c.fetchone()

            if not row:
                conflicts.append({"documento": doc, "serial": nuevo_serial, "error": "Estudiante no encontrado en la base de datos"})
                continue

            serial_anterior = str(row["serial_asignado"] or "0")

            if serial_anterior == nuevo_serial:
                unchanged.append({
                    "documento": doc,
                    "nombre": row["nombre_completo"],
                    "serial": nuevo_serial,
                    "mensaje": "El serial actual ya coincide con el nuevo"
                })
                continue

            # Verificar si el serial ya está asignado a otro estudiante
            c.execute("""
                SELECT estudiante_documento FROM asignaciones
                WHERE serial_asignado = ? AND estudiante_documento != ?
            """, (nuevo_serial, doc))
            dup = c.fetchone()
            if dup:
                conflicts.append({
                    "documento": doc,
                    "serial": nuevo_serial,
                    "error": f"Serial ya asignado al estudiante {dup['estudiante_documento']}"
                })
                continue

            valid_updates.append({
                "documento": doc,
                "nombre": row["nombre_completo"],
                "sede": row["nombre_sede"],
                "tipo_terminal": row["tipo_terminal"],
                "serial_anterior": serial_anterior,
                "serial_nuevo": nuevo_serial
            })

        conn.close()

        return {
            "total_recibidos": len(records),
            "total_validos": len(valid_updates),
            "total_conflictos": len(conflicts),
            "total_sin_cambio": len(unchanged),
            "actualizaciones_validas": valid_updates,
            "conflictos": conflicts,
            "sin_cambio": unchanged,
            "listo_para_aplicar": len(conflicts) == 0 and len(valid_updates) > 0
        }

    @staticmethod
    def apply_serial_updates(
        valid_updates: List[Dict[str, Any]],
        usuario_id: int,
        username: str,
        rol: str,
        motivo: str,
        archivo_fuente: Optional[str] = "Actualización manual"
    ) -> Dict[str, Any]:
        """
        Aplica las actualizaciones validadas registrando trazabilidad estricta.
        """
        conn = get_db_connection()
        c = conn.cursor()

        applied_count = 0
        for item in valid_updates:
            doc = str(item["documento"])
            s_nuevo = str(item["serial_nuevo"])
            s_ant = str(item["serial_anterior"])

            # Actualizar asignación
            c.execute("""
                UPDATE asignaciones
                SET serial_asignado = ?
                WHERE estudiante_documento = ?
            """, (s_nuevo, doc))

            # Registrar en historial de seriales
            c.execute("""
                INSERT INTO seriales_historial (
                    estudiante_documento, serial_anterior, serial_nuevo,
                    usuario_id, motivo, archivo_fuente
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (doc, s_ant, s_nuevo, usuario_id, motivo, archivo_fuente))

            # Registrar en auditoría general
            c.execute("""
                INSERT INTO auditoria (actor_id, username, rol, accion, entidad, entidad_id, detalles_json)
                VALUES (?, ?, ?, 'ACTUALIZAR_SERIAL', 'asignaciones', ?, ?)
            """, (usuario_id, username, rol, doc, f'{{"serial_anterior": "{s_ant}", "serial_nuevo": "{s_nuevo}", "motivo": "{motivo}"}}'))

            applied_count += 1

        conn.commit()
        conn.close()

        return {
            "success": True,
            "actualizaciones_aplicadas": applied_count,
            "mensaje": f"Se actualizaron exitosamente {applied_count} seriales con trazabilidad."
        }
