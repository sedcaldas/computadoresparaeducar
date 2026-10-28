/**
 * seriales-source.js - Única fuente de datos de la aplicación
 *
 * Lee "SERIALES BOLSA TECNOLOGICA CALDAS.xlsx" y arma toda la base de la app
 * (municipios, instituciones, sedes, bolsa, estudiantes, asignaciones y formatos).
 * No se usa ningún otro archivo Excel ni JSON como fuente de datos.
 *
 * La llave que une las hojas es la columna "Radicado": cada radicado es una sede.
 *
 * Hojas esperadas:
 *  - ESTUDIANTES BENEFICIADOS : estudiantes, acudientes y serial asignado
 *  - PORTATIL ESTUDIANTES     : seriales de portátiles por radicado
 *  - TABLETAS ESTUDIANTES     : seriales de tabletas por radicado
 *  - BOLSA TECNOLOGICA        : elementos de bolsa por radicado (LOG-026-F / LOG-029-F)
 *
 * Funciona en el navegador (window.serialesSource) y en Node (require) para las pruebas.
 */
(function (root) {
    const SOURCE_FILE = 'SERIALES BOLSA TECNOLOGICA CALDAS.xlsx';
    const DEPARTAMENTO = 'Caldas';

    // Quita tildes, signos y espacios repetidos para comparar encabezados y nombres
    function norm(value) {
        return String(value == null ? '' : value)
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Za-z0-9]+/g, ' ')
            .trim().toLowerCase();
    }

    function text(value) {
        if (value == null) return '';
        if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value);
        return String(value).replace(/\s+/g, ' ').trim();
    }

    // Celdas con 0, "-" o vacías se consideran sin dato
    function clean(value) {
        const t = text(value);
        if (!t || t === '0' || /^-+$/.test(t)) return '';
        return t;
    }

    function hash(buffer) {
        const bytes = new Uint8Array(buffer);
        let h = 0x811c9dc5;
        for (let i = 0; i < bytes.length; i++) {
            h ^= bytes[i];
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return h.toString(16).padStart(8, '0') + '-' + bytes.length;
    }

    function findSheet(workbook, keywords) {
        return workbook.SheetNames.find(n => keywords.some(k => norm(n).includes(k)));
    }

    // Convierte una hoja en objetos usando encabezados normalizados.
    // Si un encabezado se repite, se conserva la primera columna.
    function readSheet(XLSX, workbook, sheetName) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null, raw: true });
        const headerIdx = rows.findIndex(r => r && r.some(c => norm(c) === 'radicado'));
        if (headerIdx < 0) throw new Error(`La hoja "${sheetName}" no tiene la columna Radicado.`);
        const headers = rows[headerIdx].map(norm);
        const out = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.every(c => c == null || text(c) === '')) continue;
            const obj = { __fila: i + 1 };
            headers.forEach((h, idx) => {
                if (h && !(h in obj)) obj[h] = r[idx];
            });
            out.push(obj);
        }
        return out;
    }

    function pick(row, ...names) {
        for (const n of names) {
            const v = row[n];
            if (v != null && text(v) !== '') return v;
        }
        return null;
    }

    // "IE X - IE X - SEDE PRINCIPAL" -> "IE X - SEDE PRINCIPAL"
    function cleanSedeName(name) {
        const t = text(name);
        const i = t.indexOf(' - ');
        if (i > 0) {
            const first = t.slice(0, i);
            const rest = t.slice(i + 3);
            if (norm(rest).startsWith(norm(first))) return rest;
        }
        return t;
    }

    function cleanMunicipio(value) {
        return text(value).split(' - ')[0].trim();
    }

    function tipoFromDescripcion(desc) {
        const d = norm(desc);
        if (d.includes('tableta') || d.includes('tablet')) return 'Tableta';
        if (d.includes('portatil') || d.includes('laptop')) return 'Portátil';
        return '';
    }

    function parseWorkbook(XLSX, buffer) {
        const workbook = XLSX.read(buffer, { type: 'array' });
        const warnings = [];

        const sheetEst = findSheet(workbook, ['estudiantes beneficiad', 'beneficiad']);
        const sheetPort = findSheet(workbook, ['portatil']);
        const sheetTab = findSheet(workbook, ['tableta']);
        const sheetBolsa = findSheet(workbook, ['bolsa']);
        if (!sheetEst) throw new Error(`El archivo ${SOURCE_FILE} no tiene la hoja ESTUDIANTES BENEFICIADOS.`);
        if (!sheetBolsa) throw new Error(`El archivo ${SOURCE_FILE} no tiene la hoja BOLSA TECNOLOGICA.`);

        const estRows = readSheet(XLSX, workbook, sheetEst);
        const portRows = sheetPort ? readSheet(XLSX, workbook, sheetPort) : [];
        const tabRows = sheetTab ? readSheet(XLSX, workbook, sheetTab) : [];
        const bolsaRows = readSheet(XLSX, workbook, sheetBolsa);

        // --- Sedes por Radicado (llave) ---
        const sedesByRad = new Map();
        const municipios = new Map();
        const instituciones = new Map();

        function registerSede(sheet, row, data) {
            const radicado = text(row.radicado);
            if (!radicado) {
                warnings.push(`${sheet} fila ${row.__fila}: sin Radicado, se omite.`);
                return null;
            }
            const dane = text(data.codigo_dane_sede);
            let sede = sedesByRad.get(radicado);
            if (!sede) {
                if (!dane) {
                    warnings.push(`${sheet} fila ${row.__fila}: radicado ${radicado} sin código DANE de sede, se omite.`);
                    return null;
                }
                sede = {
                    codigo_dane_sede: dane,
                    codigo_dane_ie: '',
                    nombre: '',
                    radicado,
                    zona: '',
                    _ie_nombre: '',
                    _mpio_codigo: '',
                    _mpio_nombre: ''
                };
                sedesByRad.set(radicado, sede);
            } else if (dane && dane !== sede.codigo_dane_sede) {
                warnings.push(`${sheet} fila ${row.__fila}: radicado ${radicado} tiene DANE ${dane}, distinto de ${sede.codigo_dane_sede}. Se usa el primero.`);
            }
            // Completar datos vacíos sin sobrescribir los ya conocidos
            if (!sede.nombre && data.nombre) sede.nombre = data.nombre;
            if (!sede.codigo_dane_ie && data.codigo_dane_ie) sede.codigo_dane_ie = data.codigo_dane_ie;
            if (!sede._ie_nombre && data.ie_nombre) sede._ie_nombre = data.ie_nombre;
            if (!sede.zona && data.zona) sede.zona = data.zona;
            if (!sede._mpio_codigo && data.mpio_codigo) sede._mpio_codigo = data.mpio_codigo;
            if (!sede._mpio_nombre && data.mpio_nombre) sede._mpio_nombre = data.mpio_nombre;
            return sede;
        }

        // 1. Estudiantes (trae la información más completa de la sede)
        for (const r of estRows) {
            registerSede(sheetEst, r, {
                codigo_dane_sede: text(pick(r, 'codigo dane sede', 'dane sede')),
                codigo_dane_ie: text(r['codigo dane']),
                nombre: text(r['nombre sede']) || cleanSedeName(r['lugar de entrega']),
                ie_nombre: text(r['nombre establecimiento']),
                zona: text(r.zona).toUpperCase(),
                mpio_codigo: text(r['codigo dane municipio']),
                mpio_nombre: text(r.municipio) || cleanMunicipio(r['ubicacion institucional educativa p d m'])
            });
        }
        // 2. Portátiles, tabletas y bolsa (completan sedes que no tienen estudiantes)
        const equipoRows = [
            ...portRows.map(r => ({ sheet: sheetPort, r })),
            ...tabRows.map(r => ({ sheet: sheetTab, r })),
            ...bolsaRows.map(r => ({ sheet: sheetBolsa, r }))
        ];
        for (const { sheet, r } of equipoRows) {
            registerSede(sheet, r, {
                codigo_dane_sede: text(pick(r, 'dane sede', 'codigo dane sede')),
                nombre: cleanSedeName(r['lugar de entrega']),
                mpio_nombre: cleanMunicipio(r['ubicacion institucional educativa p d m'])
            });
        }

        // Derivar institución y municipio de cada sede
        const ieByName = new Map();
        for (const sede of sedesByRad.values()) {
            if (sede.codigo_dane_ie && sede._ie_nombre) ieByName.set(norm(sede._ie_nombre), sede.codigo_dane_ie);
        }
        for (const sede of sedesByRad.values()) {
            if (!sede._ie_nombre) sede._ie_nombre = sede.nombre.split(' - ')[0].trim() || sede.nombre;
            // Sin código de institución: reutilizar el de una institución con el mismo nombre o usar el de la sede
            if (!sede.codigo_dane_ie) sede.codigo_dane_ie = ieByName.get(norm(sede._ie_nombre)) || sede.codigo_dane_sede;
            ieByName.set(norm(sede._ie_nombre), sede.codigo_dane_ie);
            if (!sede.nombre) sede.nombre = sede._ie_nombre;
            if (!sede.zona) sede.zona = 'N/D';
            // El código DANE de municipio está en las posiciones 2-6 del código de sede
            const mpioCode = sede._mpio_codigo || sede.codigo_dane_sede.slice(1, 6);
            if (!municipios.has(mpioCode)) {
                municipios.set(mpioCode, { codigo: mpioCode, nombre: sede._mpio_nombre || mpioCode, departamento: DEPARTAMENTO });
            } else if (municipios.get(mpioCode).nombre === mpioCode && sede._mpio_nombre) {
                municipios.get(mpioCode).nombre = sede._mpio_nombre;
            }
            if (!instituciones.has(sede.codigo_dane_ie)) {
                instituciones.set(sede.codigo_dane_ie, { codigo_dane: sede.codigo_dane_ie, nombre: sede._ie_nombre, codigo_municipio: mpioCode });
            }
        }

        const sedeOf = (row) => sedesByRad.get(text(row.radicado));

        // --- Tipo de terminal por serial (hojas de portátiles y tabletas) ---
        const tipoBySerial = new Map();
        for (const r of portRows) { const s = text(r.serial); if (s) tipoBySerial.set(s, 'Portátil'); }
        for (const r of tabRows) { const s = text(r.serial); if (s) tipoBySerial.set(s, 'Tableta'); }

        // --- Estudiantes y asignaciones ---
        const estudiantes = [];
        const asignaciones = [];
        const seenDocs = new Set();
        const usedSerials = new Set();
        for (const r of estRows) {
            const sede = sedeOf(r);
            const doc = text(r['documento de identidad']);
            if (!sede || !doc) {
                if (!doc) warnings.push(`${sheetEst} fila ${r.__fila}: estudiante sin documento de identidad, se omite.`);
                continue;
            }
            if (seenDocs.has(doc)) {
                warnings.push(`${sheetEst} fila ${r.__fila}: documento ${doc} repetido, se omite.`);
                continue;
            }
            seenDocs.add(doc);

            const nombres = [clean(r['nombre 1']), clean(r['nombre 2'])].filter(Boolean).join(' ');
            const apellidos = [clean(r['apellido 1']), clean(r['apellido 2'])].filter(Boolean).join(' ');
            const serial = clean(pick(r, 'serial', 'serial asignado'));
            let tipo = tipoBySerial.get(serial) || '';
            if (!tipo) {
                if (clean(r['computador portatil'])) tipo = 'Portátil';
                else if (clean(r.tableta)) tipo = 'Tableta';
                else tipo = tipoFromDescripcion(r.descripcion) || 'Tableta';
            }
            if (serial) {
                if (usedSerials.has(serial)) warnings.push(`${sheetEst} fila ${r.__fila}: serial ${serial} asignado a más de un estudiante.`);
                usedSerials.add(serial);
            }

            estudiantes.push({
                documento_identidad: doc,
                nombres,
                apellidos,
                nombre_completo: [nombres, apellidos].filter(Boolean).join(' '),
                codigo_dane_sede: sede.codigo_dane_sede,
                radicado: sede.radicado,
                grado: clean(r.grado),
                acudiente_documento: clean(r['acudiente documento']),
                acudiente_nombres: clean(r['acudiente nombres']),
                acudiente_parentesco: clean(r['acudiente parentesco']),
                acudiente_telefono: clean(r['acudiente celular']),
                acudiente_direccion: clean(r['acudiente direccion']),
                acudiente_correo: clean(r['acudiente correo']),
                serial_terminal: serial,
                tipo_terminal: tipo
            });
            asignaciones.push({
                estudiante_documento: doc,
                tipo_terminal: tipo,
                serial_asignado: serial,
                estado_despacho: serial ? (clean(r['estado despacho']) || 'Despacho Programado') : 'Sin terminal asignada'
            });
        }

        // Equipos de las hojas de portátiles/tabletas sin estudiante asignado
        for (const [serial, tipo] of tipoBySerial) {
            if (!usedSerials.has(serial)) warnings.push(`${tipo} con serial ${serial} no está asignado a ningún estudiante en ${sheetEst}.`);
        }

        // --- Elementos de Bolsa Tecnológica ---
        const bolsa_elementos = [];
        const countBySede = new Map();
        for (const r of bolsaRows) {
            const sede = sedeOf(r);
            if (!sede) continue;
            const n = (countBySede.get(sede.codigo_dane_sede) || 0) + 1;
            countBySede.set(sede.codigo_dane_sede, n);
            const cantidad = Number(r.cantidad);
            bolsa_elementos.push({
                id: `ELEM-${sede.codigo_dane_sede}-${n}`,
                codigo_dane_sede: sede.codigo_dane_sede,
                radicado: sede.radicado,
                elemento_nombre: text(r.descripcion),
                cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1,
                serial: text(r.serial) || 'NO APLICA',
                estado_entrega: 'Entregado y Verificado',
                verificado_rector: false,
                verificado_cpe: true
            });
        }

        // --- Formatos pregenerados (LOG-026-F y LOG-029-F por sede con bolsa; LOG-007-F por estudiante) ---
        const now = new Date().toISOString();
        const documentos = [];
        for (const sede of sedesByRad.values()) {
            if (!countBySede.has(sede.codigo_dane_sede)) continue;
            for (const tipo of ['026', '029']) {
                documentos.push({
                    id: `DOC-${tipo}-${sede.codigo_dane_sede}`,
                    tipo_documento: `LOG-${tipo}-F`,
                    codigo_dane_sede: sede.codigo_dane_sede,
                    radicado: sede.radicado,
                    version_actual: 1,
                    estado: 'Generado',
                    nombre_archivo: `LOG-${tipo}-F_${sede.codigo_dane_sede}_v01.${tipo === '026' ? 'docx' : 'xlsx'}`,
                    drive_id: `DRIVE-${tipo}-${sede.codigo_dane_sede}`,
                    updated_at: now
                });
            }
        }
        for (const est of estudiantes) {
            if (!est.serial_terminal) continue;
            documentos.push({
                id: `DOC-007-${est.documento_identidad}`,
                tipo_documento: 'LOG-007-F',
                codigo_dane_sede: est.codigo_dane_sede,
                estudiante_documento: est.documento_identidad,
                radicado: est.radicado,
                version_actual: 1,
                estado: 'Generado',
                nombre_archivo: `LOG-007-F_${est.codigo_dane_sede}_${est.documento_identidad}_v01.docx`,
                drive_id: `DRIVE-007-${est.documento_identidad}`,
                updated_at: now
            });
        }

        const sedes = [...sedesByRad.values()].map(s => ({
            codigo_dane_sede: s.codigo_dane_sede,
            codigo_dane_ie: s.codigo_dane_ie,
            nombre: s.nombre,
            radicado: s.radicado,
            zona: s.zona
        }));

        return {
            fuente: {
                archivo: SOURCE_FILE,
                firma: hash(buffer),
                leido: now,
                hojas: { estudiantes: sheetEst, portatiles: sheetPort || null, tabletas: sheetTab || null, bolsa: sheetBolsa },
                advertencias: warnings
            },
            municipios: [...municipios.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
            instituciones: [...instituciones.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
            sedes,
            bolsa_elementos,
            estudiantes,
            asignaciones,
            documentos_pregenerados: documentos
        };
    }

    const api = { SOURCE_FILE, parseWorkbook, hash };

    // Navegador: descarga el archivo publicado junto a la app
    api.fetchBuffer = async function (baseUrl = './') {
        const url = baseUrl + encodeURIComponent(SOURCE_FILE) + '?t=' + Date.now();
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`No se pudo leer ${SOURCE_FILE} (HTTP ${res.status}).`);
        return res.arrayBuffer();
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.serialesSource = api;
})(typeof window !== 'undefined' ? window : null);
