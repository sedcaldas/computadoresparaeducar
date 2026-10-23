/**
 * generator.js - Motor de Generación y Diligenciamiento Documental en el Navegador
 * Aplicación de Gestión Documental - Secretaría de Educación de Caldas & Computadores para Educar
 * 
 * Funcionalidades 100% Client-Side:
 * 1. LOG-026-F (.docx): Acta de Verificación y Legalización de Bolsa Tecnológica
 * 2. LOG-029-F (.xlsx): Formato Informe Validación Bolsa Tecnológica (cumpliendo validaciones y catálogos)
 * 3. LOG-007-F (.docx): Legalización y Entrega Directa de Equipos a Estudiantes
 * 4. Pregeneración masiva y sincronización a Google Drive
 * 5. Empaquetador masivo ZIP con manifiesto CSV para el Coordinador
 */

class DocumentGenerator {
    constructor() {
        this.templateCache = new Map();
        this.MONTHS_ES = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
    }

    async getTemplateArrayBuffer(path) {
        if (this.templateCache.has(path)) {
            return this.templateCache.get(path).slice(0);
        }
        if (typeof window === 'undefined' || !window.fetch) {
            const fs = require('fs');
            const p = require('path');
            const cleanPath = path.replace(/^\.\//, '');
            const absPath = p.resolve(__dirname, '..', cleanPath);
            const buf = fs.readFileSync(absPath);
            const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            this.templateCache.set(path, ab);
            return ab.slice(0);
        }
        const resp = await fetch(path);
        if (!resp.ok) {
            throw new Error(`No se pudo cargar la plantilla ${path} (HTTP ${resp.status})`);
        }
        const buffer = await resp.arrayBuffer();
        this.templateCache.set(path, buffer);
        return buffer.slice(0);
    }

    // --- Mapeo estricto al catálogo oficial de LOG-029-F (Hoja 'Lista Elementos') ---
    _mapItemToCatalogueName(rawName) {
        if (!rawName) return 'Elemento Tecnológico';
        const s = rawName.toLowerCase();
        if (s.includes('portátil') || s.includes('portatil')) return 'Portatil de diseño';
        if (s.includes('computador de escritorio') || s.includes('pantalla de 24')) return 'Desktop para diseño - Torre';
        if (s.includes('impresora 3d')) return 'Impresora 3D';
        if (s.includes('filamento')) return 'kit de Filamento PLA';
        if (s.includes('videoproyector')) return 'Videoproyector';
        if (s.includes('smart tv') && !s.includes('soporte')) return 'Smart TV';
        if (s.includes('soporte') && s.includes('smart tv')) return 'Soporte Smart TV';
        if (s.includes('pantalla interactiva') && !s.includes('soporte')) return 'Pantalla iteractiva';
        if (s.includes('soporte') && s.includes('pantalla interactiva')) return 'Soporte Pantalla Interactiva';
        if (s.includes('cámara fotográfica') || s.includes('camara fotográfica') || s.includes('camara fotografica')) return 'Cámara fotográfica';
        if (s.includes('lente')) return 'Lente camara fotografica';
        if (s.includes('disco duro')) return 'Disco duro externo 1 TB';
        if (s.includes('tableta')) return 'Tableta';
        if (s.includes('audiovisual')) return 'Estuche de transporte Kit Audio Visual';
        if (s.includes('audio digital')) return 'Consola de audio';
        if (s.includes('multimetro')) return 'Multimetro Digital';
        if (s.includes('fuente de voltaje')) return 'Fuente regulada variable 30V - 10A, LED display 4 digitos';
        if (s.includes('soldadura')) return 'Estación de soldadura y aire caliente';
        if (s.includes('agricultura')) return 'Kit de agricultura inteligente';
        if (s.includes('micro:bit') || s.includes('microbit')) return 'Kit avanzado KEYESTUDIO de 45 sensores para MICRO:BIT';
        if (s.includes('arduino') || s.includes('raspberry')) return 'KIT DE 45 SENSORES PARA ARDUINO Y RASPBERRY PI';
        if (s.includes('jetson nano')) return 'Placa Jetson Nano de 16 GB - Módulo de cámara de 8 megapíxeles compatible con Jetson Nano y Rasberry Pi 5';
        if (s.includes('módulo de cámara') || s.includes('modulo de camara')) return 'Módulo de cámara de 8 megapíxeles compatible con Jetson Nano y Rasberry Pi 5';
        if (s.includes('mantenimiento')) return 'Maleta Organizadora Kit de Mantenimiento';
        if (s.includes('maker') || s.includes('raee')) return 'Kit Didáctico Semáforo Mini Laboratorio Electrónico';
        if (s.includes('análisis') || s.includes('analisis') || s.includes('suelos')) return 'Kit profesional de prueba de suelo';
        if (s.includes('electrónica') || s.includes('electronica')) return 'Malet organizadora para KIT de electrónica básica';
        if (s.includes('bunnyz') || s.includes('cubetto')) return 'Kit Robot de Aprendizaje Temprano';
        return rawName.substring(0, 50);
    }

    _setCellText(tcNode, text) {
        if (!tcNode) return;
        let pNode = tcNode.getElementsByTagName('w:p')[0];
        if (!pNode) {
            pNode = tcNode.ownerDocument.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:p');
            tcNode.appendChild(pNode);
        }

        const pPr = pNode.getElementsByTagName('w:pPr')[0];
        const rPr = pNode.getElementsByTagName('w:rPr')[0];
        let rPrClone = null;
        if (rPr) {
            rPrClone = rPr.cloneNode(true);
        }

        const children = Array.from(pNode.childNodes);
        for (const child of children) {
            if (child.nodeName !== 'w:pPr') {
                pNode.removeChild(child);
            }
        }

        const doc = tcNode.ownerDocument;
        const wNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
        const rNode = doc.createElementNS(wNS, 'w:r');
        if (rPrClone) {
            rNode.appendChild(rPrClone);
        }
        const tNode = doc.createElementNS(wNS, 'w:t');
        tNode.textContent = String(text ?? '');
        rNode.appendChild(tNode);
        pNode.appendChild(rNode);
    }

    // =========================================================================
    // 1. GENERACIÓN LOG-026-F (.docx) - BOLSA TECNOLÓGICA
    // =========================================================================
    async generateLog026(daneSede, version = 1, estado = 'Generado') {
        const store = window.appStore;
        const sede = store.getSedeByDane(daneSede);
        if (!sede) throw new Error(`Sede con DANE ${daneSede} no encontrada.`);

        // LOG-026-F solo se genera si la institución/sede tiene elementos asignados
        const elementos = store.getElementosBolsa(daneSede);
        if (!elementos || elementos.length === 0) {
            throw new Error(`La sede ${daneSede} no tiene elementos asignados de Bolsa Tecnológica (no aplica LOG-026-F).`);
        }

        const ie = store.getInstitucionByDane(sede.codigo_dane_ie);
        const mpio = ie ? store.getMunicipios().find(m => String(m.codigo) === String(ie.codigo_municipio)) : null;

        const templateBuf = await this.getTemplateArrayBuffer('./templates/LOG-026-F.docx');
        const zip = await JSZip.loadAsync(templateBuf);
        let docXmlStr = await zip.file('word/document.xml').async('text');

        const now = new Date();
        const dateStr = `${now.getDate()} de ${this.MONTHS_ES[now.getMonth()]} de ${now.getFullYear()}`;

        // Diligenciar fecha en introducción si aplica
        docXmlStr = docXmlStr.replace(/Siendo el d[íi]a[\s\S]*?_{5,}[\s\S]*?,/g, `Siendo el día ${dateStr},`);

        // Diligenciar señor(a) con "YUBY CATERINE BOHÓRQUEZ ROJAS" y en su calidad de con "PROFESIONAL LOGÍSTICA "
        docXmlStr = docXmlStr.replace(
            /__________________________________________en su calidad de _______________________________/g,
            'YUBY CATERINE BOHÓRQUEZ ROJAS en su calidad de PROFESIONAL LOGÍSTICA '
        );

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXmlStr, 'application/xml');
        const tables = xmlDoc.getElementsByTagName('w:tbl');
        if (!tables || tables.length === 0) {
            throw new Error('La plantilla LOG-026-F no contiene tablas válidas.');
        }

        const table0 = tables[0];
        let rows = table0.getElementsByTagName('w:tr');
        const getCells = (rowIdx) => rows[rowIdx] ? rows[rowIdx].getElementsByTagName('w:tc') : [];

        // R1: Nombre de IE & Radicado Sede
        const r1Cells = getCells(1);
        if (r1Cells.length > 1) this._setCellText(r1Cells[1], ie ? ie.nombre : 'INSTITUCIÓN EDUCATIVA');
        if (r1Cells.length >= 4) this._setCellText(r1Cells[3] || r1Cells[r1Cells.length - 1], sede.radicado || 'S/N');

        // R2: Nombre Sede & Código DANE Sede
        const r2Cells = getCells(2);
        if (r2Cells.length > 1) this._setCellText(r2Cells[1], sede.nombre);
        if (r2Cells.length >= 4) this._setCellText(r2Cells[3] || r2Cells[r2Cells.length - 1], sede.codigo_dane_sede);

        // R3: Departamento & Municipio
        const r3Cells = getCells(3);
        if (r3Cells.length > 1) this._setCellText(r3Cells[1], mpio ? (mpio.departamento || 'Caldas') : 'Caldas');
        if (r3Cells.length >= 4) this._setCellText(r3Cells[3] || r3Cells[r3Cells.length - 1], mpio ? mpio.nombre : 'Caldas');

        // Llenar elementos de bolsa con nombre y número(s) de serial en paréntesis
        // Si hay más de 10 elementos (5 filas x 2), clonar fila 11 antes de fila 12
        const neededRows = Math.max(5, Math.ceil(elementos.length / 2));
        if (neededRows > 5) {
            const row11 = rows[11];
            const row12 = rows[12];
            for (let i = 0; i < neededRows - 5; i++) {
                const newRow = row11.cloneNode(true);
                table0.insertBefore(newRow, row12);
            }
            rows = table0.getElementsByTagName('w:tr');
        }

        let elemIdx = 0;
        const lastItemRowIdx = 6 + neededRows;
        for (let rIdx = 7; rIdx <= lastItemRowIdx; rIdx++) {
            const rowCells = getCells(rIdx);
            if (!rowCells || rowCells.length < 4) continue;

            if (elemIdx < elementos.length) {
                const e1 = elementos[elemIdx++];
                const desc1 = (e1.serial && e1.serial !== 'NO APLICA' && e1.serial !== 'N/A')
                    ? `${e1.elemento_nombre} (Serial: ${e1.serial})`
                    : e1.elemento_nombre;
                this._setCellText(rowCells[0], desc1);
                this._setCellText(rowCells[1], String(e1.cantidad));
            } else {
                this._setCellText(rowCells[0], 'N/A');
                this._setCellText(rowCells[1], '0');
            }

            const colElem2 = rowCells.length > 3 ? rowCells[rowCells.length - 2] : null;
            const colCant2 = rowCells.length > 3 ? rowCells[rowCells.length - 1] : null;
            if (colElem2 && colCant2) {
                if (elemIdx < elementos.length) {
                    const e2 = elementos[elemIdx++];
                    const desc2 = (e2.serial && e2.serial !== 'NO APLICA' && e2.serial !== 'N/A')
                        ? `${e2.elemento_nombre} (Serial: ${e2.serial})`
                        : e2.elemento_nombre;
                    this._setCellText(colElem2, desc2);
                    this._setCellText(colCant2, String(e2.cantidad));
                } else {
                    this._setCellText(colElem2, 'N/A');
                    this._setCellText(colCant2, '0');
                }
            }
        }

        // Relación de seriales oficiales en fila de Observaciones
        for (let r = 0; r < rows.length; r++) {
            const textContent = rows[r].textContent || '';
            if (textContent.includes('OBSERVACIONES') && rows[r + 1]) {
                const obsRowCells = rows[r + 1].getElementsByTagName('w:tc');
                if (obsRowCells.length > 0) {
                    const serialList = elementos
                        .filter(e => e.serial && e.serial !== 'NO APLICA' && e.serial !== 'N/A')
                        .map((e, idx) => `${idx + 1}. ${e.elemento_nombre}: [Serial: ${e.serial}] (Cant: ${e.cantidad})`)
                        .join('; ');
                    const obsText = serialList
                        ? `Relación oficial de seriales verificados a satisfacción según archivo de despacho CPE: ${serialList}. Elementos instalados y validados.`
                        : 'Elementos y equipos recibidos e instalados a entera satisfacción.';
                    this._setCellText(obsRowCells[0], obsText);
                }
                break;
            }
        }

        // Firmas en tabla 0: Asegurar datos oficiales del contratista CPE
        for (let r = 0; r < rows.length; r++) {
            const tcList = rows[r].getElementsByTagName('w:tc');
            for (let c = 0; c < tcList.length; c++) {
                const txt = tcList[c].textContent || '';
                if (txt.includes('profesional logístico') || txt.includes('profesional logistico')) {
                    this._setCellText(tcList[c], 'Cargo: PROFESIONAL LOGÍSTICA ');
                }
                if (txt.includes('Bohórquez') || txt.includes('Bohorquez')) {
                    this._setCellText(tcList[c], 'YUBY CATERINE BOHÓRQUEZ ROJAS');
                }
            }
        }

        const serializer = new XMLSerializer();
        const updatedXml = serializer.serializeToString(xmlDoc);
        zip.file('word/document.xml', updatedXml);

        const versionPad = String(version).padStart(2, '0');
        const filename = `LOG-026-F_${sede.codigo_dane_sede}_v${versionPad}.docx`;
        const blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        // Registrar o actualizar documento original
        const docRecord = store.saveDocumento({
            id: `DOC-026-${sede.codigo_dane_sede}`,
            tipo_documento: 'LOG-026-F',
            codigo_dane_sede: sede.codigo_dane_sede,
            radicado: sede.radicado,
            version_actual: version,
            estado: estado,
            nombre_archivo: filename
        }, 'Sistema', 'Rector', `Generación LOG-026-F v${version}`);

        await store.saveBlob(`DOC-${docRecord.id}-v${version}`, blob, filename, blob.type);
        await store.saveBlob(`DOC-${docRecord.id}-active`, blob, filename, blob.type);

        let driveUpload = null;
        if (window.googleDriveClient) {
            try {
                const targetFolder = await window.googleDriveClient.getTargetFolderForDocument({
                    codigo_mpio: mpio ? mpio.codigo : '17000',
                    nombre_mpio: mpio ? mpio.nombre : 'Caldas',
                    dane_ie: ie ? ie.codigo_dane : '000000',
                    nombre_ie: ie ? ie.nombre : 'IE',
                    dane_sede: sede.codigo_dane_sede,
                    nombre_sede: sede.nombre,
                    tipo_documento: 'LOG-026-F',
                    estado: estado
                });

                driveUpload = await window.googleDriveClient.uploadFile({
                    folderId: targetFolder.folderId,
                    filename: filename,
                    mimeType: blob.type,
                    blob: blob,
                    description: `Acta LOG-026-F para ${sede.nombre}`,
                    existingFileId: docRecord.drive_id
                });

                docRecord.drive_id = driveUpload.id;
                docRecord.drive_folder_id = targetFolder.folderId;
                docRecord.drive_path = targetFolder.relativePath;
                store.persist();
            } catch (err) {
                console.warn('Advertencia subiendo a Drive:', err);
            }
        }

        return { docRecord, blob, filename, driveUpload };
    }

