import os
import io
import zipfile
import csv
import openpyxl
from typing import Dict, Any, List, Optional
from database import get_db_connection

class CoordinatorExportService:
    """
    Servicio de descargas y exportaciones del coordinador conforme a la Sección 15 de SKILL.md.
    Genera paquetes ZIP filtrados con manifiesto en formato XLSX y CSV.
    """

    @staticmethod
    def get_documents_query(
        codigo_mpio: Optional[str] = None,
        codigo_dane_ie: Optional[str] = None,
        codigo_dane_sede: Optional[str] = None,
        tipo_documento: Optional[str] = None,
        estado: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        c = conn.cursor()

        query = """
            SELECT d.id, d.tipo_documento, d.codigo_dane_sede, d.estudiante_documento,
                   d.version_actual, d.estado, d.ruta_archivo, d.drive_id, d.radicado,
                   d.created_at, d.updated_at,
                   s.nombre as nombre_sede, s.codigo_dane_ie,
                   i.nombre as nombre_ie, i.codigo_municipio,
                   m.nombre as nombre_mpio,
                   e.nombre_completo as nombre_estudiante
            FROM documentos d
            JOIN sedes s ON d.codigo_dane_sede = s.codigo_dane_sede
            JOIN instituciones i ON s.codigo_dane_ie = i.codigo_dane
            JOIN municipios m ON i.codigo_municipio = m.codigo_municipio
            LEFT JOIN estudiantes e ON d.estudiante_documento = e.documento_identidad
            WHERE 1=1
        """
        params = []
        if codigo_mpio:
            query += " AND m.codigo_municipio = ?"
            params.append(codigo_mpio)
        if codigo_dane_ie:
            query += " AND i.codigo_dane = ?"
            params.append(codigo_dane_ie)
        if codigo_dane_sede:
            query += " AND s.codigo_dane_sede = ?"
            params.append(codigo_dane_sede)
        if tipo_documento:
            query += " AND d.tipo_documento = ?"
            params.append(tipo_documento)
        if estado:
            query += " AND d.estado = ?"
            params.append(estado)

        query += " ORDER BY m.nombre, i.nombre, s.nombre, d.tipo_documento, d.id"
        c.execute(query, params)
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def generate_zip_package(
        docs: List[Dict[str, Any]],
        output_zip_path: str
    ) -> Dict[str, Any]:
        """
        Empaqueta los archivos de documentos en un ZIP, incorporando un manifiesto
        en CSV y en XLSX con el detalle del expediente.
        """
        included_files = 0
        manifest_rows = []
        os.makedirs(os.path.dirname(os.path.abspath(output_zip_path)), exist_ok=True)

        with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for d in docs:
                file_path = d.get("ruta_archivo")
                if file_path and os.path.exists(file_path):
                    filename = os.path.basename(file_path)
                    arcname = f"{d['nombre_mpio']}/{d['codigo_dane_ie']}_{d['nombre_ie'][:25]}/{d['tipo_documento']}/{filename}"
                    zip_file.write(file_path, arcname=arcname)
                    included_files += 1

                manifest_rows.append({
                    "ID_Documento": d["id"],
                    "Tipo_Formato": d["tipo_documento"],
                    "Municipio": d["nombre_mpio"],
                    "Institucion": d["nombre_ie"],
                    "DANE_IE": d["codigo_dane_ie"],
                    "Sede": d["nombre_sede"],
                    "DANE_Sede": d["codigo_dane_sede"],
                    "Estudiante_Doc": d.get("estudiante_documento") or "N/A",
                    "Estudiante_Nombre": d.get("nombre_estudiante") or "N/A",
                    "Version": d["version_actual"],
                    "Estado": d["estado"],
                    "Fecha_Actualizacion": d["updated_at"],
                    "Archivo": os.path.basename(file_path) if file_path else "No generado"
                })

            # 1. Generar manifiesto CSV
            csv_buf = io.StringIO()
            if manifest_rows:
                writer = csv.DictWriter(csv_buf, fieldnames=list(manifest_rows[0].keys()))
                writer.writeheader()
                writer.writerows(manifest_rows)
            zip_file.writestr("MANIFIESTO_EXPEDIENTES.csv", csv_buf.getvalue().encode('utf-8-sig'))

            # 2. Generar manifiesto XLSX
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Manifiesto Expedientes"
            if manifest_rows:
                headers = list(manifest_rows[0].keys())
                ws.append(headers)
                for r in manifest_rows:
                    ws.append(list(r.values()))
            
            xlsx_buf = io.BytesIO()
            wb.save(xlsx_buf)
            zip_file.writestr("MANIFIESTO_EXPEDIENTES.xlsx", xlsx_buf.getvalue())

        return {
            "output_zip_path": output_zip_path,
            "total_documentos": len(docs),
            "archivos_incluidos": included_files,
            "zip_size_bytes": os.path.getsize(output_zip_path)
        }
