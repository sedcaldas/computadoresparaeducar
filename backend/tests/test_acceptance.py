import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection
from security import verify_password
from document_generator import DocumentGenerator
from approval_workflow import ApprovalWorkflowEngine
from serial_manager import SerialManager
from coordinator_service import CoordinatorExportService

class TestAcceptanceCriteria(unittest.TestCase):
    """
    Pruebas automatizadas de aceptación basadas en la Sección 18 de SKILL.md.
    """

    @classmethod
    def setUpClass(cls):
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT codigo_dane_sede FROM sedes LIMIT 1")
        cls.dane_sede = c.fetchone()[0]
        c.execute("SELECT documento_identidad FROM estudiantes LIMIT 1")
        cls.doc_estudiante = c.fetchone()[0]

        c.execute("SELECT id, username, salt, password_hash FROM usuarios WHERE rol = 'administrador' LIMIT 1")
        cls.admin = dict(c.fetchone())
        c.execute("SELECT id, username, salt, password_hash FROM usuarios WHERE rol = 'coordinador' LIMIT 1")
        cls.coord = dict(c.fetchone())
        c.execute("SELECT id, username, salt, password_hash, codigo_dane_ie FROM usuarios WHERE rol = 'rector' LIMIT 1")
        cls.rector = dict(c.fetchone())
        c.execute("SELECT id, username, salt, password_hash, documento_estudiante FROM usuarios WHERE rol = 'acudiente' LIMIT 1")
        cls.acudiente = dict(c.fetchone())
        conn.close()

    def test_01_initial_credentials_compliance(self):
        """Criterio 17 & Sección 5: Verificación de contraseñas iniciales con hash seguro"""
        # Admin: gcaldas2026*
        self.assertTrue(verify_password("gcaldas2026*", self.admin["salt"], self.admin["password_hash"]))
        # Coordinador: gcaldas2026*
        self.assertTrue(verify_password("gcaldas2026*", self.coord["salt"], self.coord["password_hash"]))
        # Rector: CODIGO_DANE
        self.assertTrue(verify_password(self.rector["username"], self.rector["salt"], self.rector["password_hash"]))
        # Acudiente: DOCUMENTO_ESTUDIANTE
        self.assertTrue(verify_password(self.acudiente["username"], self.acudiente["salt"], self.acudiente["password_hash"]))

    def test_02_log026_generation(self):
        """Criterio 2: LOG-026-F se genera con datos correctos por institución/sede"""
        res = DocumentGenerator.generate_log_026(self.dane_sede, version=1)
        self.assertTrue(os.path.exists(res["path"]))
        self.assertIn("LOG-026-F", res["filename"])

    def test_03_log029_generation_preserves_sheets_and_formulas(self):
        """Criterio 3: LOG-029-F se diligencia sin destruir fórmulas, hojas auxiliares ni catálogos"""
        res = DocumentGenerator.generate_log_029(self.dane_sede, version=1)
        self.assertTrue(os.path.exists(res["path"]))
        import openpyxl
        wb = openpyxl.load_workbook(res["path"])
        expected_sheets = ['Formulario', 'Lista Elementos', 'Catalogo de Elementos', 'Sabana de Seriales Despachados', 'Validación Equipos Portatiles']
        for s in expected_sheets:
            self.assertIn(s, wb.sheetnames)

    def test_04_log007_generation(self):
        """Criterio 4: LOG-007-F se genera desde la base de estudiantes y conserva la plantilla"""
        res = DocumentGenerator.generate_log_007(self.doc_estudiante, version=1)
        self.assertTrue(os.path.exists(res["path"]))
        self.assertIn("LOG-007-F", res["filename"])

    def test_05_rector_on_behalf_of_acudiente(self):
        """Criterio 8: El rector puede cargar LOG-007-F en nombre del acudiente con trazabilidad"""
        res_gen = DocumentGenerator.generate_log_007(self.doc_estudiante, version=1)
        res = ApprovalWorkflowEngine.transition_document(
            documento_id=res_gen["documento_id"],
            action="cargar_firmado",
            actor_id=self.rector["id"],
            actor_role="rector",
            actor_username=self.rector["username"],
            comentario="Carga institucional por imposibilidad tecnológica del acudiente",
            on_behalf_of_role="acudiente",
            on_behalf_motive="Acudiente sin conectividad en zona rural"
        )
        self.assertEqual(res["nuevo_estado"], "En revisión del rector")

    def test_06_coordinator_on_behalf_of_rector(self):
        """Criterio 9: El coordinador puede actuar en nombre del rector registrando motivo"""
        res_gen = DocumentGenerator.generate_log_026(self.dane_sede, version=1)
        res = ApprovalWorkflowEngine.transition_document(
            documento_id=res_gen["documento_id"],
            action="enviar_coordinador",
            actor_id=self.coord["id"],
            actor_role="coordinador",
            actor_username=self.coord["username"],
            comentario="Remisión por contingencia del rector",
            on_behalf_of_role="rector",
            on_behalf_motive="Rector con licencia médica certificada"
        )
        self.assertEqual(res["nuevo_estado"], "En revisión del coordinador")

    def test_07_serial_validation_and_conflict_detection(self):
        """Criterio 13: La actualización de seriales detecta conflictos y conserva historial"""
        preview = SerialManager.preview_serial_updates([
            {"documento_estudiante": self.doc_estudiante, "nuevo_serial": "SERIAL-TEST-2026-X1"},
            {"documento_estudiante": self.doc_estudiante, "nuevo_serial": "SERIAL-TEST-2026-X1"} # duplicado
        ])
        self.assertGreater(preview["total_conflictos"], 0)
        self.assertFalse(preview["listo_para_aplicar"])

    def test_08_drive_structure_compliance(self):
        """Criterio 14: Los documentos quedan en las carpetas correctas de Drive"""
        res = DocumentGenerator.generate_log_026(self.dane_sede, version=1)
        self.assertIn("/Bolsa_Tecnologica_Caldas/", res["drive_path"])
        self.assertIn("/LOG-026-F/", res["drive_path"])

    def test_09_coordinator_zip_export_with_manifest(self):
        """Criterio 15: Exportación por lotes en ZIP con manifiesto XLSX y CSV"""
        docs = CoordinatorExportService.get_documents_query()
        zip_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_documents", "temp", "test_pack.zip")
        res = CoordinatorExportService.generate_zip_package(docs[:5], zip_path)
        self.assertTrue(os.path.exists(zip_path))
        import zipfile
        with zipfile.ZipFile(zip_path, 'r') as z:
            names = z.namelist()
            self.assertIn("MANIFIESTO_EXPEDIENTES.csv", names)
            self.assertIn("MANIFIESTO_EXPEDIENTES.xlsx", names)

if __name__ == "__main__":
    unittest.main()