    // =========================================================================
    // 2. GENERACIÓN / DILIGENCIAMIENTO LOG-029-F (.xlsx) - FORMATO OFICIAL CORREGIDO
    // =========================================================================
    async generateLog029(daneSede, version = 1, estado = 'Generado') {
        const store = window.appStore;
        const sede = store.getSedeByDane(daneSede);
        if (!sede) throw new Error(`Sede con DANE ${daneSede} no encontrada.`);

        // LOG-029-F solo se genera si la institución/sede tiene elementos asignados
        const elementos = store.getElementosBolsa(daneSede);
        if (!elementos || elementos.length === 0) {
            throw new Error(`La sede ${daneSede} no tiene elementos asignados de Bolsa Tecnológica (no aplica LOG-029-F).`);
        }

        const ie = store.getInstitucionByDane(sede.codigo_dane_ie);
        const mpio = ie ? store.getMunicipios().find(m => String(m.codigo) === String(ie.codigo_municipio)) : null;

        const templateBuf = await this.getTemplateArrayBuffer('./templates/LOG-029-F.xlsx');

        // Cargar libro en ExcelJS preservando hojas auxiliares y fórmulas
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(templateBuf);

        const ws = workbook.getWorksheet('Formulario');
        if (!ws) throw new Error('La plantilla LOG-029-F no contiene la hoja "Formulario".');

        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        // 1. Encabezado del Formulario
        ws.getCell('E8').value = dateStr;
        ws.getCell('I8').value = dateStr;
        ws.getCell('E9').value = mpio ? mpio.departamento : 'Caldas';
        ws.getCell('I9').value = mpio ? mpio.nombre : 'Caldas';
        ws.getCell('E10').value = ie ? ie.nombre : '';
        ws.getCell('I10').value = sede.nombre;
        ws.getCell('E11').value = String(sede.radicado || 'S/N');
        ws.getCell('I11').value = String(sede.codigo_dane_sede);
        ws.getCell('E12').value = 'N/A';

        // 2. Tabla de elementos verificados (Filas 18 a 27) - SIN INVENTAR SERIALES
        let rowCurr = 18;
        for (const elem of elementos) {
            if (rowCurr > 27) break; // Máximo de filas del formato oficial

            const officialName = this._mapItemToCatalogueName(elem.elemento_nombre);
            const serialVal = (elem.serial && elem.serial !== 'NO APLICA' && elem.serial !== 'N/A') ? elem.serial : '';

            ws.getCell(`D${rowCurr}`).value = officialName;
            ws.getCell(`E${rowCurr}`).value = elem.cantidad;
            ws.getCell(`F${rowCurr}`).value = serialVal;
            ws.getCell(`G${rowCurr}`).value = 'SI';
            ws.getCell(`H${rowCurr}`).value = 'SI';
            // CRÍTICO: Debe ser 'SIN NOVEDAD' para cumplir exactamente la validación de lista de Excel
            ws.getCell(`I${rowCurr}`).value = 'SIN NOVEDAD';
            ws.getCell(`J${rowCurr}`).value = 'Conforme a despacho y recepción en sede';
            rowCurr++;
        }

        // 3. Observaciones Generales
        const serialSummary = elementos.filter(e => e.serial && e.serial !== 'NO APLICA' && e.serial !== 'N/A').map(e => `${e.elemento_nombre}: ${e.serial}`).slice(0, 5).join(' | ');
        ws.getCell('C35').value = serialSummary
            ? `Elementos recibidos y verificados con seriales oficiales CPE: ${serialSummary}. Validación a entera satisfacción.`
            : 'Elementos recibidos, verificados y validados a entera satisfacción en la sede educativa.';

        // 4. Bloque de Firma del Beneficiario (Rectoría)
        ws.getCell('D39').value = ie ? `Rector(a) ${ie.nombre}` : 'Rector Institucional';
        ws.getCell('D40').value = String(ie ? ie.codigo_dane : 'S/N');
        ws.getCell('D41').value = '3100000000';
        ws.getCell('D42').value = 'Rector(a)';
        ws.getCell('D43').value = ie ? `rector.${ie.codigo_dane}@sedcaldas.gov.co` : 'rector@sedcaldas.gov.co';

        // 1. Eliminar cualquier definición de formato condicional en todas las hojas
        // (ExcelJS no serializa adecuadamente las reglas y genera tags vacíos que provocan HRESULT 0x8000ffff en Excel)
        workbook.worksheets.forEach(w => {
            w.conditionalFormattings = [];
        });

        const rawBuffer = await workbook.xlsx.writeBuffer();

        // 2. Post-procesamiento estricto con JSZip para asegurar XML 100% libre de elementos incompletos
        const zip = await JSZip.loadAsync(rawBuffer);
        for (const [name, fileObj] of Object.entries(zip.files)) {
            if (name.startsWith('xl/worksheets/sheet') && name.endsWith('.xml')) {
                let xml = await fileObj.async('text');
                xml = xml.replace(/<conditionalFormatting[\s\S]*?<\/conditionalFormatting>/g, '');
                xml = xml.replace(/<conditionalFormatting[^>]*\/>/g, '');
                zip.file(name, xml);
            }
        }

        const outBuffer = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const blob = outBuffer;

        const versionPad = String(version).padStart(2, '0');
        const filename = `LOG-029-F_${sede.codigo_dane_sede}_v${versionPad}.xlsx`;

        const docRecord = store.saveDocumento({
            id: `DOC-029-${sede.codigo_dane_sede}`,
            tipo_documento: 'LOG-029-F',
            codigo_dane_sede: sede.codigo_dane_sede,
            radicado: sede.radicado,
            version_actual: version,
            estado: estado,
            nombre_archivo: filename
        }, 'Sistema', 'Rector', `Informe LOG-029-F v${version}`);

        await store.saveBlob(`DOC-${docRecord.id}-v${version}`, blob, filename, blob.type);
        await store.saveBlob(`DOC-${docRecord.id}-active`, blob, filename, blob.type);

        let driveUpload = null;
        if (window.googleDriveClient) {
            try {
                const targetFolder = await window.googleDriveClient.getTargetFolderForDocument({
                    codigo_mpio: mpio ? mpio.codigo : '17000',
                    nombre_mpio: mpio ? mpio.nombre : 'Caldas',
                    dane_ie: ie ? ie.codigo_dane : '000000',
                    nombre_ie: ie ? ie.nombre : 'IE',
                    dane_sede: sede.codigo_dane_sede,
                    nombre_sede: sede.nombre,
                    tipo_documento: 'LOG-029-F',
                    estado: estado
                });

                driveUpload = await window.googleDriveClient.uploadFile({
                    folderId: targetFolder.folderId,
                    filename: filename,
                    mimeType: blob.type,
                    blob: blob,
                    description: `Informe LOG-029-F para ${sede.nombre}`,
                    existingFileId: docRecord.drive_id
                });

                docRecord.drive_id = driveUpload.id;
                docRecord.drive_folder_id = targetFolder.folderId;
                docRecord.drive_path = targetFolder.relativePath;
                store.persist();
            } catch (err) {
                console.warn('Advertencia subiendo a Drive:', err);
            }
        }

        return { docRecord, blob, filename, driveUpload };
    }

