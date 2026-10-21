import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection
from document_generator import DocumentGenerator
from approval_workflow import ApprovalWorkflowEngine

class TestWorkflowEngine(unittest.TestCase):

    def setUp(self):
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT documento_identidad FROM estudiantes LIMIT 1")
        self.doc_estudiante = c.fetchone()[0]

        # Obtener IDs de usuarios
        c.execute("SELECT id, username FROM usuarios WHERE rol = 'acudiente' LIMIT 1")
        self.acudiente = c.fetchone()
        c.execute("SELECT id, username FROM usuarios WHERE rol = 'rector' LIMIT 1")
        self.rector = c.fetchone()
        c.execute("SELECT id, username FROM usuarios WHERE rol = 'coordinador' LIMIT 1")
        self.coordinador = c.fetchone()
        conn.close()

    def test_full_log007_workflow(self):
        # 1. Generar documento
        res_gen = DocumentGenerator.generate_log_007(self.doc_estudiante, version=1)
        doc_id = res_gen["documento_id"]

        # 2. Cargar firmado (por acudiente)
        res_upload = ApprovalWorkflowEngine.transition_document(
            documento_id=doc_id,
            action="cargar_firmado",
            actor_id=self.acudiente["id"],
            actor_role="acudiente",
            actor_username=self.acudiente["username"],
            comentario="Documento firmado cargado por el acudiente"
        )
        self.assertEqual(res_upload["nuevo_estado"], "En revisión del rector")

        # 3. Rector aprueba -> En revisión del coordinador
        res_rec = ApprovalWorkflowEngine.transition_document(
            documento_id=doc_id,
            action="aprobar_rector",
            actor_id=self.rector["id"],
            actor_role="rector",
            actor_username=self.rector["username"],
            comentario="Aprobado por el rector de la IE"
        )
        self.assertEqual(res_rec["nuevo_estado"], "En revisión del coordinador")

        # 4. Coordinador aprueba -> Aprobado final
        res_coord = ApprovalWorkflowEngine.transition_document(
            documento_id=doc_id,
            action="aprobar_coordinador",
            actor_id=self.coordinador["id"],
            actor_role="coordinador",
            actor_username=self.coordinador["username"],
            comentario="Validación conforme y aprobado finalmente"
        )
        self.assertEqual(res_coord["nuevo_estado"], "Aprobado")

    def test_rejection_requires_comment(self):
        res_gen = DocumentGenerator.generate_log_007(self.doc_estudiante, version=1)
        doc_id = res_gen["documento_id"]

        # Intentar devolver sin comentario suficiente debe fallar
        with self.assertRaises(ValueError):
            ApprovalWorkflowEngine.transition_document(
                documento_id=doc_id,
                action="devolver_acudiente",
                actor_id=self.rector["id"],
                actor_role="rector",
                actor_username=self.rector["username"],
                comentario=""  # Comentario vacío
            )

    def test_unauthorized_role_rejected(self):
        res_gen = DocumentGenerator.generate_log_007(self.doc_estudiante, version=1)
        doc_id = res_gen["documento_id"]

        # Acudiente intentando aprobar como rector debe fallar
        with self.assertRaises(PermissionError):
            ApprovalWorkflowEngine.transition_document(
                documento_id=doc_id,
                action="aprobar_rector",
                actor_id=self.acudiente["id"],
                actor_role="acudiente",
                actor_username=self.acudiente["username"],
                comentario="Intento no autorizado"
            )

if __name__ == "__main__":
    unittest.main()
