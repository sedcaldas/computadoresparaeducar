import os
import re
import hashlib
import json
import shutil
from typing import Dict, Any, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DRIVE_FOLDER_ID = "1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51"
DRIVE_MIRROR_DIR = os.path.join(BASE_DIR, "generated_documents", "Bolsa_Tecnologica_Caldas")

def sanitize_folder_name(name: str) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', '_', str(name)).strip()
    return re.sub(r'\s+', '_', cleaned)

class GoogleDriveManager:
    """
    Gestiona la jerarquía de almacenamiento de Google Drive conforme a la sección 6 de SKILL.md.
    Estructura:
    /Bolsa_Tecnologica_Caldas/
      /{CODIGO_MUNICIPIO}_{MUNICIPIO}/
        /{CODIGO_DANE_IE}_{NOMBRE_IE}/
          /{CODIGO_DANE_SEDE}_{NOMBRE_SEDE}/
            /LOG-026-F/
              /Borradores/
              /En_revision/
              /Aprobados/
              /Devueltos/
            /LOG-029-F/
              /Borradores/
              /En_revision/
              /Aprobados/
              /Devueltos/
            /LOG-007-F/
              /{DOCUMENTO_ESTUDIANTE}/
                /Generados/
                /Firmados/
                /En_revision/
                /Aprobados/
                /Devueltos/
            /Historial/
    """
    def __init__(self):
        self.root_folder_id = ROOT_DRIVE_FOLDER_ID
        self.mirror_base = DRIVE_MIRROR_DIR
        os.makedirs(self.mirror_base, exist_ok=True)
        self.credentials_path = os.path.join(os.path.dirname(__file__), "credentials.json")
        self.has_real_drive = os.path.exists(self.credentials_path)

    def compute_deterministic_id(self, path_str: str) -> str:
        h = hashlib.sha256(path_str.encode('utf-8')).hexdigest()[:28]
        return f"1-Gdrive-{h}"

    def get_document_folder_path(
        self,
        codigo_mpio: str,
        nombre_mpio: str,
        dane_ie: str,
        nombre_ie: str,
        dane_sede: str,
        nombre_sede: str,
        tipo_documento: str,
        estado: str,
        documento_estudiante: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """
        Retorna (rel_path, abs_mirror_path, drive_folder_id)
        """
        mpio_folder = f"{sanitize_folder_name(codigo_mpio)}_{sanitize_folder_name(nombre_mpio)}"
        ie_folder = f"{sanitize_folder_name(dane_ie)}_{sanitize_folder_name(nombre_ie)}"
        sede_folder = f"{sanitize_folder_name(dane_sede)}_{sanitize_folder_name(nombre_sede)}"
        
        # Estado normalizado para subcarpeta
        estado_map = {
            'Borrador': 'Borradores',
            'Generado': 'Generados' if tipo_documento == 'LOG-007-F' else 'Borradores',
            'Pendiente de firma/carga': 'Firmados',
            'En revisión del rector': 'En_revision',
            'En revisión del coordinador': 'En_revision',
            'Devuelto al acudiente': 'Devueltos',
            'Devuelto al rector': 'Devueltos',
            'Aprobado': 'Aprobados'
        }
        subcarpeta_estado = estado_map.get(estado, 'En_revision')

        if tipo_documento == 'LOG-007-F':
            doc_est = sanitize_folder_name(documento_estudiante or 'GENERAL')
            rel_parts = [
                mpio_folder,
                ie_folder,
                sede_folder,
                'LOG-007-F',
                doc_est,
                subcarpeta_estado
            ]
        else:
            rel_parts = [
                mpio_folder,
                ie_folder,
                sede_folder,
                sanitize_folder_name(tipo_documento),
                subcarpeta_estado
            ]

        rel_path = "/".join(rel_parts)
        abs_mirror_path = os.path.join(self.mirror_base, *rel_parts)
        os.makedirs(abs_mirror_path, exist_ok=True)
        drive_folder_id = self.compute_deterministic_id(f"folder/{rel_path}")

        return rel_path, abs_mirror_path, drive_folder_id

    def store_file(
        self,
        src_file_path: str,
        target_filename: str,
        codigo_mpio: str,
        nombre_mpio: str,
        dane_ie: str,
        nombre_ie: str,
        dane_sede: str,
        nombre_sede: str,
        tipo_documento: str,
        estado: str,
        documento_estudiante: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Almacena el archivo en la jerarquía espejada de Google Drive y registra los metadatos.
        """
        rel_path, abs_dir, folder_id = self.get_document_folder_path(
            codigo_mpio, nombre_mpio, dane_ie, nombre_ie,
            dane_sede, nombre_sede, tipo_documento, estado, documento_estudiante
        )
        
        dest_file_path = os.path.join(abs_dir, target_filename)
        shutil.copy2(src_file_path, dest_file_path)

        # Calcular SHA-256
        h = hashlib.sha256()
        with open(dest_file_path, 'rb') as f:
            while chunk := f.read(8192):
                h.update(chunk)
        sha256 = h.hexdigest()

        drive_file_id = self.compute_deterministic_id(f"file/{rel_path}/{target_filename}")

        # Guardar metadatos en json adyacente
        meta_path = f"{dest_file_path}.meta.json"
        metadata = {
            "drive_file_id": drive_file_id,
            "drive_folder_id": folder_id,
            "root_folder_id": self.root_folder_id,
            "filename": target_filename,
            "relative_path": f"/Bolsa_Tecnologica_Caldas/{rel_path}/{target_filename}",
            "tipo_documento": tipo_documento,
            "estado": estado,
            "codigo_dane_sede": dane_sede,
            "estudiante_documento": documento_estudiante,
            "sha256": sha256,
            "size_bytes": os.path.getsize(dest_file_path)
        }
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)

        return {
            "dest_file_path": dest_file_path,
            "drive_file_id": drive_file_id,
            "drive_folder_id": folder_id,
            "relative_path": metadata["relative_path"],
            "sha256": sha256
        }

drive_service = GoogleDriveManager()
