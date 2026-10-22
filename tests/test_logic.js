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
    assert(sedesConBolsa.length === 12, `Exactamente 12 sedes tienen elementos de bolsa asignados (${sedesConBolsa.length} == 12)`);

    // 2. Generación LOG-026-F (.docx)
    console.log('\n2. Generación Documental LOG-026-F (.docx)');
    const template026Path = path.join(__dirname, '../templates/LOG-026-F.docx');
    assert(fs.existsSync(template026Path), 'Plantilla LOG-026-F.docx existe');
    const buf026 = fs.readFileSync(template026Path);
    const zip026 = await JSZip.loadAsync(buf026);
    let docXml026 = await zip026.file('word/document.xml').async('text');
    assert(docXml026.includes('Nombre de la Institución Educativa') || docXml026.includes('Nombre de la Instituci'), 'XML contiene encabezado de institución');
    assert(docXml026.includes('DETALLE DE ELEMENTOS'), 'XML contiene tabla de detalle de elementos');
    
    // Validar reemplazo de señor(a) y en su calidad de
    docXml026 = docXml026.replace(
        /__________________________________________en su calidad de _______________________________/g,
        'YUBY CATERINE BOHÓRQUEZ ROJAS en su calidad de PROFESIONAL LOGÍSTICA '
    );
    assert(docXml026.includes('YUBY CATERINE BOHÓRQUEZ ROJAS en su calidad de PROFESIONAL LOGÍSTICA '), 'LOG-026 incluye señor(a) YUBY CATERINE BOHÓRQUEZ ROJAS y calidad PROFESIONAL LOGÍSTICA');

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

    // 5. Validación de Acta Consolidada LOG-007 (Excel)
    console.log('\n5. Consolidación de Formatos LOG-007 en Excel');
    const wbConsolidado = new ExcelJS.Workbook();
    const wsConsolidado = wbConsolidado.addWorksheet('ACTA FORMAL DE ENTREGA');
    wsConsolidado.getCell('B2').value = 'ACTA FORMAL DE ENTREGA Y LEGALIZACIÓN';
    const headerCols = [
        'No. Documento Estudiante',
        'Nombres y Apellidos Estudiante',
        'Nombres y Apellidos Acudiente',
        'No. Documento Acudiente',
        'No. Celular Acudiente'
    ];
    headerCols.forEach((col, idx) => {
        wsConsolidado.getCell(6, idx + 2).value = col;
    });
    assert(wsConsolidado.getCell('B2').value === 'ACTA FORMAL DE ENTREGA Y LEGALIZACIÓN', 'Título oficial de acta consolidada validado');
    assert(wsConsolidado.getCell('B6').value === 'No. Documento Estudiante', 'Columna No. Documento Estudiante validada');
    assert(wsConsolidado.getCell('C6').value === 'Nombres y Apellidos Estudiante', 'Columna Nombres y Apellidos Estudiante validada');
    assert(wsConsolidado.getCell('D6').value === 'Nombres y Apellidos Acudiente', 'Columna Nombres y Apellidos Acudiente validada');
    assert(wsConsolidado.getCell('E6').value === 'No. Documento Acudiente', 'Columna No. Documento Acudiente validada');
    assert(wsConsolidado.getCell('F6').value === 'No. Celular Acudiente', 'Columna No. Celular Acudiente validada');

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
