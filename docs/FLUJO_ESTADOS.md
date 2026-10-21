# Diagrama de Estados del Flujo de Aprobación Documental

## 1. Ciclo de Vida General

El ciclo de vida de los formatos institucionales (LOG-007-F, LOG-026-F y LOG-029-F) sigue la siguiente secuencia de estados:

```mermaid
stateDiagram-v2
    [*] --> Borrador: Prellenado inicial
    Borrador --> Generado: Formato descargable listo
    Generado --> Pendiente_Firma: Descargado por acudiente/rector
    Pendiente_Firma --> En_revision_rector: Acudiente carga formato firmado
    Pendiente_Firma --> En_revision_coordinador: Rector carga en nombre del acudiente
    
    En_revision_rector --> Devuelto_acudiente: Rector devuelve con observaciones
    Devuelto_acudiente --> En_revision_rector: Acudiente corrige y recarga
    
    En_revision_rector --> En_revision_coordinador: Rector aprueba / remite
    En_revision_coordinador --> Devuelto_rector: Coordinador devuelve por inconsistencias
    Devuelto_rector --> En_revision_coordinador: Rector corrige y reenvía
    
    En_revision_coordinador --> Aprobado: Coordinador aprueba formalmente
    Aprobado --> [*]
```

## 2. Flujo Específico LOG-007-F (Entrega Directa a Estudiante)

```mermaid
sequenceDiagram
    autonumber
    actor Estudiante_Acudiente as Acudiente
    actor Rector as Rector(a)
    actor Coordinador as Coordinador CPE
    participant App as Aplicación SPA (GitHub Pages)
    participant Drive as Google Drive

    Note over App: 1. Generación inicial
    App->>App: Genera LOG-007-F desde BASE ESTUDIANTES CALDAS.xlsx
    
    Note over Estudiante_Acudiente,App: 2. Descarga y firma
    Estudiante_Acudiente->>App: Descarga formato Word prellenado
    Estudiante_Acudiente-->>Estudiante_Acudiente: Imprime y firma físicamente fuera de la app
    Estudiante_Acudiente->>App: Carga archivo firmado (PDF/Word/Imagen)
    App->>Drive: Sube a /LOG-007-F/{ID_ESTUDIANTE}/En_revision/
    
    Note over Rector,App: 3. Revisión de Rectoría
    alt Caso: Formato Correcto
        Rector->>App: Aprueba expediente del estudiante
        App->>Drive: Registra versión aprobada por Rector
    else Caso: Novedad o Ilegible
        Rector->>App: Devuelve con motivo y observaciones
        App->>Drive: Mueve a /LOG-007-F/{ID_ESTUDIANTE}/Devueltos/
        Estudiante_Acudiente->>App: Recibe observaciones, corrige y recarga
    else Caso: Acudiente sin conectividad
        Rector->>App: Carga documento en nombre del acudiente (registra justificación)
    end

    Note over Coordinador,App: 4. Aprobación Departamental
    alt Caso: Validación Exitosa
        Coordinador->>App: Aprobación formal definitiva
        App->>Drive: Mueve a /LOG-007-F/{ID_ESTUDIANTE}/Aprobados/
    else Caso: Inconsistencia
        Coordinador->>App: Devuelve al Rector con observaciones técnicas
    end
```

## 3. Flujo LOG-026-F y LOG-029-F (Bolsa Tecnológica Institucional)

1. **Generación:** El sistema genera el acta Word (LOG-026-F) y el informe Excel (LOG-029-F) desde `BOLSA TECNOLOGICA CALDAS.xlsx`.
2. **Diligenciamiento:** El Rector descarga los formatos, realiza la verificación física en sede y diligencia observaciones y firmas.
3. **Carga y Remisión:** El Rector carga los formatos finales y los remite a Coordinación.
4. **Revisión Departamental:** El Coordinador valida las cantidades y catálogos:
   - Si es conforme: Aprueba formalmente.
   - Si hay diferencias: Devuelve al Rector con motivo detallado para corrección y nueva versión.
