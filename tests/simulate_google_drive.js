/**
 * simulate_google_drive.js
 * Simulación y Verificación End-to-End del Registro de Información en Google Drive API v3
 * Carpeta Raíz Oficial: 1sCwul3GdqXtAwTsMP1EZHaeD3Zx190RW
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Cargar librerías y componentes
const JSZip = require(path.join(__dirname, '../vendor/jszip.min.js'));
const ExcelJS = require(path.join(__dirname, '../vendor/exceljs.min.js'));

// Mock del entorno DOM mínimo para que las clases cliente funcionen en Node
global.window = global;
global.JSZip = JSZip;
global.ExcelJS = ExcelJS;
global.Blob = class MockBlob {
    constructor(parts = [], options = {}) {
        this.parts = parts;
        this.type = options.type || '';
        let total = 0;
        for (const p of parts) {
            if (typeof p === 'string') total += Buffer.byteLength(p, 'utf8');
            else if (Buffer.isBuffer(p)) total += p.length;
            else if (p instanceof Uint8Array) total += p.byteLength;
            else if (p instanceof ArrayBuffer) total += p.byteLength;
        }
        this.size = total;
    }
    async arrayBuffer() {
        const bufs = this.parts.map(p => {
            if (typeof p === 'string') return Buffer.from(p, 'utf8');
            if (Buffer.isBuffer(p)) return p;
            if (p instanceof Uint8Array) return Buffer.from(p.buffer, p.byteOffset, p.byteLength);
            if (p instanceof ArrayBuffer) return Buffer.from(p);
            return Buffer.from(String(p));
        });
        const combined = Buffer.concat(bufs);
        return combined.buffer.slice(combined.byteOffset, combined.byteOffset + combined.byteLength);
    }
    async text() {
        const ab = await this.arrayBuffer();
        return Buffer.from(ab).toString('utf8');
    }
};

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Simulación de IndexedDB en memoria
class MemoryStore {
    constructor() {
        this.blobs = new Map();
    }
    async saveBlob(key, blob, filename, mimeType) {
        this.blobs.set(key, { key, blob, filename, mimeType, timestamp: Date.now() });
    }
    async getBlob(key) {
        return this.blobs.get(key) || null;
    }
    async clearBlobs() {
        this.blobs.clear();
    }
}

// 2. Mock del Servidor Google Drive API v3
class VirtualGoogleDriveServer {
    constructor(rootId) {
        this.rootId = rootId;
        this.files = new Map(); // id -> file object
        this.nextId = 1000;

        // Crear carpeta raíz oficial
        this.files.set(rootId, {
            id: rootId,
            name: 'Bolsa_Tecnologica_Caldas',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
            capabilities: { canAddChildren: true }
        });
    }

    createFolder(parentFolderId, name) {
        // Verificar si ya existe bajo ese padre
        for (const f of this.files.values()) {
            if (f.parents.includes(parentFolderId) && f.name === name && f.mimeType === 'application/vnd.google-apps.folder' && !f.trashed) {
                return f;
            }
        }
        const id = 'GDRIVE_DIR_' + (++this.nextId);
        const folder = {
            id,
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
            trashed: false,
            createdAt: new Date().toISOString()
        };
        this.files.set(id, folder);
        return folder;
    }

    uploadMultipart(folderId, metadata, contentBuffer, mimeType) {
        const id = 'GDRIVE_FILE_' + (++this.nextId);
        const file = {
            id,
            name: metadata.name,
            mimeType: mimeType || metadata.mimeType,
            parents: [folderId],
            description: metadata.description || '',
            size: contentBuffer.length,
            content: contentBuffer,
            webViewLink: `https://drive.google.com/file/d/${id}/view`,
            trashed: false,
            version: 1,
            updatedAt: new Date().toISOString()
        };
        this.files.set(id, file);
        return file;
    }

    patchMedia(fileId, contentBuffer, mimeType) {
        const file = this.files.get(fileId);
        if (!file) throw new Error(`Archivo ${fileId} no encontrado en Google Drive`);
        file.content = contentBuffer;
        file.size = contentBuffer.length;
        file.version = (file.version || 1) + 1;
        file.updatedAt = new Date().toISOString();
        if (mimeType) file.mimeType = mimeType;
        return file;
    }

    getTree(folderId = this.rootId, prefix = '') {
        const results = [];
        for (const f of this.files.values()) {
            if (f.parents.includes(folderId) && !f.trashed) {
                const isDir = f.mimeType === 'application/vnd.google-apps.folder';
                results.push({
                    path: `${prefix}/${f.name}`,
                    id: f.id,
                    isDir,
                    mimeType: f.mimeType,
                    size: f.size || 0,
                    version: f.version || 1
                });
                if (isDir) {
                    results.push(...this.getTree(f.id, `${prefix}/${f.name}`));
                }
            }
        }
        return results;
    }
}

// 3. Ejecutar simulación paso a paso
async function runSimulation() {
    console.log('========================================================================');
    console.log('SIMULACIÓN DE REGISTRO Y SINCRONIZACIÓN EN GOOGLE DRIVE API v3');
    console.log('Carpeta Raíz Configurada: 1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51');
    console.log('========================================================================\n');

    const ROOT_FOLDER_ID = '1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51';
    const driveServer = new VirtualGoogleDriveServer(ROOT_FOLDER_ID);

    // Mock global de fetch para interceptar las llamadas del cliente GoogleDriveClient
    global.fetch = async (url, options = {}) => {
        const u = new URL(url);
        const headers = options.headers || {};
        const method = options.method || 'GET';

        // 1. Verificación de permisos y about
        if (u.pathname === '/drive/v3/about') {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    user: { displayName: 'Coordinador CPE Caldas', emailAddress: 'coordinador.cpe@sedcaldas.gov.co' }
                })
            };
        }

        // 2. Consulta de carpeta raíz
        if (u.pathname === `/drive/v3/files/${ROOT_FOLDER_ID}`) {
            const root = driveServer.files.get(ROOT_FOLDER_ID);
            return {
                ok: true,
                status: 200,
                json: async () => root
            };
        }

        // 3. Búsqueda de carpetas (Query)
        if (u.pathname === '/drive/v3/files' && method === 'GET') {
            const q = u.searchParams.get('q') || '';
            const matchParent = q.match(/'([^']+)' in parents/);
            const matchName = q.match(/name = '([^']+)'/);
            if (matchParent && matchName) {
                const parentId = matchParent[1];
                const name = matchName[1].replace(/\\'/g, "'");
                const found = [];
                for (const f of driveServer.files.values()) {
                    if (f.parents.includes(parentId) && f.name === name && !f.trashed) {
                        found.push({ id: f.id, name: f.name });
                    }
                }
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ files: found })
                };
            }
            return { ok: true, status: 200, json: async () => ({ files: [] }) };
        }

        // 4. Creación de carpetas (POST /drive/v3/files)
        if (u.pathname === '/drive/v3/files' && method === 'POST') {
            const body = JSON.parse(options.body);
            const parentId = body.parents[0];
            const folder = driveServer.createFolder(parentId, body.name);
            return {
                ok: true,
                status: 200,
                json: async () => folder
            };
        }

        // 5. Subida Multipart (POST /upload/drive/v3/files?uploadType=multipart)
        if (u.pathname === '/upload/drive/v3/files' && u.searchParams.get('uploadType') === 'multipart') {
            const bodyBytes = options.body;
            const bodyBuf = Buffer.isBuffer(bodyBytes) ? bodyBytes : Buffer.from(bodyBytes.buffer, bodyBytes.byteOffset, bodyBytes.byteLength);
            const bodyStr = bodyBuf.toString('binary');

            // Extraer JSON de metadatos
            const jsonStart = bodyStr.indexOf('{');
            const jsonEnd = bodyStr.indexOf('}\r\n') + 1;
            const metaStr = bodyStr.substring(jsonStart, jsonEnd);
            const metadata = JSON.parse(metaStr);

            // Extraer binario del archivo
            const headerMarker = 'Content-Transfer-Encoding: binary\r\n\r\n';
            const binStart = bodyStr.indexOf(headerMarker) + headerMarker.length;
            const lastBoundary = bodyStr.lastIndexOf('\r\n--');
            const fileData = bodyBuf.slice(binStart, lastBoundary);

            const file = driveServer.uploadMultipart(metadata.parents[0], metadata, fileData, metadata.mimeType);
            return {
                ok: true,
                status: 200,
                json: async () => ({ id: file.id, name: file.name, webViewLink: file.webViewLink })
            };
        }

        // 6. Actualización Patch (PATCH /upload/drive/v3/files/{id}?uploadType=media)
        if (u.pathname.startsWith('/upload/drive/v3/files/') && method === 'PATCH') {
            const fileId = u.pathname.replace('/upload/drive/v3/files/', '');
            const bodyBytes = options.body;
            let bodyBuf;
            if (Buffer.isBuffer(bodyBytes)) bodyBuf = bodyBytes;
            else if (bodyBytes instanceof ArrayBuffer) bodyBuf = Buffer.from(bodyBytes);
            else if (bodyBytes?.buffer instanceof ArrayBuffer) bodyBuf = Buffer.from(bodyBytes.buffer, bodyBytes.byteOffset, bodyBytes.byteLength);
            else bodyBuf = Buffer.from(bodyBytes || '');
            const mimeType = headers['Content-Type'];
            const file = driveServer.patchMedia(fileId, bodyBuf, mimeType);
            return {
                ok: true,
                status: 200,
                json: async () => ({ id: file.id, name: file.name, webViewLink: file.webViewLink })
            };
        }

        // 7. Descarga (GET /drive/v3/files/{id}?alt=media)
        if (u.pathname.startsWith('/drive/v3/files/') && u.searchParams.get('alt') === 'media') {
            const fileId = u.pathname.replace('/drive/v3/files/', '');
            const file = driveServer.files.get(fileId);
            if (!file) return { ok: false, status: 404, statusText: 'Not Found' };
            return {
                ok: true,
                status: 200,
                blob: async () => new global.Blob([file.content], { type: file.mimeType })
            };
        }

        return { ok: false, status: 404, statusText: 'Mock endpoint not handled: ' + url };
    };

    // 4. Instanciar clases del sistema
    const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/seed_data.json'), 'utf8'));

    // Cargar clases reales del proyecto
    const storeCode = fs.readFileSync(path.join(__dirname, '../js/store.js'), 'utf8');
    const driveCode = fs.readFileSync(path.join(__dirname, '../js/drive.js'), 'utf8');
    const workflowCode = fs.readFileSync(path.join(__dirname, '../js/workflow.js'), 'utf8');
    
    const vm = require('vm');
    vm.runInThisContext(storeCode);
    vm.runInThisContext(driveCode);
    vm.runInThisContext(workflowCode);

    const store = new AppStore();
    window.appStore = store;
    store.state = JSON.parse(JSON.stringify(seedData));
    store.state.documentos = JSON.parse(JSON.stringify(seedData.documentos_pregenerados || []));
    store.state.versiones = [];
    store.state.historial_auditoria = [];
    store.persist = () => {};
    store._memStore = new MemoryStore();
    store.saveBlob = async (k, b, f, m) => store._memStore.saveBlob(k, b, f, m);
    store.getBlob = async (k) => store._memStore.getBlob(k);

    const driveClient = new GoogleDriveClient();
    window.googleDriveClient = driveClient;
    driveClient.setToken('SIMULATED_OAUTH_BEARER_TOKEN_CPE', {
        displayName: 'Coordinador CPE Caldas',
        emailAddress: 'coordinador.cpe@sedcaldas.gov.co'
    });

    const workflow = new ApprovalWorkflowEngine();
    window.approvalWorkflow = workflow;

    // Conexión y diagnóstico
    console.log('PASO 1: Verificación de diagnóstico de Google Drive Client');
    const connTest = await driveClient.testConnection();
    console.log('  -> Estado:', connTest.connected ? 'CONECTADO' : 'DESCONECTADO');
    console.log('  -> Usuario autenticado:', connTest.user?.displayName, `(${connTest.user?.emailAddress})`);
    console.log('  -> Carpeta raíz accesible:', connTest.rootAccessible, `[ID: ${driveClient.rootFolderId}]`);
    assert(connTest.connected === true, 'Conexión a Drive debe ser exitosa');
    assert(driveClient.rootFolderId === ROOT_FOLDER_ID, 'ID raíz debe ser 1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51');

    // PASO 2: Simulación de pregeneración de carpeta jerárquica para una sede de Caldas
    console.log('\nPASO 2: Simulación de creación de jerarquía de carpetas en Google Drive');
    const sampleSede = store.state.sedes.find(s => s.codigo_dane_sede === '217614000723'); // Sede La Amalia
    const sampleIE = store.state.instituciones.find(i => i.codigo_dane === sampleSede.codigo_dane_ie);
    const sampleMpio = store.state.municipios.find(m => String(m.codigo) === String(sampleIE.codigo_municipio));

    console.log(`  -> Municipio: ${sampleMpio.codigo} - ${sampleMpio.nombre}`);
    console.log(`  -> Institución: ${sampleIE.codigo_dane} - ${sampleIE.nombre}`);
    console.log(`  -> Sede: ${sampleSede.codigo_dane_sede} - ${sampleSede.nombre}`);

    // Resolver carpeta de destino para LOG-026-F
    const folderLog026Gen = await driveClient.getTargetFolderForDocument({
        codigo_mpio: sampleMpio.codigo,
        nombre_mpio: sampleMpio.nombre,
        dane_ie: sampleIE.codigo_dane,
        nombre_ie: sampleIE.nombre,
        dane_sede: sampleSede.codigo_dane_sede,
        nombre_sede: sampleSede.nombre,
        tipo_documento: 'LOG-026-F',
        estado: 'Generado'
    });
    console.log('  -> Ruta jerárquica construida para LOG-026-F (Generado):');
    console.log(`     ${folderLog026Gen.relativePath}`);
    assert(folderLog026Gen.relativePath.includes('LOG-026-F/Generados'), 'Ruta debe incluir LOG-026-F/Generados');

    // PASO 3: Subida inicial de documentos a Google Drive
    console.log('\nPASO 3: Simulación de subida de formatos iniciales (LOG-026-F y LOG-029-F)');
    
    // Subir LOG-026-F
    const mockDocxBytes = fs.readFileSync(path.join(__dirname, '../templates/LOG-026-F.docx'));
    const upload026 = await driveClient.uploadFile({
        folderId: folderLog026Gen.folderId,
        filename: `LOG-026-F_${sampleSede.codigo_dane_sede}_v01.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        blob: new global.Blob([mockDocxBytes]),
        description: `Acta LOG-026-F para ${sampleSede.nombre}`
    });
    console.log(`  ✓ LOG-026-F registrado en Drive con ID: ${upload026.id}`);
    console.log(`    Enlace web: ${upload026.webViewLink}`);

    // Subir LOG-029-F en su carpeta respectiva
    const folderLog029Gen = await driveClient.getTargetFolderForDocument({
        codigo_mpio: sampleMpio.codigo,
        nombre_mpio: sampleMpio.nombre,
        dane_ie: sampleIE.codigo_dane,
        nombre_ie: sampleIE.nombre,
        dane_sede: sampleSede.codigo_dane_sede,
        nombre_sede: sampleSede.nombre,
        tipo_documento: 'LOG-029-F',
        estado: 'Generado'
    });
    const mockXlsxBytes = fs.readFileSync(path.join(__dirname, '../templates/LOG-029-F.xlsx'));
    const upload029 = await driveClient.uploadFile({
        folderId: folderLog029Gen.folderId,
        filename: `LOG-029-F_${sampleSede.codigo_dane_sede}_v01.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        blob: new global.Blob([mockXlsxBytes]),
        description: `Informe LOG-029-F para ${sampleSede.nombre}`
    });
    console.log(`  ✓ LOG-029-F registrado en Drive con ID: ${upload029.id}`);

    // PASO 4: Simulación de flujo de aprobación por Rector y Coordinador CPE con actualización en Drive
    console.log('\nPASO 4: Simulación de ciclo de vida documental y sincronización en Google Drive');
    const doc026 = store.getDocumentoById(`DOC-026-${sampleSede.codigo_dane_sede}`) || store.state.documentos[0];
    doc026.drive_id = upload026.id;
    doc026.drive_folder_id = folderLog026Gen.folderId;
    doc026.drive_path = folderLog026Gen.relativePath;

    // Acudiente / Rector radica nueva versión firmada (v02)
    console.log('  -> Radicando versión firmada v02...');
    const signedBlob = new global.Blob(['DOCUMENTO_FIRMADO_ESCANEADO_PDF'], { type: 'application/pdf' });
    await workflow.uploadDocumentOnBehalfOfRector(doc026.id, signedBlob, `LOG-026-F_${sampleSede.codigo_dane_sede}_v02.pdf`, 'Acta firmada formalmente');
    console.log(`     Estado actual: ${doc026.estado} | Versión: v0${doc026.version_actual}`);
    console.log(`     Drive ID asociado: ${doc026.drive_id}`);

    // Coordinador CPE aprueba formalmente
    console.log('  -> Coordinador CPE aprueba formalmente el documento...');
    await workflow.approveDocumentByCoordinador(doc026.id, 'Verificado a satisfacción por CPE');
    console.log(`     Estado final: ${doc026.estado} (Aprobado formalmente)`);
    console.log(`     Última acción registrada por: ${doc026.actor_ultima_accion}`);

    // PASO 5: Registro de Índices Generales y Auditoría en Drive
    console.log('\nPASO 5: Simulación de registro de Índices (/Indices/) y Bitácora (/Historial/) en Drive');
    const syncIndex = await driveClient.syncGeneralIndex({
        fecha_corte: new Date().toISOString(),
        total_expedientes: store.state.documentos.length,
        entidad: 'Secretaría de Educación de Caldas - CPE',
        version_datos: store.state.data_version
    });
    console.log(`  ✓ /Indices/indice_general.json registrado con ID: ${syncIndex.id}`);

    const syncAudit = await driveClient.appendAuditLog({
        id: 'EVT-' + Date.now(),
        fecha: new Date().toISOString(),
        actor: 'Coordinador CPE - Caldas',
        accion: 'APROBACION_FORMAL_CPE',
        documento_id: doc026.id,
        resultado: 'Aprobado satisfactoriamente'
    });
    console.log(`  ✓ /Historial/${syncAudit.name} registrado con ID: ${syncAudit.id}`);

    // PASO 6: Inspección del Árbol Completo Registrado en Google Drive
    console.log('\n========================================================================');
    console.log('VERIFICACIÓN DEL ÁRBOL DE DOCUMENTOS REGISTRADOS EN GOOGLE DRIVE');
    console.log('========================================================================');
    const tree = driveServer.getTree();
    for (const item of tree) {
        const icon = item.isDir ? '📁' : '📄';
        const info = item.isDir ? '' : ` [${(item.size / 1024).toFixed(1)} KB, v${item.version}]`;
        console.log(`  ${icon} ${item.path}${info}`);
    }

    // Verificaciones y aserciones estrictas
    console.log('\n========================================================================');
    console.log('RESULTADO DE VALIDACIONES:');
    console.log('========================================================================');

    assert(tree.some(t => t.path.includes('Indices/indice_general.json')), 'Debe existir /Indices/indice_general.json en Drive');
    console.log('  ✓ PASS: Índice general registrado en /Indices/');

    assert(tree.some(t => t.path.includes('Historial/evento_')), 'Debe existir evento de auditoría en /Historial/ en Drive');
    console.log('  ✓ PASS: Bitácora de auditoría registrada en /Historial/');

    assert(tree.some(t => t.path.includes('LOG-026-F')), 'Debe existir carpeta y archivo LOG-026-F');
    console.log('  ✓ PASS: Formato LOG-026-F (.docx) registrado en su estructura jerárquica');

    assert(tree.some(t => t.path.includes('LOG-029-F')), 'Debe existir carpeta y archivo LOG-029-F');
    console.log('  ✓ PASS: Formato LOG-029-F (.xlsx) registrado en su estructura jerárquica');

    assert(doc026.estado === 'Aprobado', 'Documento debe terminar en estado Aprobado');
    console.log('  ✓ PASS: Estado documental actualizado a "Aprobado"');

    console.log('\n>>> SIMULACIÓN Y VERIFICACIÓN EN GOOGLE DRIVE COMPLETADA CON ÉXITO (100% OK) <<<\n');
}

runSimulation().catch(err => {
    console.error('ERROR EN SIMULACIÓN:', err);
    process.exit(1);
});
