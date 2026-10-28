/**
 * store.js - Almacenamiento en el navegador (Local + IndexedDB + Google Drive Sync)
 * Aplicación de Gestión Documental - Secretaría de Educación de Caldas & Computadores para Educar
 * 
 * Implementación 100% estática para GitHub Pages. No requiere backend ni base de datos externa.
 */

class AppStore {
    constructor() {
        this.STORAGE_PREFIX = 'ceducar_';
        this.dbName = 'ceducar_blobs_db';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;

        this.state = {
            municipios: [],
            instituciones: [],
            sedes: [],
            bolsa_elementos: [],
            estudiantes: [],
            asignaciones: [],
            documentos: [],
            versiones: [],
            historial_auditoria: [],
            config: {
                google_client_id: '145744770636-qt8k12nfam0fmjfkpi66ct0fkq9b9n9j.apps.googleusercontent.com',
                drive_root_folder_id: '1ml8ZDOQOKVJJI6y7EtZiqUaUw-AqAa4l',
                drive_relay_url: '',
                drive_relay_key: '',
                root_folder_name: 'Bolsa_Tecnologica_Caldas',
                scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
                drive_sync: true
            }
        };

        this.listeners = [];
    }

    async init() {
        if (this.isInitialized) return;
        await this._initIndexedDB();
        await this._loadState();
        this.isInitialized = true;
        this._notify();
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    _notify() {
        for (const cb of this.listeners) {
            try { cb(this.state); } catch (e) { console.error('Error en listener del store:', e); }
        }
    }

    // --- IndexedDB para almacenar blobs (archivos generados y firmados) ---
    async _initIndexedDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'key' });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            request.onerror = (event) => {
                console.warn('IndexedDB no disponible, se usará memoria volátil para blobs:', event);
                resolve(null);
            };
        });
    }

    async saveBlob(key, blob, filename, mimeType) {
        if (!this.db) {
            this._memBlobs = this._memBlobs || {};
            this._memBlobs[key] = { key, blob, filename, mimeType, timestamp: Date.now() };
            return;
        }
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['files'], 'readwrite');
            const store = tx.objectStore('files');
            store.put({
                key,
                blob,
                filename,
                mimeType,
                timestamp: Date.now()
            });
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    }

    async getBlob(key) {
        if (!this.db) {
            return this._memBlobs && this._memBlobs[key] ? this._memBlobs[key] : null;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction(['files'], 'readonly');
            const store = tx.objectStore('files');
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }

    async clearBlobs(prefix = null) {
        if (!this.db) {
            if (!prefix) {
                this._memBlobs = {};
            } else if (this._memBlobs) {
                for (const k of Object.keys(this._memBlobs)) {
                    if (k.includes(prefix)) delete this._memBlobs[k];
                }
            }
            return;
        }
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(['files'], 'readwrite');
                const store = tx.objectStore('files');
                if (!prefix) {
                    store.clear();
                    tx.oncomplete = () => resolve();
                } else {
                    const req = store.openCursor();
                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            if (String(cursor.key).includes(prefix)) {
                                cursor.delete();
                            }
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    req.onerror = () => resolve();
                }
            } catch (err) {
                console.warn('Error purgando blobs:', err);
                resolve();
            }
        });
    }

    // --- Carga y persistencia del estado en LocalStorage ---
    // Versión 10: la única fuente de datos es "SERIALES BOLSA TECNOLOGICA CALDAS.xlsx"
    static get DATA_VERSION() { return 10; }

    async _loadState() {
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(this.STORAGE_PREFIX + 'state') || 'null');
        } catch (e) {
            console.error('Error parseando datos guardados en LocalStorage:', e);
        }
        if (saved && saved.data_version === AppStore.DATA_VERSION && saved.documentos && saved.documentos.length) {
            const defaultFolder = this.state.config.drive_root_folder_id;
            this.state = Object.assign(this.state, saved);
            // La carpeta raíz de Drive la define el código (no la copia guardada en el navegador)
            if (this.state.config) this.state.config.drive_root_folder_id = defaultFolder;
            // Si el archivo Excel cambió, actualizar la base conservando el trabajo hecho en los formatos
            await this.syncFromSource();
            return;
        }
        if (saved) await this.clearBlobs();
        await this.loadSeedData();
    }

    async _readSource() {
        const src = window.serialesSource;
        const isTest = window.location && window.location.pathname.includes('/tests/');
        const buffer = await src.fetchBuffer(isTest ? '../' : './');
        return src.parseWorkbook(XLSX, buffer);
    }

    _applyCatalog(data) {
        this.state.municipios = data.municipios;
        this.state.instituciones = data.instituciones;
        this.state.sedes = data.sedes;
        this.state.bolsa_elementos = data.bolsa_elementos;
        this.state.estudiantes = data.estudiantes;
        this.state.asignaciones = data.asignaciones;
        this.state.fuente = data.fuente;
        this.state.data_version = AppStore.DATA_VERSION;
        this.sourceError = null;
    }

    // Carga completa desde el Excel (reinicia formatos, versiones y bitácora)
    async loadSeedData() {
        try {
            const data = await this._readSource();
            this._applyCatalog(data);
            this.state.documentos = data.documentos_pregenerados;
            this.state.versiones = [];
            this.state.historial_auditoria = [];
            this.logAudit({
                actor: 'Sistema',
                rol: 'Sistema',
                accion: 'INICIALIZACION_DATOS',
                entidad: 'Sistema',
                entidad_id: data.fuente.archivo,
                detalles: `Base cargada desde ${data.fuente.archivo}: ${data.sedes.length} sedes, ${data.estudiantes.length} estudiantes, ${data.bolsa_elementos.length} elementos de bolsa, ${data.documentos_pregenerados.length} formatos pregenerados.` +
                    (data.fuente.advertencias.length ? ` Advertencias: ${data.fuente.advertencias.length}.` : '')
            });
            this.persist();
        } catch (e) {
            this.sourceError = e.message;
            console.error('No se pudo cargar el archivo fuente de seriales:', e);
        }
    }

    // Relee el Excel; si cambió, actualiza la base y agrega formatos nuevos sin perder los ya trabajados.
    // Devuelve true si hubo cambios.
    async syncFromSource(force = false) {
        let data;
        try {
            data = await this._readSource();
        } catch (e) {
            this.sourceError = e.message;
            console.error('No se pudo leer el archivo fuente de seriales:', e);
            return false;
        }
        if (!force && this.state.fuente && this.state.fuente.firma === data.fuente.firma) {
            this.sourceError = null;
            return false;
        }
        this._applyCatalog(data);
        const existing = new Map(this.state.documentos.map(d => [d.id, d]));
        const merged = [];
        let nuevos = 0;
        for (const doc of data.documentos_pregenerados) {
            if (existing.has(doc.id)) {
                merged.push(Object.assign(existing.get(doc.id), { radicado: doc.radicado, codigo_dane_sede: doc.codigo_dane_sede }));
                existing.delete(doc.id);
            } else {
                merged.push(doc);
                nuevos++;
            }
        }
        // Formatos que ya no están en el Excel: se conservan solo si tienen trabajo (versiones o cambio de estado)
        for (const doc of existing.values()) {
            if (doc.version_actual > 1 || doc.estado !== 'Generado') merged.push(doc);
        }
        this.state.documentos = merged;
        this.logAudit({
            actor: 'Sistema',
            rol: 'Sistema',
            accion: 'ACTUALIZACION_FUENTE_EXCEL',
            entidad: 'Sistema',
            entidad_id: data.fuente.archivo,
            detalles: `Se detectó una nueva versión de ${data.fuente.archivo}: ${data.sedes.length} sedes, ${data.estudiantes.length} estudiantes, ${data.bolsa_elementos.length} elementos de bolsa. Formatos nuevos: ${nuevos}.`
        });
        this.persist();
        return true;
    }

    persist() {
        try {
            localStorage.setItem(this.STORAGE_PREFIX + 'state', JSON.stringify({
                data_version: this.state.data_version,
                fuente: this.state.fuente,
                municipios: this.state.municipios,
                instituciones: this.state.instituciones,
                sedes: this.state.sedes,
                bolsa_elementos: this.state.bolsa_elementos,
                estudiantes: this.state.estudiantes,
                asignaciones: this.state.asignaciones,
                documentos: this.state.documentos,
                versiones: this.state.versiones,
                historial_auditoria: this.state.historial_auditoria,
                config: this.state.config
            }));
            this._notify();
            // Toda modificación del estado se refleja en /Indices/indice_general.json de la carpeta compartida
            if (typeof window !== 'undefined' && window.googleDriveClient) {
                window.googleDriveClient.scheduleIndexSync(() => this.getIndexSnapshot());
            }
        } catch (e) {
            console.error('Error persistiendo estado en LocalStorage:', e);
        }
    }

    // --- Auditoría / Bitácora ---
    logAudit({ actor = 'Usuario', rol = 'Invitado', accion = 'ACCION', entidad = '', entidad_id = '', detalles = '', version = 1 }) {
        const entry = {
            id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            timestamp: new Date().toISOString(),
            actor,
            rol,
            accion,
            entidad,
            entidad_id: String(entidad_id),
            detalles,
            version
        };
        this.state.historial_auditoria.unshift(entry);
        if (this.state.historial_auditoria.length > 500) {
            this.state.historial_auditoria.pop();
        }
        this.persist();
        // Cada acción queda registrada en la bitácora de /Historial/ en la carpeta compartida
        if (typeof window !== 'undefined' && window.googleDriveClient) {
            window.googleDriveClient.appendAuditLog(entry);
        }
        return entry;
    }

    getIndexSnapshot() {
        return {
            sedes: this.state.sedes,
            estudiantes: this.state.estudiantes,
            asignaciones: this.state.asignaciones,
            bolsa_elementos: this.state.bolsa_elementos,
            documentos: this.state.documentos,
            versiones: this.state.versiones
        };
    }

    getAuditoria(limit = 100) {
        return this.state.historial_auditoria.slice(0, limit);
    }

    // --- Consultas del Modelo de Datos (Instituciones en orden ascendente y filtrables) ---
    getMunicipios() {
        return this.state.municipios.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    }

    getInstituciones(codigoMunicipio = null) {
        let list = this.state.instituciones;
        if (codigoMunicipio && String(codigoMunicipio).trim() !== '') {
            list = list.filter(i => String(i.codigo_municipio) === String(codigoMunicipio));
        }
        // Siempre en orden ascendente por nombre
        return list.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    }

    getInstitucionByDane(dane) {
        return this.state.instituciones.find(i => String(i.codigo_dane) === String(dane));
    }

    getSedes(daneIE = null) {
        let list = this.state.sedes;
        if (daneIE) {
            list = list.filter(s => String(s.codigo_dane_ie) === String(daneIE));
        }
        return list.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    }

    getSedeByDane(daneSede) {
        return this.state.sedes.find(s => String(s.codigo_dane_sede) === String(daneSede));
    }

    getElementosBolsa(daneSede) {
        return this.state.bolsa_elementos.filter(e => String(e.codigo_dane_sede) === String(daneSede));
    }

    getEstudiantes(daneSede = null) {
        let list = this.state.estudiantes;
        if (daneSede) {
            list = list.filter(e => String(e.codigo_dane_sede) === String(daneSede));
        }
        return list.slice().sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo, 'es', { sensitivity: 'base' }));
    }

    getEstudianteByDoc(doc) {
        return this.state.estudiantes.find(e => String(e.documento_identidad) === String(doc));
    }

    getEstudianteByAcudienteDoc(doc) {
        return this.state.estudiantes.find(e => String(e.acudiente_documento) === String(doc));
    }

    getAsignacionByDoc(doc) {
        return this.state.asignaciones.find(a => String(a.estudiante_documento) === String(doc));
    }

    // --- Documentos y Versiones (Actualización de documentos originales) ---
    getDocumentos(filter = {}) {
        return this.state.documentos.filter(doc => {
            if (filter.tipo_documento && doc.tipo_documento !== filter.tipo_documento) return false;
            if (filter.codigo_dane_sede && String(doc.codigo_dane_sede) !== String(filter.codigo_dane_sede)) return false;
            if (filter.estudiante_documento && String(doc.estudiante_documento) !== String(filter.estudiante_documento)) return false;
            if (filter.estado && doc.estado !== filter.estado) return false;
            if (filter.codigo_dane_ie) {
                const sede = this.getSedeByDane(doc.codigo_dane_sede);
                if (!sede || String(sede.codigo_dane_ie) !== String(filter.codigo_dane_ie)) return false;
            }
            if (filter.codigo_municipio) {
                const sede = this.getSedeByDane(doc.codigo_dane_sede);
                if (sede) {
                    const ie = this.getInstitucionByDane(sede.codigo_dane_ie);
                    if (!ie || String(ie.codigo_municipio) !== String(filter.codigo_municipio)) return false;
                } else {
                    return false;
                }
            }
            return true;
        });
    }

    getDocumentoById(id) {
        return this.state.documentos.find(d => String(d.id) === String(id));
    }

    findDocumento(tipo, daneSede, estudianteDoc = null) {
        return this.state.documentos.find(d => {
            if (d.tipo_documento !== tipo) return false;
            if (String(d.codigo_dane_sede) !== String(daneSede)) return false;
            if (tipo === 'LOG-007-F') {
                return String(d.estudiante_documento) === String(estudianteDoc);
            }
            return true;
        });
    }

    /**
     * Guarda o actualiza un documento garantizando que los archivos cargados actualizan los originales.
     */
    saveDocumento(docData, actor = 'Usuario', rol = 'Coordinador', comentario = '') {
        let existingIndex = this.state.documentos.findIndex(d => String(d.id) === String(docData.id));
        if (existingIndex < 0 && docData.tipo_documento) {
            existingIndex = this.state.documentos.findIndex(d => 
                d.tipo_documento === docData.tipo_documento &&
                String(d.codigo_dane_sede) === String(docData.codigo_dane_sede) &&
                (docData.tipo_documento !== 'LOG-007-F' || String(d.estudiante_documento) === String(docData.estudiante_documento))
            );
        }

        const now = new Date().toISOString();
        let docRecord;

        if (existingIndex >= 0) {
            // Actualización del documento original existente
            const prev = this.state.documentos[existingIndex];
            docRecord = Object.assign({}, prev, docData, { 
                updated_at: now,
                actor_ultima_accion: actor
            });
            this.state.documentos[existingIndex] = docRecord;
        } else {
            // Creación
            docRecord = Object.assign({
                id: 'DOC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                created_at: now,
                updated_at: now,
                version_actual: 1,
                estado: 'Generado',
                actor_ultima_accion: actor
            }, docData);
            this.state.documentos.push(docRecord);
        }

        // Registrar versión en el historial
        const versionEntry = {
            id: 'VER-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            documento_id: docRecord.id,
            version_num: docRecord.version_actual || 1,
            estado: docRecord.estado,
            actor,
            rol,
            fecha: now,
            comentarios: comentario || `Actualización a ${docRecord.estado}`,
            drive_id: docRecord.drive_id || null,
            filename: docRecord.nombre_archivo || `${docRecord.tipo_documento}_v${docRecord.version_actual}`
        };
        this.state.versiones = this.state.versiones || [];
        this.state.versiones.push(versionEntry);

        // Registrar auditoría
        this.state.historial_auditoria = this.state.historial_auditoria || [];
        this.logAudit({
            actor,
            rol,
            accion: 'DOCUMENTO_ACTUALIZADO',
            entidad: docRecord.tipo_documento,
            entidad_id: docRecord.id,
            detalles: `Documento ${docRecord.nombre_archivo} actualizado a estado "${docRecord.estado}". ${comentario}`,
            version: docRecord.version_actual
        });

        this.persist();
        return docRecord;
    }

    getVersiones(documentoId) {
        return this.state.versiones
            .filter(v => String(v.documento_id) === String(documentoId))
            .sort((a, b) => b.version_num - a.version_num);
    }

    // --- Control de concurrencia en cliente ---
    checkConcurrencyConflict(documentoId, expectedVersion) {
        const doc = this.getDocumentoById(documentoId);
        if (!doc) return false;
        if (doc.version_actual > expectedVersion) {
            return {
                conflict: true,
                currentVersion: doc.version_actual,
                expectedVersion,
                updated_at: doc.updated_at,
                actor: doc.actor_ultima_accion || 'Otro usuario'
            };
        }
        return false;
    }

    // --- Gestión y actualización de seriales ---
    updateSerial(estudianteDoc, newSerial, actor, rol, motivo = '') {
        const asignacion = this.getAsignacionByDoc(estudianteDoc);
        if (!asignacion) throw new Error(`Asignación para estudiante ${estudianteDoc} no encontrada.`);

        const oldSerial = asignacion.serial_asignado;
        asignacion.serial_asignado = String(newSerial).trim();

        this.logAudit({
            actor,
            rol,
            accion: 'ACTUALIZAR_SERIAL',
            entidad: 'Asignacion',
            entidad_id: estudianteDoc,
            detalles: `Serial actualizado de "${oldSerial}" a "${asignacion.serial_asignado}". Motivo: ${motivo}`
        });

        this.persist();
        return asignacion;
    }

    // --- Exportación y Respaldo ---
    exportBackup() {
        const backup = {
            export_date: new Date().toISOString(),
            app: 'computadoresparaeducar-sedcaldas',
            version: '2.0-static',
            data: this.state
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_ceducar_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importBackup(jsonString, actor = 'Administrador') {
        const backup = JSON.parse(jsonString);
        if (!backup.data || !backup.data.sedes) {
            throw new Error('El archivo no tiene el formato válido de respaldo de la aplicación.');
        }
        this.state = Object.assign(this.state, backup.data);
        this.logAudit({
            actor,
            rol: 'Administrador',
            accion: 'IMPORTAR_RESPALDO',
            entidad: 'Sistema',
            entidad_id: 'BACKUP',
            detalles: `Respaldo importado con fecha original ${backup.export_date}`
        });
        this.persist();
    }
}

// Singleton global
window.appStore = new AppStore();
