import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection
from document_generator import DocumentGenerator

class TestDocumentGenerator(unittest.TestCase):

    def setUp(self):
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT codigo_dane_sede FROM sedes LIMIT 1")
        self.dane_sede = c.fetchone()[0]
        c.execute("SELECT documento_identidad FROM estudiantes LIMIT 1")
        self.doc_estudiante = c.fetchone()[0]
        conn.close()

    def test_generate_log_026(self):
        res = DocumentGenerator.generate_log_026(self.dane_sede, version=1)
        self.assertIn("documento_id", res)
        self.assertTrue(os.path.exists(res["path"]))
        self.assertTrue(res["filename"].startswith("LOG-026-F_"))
        self.assertIn("Bolsa_Tecnologica_Caldas", res["drive_path"])

    def test_generate_log_029(self):
        res = DocumentGenerator.generate_log_029(self.dane_sede, version=1)
        self.assertIn("documento_id", res)
        self.assertTrue(os.path.exists(res["path"]))
        self.assertTrue(res["filename"].startswith("LOG-029-F_"))
        self.assertIn(".xlsx", res["filename"])

    def test_generate_log_007(self):
        res = DocumentGenerator.generate_log_007(self.doc_estudiante, version=1)
        self.assertIn("documento_id", res)
        self.assertTrue(os.path.exists(res["path"]))
        self.assertTrue(res["filename"].startswith("LOG-007-F_"))
        self.assertIn(str(self.doc_estudiante), res["filename"])

if __name__ == "__main__":
    unittest.main()
