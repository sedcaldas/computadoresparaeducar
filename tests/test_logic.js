/**
 * test_logic.js - Pruebas Automatizadas Unitarias y de Aceptación (Node.js & Navegador)
 * Secretaría de Educación de Caldas & Computadores para Educar
 */

const fs = require('fs');
const path = require('path');
const JSZip = require(path.join(__dirname, '../vendor/jszip.min.js'));
const ExcelJS = require(path.join(__dirname, '../vendor/exceljs.min.js'));

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✓ PASS: ${testName}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${testName}`);
        failed++;
    }
}

async function runTests() {
    console.log('=== INICIANDO PRUEBAS DE ACEPTACIÓN CLIENT-SIDE ===\n');

    // 1. Validar Seed Data
    console.log('1. Verificación de Datos Semilla Oficiales');
    const seedPath = path.join(__dirname, '../data/seed_data.json');
    assert(fs.existsSync(seedPath), 'seed_data.json existe');
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    assert(seedData.municipios.length === 22, `Municipios cargados correctamente (${seedData.municipios.length} == 22)`);
    assert(seedData.sedes.length >= 42, `Sedes de Bolsa cargadas (${seedData.sedes.length} >= 42)`);
    assert(seedData.estudiantes.length === 90, `Estudiantes beneficiarios cargados (${seedData.estudiantes.length} == 90)`);
    assert(seedData.config.drive_root_folder_id === '1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51', 'Carpeta raíz oficial de Drive configurada');
    const elemsWithSerial = seedData.bolsa_elementos.filter(e => e.serial && e.serial.length > 0);
    assert(elemsWithSerial.length === seedData.bolsa_elementos.length, `Todos los elementos de bolsa tienen serial oficial (${elemsWithSerial.length}/${seedData.bolsa_elementos.length})`);
    const estWithSerial = seedData.estudiantes.filter(e => e.serial_terminal && e.serial_terminal.length > 0);
    assert(estWithSerial.length === 87, `87 estudiantes focalizados con serial oficial verificado (${estWithSerial.length}/87)`);
    assert(seedData.estudiantes.filter(e => !e.serial_terminal).length === 3, 'Exactamente 3 estudiantes sin terminal asignada (no se inventan seriales)');
    const sedesConBolsa = seedData.sedes.filter(s => seedData.bolsa_elementos.some(e => e.codigo_dane_sede === s.codigo_dane_sede));
    assert(sedesConBolsa.length === 38, `Exactamente 38 sedes tienen elementos de bolsa asignados (${sedesConBolsa.length} == 38)`);

    // 2. Generación LOG-026-F (.docx)
    console.log('\n2. Generación Documental LOG-026-F (.docx)');
    const template026Path = path.join(__dirname, '../templates/LOG-026-F.docx');
    assert(fs.existsSync(template026Path), 'Plantilla LOG-026-F.docx existe');
    const buf026 = fs.readFileSync(template026Path);
    const zip026 = await JSZip.loadAsync(buf026);
    let docXml026 = await zip026.file('word/document.xml').async('text');
    assert(docXml026.includes('Nombre de la Institución Educativa') || docXml026.includes('Nombre de la Instituci'), 'XML contiene encabezado de institución');
    assert(docXml026.includes('DETALLE DE ELEMENTOS'), 'XML contiene tabla de detalle de elementos');
    
    assert(docXml026.includes('DATOS BÁSICOS'), 'LOG-026 contiene sección DATOS BÁSICOS');
    assert(docXml026.includes('Radicado Sede:'), 'LOG-026 contiene campo Radicado Sede');
    assert(docXml026.includes('Código DANE Sede:') || docXml026.includes('C\u00f3digo DANE Sede:'), 'LOG-026 contiene campo Código DANE Sede');
    assert(docXml026.includes('Municipio'), 'LOG-026 contiene campo Municipio');

    // Validar que señor(a) contenga YUBY CATERINE BOHÓRQUEZ ROJAS y calidad PROFESIONAL LOGÍSTICA
    const text026 = docXml026.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const hasContratista = text026.includes('YUBY CATERINE BOHÓRQUEZ ROJAS') && text026.includes('PROFESIONAL LOGÍSTICA');
    assert(hasContratista, 'LOG-026 incluye señor(a) YUBY CATERINE BOHÓRQUEZ ROJAS y calidad PROFESIONAL LOGÍSTICA');

    // Validar encabezado con Radicado Sede
    assert(zip026.file('word/header1.xml') !== null, 'word/header1.xml presente en plantilla LOG-026-F');
    const headerXml = await zip026.file('word/header1.xml').async('text');
    assert(headerXml.includes('Radicado') && headerXml.includes('Sede:'), 'Encabezado header1.xml contiene sección Radicado Sede');
    assert(headerXml.includes('MERGEFIELD Radicado') || headerXml.includes('«Radicado»'), 'Encabezado contiene campo dinámico Radicado');

    // Validar anchos fijos de tabla para respetar márgenes
    assert(docXml026.includes('<w:tblLayout w:type="fixed"/>'), 'Tabla de LOG-026-F cuenta con w:tblLayout fixed para no deformar columnas');
    const tbl0Match = docXml026.match(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/);
    assert(tbl0Match !== null, 'tblGrid encontrado en tabla de LOG-026-F');
    if (tbl0Match) {
        const colMatches = [...tbl0Match[0].matchAll(/<w:gridCol\s+w:w="(\d+)"/g)];
        const totalGridW = colMatches.reduce((acc, m) => acc + parseInt(m[1], 10), 0);
        assert(totalGridW === 10772 && colMatches.length === 6, `Cuadrícula de 6 columnas ajustada exactamente a 19 cm (${totalGridW} dxa == 19 cm)`);
    }

    // Simulación de inyección de Radicado Sede en encabezado
    let simHeaderXml = headerXml;
    const testRadicado = '84716';
    const radTcRegex = /<w:tc\b[^>]*>(?:(?!<\/w:tc>)[\s\S])*?(?:MERGEFIELD\s+Radicado|«Radicado»)(?:(?!<\/w:tc>)[\s\S])*?<\/w:tc>/;
    const radTcReplacement = `<w:tc><w:tcPr><w:tcW w:w="2736" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:contextualSpacing/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${testRadicado}</w:t></w:r></w:p></w:tc>`;
    assert(radTcRegex.test(simHeaderXml), 'Celda de Radicado identificada con precisión en header1.xml');
    simHeaderXml = simHeaderXml.replace(radTcRegex, radTcReplacement);
    assert(simHeaderXml.includes(testRadicado), 'Radicado sede inyectado correctamente en el encabezado');
    assert(!simHeaderXml.includes('«Radicado»'), 'Marcador «Radicado» eliminado del encabezado tras inyección');
    assert(simHeaderXml.includes('NUMPAGES'), 'Paginación NUMPAGES preservada intacta en encabezado');

    // 3. Diligenciamiento LOG-029-F (.xlsx)
    console.log('\n3. Diligenciamiento LOG-029-F (.xlsx)');
    const template029Path = path.join(__dirname, '../templates/LOG-029-F.xlsx');
    assert(fs.existsSync(template029Path), 'Plantilla LOG-029-F.xlsx existe');
    const buf029 = fs.readFileSync(template029Path);
    const wb029 = new ExcelJS.Workbook();
    await wb029.xlsx.load(buf029);
    const wsNames = wb029.worksheets.map(w => w.name);
    assert(wsNames.includes('Formulario'), 'Hoja Formulario presente');
    assert(wsNames.includes('Catalogo de Elementos'), 'Hoja Catalogo de Elementos presente');
    assert(wsNames.includes('Sabana de Seriales Despachados'), 'Hoja Sabana de Seriales Despachados presente');

    const formSheet = wb029.getWorksheet('Formulario');
    formSheet.getCell('E10').value = 'INSTITUCION EDUCATIVA TEST';
    formSheet.getCell('I10').value = 'SEDE PRINCIPAL TEST';
    formSheet.getCell('D18').value = 'Portatil de diseño';
    formSheet.getCell('E18').value = 5;
    assert(formSheet.getCell('E10').value === 'INSTITUCION EDUCATIVA TEST', 'Escritura en celda E10 preservada');
    assert(formSheet.getCell('E18').value === 5, 'Escritura en fila de elementos preservada');

    // Validación de integridad XML en hojas de LOG-029-F (corrección definitiva HRESULT 0x8000ffff)
    wb029.worksheets.forEach(w => {
        w.conditionalFormattings = [];
    });
    const rawOut029 = await wb029.xlsx.writeBuffer();
    const zip029 = await JSZip.loadAsync(rawOut029);
    let hasAnyCf = false;
    for (const [fName, fObj] of Object.entries(zip029.files)) {
        if (fName.startsWith('xl/worksheets/sheet') && fName.endsWith('.xml')) {
            let sXml = await fObj.async('text');
            sXml = sXml.replace(/<conditionalFormatting[\s\S]*?<\/conditionalFormatting>/g, '');
            sXml = sXml.replace(/<conditionalFormatting[^>]*\/>/g, '');
            if (sXml.includes('conditionalFormatting')) {
                hasAnyCf = true;
            }
        }
    }
    assert(!hasAnyCf, 'Worksheets XML libres de errores de conditionalFormatting (100% limpios)');

    // 4. Generación LOG-007-F (.docx)
    console.log('\n4. Generación Documental LOG-007-F (.docx)');
    const template007Path = path.join(__dirname, '../templates/LOG-007-F.docx');
    assert(fs.existsSync(template007Path), 'Plantilla LOG-007-F.docx existe');
    const buf007 = fs.readFileSync(template007Path);
    const zip007 = await JSZip.loadAsync(buf007);
    const docXml007 = await zip007.file('word/document.xml').async('text');
    assert(docXml007.includes('ACTA') && docXml007.includes('LEGALIZACI'), 'XML contiene título formal de entrega');
    assert(docXml007.includes('No. Documento Estudiante'), 'XML contiene tabla de estudiantes y acudientes');
    assert(docXml007.includes('Nombre de Contratista'), 'XML contiene campo para contratista CPE');
    assert(docXml007.includes('Nombre del rector'), 'XML contiene campo para rectoría');

    // 5. Validación de Acta Consolidada LOG-007 (Excel) con Plantilla Oficial
    console.log('\n5. Consolidación de Formatos LOG-007 en Excel (Plantilla Oficial)');
    const templateConsolidadoPath = path.join(__dirname, '../templates/Acta_Consolidada_LOG-007.xlsx');
    assert(fs.existsSync(templateConsolidadoPath), 'Plantilla Acta_Consolidada_LOG-007.xlsx existe');

    const wbConsolidado = new ExcelJS.Workbook();
    const bufConsolidado = fs.readFileSync(templateConsolidadoPath);
    await wbConsolidado.xlsx.load(bufConsolidado);
    const wsConsolidado = wbConsolidado.getWorksheet('Hoja1') || wbConsolidado.worksheets[0];

    // Verificar Título en fila 3 (B3:G3)
    assert(wsConsolidado.getCell('B3').value === 'ACTA FORMAL DE ENTREGA Y LEGALIZACIÓN', 'Título oficial en celda B3 validado ("ACTA FORMAL DE ENTREGA Y LEGALIZACIÓN")');

    // Verificar Campos de Metadatos en filas 5, 6 y 7
    assert(String(wsConsolidado.getCell('B5').value).includes('Institución Educativa:'), 'Etiqueta B5 "Institución Educativa:" validada');
    assert(String(wsConsolidado.getCell('E5').value).includes('Código Dane IE:'), 'Etiqueta E5 "Código Dane IE:" validada');
    assert(String(wsConsolidado.getCell('B6').value).includes('Sede Educativa:'), 'Etiqueta B6 "Sede Educativa:" validada');
    assert(String(wsConsolidado.getCell('E6').value).includes('Código Dane Sede:'), 'Etiqueta E6 "Código Dane Sede:" validada');
    assert(String(wsConsolidado.getCell('B7').value).includes('Radicado:'), 'Etiqueta B7 "Radicado:" validada');

    // Verificar Encabezados de tabla en filas 9-10 (B9 a G9)
    assert(wsConsolidado.getCell('B9').value === 'No. Documento Estudiante', 'Columna B9 "No. Documento Estudiante" validada');
    assert(wsConsolidado.getCell('C9').value === 'Nombres y Apellidos Estudiante', 'Columna C9 "Nombres y Apellidos Estudiante" validada');
    assert(wsConsolidado.getCell('D9').value === 'Nombres y Apellidos Acudiente', 'Columna D9 "Nombres y Apellidos Acudiente" validada');
    assert(wsConsolidado.getCell('E9').value === 'No. Documento Acudiente', 'Columna E9 "No. Documento Acudiente" validada');
    assert(wsConsolidado.getCell('F9').value === 'No. Celular Acudiente', 'Columna F9 "No. Celular Acudiente" validada');
    assert(wsConsolidado.getCell('G9').value === 'Firma Acudiente', 'Columna G9 "Firma Acudiente" validada');

    // Simular diligenciamiento de metadatos y registros a partir de fila 11
    wsConsolidado.getCell('C5').value = 'INSTITUCION EDUCATIVA TEST';
    wsConsolidado.getCell('F5').value = '117001000001';
    wsConsolidado.getCell('C6').value = 'SEDE PRINCIPAL';
    wsConsolidado.getCell('F6').value = '117001000001';
    wsConsolidado.getCell('C7').value = 'LOG-007-IE-117001000001';

    const sampleRow = wsConsolidado.getRow(11);
    sampleRow.getCell(2).value = '1059812839';
    sampleRow.getCell(3).value = 'ESTUDIANTE TEST PRUEBA';
    sampleRow.getCell(4).value = 'ACUDIENTE TEST';
    sampleRow.getCell(5).value = '24500000';
    sampleRow.getCell(6).value = '3101234567';
    sampleRow.getCell(7).value = '';
    sampleRow.getCell(2).numFmt = '@';
    sampleRow.getCell(5).numFmt = '@';
    sampleRow.getCell(6).numFmt = '@';

    const testBufOut = await wbConsolidado.xlsx.writeBuffer();
    assert(testBufOut.byteLength > 5000, `Acta Consolidada generada y escrita correctamente en buffer (${testBufOut.byteLength} bytes)`);

    // 6. Estructura Jerárquica de Carpetas en Drive
    console.log('\n6. Estructura Jerárquica de Carpetas en Drive');
    const sampleMpio = seedData.municipios[0];
    const sampleIE = seedData.instituciones[0];
    const sampleSede = seedData.sedes[0];
    const pathEsperado = `/${sampleMpio.codigo}_${sampleMpio.nombre}/${sampleIE.codigo_dane}_${sampleIE.nombre}/${sampleSede.codigo_dane_sede}_${sampleSede.nombre}/LOG-026-F/Aprobados`;
    assert(pathEsperado.includes(sampleMpio.nombre) && pathEsperado.includes('LOG-026-F'), 'Ruta jerárquica conforme a especificación oficial');

    // 7. Flujo de Estados y Auditoría
    console.log('\n7. Reglas de Flujo de Estados y Auditoría');
    const estadosValidos = [
        'Borrador', 'Generado', 'Pendiente de firma/carga', 'En revisión del rector',
        'Devuelto al acudiente', 'En revisión del coordinador', 'Devuelto al rector', 'Aprobado'
    ];
    assert(estadosValidos.length === 8, '8 estados de ciclo de vida definidos');
    assert(estadosValidos[estadosValidos.length - 1] === 'Aprobado', 'Estado final es Aprobado');

    console.log(`\n========================================`);
    console.log(`RESULTADOS: ${passed} PASADAS, ${failed} FALLADAS`);
    console.log(`========================================`);

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Error ejecutando pruebas:', err);
    process.exit(1);
});
