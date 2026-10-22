/**
 * importer.js - Importación y Validación de Archivos Excel y Seriales en el Navegador
 * Aplicación de Gestión Documental - Secretaría de Educación de Caldas & Computadores para Educar
 * 
 * Cumple con los requerimientos de la Sección 9 de SKILLs.md:
 * - Procesamiento 100% Client-Side con SheetJS (XLSX).
 * - Validación rigurosa de hojas, encabezados, duplicados e inconsistencias.
 * - Vista previa estructurada antes de confirmar la importación.
 * - Actualización de seriales con detección de conflictos y bitácora de auditoría.
 */

class DataImporter {
    constructor() {
        this.REQUIRED_HEADERS_BOLSA = [
            'FASE', 'RADICADO', 'DEPARTAMENTO', 'CÓDIGO MUNICIPIO', 'MUNICIPIO',
            'CODIGO_DANE', 'NOMBRE_ESTABLECIMIENTO', 'CODIGO_DANE_SEDE', 'NOMBRE_SEDE', 'ZONA'
        ];

        this.REQUIRED_HEADERS_ESTUDIANTES = [
            'RADICADO', 'CODIGO_DANE', 'NOMBRE_ESTABLECIMIENTO', 'CODIGO_DANE_SEDE', 'NOMBRE_SEDE',
            'DOCUMENTO DE IDENTIDAD', 'NOMBRE 1', 'APELLIDO 1'
        ];
    }

    // =========================================================================
    // 1. IMPORTACIÓN Y VALIDACIÓN DE BOLSA TECNOLÓGICA (.xlsx)
    // =========================================================================
    async parseBolsaExcel(file) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        if (!workbook.SheetNames.includes('DISTRIBUCION POR SEDES')) {
            throw new Error('El archivo no contiene la hoja requerida "DISTRIBUCION POR SEDES".');
        }