    // =========================================================================
    // 3. GENERACIÓN LOG-007-F (.docx) - ENTREGA A ESTUDIANTE BENEFICIARIO
    // =========================================================================
    async generateLog007(documentoEstudiante, version = 1, estado = 'Generado') {
        const store = window.appStore;
        const est = store.getEstudianteByDoc(documentoEstudiante);
        if (!est) throw new Error(`Estudiante con documento ${documentoEstudiante} no encontrado.`);

        const sede = store.getSedeByDane(est.codigo_dane_sede);
        const ie = sede ? store.getInstitucionByDane(sede.codigo_dane_ie) : null;
        const mpio = ie ? store.getMunicipios().find(m => String(m.codigo) === String(ie.codigo_municipio)) : null;
        const asignacion = store.getAsignacionByDoc(documentoEstudiante);

        const templateBuf = await this.getTemplateArrayBuffer('./templates/LOG-007-F.docx');
        const zip = await JSZip.loadAsync(templateBuf);
        const docXmlStr = await zip.file('word/document.xml').async('text');

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXmlStr, 'application/xml');
        const tables = xmlDoc.getElementsByTagName('w:tbl');
        if (!tables || tables.length < 3) {
            throw new Error('La plantilla LOG-007-F no contiene las tablas requeridas.');
        }

