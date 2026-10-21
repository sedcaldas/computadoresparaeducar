# Diagrama de Arquitectura de la Solución

Este documento describe la arquitectura modular del sistema de gestión documental de equipos tecnológicos, diseñado de conformidad con la Sección 7 de `SKILL.md`.

---

## 1. Visión General de la Arquitectura

```mermaid
graph TD
    subgraph "Capa de Presentación (Frontend)"
        A1[GitHub Pages / Portal Web] --> A2[Router de Vistas]
        A2 --> V1[Vista Acudiente: 3 Pasos Simples]
        A2 --> V2[Mesa de Revisión Rector]
        A2 --> V3[Centro de Aprobación Coordinador]
        A2 --> V4[Consola de Administración]
    end

    subgraph "Capa de API & Negocio (Backend Seguro)"
        B1[FastAPI REST Engine]
        B2[Controlador de Autenticación & RBAC]
        B3[Motor de Flujos de Aprobación]
        B4[Generador Documental: Word & Excel]
        B5[Gestor de Seriales & Conflictos]
        B6[Servicio de Exportación & Manifiestos]
        B7[Adaptador de Google Drive]
    end

    subgraph "Capa de Persistencia & Archivos"
        C1[(Base de Datos SQLite)]
        C2[Jerarquía Local de Almacenamiento]
        C3[Google Drive API: Carpeta Raíz 1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51]
    end

    A1 -->|HTTPS / JSON / JWT| B1
    B1 --> B2
    B1 --> B3
    B1 --> B4
    B1 --> B5
    B1 --> B6
    B1 --> B7

    B3 --> C1
    B4 --> C1
    B5 --> C1
    B6 --> C1
    B7 --> C2
    B7 --> C3
```

---

## 2. Descripción de Componentes

### 2.1 Capa de Presentación (Frontend)
- **Tecnologías:** HTML5 semántico, Vanilla CSS de alta fidelidad con tokens institucionales inspirados en https://educacion.caldas.gov.co/, JavaScript ES6+ modular.
- **Alojamiento Estático:** Listo para publicarse en GitHub Pages bajo la organización/usuario `sedcaldas` y proyecto `computadoresparaeducar`.
- **Adaptabilidad:** Diseño 100% responsive optimizado para teléfonos móviles, tabletas y computadores de escritorio.
- **Usabilidad Inclusiva:** Flujo intuitivo de 3 pasos para acudientes con poca experiencia tecnológica:
  1. *Descargar formato.*
  2. *Firmar físicamente.*
  3. *Subir formato firmado.*

### 2.2 Capa de API y Negocio (Backend Seguro)
- **Tecnologías:** Python 3.12, FastAPI, Uvicorn.
- **Seguridad y Control de Acceso (RBAC):**
  - Autenticación mediante tokens firmados con expiración.
  - Almacenamiento de contraseñas mediante algoritmo PBKDF2 con HMAC-SHA256 y sal criptográfica individual de 16 bytes.
  - Autorización estricta por rol, municipio, institución, sede y expediente estudiantil.
- **Generación Documental Oficial:**
  - `python-docx` para los formatos LOG-026-F y LOG-007-F.
  - `openpyxl` para el formato LOG-029-F, preservando hojas auxiliares, rangos con nombre, catálogos y fórmulas vivas.
- **Motor de Transiciones de Estado:**
  - Valida precondiciones y permisos antes de cualquier cambio de estado.
  - Bloquea devoluciones que no cuenten con justificación y observaciones detalladas.
  - Registra trazabilidad de actuaciones en nombre de otro usuario (`on_behalf_of`).

### 2.3 Capa de Almacenamiento y Google Drive
- **Carpeta Raíz Asignada:** `1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51`.
- **Estructura Jerárquica:**
  `/Bolsa_Tecnologica_Caldas/{COD_MPIO}_{MPIO}/{DANE_IE}_{NOMBRE_IE}/{DANE_SEDE}_{SEDE}/{FORMATO}/...`
- **Trazabilidad:** Cada archivo cuenta con su resumen SHA-256, metadatos JSON adyacentes y registro en la base de datos con su identificador único de Drive.

---

## 3. Protocolo de Seguridad y Privacidad
1. **Protección de Datos de Menores:** Los números de identificación se procesan de forma restringida y solo se exponen a los roles debidamente autorizados.
2. **Sin Enlaces Públicos:** Las descargas se realizan a través de endpoints seguros y autenticados con verificación de titularidad.
3. **Inmutabilidad de Aprobaciones:** Ningún documento firmado o aprobado puede ser sobreescrito o eliminado silenciosamente; cada modificación genera una nueva versión auditada.
