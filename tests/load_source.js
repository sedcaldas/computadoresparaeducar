/**
 * load_source.js - Carga para pruebas en Node la única fuente de datos:
 * SERIALES BOLSA TECNOLOGICA CALDAS.xlsx (mismo lector que usa la aplicación).
 */
const fs = require('fs');
const path = require('path');
const XLSX = require(path.join(__dirname, '../vendor/xlsx.full.min.js'));
const source = require(path.join(__dirname, '../js/seriales-source.js'));

function loadSourceData() {
    const file = path.join(__dirname, '..', source.SOURCE_FILE);
    const buf = fs.readFileSync(file);
    return source.parseWorkbook(XLSX, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
}

module.exports = { loadSourceData, SOURCE_FILE: source.SOURCE_FILE };