        const now = new Date();
        const dateStr = `${now.getDate()} de ${this.MONTHS_ES[now.getMonth()]} de ${now.getFullYear()}`;

        // Tabla 0: Datos Básicos
        const table0 = tables[0];
        const t0Rows = table0.getElementsByTagName('w:tr');
        const getT0Cells = (idx) => t0Rows[idx] ? t0Rows[idx].getElementsByTagName('w:tc') : [];

        // R1: Fecha de Legalización
        const r1Cells = getT0Cells(1);
        if (r1Cells.length > 1) this._setCellText(r1Cells[1], dateStr);

        // R2: Nombre IE y Sede | Código DANE Sede
        const r2Cells = getT0Cells(2);
        if (r2Cells.length > 1) this._setCellText(r2Cells[1], `${ie ? ie.nombre : ''} - ${sede ? sede.nombre : ''}`);
        if (r2Cells.length > 3) this._setCellText(r2Cells[r2Cells.length - 1], sede ? sede.codigo_dane_sede : '');

        // R3: Nombre del rector de la institución educativa: No debe aparecer diligenciado
        const r3Cells = getT0Cells(3);
        if (r3Cells.length > 1) this._setCellText(r3Cells[1], '');

        // R4: Folios
        const r4Cells = getT0Cells(4);
        if (r4Cells.length > 1) this._setCellText(r4Cells[1], '1 (Un folio)');

