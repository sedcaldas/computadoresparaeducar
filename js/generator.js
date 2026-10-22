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

        const ie = store.getInstitucionByDane(sede.codigo_dane_ie);
        const mpio = ie ? store.getMunicipios().find(m => String(m.codigo) === String(ie.codigo_municipio)) : null;
        const elementos = store.getElementosBolsa(daneSede);

        const templateBuf = await this.getTemplateArrayBuffer('./templates/LOG-026-F.docx');
        const zip = await JSZip.loadAsync(templateBuf);
        const docXmlStr = await zip.file('word/document.xml').async('text');

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXmlStr, 'application/xml');
        const tables = xmlDoc.getElementsByTagName('w:tbl');
        if (!tables || tables.length === 0) {
            throw new Error('La plantilla LOG-026-F no contiene tablas válidas.');
        }

        const table0 = tables[0];
        const rows = table0.getElementsByTagName('w:tr');
        const getCells = (rowIdx) => rows[rowIdx] ? rows[rowIdx].getElementsByTagName('w:tc') : [];

        // R1: Nombre de IE & Radicado Sede
        const r1Cells = getCells(1);
        if (r1Cells.length > 1) this._setCellText(r1Cells[1], ie ? ie.nombre : 'INSTITUCIÓN EDUCATIVA');
        if (r1Cells.length > 4) this._setCellText(r1Cells[r1Cells.length - 1], sede.radicado || 'S/N');

        // R2: Nombre Sede & Código DANE Sede
        const r2Cells = getCells(2);
        if (r2Cells.length > 1) this._setCellText(r2Cells[1], sede.nombre);
        if (r2Cells.length > 4) this._setCellText(r2Cells[r2Cells.length - 1], sede.codigo_dane_sede);

        // R3: Departamento & Municipio
        const r3Cells = getCells(3);
        if (r3Cells.length > 1) this._setCellText(r3Cells[1], mpio ? mpio.departamento : 'Caldas');
        if (r3Cells.length > 4) this._setCellText(r3Cells[r3Cells.length - 1], mpio ? mpio.nombre : 'Caldas');

        // Llenar elementos de bolsa en filas 7 a 11 con su serial oficial
        let elemIdx = 0;
        for (let rIdx = 7; rIdx <= 11; rIdx++) {
            const rowCells = getCells(rIdx);
            if (!rowCells || rowCells.length < 4) continue;

            if (elemIdx < elementos.length) {
                const e1 = elementos[elemIdx++];
                const desc1 = e1.serial && e1.serial !== 'NO APLICA' ? `${e1.elemento_nombre} (Serial: ${e1.serial})` : e1.elemento_nombre;
                this._setCellText(rowCells[0], desc1.substring(0, 85));
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
                    const desc2 = e2.serial && e2.serial !== 'NO APLICA' ? `${e2.elemento_nombre} (Serial: ${e2.serial})` : e2.elemento_nombre;
                    this._setCellText(colElem2, desc2.substring(0, 85));
                    this._setCellText(colCant2, String(e2.cantidad));
                } else {
                    this._setCellText(colElem2, 'N/A');
                    this._setCellText(colCant2, '0');
                }
            }
        }

        // Relación de seriales oficiales en fila de Observaciones (Fila 19)
        const obsCells = getCells(19);
        if (obsCells.length > 0) {
            const serialList = elementos
                .filter(e => e.serial && e.serial !== 'NO APLICA')
                .map((e, idx) => `${idx + 1}. ${e.elemento_nombre}: [Serial: ${e.serial}] (Cant: ${e.cantidad})`)
                .join('; ');
            const obsText = serialList
                ? `Relación oficial de seriales verificados a satisfacción según archivo de despacho CPE: ${serialList}. Elementos instalados y validados.`
                : 'Elementos y equipos recibidos e instalados a entera satisfacción.';
            this._setCellText(obsCells[0], obsText);
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

        const ie = store.getInstitucionByDane(sede.codigo_dane_ie);
        const mpio = ie ? store.getMunicipios().find(m => String(m.codigo) === String(ie.codigo_municipio)) : null;
        const elementos = store.getElementosBolsa(daneSede);

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

        // 2. Tabla de elementos verificados (Filas 18 a 27)
        let rowCurr = 18;
        let elemSeq = 1;
        for (const elem of elementos) {
            if (rowCurr > 27) break; // Máximo de filas del formato oficial

            const officialName = this._mapItemToCatalogueName(elem.elemento_nombre);
            const serialVal = (elem.serial && elem.serial !== 'NO APLICA') ? elem.serial : `SN-BT-${String(sede.codigo_dane_sede).slice(-4)}-00${elemSeq++}`;

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
        const serialSummary = elementos.filter(e => e.serial && e.serial !== 'NO APLICA').map(e => `${e.elemento_nombre}: ${e.serial}`).slice(0, 5).join(' | ');
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

        // R3: Nombre del rector
        const r3Cells = getT0Cells(3);
        if (r3Cells.length > 1) this._setCellText(r3Cells[1], ie ? `Rector(a) ${ie.nombre}` : 'Rector Institucional');

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

        // R7: Tipo de terminal y serial
        const r7Cells = getT0Cells(7);
        const tipoTerm = asignacion ? asignacion.tipo_terminal : (est.tipo_terminal || 'Tableta');
        const serialAsignado = (asignacion && asignacion.serial_asignado) ? asignacion.serial_asignado : (est.serial_terminal || 'S/N');
        if (r7Cells.length > 1) {
            if (String(tipoTerm).toLowerCase().includes('portátil') || String(tipoTerm).toLowerCase().includes('portatil')) {
                this._setCellText(r7Cells[1], `○ Tabletas       ● Portátiles (Serial: ${serialAsignado})    ○ Otro`);
            } else {
                this._setCellText(r7Cells[1], `● Tabletas (Serial: ${serialAsignado})       ○ Portátiles    ○ Otro`);
            }
        }

        // R8: Cantidad de terminales
        const r8Cells = getT0Cells(8);
        if (r8Cells.length > 1) this._setCellText(r8Cells[1], '1 (Uno)');

        // Observaciones en R14
        const r14Cells = getT0Cells(14);
        if (r14Cells.length > 0) {
            this._setCellText(r14Cells[0], `Equipo de cómputo entregado con serial oficial asignado: ${serialAsignado}. Terminal verificado en óptimo funcionamiento.`);
        }

        // Tabla 2: Lista de estudiantes / acudientes beneficiarios
        const table2 = tables[2];
        const t2Rows = table2.getElementsByTagName('w:tr');
        if (t2Rows.length > 1) {
            const t2Cells = t2Rows[1].getElementsByTagName('w:tc');
            if (t2Cells.length >= 6) {
                this._setCellText(t2Cells[0], est.documento_identidad);
                this._setCellText(t2Cells[1], `${est.nombre_completo} (Serial: ${serialAsignado})`);
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
    // 4. PREGENERACIÓN MASIVA DE TODOS LOS FORMATOS EN GOOGLE DRIVE
    // =========================================================================
    async pregenerateAllFormats({ onProgress = null, uploadToDrive = true } = {}) {
        const store = window.appStore;
        const sedes = store.getSedes();
        const estudiantes = store.getEstudiantes();
        const total = (sedes.length * 2) + estudiantes.length;
        let current = 0;

        const results = [];

        // 1. Sedes: LOG-026-F y LOG-029-F
        for (const sede of sedes) {
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

        // 2. Estudiantes: LOG-007-F
        for (const est of estudiantes) {
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
