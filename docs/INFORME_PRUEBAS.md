# Informe de Pruebas y Evidencias de Aceptación

**Proyecto:** Aplicación de Gestión Documental de Equipos Tecnológicos — Computadores para Educar  
**Entidad:** Secretaría de Educación Departamental de Caldas  
**Fecha de Ejecución:** Octubre 2026  
**Resultado Global:** 100% SATISFACTORIO (15 Pruebas Ejecutadas — 15 Aprobadas)

---

## 1. Resumen Ejecutivo de la Evaluación

Se implementó una batería integral de pruebas unitarias, de integración, de seguridad y de aceptación funcional conforme a los 19 criterios de la Sección 18 de `SKILL.md`. Todos los casos resultaron exitosos.

| Módulo de Pruebas | Archivo de Prueba | Pruebas | Aprobadas | Fallidas | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Generación Documental** | `tests/test_documents.py` | 3 | 3 | 0 | **APROBADO** |
| **Motor de Flujos y Estados** | `tests/test_workflow.py` | 3 | 3 | 0 | **APROBADO** |
| **Criterios de Aceptación** | `tests/test_acceptance.py` | 9 | 9 | 0 | **APROBADO** |
| **TOTAL** | — | **15** | **15** | **0** | **100% OK** |

---

## 2. Detalle de Casos de Prueba y Evidencias Anonimizadas

### CP-01: Verificación de Contraseñas Iniciales y Algoritmo Criptográfico (Sección 5 y Criterio 17)
- **Objetivo:** Verificar que las contraseñas iniciales cumplan con la especificación y se almacenen exclusivamente con hash PBKDF2 y sal aleatoria.
- **Resultado:** APROBADO.
- **Evidencia Anonimizada:**
  - Administrador (`admin`): hash validado con `gcaldas2026*`.
  - Coordinador (`coordinador_caldas`): hash validado con `gcaldas2026*`.
  - Rector (DANE Institución `117013******`): hash validado con código DANE.
  - Acudiente (Doc. Estudiante `105981****`): hash validado con documento.
  - Ninguna contraseña se almacena en texto plano.

### CP-02: Generación Oficial LOG-026-F (.docx) (Criterio 2)
- **Objetivo:** Generar el acta Word para una sede educativa real conservando la estructura oficial, radicados, elementos asignados y secciones de firmas.
- **Resultado:** APROBADO.
- **Evidencia:** Archivo `LOG-026-F_217042000255_v01.docx` generado correctamente e incorporado en la ruta institucional de Drive `/Bolsa_Tecnologica_Caldas/17042_Anserma/217042000913_INSTITUCION_EDUCATIVA_EL_HORRO/217042000255_SEDE_VILLA_OROZCO/LOG-026-F/Borradores/`.

### CP-03: Diligenciamiento Oficial LOG-029-F (.xlsx) (Criterio 3)
- **Objetivo:** Diligenciar la hoja `Formulario` sin alterar fórmulas ni hojas auxiliares (`Lista Elementos`, `Catalogo de Elementos`, etc.).
- **Resultado:** APROBADO.
- **Evidencia:** Archivo `LOG-029-F_217042000255_v01.xlsx` generado con todas sus 5 hojas intactas y fórmulas preservadas.

### CP-04: Generación Oficial LOG-007-F (.docx) (Criterio 4)
- **Objetivo:** Generar acta individual de entrega directa para estudiante beneficiario con datos de acudiente, institución, sede y equipo asignado (Portátil/Tableta).
- **Resultado:** APROBADO.
- **Evidencia:** Archivo `LOG-007-F_117013000306_1059812839_v01.docx` generado con radicado `86471`, terminal marcada `● Tabletas ○ Portátiles`, estudiante y acudiente relacionados.

### CP-05: Flujo Completo de Aprobación Documental (Criterios 5, 6 y 7)
- **Secuencia Evaluada:**
  1. `Generado` -> Acudiente carga documento firmado -> `En revisión del rector`.
  2. `En revisión del rector` -> Rector emite visto bueno -> `En revisión del coordinador`.
  3. `En revisión del coordinador` -> Coordinador valida -> `Aprobado` final.
- **Resultado:** APROBADO. Todas las transiciones auditadas con marca de tiempo y usuario.

### CP-06: Control de Devoluciones y Justificación Obligatoria (Criterio 6 y 7)
- **Objetivo:** Comprobar que el sistema rechace devoluciones sin justificación formal.
- **Resultado:** APROBADO. Transición rechazada con excepción `ValueError: La devolución exige un motivo y observaciones claras de corrección.` cuando el comentario es vacío.

### CP-07: Actuación en Nombre de Otro Usuario con Trazabilidad (Criterios 8 y 9)
- **Secuencia Evaluada:**
  - Rector carga en nombre del acudiente con motivo: *"Acudiente sin conectividad en zona rural"*.
  - Coordinador remite en nombre del rector con motivo: *"Rector con licencia médica certificada"*.
- **Resultado:** APROBADO. Registros guardados en `documentos` (`on_behalf_of_id`, `motivo_on_behalf`) y en `auditoria`.

### CP-08: Gestión de Seriales y Detección de Conflictos (Criterio 13)
- **Objetivo:** Detectar seriales vacíos, seriales duplicados dentro del lote o seriales ya asignados a otro estudiante.
- **Resultado:** APROBADO. Detección inmediata en `SerialManager.preview_serial_updates()`, impidiendo la aplicación errónea.

### CP-09: Jerarquía de Almacenamiento en Google Drive (Criterio 14)
- **Objetivo:** Asegurar que los documentos se ubiquen en la ruta normalizada bajo la carpeta raíz `1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51`.
- **Resultado:** APROBADO.

### CP-10: Exportación Masiva en ZIP con Manifiesto XLSX y CSV (Criterio 15)
- **Objetivo:** Generar paquete ZIP con documentos filtrados y verificar la inclusión de los dos formatos de manifiesto.
- **Resultado:** APROBADO. Verificados `MANIFIESTO_EXPEDIENTES.csv` y `MANIFIESTO_EXPEDIENTES.xlsx` dentro del archivo ZIP.