        // R5: Radicado Sede
        const r5Cells = getT0Cells(5);
        if (r5Cells.length > 1) this._setCellText(r5Cells[1], sede ? (sede.radicado || 'S/N') : '');

        // R6: Departamento y Municipio
        const r6Cells = getT0Cells(6);
        if (r6Cells.length > 1) this._setCellText(r6Cells[1], mpio ? mpio.departamento : 'Caldas');
        if (r6Cells.length > 3) this._setCellText(r6Cells[r6Cells.length - 1], mpio ? mpio.nombre : 'Caldas');

        // R7: Tipo de terminal y serial (sin inventar seriales)
        const r7Cells = getT0Cells(7);
        const tipoTerm = asignacion ? asignacion.tipo_terminal : (est.tipo_terminal || 'Tableta');
        const serialAsignado = (asignacion && asignacion.serial_asignado) ? asignacion.serial_asignado : (est.serial_terminal || '');
        if (r7Cells.length > 1) {
            const serialSuffix = serialAsignado ? ` (Serial: ${serialAsignado})` : '';
            if (String(tipoTerm).toLowerCase().includes('portátil') || String(tipoTerm).toLowerCase().includes('portatil')) {
                this._setCellText(r7Cells[1], `○ Tabletas       ● Portátiles${serialSuffix}    ○ Otro`);
            } else {
                this._setCellText(r7Cells[1], `● Tabletas${serialSuffix}       ○ Portátiles    ○ Otro`);
            }
        }

        // R8: Cantidad de terminales
        const r8Cells = getT0Cells(8);
        if (r8Cells.length > 1) this._setCellText(r8Cells[1], '1 (Uno)');

        // R10: Representante de CPE en la diligencia de entrega
        const r10Cells = getT0Cells(10);
        if (r10Cells.length > 1) this._setCellText(r10Cells[1], 'YUBY CATERINE BOHÓRQUEZ ROJAS');
        if (r10Cells.length > 3) this._setCellText(r10Cells[3], '52.497.293');

        // Observaciones en R14
        const r14Cells = getT0Cells(14);
        if (r14Cells.length > 0) {
            const obsSerial = serialAsignado ? `con serial oficial asignado: ${serialAsignado}` : 'verificado';
            this._setCellText(r14Cells[0], `Equipo de cómputo entregado ${obsSerial}. Terminal verificado en óptimo funcionamiento.`);
        }

        // Tabla 1: Bloque de Firmas (CPE con YUBY CATERINE BOHÓRQUEZ ROJAS / 52.497.293; Rector en blanco)
        const table1 = tables[1];
        const t1Rows = table1.getElementsByTagName('w:tr');
        const getT1Cells = (idx) => t1Rows[idx] ? t1Rows[idx].getElementsByTagName('w:tc') : [];

        // R3: Nombres
        const r3T1Cells = getT1Cells(3);
        if (r3T1Cells.length > 1) this._setCellText(r3T1Cells[1], 'Nombre: YUBY CATERINE BOHÓRQUEZ ROJAS');
        if (r3T1Cells.length > 3) this._setCellText(r3T1Cells[3], 'Nombre: '); // No diligenciar nombre de rector

        // R4: No. identificación
        const r4T1Cells = getT1Cells(4);
        if (r4T1Cells.length > 1) this._setCellText(r4T1Cells[1], 'No. identificación: 52.497.293');
        if (r4T1Cells.length > 3) this._setCellText(r4T1Cells[3], 'No. identificación: ');

        // R5: Celular
        const r5T1Cells = getT1Cells(5);
        if (r5T1Cells.length > 1) this._setCellText(r5T1Cells[1], 'Celular: 3100000000');
        if (r5T1Cells.length > 3) this._setCellText(r5T1Cells[3], 'Celular: ');

        // R6: Correo
        const r6T1Cells = getT1Cells(6);
        if (r6T1Cells.length > 1) this._setCellText(r6T1Cells[1], 'Correo: ybohorquez@cpe.gov.co');
        if (r6T1Cells.length > 3) this._setCellText(r6T1Cells[3], 'Correo: ');