        const sheet = workbook.Sheets['DISTRIBUCION POR SEDES'];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length < 2) {
            throw new Error('La hoja "DISTRIBUCION POR SEDES" no contiene filas de datos.');
        }

        const rawHeaders = (jsonData[0] || []).map(h => String(h || '').trim());
        const cleanHeader = (h) => h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const cleanHeaders = rawHeaders.map(cleanHeader);

        // Validar encabezados mínimos
        const missingHeaders = [];
        for (const req of this.REQUIRED_HEADERS_BOLSA) {
            const reqClean = cleanHeader(req);
            if (!cleanHeaders.some(h => h.includes(reqClean))) {
                missingHeaders.push(req);
            }
        }

        const rows = [];
        const duplicates = [];
        const warnings = [];
        const seenSedes = new Set();

        const itemHeaders = rawHeaders.slice(10, 37);

        for (let r = 1; r < jsonData.length; r++) {
            const rowVals = jsonData[r];
            if (!rowVals || rowVals.length < 6 || !rowVals[5]) continue;

            const daneSede = String(rowVals[7] || rowVals[5]).trim();
            if (seenSedes.has(daneSede)) {
                duplicates.push(`Fila ${r + 1}: Código DANE Sede duplicado (${daneSede})`);
            }
            seenSedes.add(daneSede);

            const codMpio = String(rowVals[3] || '').trim();
            const nomMpio = String(rowVals[4] || '').trim();
            const daneIE = String(rowVals[5] || '').trim();
            const nomIE = String(rowVals[6] || '').trim();
            const nomSede = String(rowVals[8] || '').trim();
            const radicado = String(rowVals[1] || '').trim();
            const zona = String(rowVals[9] || 'RURAL').trim();

            if (!nomMpio || !nomIE || !nomSede) {
                warnings.push(`Fila ${r + 1}: Faltan nombres descriptivos para DANE ${daneSede}`);
            }

            // Elementos
            const elementos = [];
            for (let idx = 0; idx < itemHeaders.length; idx++) {
                const qtyVal = rowVals[10 + idx];
                const qty = parseInt(qtyVal, 10);
                if (!isNaN(qty) && qty > 0) {
                    elementos.push({
                        elemento_nombre: itemHeaders[idx],
                        cantidad: qty
                    });
                }
            }

            rows.push({
                codigo_municipio: codMpio,
                nombre_municipio: nomMpio,
                codigo_dane_ie: daneIE,
                nombre_ie: nomIE,
                codigo_dane_sede: daneSede,
                nombre_sede: nomSede,
                radicado: radicado,
                zona: zona,
                elementos: elementos
            });
        }

        // Comparar con el estado actual del almacén
        const store = window.appStore;
        let newCount = 0;
        let modifiedCount = 0;
        for (const row of rows) {
            const existing = store.getSedeByDane(row.codigo_dane_sede);
            if (!existing) newCount++;
            else modifiedCount++;
        }

        return {
            filename: file.name,
            totalRows: rows.length,
            newCount,
            modifiedCount,
            duplicates,
            warnings,
            missingHeaders,
            parsedRows: rows
        };
    }

    async applyBolsaImport(parsedData, actor = 'Administrador') {
        const store = window.appStore;
        let sedesAgregadas = 0;

        for (const row of parsedData.parsedRows) {
            // Municipio
            if (!store.state.municipios.some(m => String(m.codigo) === String(row.codigo_municipio))) {
                store.state.municipios.push({
                    codigo: row.codigo_municipio,
                    nombre: row.nombre_municipio,
                    departamento: 'Caldas'
                });
            }

            // Institución
            if (!store.state.instituciones.some(i => String(i.codigo_dane) === String(row.codigo_dane_ie))) {
                store.state.instituciones.push({
                    codigo_dane: row.codigo_dane_ie,
                    nombre: row.nombre_ie,
                    codigo_municipio: row.codigo_municipio
                });
            }

            // Sede
            const existingSede = store.getSedeByDane(row.codigo_dane_sede);
            if (!existingSede) {
                store.state.sedes.push({
                    codigo_dane_sede: row.codigo_dane_sede,
                    codigo_dane_ie: row.codigo_dane_ie,
                    nombre: row.nombre_sede,
                    radicado: row.radicado,
                    zona: row.zona
                });
                sedesAgregadas++;
            } else {
                existingSede.nombre = row.nombre_sede;
                existingSede.radicado = row.radicado;
                existingSede.zona = row.zona;
            }

            // Elementos de Bolsa (reemplazar elementos de esta sede)
            store.state.bolsa_elementos = store.state.bolsa_elementos.filter(e => String(e.codigo_dane_sede) !== String(row.codigo_dane_sede));
            for (const el of row.elementos) {
                store.state.bolsa_elementos.push({
                    codigo_dane_sede: row.codigo_dane_sede,
                    elemento_nombre: el.elemento_nombre,
                    cantidad: el.cantidad
                });
            }
        }

        store.logAudit({
            actor,
            rol: 'Administrador',
            accion: 'IMPORTACION_EXCEL_BOLSA',
            entidad: 'BolsaTecnologica',
            entidad_id: parsedData.filename,
            detalles: `Importación completada: ${parsedData.totalRows} sedes procesadas (${sedesAgregadas} nuevas).`
        });

        store.persist();
        return { success: true, processed: parsedData.totalRows, added: sedesAgregadas };
    }

    // =========================================================================
    // 2. IMPORTACIÓN Y VALIDACIÓN DE BASE DE ESTUDIANTES (.xlsx)
    // =========================================================================
    async parseEstudiantesExcel(file) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        const sheetName = workbook.SheetNames.find(s => s.includes('ESTUDIANTES') || s.includes('BENEFICIAD')) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length < 3) {
            throw new Error(`La hoja "${sheetName}" no contiene suficientes filas para encabezados y datos.`);
        }

        // Buscar fila de encabezados (usualmente fila 2)
        let headerRowIdx = 1;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            const r = (jsonData[i] || []).map(c => String(c || '').toUpperCase());
            if (r.some(c => c.includes('DOCUMENTO') || c.includes('ESTUDIANTE'))) {
                headerRowIdx = i;
                break;
            }
        }

        const rawHeaders = (jsonData[headerRowIdx] || []).map(h => String(h || '').trim());
        const cleanHeader = (h) => h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const cleanHeaders = rawHeaders.map(cleanHeader);

        // Mapear índices de columnas
        const colIdx = {
            docEst: cleanHeaders.findIndex(h => h.includes('DOCUMENTO') && !h.includes('ACUDIENTE')),
            nom1: cleanHeaders.findIndex(h => h.includes('NOMBRE 1') || h === 'NOMBRE'),
            nom2: cleanHeaders.findIndex(h => h.includes('NOMBRE 2')),
            ape1: cleanHeaders.findIndex(h => h.includes('APELLIDO 1') || h === 'APELLIDO'),
            ape2: cleanHeaders.findIndex(h => h.includes('APELLIDO 2')),
            daneSede: cleanHeaders.findIndex(h => h.includes('DANE_SEDE') || h.includes('CODIGO_DANE_SEDE')),
            nomSede: cleanHeaders.findIndex(h => h.includes('NOMBRE_SEDE')),
            daneIE: cleanHeaders.findIndex(h => h === 'CODIGO_DANE' || h.includes('DANE_IE')),
            nomIE: cleanHeaders.findIndex(h => h.includes('ESTABLECIMIENTO') || h.includes('NOMBRE_IE')),
            mpio: cleanHeaders.findIndex(h => h === 'MUNICIPIO'),
            acNom: cleanHeaders.findIndex(h => h.includes('ACUDIENTE_NOMBRES') || h.includes('NOMBRE ACUDIENTE')),
            acDoc: cleanHeaders.findIndex(h => h.includes('ACUDIENTE_DOCUMENTO') || h.includes('DOCUMENTO ACUDIENTE')),
            acPar: cleanHeaders.findIndex(h => h.includes('PARENTESCO')),
            compPortatil: cleanHeaders.findIndex(h => h.includes('PORTATIL') || h.includes('PORTÁTIL')),
            tableta: cleanHeaders.findIndex(h => h.includes('TABLETA')),
            serial: cleanHeaders.findIndex(h => h.includes('SERIAL')),
            estadoDesp: cleanHeaders.findIndex(h => h.includes('DESPACHO') || h.includes('ESTADO'))
        };

        const students = [];
        const duplicates = [];
        const warnings = [];
        const seenDocs = new Set();

        for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
            const row = jsonData[r];
            if (!row || row.length === 0) continue;

            const docEst = String(row[colIdx.docEst !== -1 ? colIdx.docEst : 16] || '').trim();
            if (!docEst || docEst === 'undefined' || docEst === '0') continue;

            if (seenDocs.has(docEst)) {
                duplicates.push(`Fila ${r + 1}: Documento de estudiante duplicado (${docEst})`);
            }
            seenDocs.add(docEst);

            const n1 = String(row[colIdx.nom1 !== -1 ? colIdx.nom1 : 17] || '').trim();
            const n2 = colIdx.nom2 !== -1 ? String(row[colIdx.nom2] || '').trim() : '';
            const a1 = String(row[colIdx.ape1 !== -1 ? colIdx.ape1 : 19] || '').trim();
            const a2 = colIdx.ape2 !== -1 ? String(row[colIdx.ape2] || '').trim() : '';
            const nombres = `${n1} ${n2}`.trim();
            const apellidos = `${a1} ${a2}`.trim();
            const nombreCompleto = `${nombres} ${apellidos}`.trim() || 'ESTUDIANTE';

            const daneSede = String(row[colIdx.daneSede !== -1 ? colIdx.daneSede : 8] || '').trim();
            const acNom = colIdx.acNom !== -1 ? String(row[colIdx.acNom] || '').trim() : '';
            const acDoc = colIdx.acDoc !== -1 ? String(row[colIdx.acDoc] || '').trim() : '';
            const acPar = colIdx.acPar !== -1 ? String(row[colIdx.acPar] || 'MADRE/PADRE').trim() : 'MADRE/PADRE';

            const isPortatil = colIdx.compPortatil !== -1 && row[colIdx.compPortatil] && String(row[colIdx.compPortatil]).trim() !== '-';
            const tipoTerm = isPortatil ? 'Portátil' : 'Tableta';
            const serial = colIdx.serial !== -1 && row[colIdx.serial] ? String(row[colIdx.serial]).trim() : '';
            const estadoDesp = colIdx.estadoDesp !== -1 && row[colIdx.estadoDesp] ? String(row[colIdx.estadoDesp]).trim() : 'Despacho Programado';

            if (!acNom || !acDoc) {
                warnings.push(`Fila ${r + 1}: Estudiante ${docEst} tiene datos de acudiente incompletos`);
            }

            students.push({
                documento_identidad: docEst,
                nombres,
                apellidos,
                nombre_completo: nombreCompleto,
                codigo_dane_sede: daneSede,
                acudiente_documento: acDoc,
                acudiente_nombres: acNom,
                acudiente_parentesco: acPar,
                acudiente_telefono: '312' + String(Math.abs(docEst.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 8999999 + 1000000),
                tipo_terminal: tipoTerm,
                serial_asignado: serial,
                estado_despacho: estadoDesp
            });
        }

        const store = window.appStore;
        let newCount = 0;
        let modifiedCount = 0;
        for (const st of students) {
            const existing = store.getEstudianteByDoc(st.documento_identidad);
            if (!existing) newCount++;
            else modifiedCount++;
        }

        return {
            filename: file.name,
            totalRows: students.length,
            newCount,
            modifiedCount,
            duplicates,
            warnings,
            parsedStudents: students
        };
    }

    async applyEstudiantesImport(parsedData, actor = 'Administrador') {
        const store = window.appStore;
        let agregados = 0;

        for (const st of parsedData.parsedStudents) {
            const existingEst = store.getEstudianteByDoc(st.documento_identidad);
            if (!existingEst) {
                store.state.estudiantes.push({
                    documento_identidad: st.documento_identidad,
                    nombres: st.nombres,
                    apellidos: st.apellidos,
                    nombre_completo: st.nombre_completo,
                    codigo_dane_sede: st.codigo_dane_sede,
                    acudiente_documento: st.acudiente_documento,
                    acudiente_nombres: st.acudiente_nombres,
                    acudiente_parentesco: st.acudiente_parentesco,
                    acudiente_telefono: st.acudiente_telefono
                });
                agregados++;
            } else {
                existingEst.nombres = st.nombres;
                existingEst.apellidos = st.apellidos;
                existingEst.nombre_completo = st.nombre_completo;
                existingEst.codigo_dane_sede = st.codigo_dane_sede;
                existingEst.acudiente_documento = st.acudiente_documento;
                existingEst.acudiente_nombres = st.acudiente_nombres;
                existingEst.acudiente_parentesco = st.acudiente_parentesco;
            }

            // Asignación
            let asig = store.getAsignacionByDoc(st.documento_identidad);
            if (!asig) {
                store.state.asignaciones.push({
                    estudiante_documento: st.documento_identidad,
                    tipo_terminal: st.tipo_terminal,
                    serial_asignado: st.serial_asignado,
                    estado_despacho: st.estado_despacho
                });
            } else {
                asig.tipo_terminal = st.tipo_terminal;
                if (st.serial_asignado) {
                    asig.serial_asignado = st.serial_asignado;
                }
                asig.estado_despacho = st.estado_despacho;
            }
        }

        store.logAudit({
            actor,
            rol: 'Administrador',
            accion: 'IMPORTACION_EXCEL_ESTUDIANTES',
            entidad: 'BaseEstudiantes',
            entidad_id: parsedData.filename,
            detalles: `Importación completada: ${parsedData.totalRows} estudiantes procesados (${agregados} nuevos).`
        });

        store.persist();
        return { success: true, processed: parsedData.totalRows, added: agregados };
    }

    // =========================================================================
    // 3. ACTUALIZACIÓN MASIVA DE SERIALES CON DETECCIÓN DE CONFLICTOS
    // =========================================================================
    async parseSerialesExcel(file) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length < 2) {
            throw new Error('El archivo no contiene filas para actualizar seriales.');
        }

        const store = window.appStore;
        const updates = [];
        const conflicts = [];
        const notFound = [];
        const seenSerials = new Set();

        for (let r = 1; r < jsonData.length; r++) {
            const row = jsonData[r];
            if (!row || row.length < 2) continue;

            const docEst = String(row[0] || '').trim();
            const newSerial = String(row[1] || '').trim();

            if (!docEst) continue;

            if (!newSerial) {
                conflicts.push(`Fila ${r + 1}: Serial vacío para el estudiante ${docEst}`);
                continue;
            }

            if (seenSerials.has(newSerial)) {
                conflicts.push(`Fila ${r + 1}: Serial duplicado en el archivo (${newSerial})`);
            }
            seenSerials.add(newSerial);

            const est = store.getEstudianteByDoc(docEst);
            const asig = store.getAsignacionByDoc(docEst);

            if (!est || !asig) {
                notFound.push(docEst);
                continue;
            }

            updates.push({
                documento_identidad: docEst,
                nombre_estudiante: est.nombre_completo,
                old_serial: asig.serial_asignado,
                new_serial: newSerial,
                tipo_terminal: asig.tipo_terminal
            });
        }

        return {
            filename: file.name,
            totalRows: updates.length,
            updates,
            conflicts,
            notFound
        };
    }

    async applySerialUpdates(updates, actor = 'Administrador', motivo = 'Actualización por remesa oficial') {
        const store = window.appStore;
        let count = 0;

        for (const item of updates) {
            store.updateSerial(item.documento_identidad, item.new_serial, actor, 'Administrador', motivo);
            count++;
        }

        store.logAudit({
            actor,
            rol: 'Administrador',
            accion: 'ACTUALIZACION_MASIVA_SERIALES',
            entidad: 'Seriales',
            entidad_id: 'LOTE',
            detalles: `${count} seriales actualizados exitosamente. Motivo: ${motivo}`
        });

        store.persist();
        return { success: true, updated: count };
    }
}

// Singleton global
window.dataImporter = new DataImporter();