        // R7: Cargo CPE / Nombre de la sede Rector
        const r7T1Cells = getT1Cells(7);
        if (r7T1Cells.length > 1) this._setCellText(r7T1Cells[1], 'Cargo: PROFESIONAL LOGÍSTICA');
        if (r7T1Cells.length > 3) this._setCellText(r7T1Cells[3], `Nombre de la sede: ${sede ? sede.nombre : ''}`);

        // Tabla 2: Lista de estudiantes / acudientes beneficiarios
        const table2 = tables[2];
        const t2Rows = table2.getElementsByTagName('w:tr');
        if (t2Rows.length > 1) {
            const t2Cells = t2Rows[1].getElementsByTagName('w:tc');
            if (t2Cells.length >= 6) {
                const nombreEstConSerial = (serialAsignado && serialAsignado !== 'NO APLICA')
                    ? `${est.nombre_completo} (Serial: ${serialAsignado})`
                    : est.nombre_completo;
                this._setCellText(t2Cells[0], est.documento_identidad);
                this._setCellText(t2Cells[1], nombreEstConSerial);
                this._setCellText(t2Cells[2], est.acudiente_nombres || '');
                this._setCellText(t2Cells[3], est.acudiente_documento || '');
                this._setCellText(t2Cells[4], est.acudiente_telefono || '3100000000');
                this._setCellText(t2Cells[5], ''); // Espacio libre para firma física externa
            }
        }

        const serializer = new XMLSerializer();
        const updatedXml = serializer.serializeToString(xmlDoc);
        zip.file('word/document.xml', updatedXml);

        const versionPad = String(version).padStart(2, '0');
        const filename = `LOG-007-F_${sede ? sede.codigo_dane_sede : '000'}_${est.documento_identidad}_v${versionPad}.docx`;
        const blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        const docRecord = store.saveDocumento({
            id: `DOC-007-${est.documento_identidad}`,
            tipo_documento: 'LOG-007-F',
            codigo_dane_sede: est.codigo_dane_sede,
            estudiante_documento: est.documento_identidad,
            radicado: sede ? sede.radicado : '',
            version_actual: version,
            estado: estado,
            nombre_archivo: filename
        }, 'Sistema', 'Acudiente/Rector', `Formato LOG-007-F v${version}`);

        await store.saveBlob(`DOC-${docRecord.id}-v${version}`, blob, filename, blob.type);
        await store.saveBlob(`DOC-${docRecord.id}-active`, blob, filename, blob.type);

        let driveUpload = null;
        if (window.googleDriveClient) {
            try {
                const targetFolder = await window.googleDriveClient.getTargetFolderForDocument({
                    codigo_mpio: mpio ? mpio.codigo : '17000',
                    nombre_mpio: mpio ? mpio.nombre : 'Caldas',
                    dane_ie: ie ? ie.codigo_dane : '000000',
                    nombre_ie: ie ? ie.nombre : 'IE',
                    dane_sede: est.codigo_dane_sede,
                    nombre_sede: sede ? sede.nombre : 'Sede',
                    tipo_documento: 'LOG-007-F',
                    estado: estado,
                    documento_estudiante: est.documento_identidad
                });

                driveUpload = await window.googleDriveClient.uploadFile({
                    folderId: targetFolder.folderId,
                    filename: filename,
                    mimeType: blob.type,
                    blob: blob,
                    description: `Formato LOG-007-F para ${est.nombre_completo}`,
                    existingFileId: docRecord.drive_id
                });

                docRecord.drive_id = driveUpload.id;
                docRecord.drive_folder_id = targetFolder.folderId;
                docRecord.drive_path = targetFolder.relativePath;
                store.persist();
            } catch (err) {
                console.warn('Advertencia subiendo a Drive:', err);
            }
        }

        return { docRecord, blob, filename, driveUpload };
    }

    // =========================================================================
    // 4. GENERACIÓN DE ACTA CONSOLIDADA LOG-007 (EXCEL)
    // Cumpliendo con la estructura exacta del archivo "Acta Consolidada LOG-007.xlsx"
    // =========================================================================
    async generateConsolidatedLog007Excel(options = {}) {
        const { codigoDaneIe = null, codigoMunicipio = null, triggerDownload = true } = options;
        const store = window.appStore;

        // Obtener formatos LOG-007
        let docs007 = store.getDocumentos({ tipo_documento: 'LOG-007-F' });

        // Filtrar por IE o Municipio si aplica
        if (codigoDaneIe) {
            const sedesIe = store.getSedes(codigoDaneIe).map(s => s.codigo_dane_sede);
            docs007 = docs007.filter(d => sedesIe.includes(d.codigo_dane_sede));
        } else if (codigoMunicipio) {
            const sedesMpio = store.getSedes().filter(s => {
                const ie = store.getInstitucionByDane(s.codigo_dane_ie);
                return ie && String(ie.codigo_municipio) === String(codigoMunicipio);
            }).map(s => s.codigo_dane_sede);
            docs007 = docs007.filter(d => sedesMpio.includes(d.codigo_dane_sede));
        }

        if (!docs007 || docs007.length === 0) {
            throw new Error('No se encontraron formatos LOG-007 para consolidar en el acta.');
        }

        // Cargar la plantilla oficial "Acta Consolidada LOG-007.xlsx"
        const templateBuf = await this.getTemplateArrayBuffer('./templates/Acta_Consolidada_LOG-007.xlsx');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(templateBuf);

        const ws = workbook.getWorksheet('Hoja1') || workbook.worksheets[0];

        // Definir metadatos de cabecera institucional
        let ieNombre = 'CONSOLIDADO DEPARTAMENTAL - CALDAS';
        let ieDane = 'TODAS LAS IEs';
        let sedeNombre = 'TODAS LAS SEDES BENEFICIARIAS';
        let sedeDane = 'CALDAS';
        let radicadoVal = 'CPE-CALDAS-2026';

        if (codigoDaneIe) {
            const ie = store.getInstitucionByDane(codigoDaneIe);
            const sedesIe = store.getSedes(codigoDaneIe);
            ieNombre = ie ? ie.nombre : 'INSTITUCIÓN EDUCATIVA';
            ieDane = ie ? ie.codigo_dane : String(codigoDaneIe);
            sedeNombre = sedesIe.length === 1 ? sedesIe[0].nombre : 'SEDES BENEFICIARIAS IE';
            sedeDane = sedesIe.length === 1 ? sedesIe[0].codigo_dane_sede : 'VARIAS';
            radicadoVal = sedesIe.length === 1 ? (sedesIe[0].radicado || `LOG-007-IE-${ieDane}`) : `LOG-007-IE-${ieDane}`;
        } else if (codigoMunicipio) {
            const mpio = store.getMunicipios().find(m => String(m.codigo) === String(codigoMunicipio));
            ieNombre = mpio ? `CONSOLIDADO MUNICIPIO DE ${mpio.nombre.toUpperCase()}` : 'CONSOLIDADO MUNICIPAL';
            ieDane = String(codigoMunicipio);
            sedeNombre = 'TODAS LAS SEDES DEL MUNICIPIO';
            sedeDane = String(codigoMunicipio);
            radicadoVal = `CPE-MPIO-${codigoMunicipio}-2026`;
        }

        // Diligenciar celdas de metadatos (Filas 5, 6 y 7)
        ws.getCell('C5').value = ieNombre;
        ws.getCell('C5').font = { name: 'Verdana', size: 9, bold: false };
        ws.getCell('F5').value = ieDane;
        ws.getCell('F5').font = { name: 'Verdana', size: 9, bold: false };

        ws.getCell('C6').value = sedeNombre;
        ws.getCell('C6').font = { name: 'Verdana', size: 9, bold: false };
        ws.getCell('F6').value = sedeDane;
        ws.getCell('F6').font = { name: 'Verdana', size: 9, bold: false };

        ws.getCell('C7').value = radicadoVal;
        ws.getCell('C7').font = { name: 'Verdana', size: 9, bold: false };

        // Ordenar estudiantes alfabéticamente (por IE y nombre)
        docs007.sort((a, b) => {
            const estA = store.getEstudianteByDoc(a.estudiante_documento);
            const estB = store.getEstudianteByDoc(b.estudiante_documento);
            const sedeA = estA ? store.getSedeByDane(estA.codigo_dane_sede) : null;
            const sedeB = estB ? store.getSedeByDane(estB.codigo_dane_sede) : null;
            const ieA = sedeA ? store.getInstitucionByDane(sedeA.codigo_dane_ie) : null;
            const ieB = sedeB ? store.getInstitucionByDane(sedeB.codigo_dane_ie) : null;
            const compIe = (ieA?.nombre || '').localeCompare(ieB?.nombre || '');
            if (compIe !== 0) return compIe;
            return (estA?.nombre_completo || '').localeCompare(estB?.nombre_completo || '');
        });

        // Diligenciar tabla de beneficiarios a partir de la fila 11
        // Columnas oficiales según plantilla Acta Consolidada LOG-007.xlsx:
        // Col B: No. Documento Estudiante
        // Col C: Nombres y Apellidos Estudiante
        // Col D: Nombres y Apellidos Acudiente
        // Col E: No. Documento Acudiente
        // Col F: No. Celular Acudiente
        // Col G: Firma Acudiente
        let rowIdx = 11;
        let counter = 1;

        for (const doc of docs007) {
            const est = store.getEstudianteByDoc(doc.estudiante_documento);
            if (!est) continue;

            const r = ws.getRow(rowIdx);
            r.getCell(2).value = String(est.documento_identidad);
            r.getCell(3).value = est.nombre_completo;
            r.getCell(4).value = est.acudiente_nombres || '';
            r.getCell(5).value = String(est.acudiente_documento || '');
            r.getCell(6).value = String(est.acudiente_telefono || '3100000000');
            r.getCell(7).value = ''; // Espacio reservado para firma física del acudiente

            // Formato de texto @ para documentos y celulares para preservar ceros
            r.getCell(2).numFmt = '@';
            r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
            r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            r.getCell(5).numFmt = '@';
            r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
            r.getCell(6).numFmt = '@';
            r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
            r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

            for (let c = 2; c <= 7; c++) {
                const cell = r.getCell(c);
                cell.font = { name: 'Verdana', size: 9 };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    right: { style: 'thin', color: { argb: 'FF94A3B8' } }
                };
            }
            r.height = 28;
            rowIdx++;
            counter++;
        }

        const now = new Date();
        const rawBuffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([rawBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const filename = codigoDaneIe
            ? `ACTA_CONSOLIDADA_LOG-007_IE_${codigoDaneIe}.xlsx`
            : `ACTA_CONSOLIDADA_LOG-007_${now.toISOString().slice(0, 10)}.xlsx`;

        if (triggerDownload && typeof window !== 'undefined' && window.document) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        store.logAudit({
            actor: window.authService?.getCurrentUser()?.name || 'Usuario',
            rol: window.authService?.getCurrentUser()?.role || 'Rector',
            accion: 'DESCARGA_ACTA_CONSOLIDADA_LOG007',
            entidad: 'ReporteExcel',
            entidad_id: filename,
            detalles: `Descarga de acta consolidada LOG-007 cumpliendo plantilla oficial con ${counter - 1} beneficiarios.`
        });

        return { blob, filename, totalRecords: counter - 1 };
    }

    // =========================================================================
    // 5. PREGENERACIÓN MASIVA DE TODOS LOS FORMATOS EN GOOGLE DRIVE
    // =========================================================================
    async pregenerateAllFormats({ onProgress = null, uploadToDrive = true } = {}) {
        const store = window.appStore;
        const sedes = store.getSedes();
        const estudiantes = store.getEstudiantes();
        
        // Solo sedes con bolsa y estudiantes con serial
        const sedesConBolsa = sedes.filter(s => store.getElementosBolsa(s.codigo_dane_sede).length > 0);
        const estConSerial = estudiantes.filter(e => e.serial_terminal && e.serial_terminal.length > 0);

        const total = (sedesConBolsa.length * 2) + estConSerial.length;
        let current = 0;

        const results = [];

        // 1. Sedes con elementos asignados: LOG-026-F y LOG-029-F
        for (const sede of sedesConBolsa) {
            current++;
            if (onProgress) onProgress(current, total, `LOG-026-F para ${sede.nombre}`);
            try {
                const res26 = await this.generateLog026(sede.codigo_dane_sede, 1, 'Generado');
                results.push(res26);
            } catch (e26) {
                console.error(`Error pregenerando LOG-026 para ${sede.nombre}:`, e26);
            }

            current++;
            if (onProgress) onProgress(current, total, `LOG-029-F para ${sede.nombre}`);
            try {
                const res29 = await this.generateLog029(sede.codigo_dane_sede, 1, 'Generado');
                results.push(res29);
            } catch (e29) {
                console.error(`Error pregenerando LOG-029 para ${sede.nombre}:`, e29);
            }
        }

        // 2. Estudiantes con serial oficial asignado: LOG-007-F
        for (const est of estConSerial) {
            current++;
            if (onProgress) onProgress(current, total, `LOG-007-F para ${est.nombre_completo}`);
            try {
                const res007 = await this.generateLog007(est.documento_identidad, 1, 'Generado');
                results.push(res007);
            } catch (e07) {
                console.error(`Error pregenerando LOG-007 para ${est.nombre_completo}:`, e07);
            }
        }


        store.logAudit({
            actor: window.authService?.getCurrentUser()?.name || 'Administrador',
            rol: 'Administrador',
            accion: 'PREGENERACION_MASIVA_DRIVE',
            entidad: 'Expedientes',
            entidad_id: 'LOTE',
            detalles: `${results.length} expedientes pregenerados e inicializados en Google Drive.`
        });

        return {
            totalPregenerados: results.length,
            totalEsperado: total
        };
    }

    // =========================================================================
    // 5. DESCARGA MASIVA DEL COORDINADOR EN ARCHIVO ZIP CON MANIFIESTO
    // =========================================================================
    async generateCoordinatorZip(filters = {}) {
        const store = window.appStore;
        const docs = store.getDocumentos(filters);
        if (docs.length === 0) {
            throw new Error('No hay documentos que coincidan con los filtros seleccionados.');
        }

        const zip = new JSZip();
        const manifestRows = [
            ['ID Documento', 'Tipo', 'Código DANE Sede', 'Nombre Sede', 'Estudiante', 'Radicado', 'Serial(es)', 'Versión', 'Estado', 'Nombre Archivo', 'Drive ID', 'Fecha Actualización']
        ];

        for (const doc of docs) {
            const sede = store.getSedeByDane(doc.codigo_dane_sede);
            const est = doc.estudiante_documento ? store.getEstudianteByDoc(doc.estudiante_documento) : null;
            let serialVal = '';
            if (est) {
                const asig = store.getAsignacionByDoc(est.documento_identidad);
                serialVal = asig ? asig.serial_asignado : (est.serial_terminal || '');
            } else if (doc.codigo_dane_sede) {
                const elems = store.getElementosBolsa(doc.codigo_dane_sede);
                serialVal = elems.filter(e => e.serial && e.serial !== 'NO APLICA').map(e => `${e.elemento_nombre}: ${e.serial}`).join('; ');
            }

            manifestRows.push([
                doc.id,
                doc.tipo_documento,
                doc.codigo_dane_sede || '',
                sede ? sede.nombre : '',
                est ? `${est.nombre_completo} (${est.documento_identidad})` : 'Bolsa Institucional',
                doc.radicado || '',
                serialVal,
                String(doc.version_actual),
                doc.estado,
                doc.nombre_archivo,
                doc.drive_id || 'ALMACENAMIENTO_LOCAL',
                doc.updated_at
            ]);

            // Obtener blob del archivo activo actualizado
            let blob = null;
            if (store) {
                const blobItem = await store.getBlob(`DOC-${doc.id}-active`) || await store.getBlob(`DOC-${doc.id}-v${doc.version_actual}`);
                if (blobItem && blobItem.blob) {
                    blob = blobItem.blob;
                }
            }

            if (!blob && window.googleDriveClient && doc.drive_id && !doc.drive_id.startsWith('DRIVE-')) {
                try {
                    blob = await window.googleDriveClient.downloadFile(doc.drive_id);
                } catch (e) {
                    console.warn(`No se pudo descargar ${doc.nombre_archivo} de Drive:`, e);
                }
            }

            if (blob) {
                const folderName = `${doc.tipo_documento}/${doc.estado}`;
                zip.folder(folderName).file(doc.nombre_archivo, blob);
            }
        }

        const csvContent = manifestRows.map(row => 
            row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
        ).join('\r\n');
        zip.file('MANIFIESTO_DOCUMENTAL.csv', csvContent);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const nowStr = new Date().toISOString().slice(0, 10);
        const zipFilename = `EXPEDIENTES_CALDAS_${nowStr}.zip`;

        const downloadUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = zipFilename;
        a.click();
        URL.revokeObjectURL(downloadUrl);

        store.logAudit({
            actor: window.authService?.getCurrentUser()?.name || 'Coordinador',
            rol: 'Coordinador',
            accion: 'DESCARGA_MASIVA_ZIP',
            entidad: 'Expedientes',
            entidad_id: 'ZIP',
            detalles: `Descarga de paquete ZIP con ${docs.length} documentos y manifiesto CSV.`
        });

        return {
            totalDocs: docs.length,
            zipFilename,
            zipBlob
        };
    }
}

// Singleton global
window.documentGenerator = new DocumentGenerator();
