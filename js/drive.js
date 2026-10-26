/**
 * drive.js - Cliente de almacenamiento en la carpeta compartida de Google Drive
 * Aplicación de Gestión Documental - Secretaría de Educación de Caldas & Computadores para Educar
 *
 * Todas las acciones (archivos generados/cargados, bitácora de auditoría e índice general)
 * se guardan en la carpeta compartida oficial. Hay tres formas de escribir en ella:
 *
 *  1. OAuth: el usuario inició sesión con Google -> llamadas directas a Drive API v3.
 *  2. Puente (Apps Script): sin sesión de Google -> se envía al Web App desplegado por la
 *     cuenta dueña de la carpeta (ver apps-script/README.md). Los usuarios nunca ven la carpeta.
 *  3. Cola local: si no hay conexión o el puente no está configurado, las acciones quedan en
 *     cola en el navegador y se reenvían automáticamente en cuanto sea posible.
 *
 * El enlace de la carpeta no se muestra en la interfaz.
 */

// URL del Web App de Apps Script (termina en /exec). Se define aquí para que TODOS los
// navegadores (acudientes, rectores, CPE) la usen sin configuración adicional.
const DRIVE_RELAY_URL = '';
const DRIVE_RELAY_KEY = '';

const DRIVE_QUEUE_KEY = 'ceducar_drive_queue';
const QUEUED_ID_PREFIX = 'DRIVE-QUEUED-';

class GoogleDriveClient {
    constructor() {
        this.accessToken = null;
        this.rootFolderId = '1sCwul3GdqXtAwTsMP1EZHaeD3Zx190RW';
        this.rootFolderName = 'Bolsa_Tecnologica_Caldas';
        this.folderCache = new Map();
        this.isOnline = true;
        this.currentUser = null;

        this._auditBuffer = [];
        this._auditTimer = null;
        this._indexTimer = null;
        this._indexProvider = null;
        this._indexFileId = null;
        this._flushing = false;

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('online', () => this.flushQueue());
            setInterval(() => this.flushQueue(), 60000);
        }
    }

    setToken(token, user = null) {
        this.accessToken = token;
        this.isOnline = true;
        this.currentUser = user;
        if (token) this.flushQueue();
    }

    hasActiveToken() {
        return !!this.accessToken;
    }

    // --- Configuración ---
    _config() {
        return (typeof window !== 'undefined' && window.appStore?.state?.config) || {};
    }

    getRelayUrl() {
        return String(this._config().drive_relay_url || DRIVE_RELAY_URL || '').trim();
    }

    _getRelayKey() {
        return this._config().drive_relay_key || DRIVE_RELAY_KEY || '';
    }

    /** 'oauth' | 'relay' | 'local' */
    getMode() {
        if (this.accessToken) return 'oauth';
        if (this.getRelayUrl()) return 'relay';
        return 'local';
    }

    isRemoteAvailable() {
        return this.getMode() !== 'local';
    }

    // --- Verificación de conexión (sin exponer el ID ni el enlace de la carpeta) ---
    async testConnection() {
        const mode = this.getMode();

        if (mode === 'local') {
            return {
                connected: false,
                mode: 'LOCAL_QUEUE',
                pending: this.getPendingCount(),
                message: 'Almacenamiento institucional no configurado: las acciones quedan en cola y se enviarán al configurarlo.'
            };
        }

        if (mode === 'relay') {
            try {
                const res = await this._relay({ action: 'ping' });
                return {
                    connected: true,
                    mode: 'DRIVE_RELAY',
                    rootAccessible: !!res.rootAccessible,
                    pending: this.getPendingCount(),
                    message: 'Conectado al almacenamiento institucional en Google Drive.'
                };
            } catch (e) {
                return { connected: false, mode: 'ERROR_RELAY', pending: this.getPendingCount(), message: `No fue posible contactar el almacenamiento: ${e.message}` };
            }
        }

        try {
            const resp = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error?.message || `Error HTTP ${resp.status}`);
            }
            const data = await resp.json();
            this.currentUser = data.user;

            const rootCheck = await fetch(`https://www.googleapis.com/drive/v3/files/${this.rootFolderId}?fields=id,name,capabilities`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            const rootData = rootCheck.ok ? await rootCheck.json() : null;

            return {
                connected: true,
                mode: 'GOOGLE_DRIVE_ONLINE',
                user: data.user,
                rootAccessible: !!rootData,
                rootName: rootData?.name || this.rootFolderName,
                canEditRoot: rootData?.capabilities?.canAddChildren ?? false,
                pending: this.getPendingCount(),
                message: `Conectado a Google Drive como ${data.user.displayName} (${data.user.emailAddress})`
            };
        } catch (e) {
            console.error('Error probando conexión a Drive:', e);
            return { connected: false, mode: 'ERROR_AUTH', message: `Fallo de autenticación con Google Drive: ${e.message}` };
        }
    }

    // --- Búsqueda y creación de carpetas (modo OAuth) ---
    async findOrCreateFolder(parentFolderId, folderName) {
        const cacheKey = `${parentFolderId}::${folderName}`;
        if (this.folderCache.has(cacheKey)) {
            return this.folderCache.get(cacheKey);
        }

        if (!this.accessToken) {
            const localFolderId = 'DRIVE-FOLDER-' + Math.abs(this._hashString(cacheKey)).toString(16);
            this.folderCache.set(cacheKey, localFolderId);
            return localFolderId;
        }

        const q = `'${parentFolderId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const listResp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });

        if (listResp.ok) {
            const listData = await listResp.json();
            if (listData.files && listData.files.length > 0) {
                const foundId = listData.files[0].id;
                this.folderCache.set(cacheKey, foundId);
                return foundId;
            }
        }

        const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId]
            })
        });

        if (!createResp.ok) {
            const err = await createResp.json().catch(() => ({}));
            throw new Error(`Error creando carpeta "${folderName}": ${err.error?.message || createResp.statusText}`);
        }

        const newFolder = await createResp.json();
        this.folderCache.set(cacheKey, newFolder.id);
        return newFolder.id;
    }

    async _resolvePath(segments) {
        let current = this.rootFolderId;
        for (const seg of segments) {
            current = await this.findOrCreateFolder(current, seg);
        }
        return current;
    }

    // --- Construcción de la ruta jerárquica obligatoria ---
    async getTargetFolderForDocument({ codigo_mpio, nombre_mpio, dane_ie, nombre_ie, dane_sede, nombre_sede, tipo_documento, estado, documento_estudiante = null }) {
        const safe = (str) => String(str || '').trim().replace(/[\/\\?%*:|"<>]/g, '_');
        const estadoCarpetaMap = {
            'Borrador': 'Borradores',
            'Generado': 'Generados',
            'Pendiente de firma/carga': 'Generados',
            'En revisión del rector': 'En_revision',
            'En revisión del coordinador': 'En_revision',
            'Devuelto al acudiente': 'Devueltos',
            'Devuelto al rector': 'Devueltos',
            'Aprobado': 'Aprobados'
        };

        // Jerarquía: /{MPIO}/{IE}/{SEDE}/{TIPO}/[{DOC_ESTUDIANTE}/]{ESTADO}
        const segments = [
            `${safe(codigo_mpio)}_${safe(nombre_mpio)}`,
            `${safe(dane_ie)}_${safe(nombre_ie)}`,
            `${safe(dane_sede)}_${safe(nombre_sede)}`,
            tipo_documento
        ];
        if (tipo_documento === 'LOG-007-F' && documento_estudiante) {
            segments.push(safe(documento_estudiante));
        }
        segments.push(estadoCarpetaMap[estado] || 'Generados');

        // En modo puente las carpetas se crean del lado del servidor a partir de la ruta.
        const folderId = this.getMode() === 'relay' ? null : await this._resolvePath(segments);

        return {
            folderId,
            pathSegments: segments,
            relativePath: '/' + segments.join('/')
        };
    }

    // --- Subida de archivos ---
    async uploadFile({ folderId = null, folderPath = null, filename, mimeType, blob, description = '', existingFileId = null, docId = null }) {
        const mode = this.getMode();

        // Si había una subida pendiente para el mismo archivo, la nueva la reemplaza.
        if (existingFileId && existingFileId.startsWith(QUEUED_ID_PREFIX)) {
            await this._dropQueued(existingFileId);
            existingFileId = null;
        }
        if (existingFileId && existingFileId.startsWith('DRIVE-')) existingFileId = null;

        try {
            if (mode === 'relay') {
                return await this._uploadViaRelay({ folderPath, filename, mimeType, blob, description, existingFileId });
            }
            if (mode === 'oauth') {
                const targetFolderId = folderId || (folderPath ? await this._resolvePath(folderPath) : this.rootFolderId);
                return await this._uploadViaOAuth({ folderId: targetFolderId, filename, mimeType, blob, description, existingFileId });
            }
        } catch (e) {
            console.warn('Subida a Drive fallida, se deja en cola para reintento:', e);
        }

        return await this._enqueueUpload({ folderPath, filename, mimeType, blob, description, existingFileId, docId });
    }

    async _uploadViaRelay({ folderPath, filename, mimeType, blob, description, existingFileId }) {
        const res = await this._relay({
            action: 'upload',
            path: folderPath || [],
            filename,
            mimeType,
            description,
            existingFileId,
            base64: await this._blobToBase64(blob)
        });
        return { id: res.id, name: res.name, folderId: res.folderId, online: true };
    }

    async _uploadViaOAuth({ folderId, filename, mimeType, blob, description, existingFileId }) {
        if (existingFileId) {
            try {
                const arrayBuffer = await blob.arrayBuffer();
                const patchResp = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': mimeType
                    },
                    body: arrayBuffer
                });
                if (patchResp.ok) {
                    return await patchResp.json();
                }
            } catch (errPatch) {
                console.warn('Actualización directa falló, procediendo a carga con metadatos:', errPatch);
            }
        }

        const metadata = { name: filename, mimeType, parents: [folderId], description };
        const boundary = '-------ceducar_multipart_boundary_' + Date.now();
        const delimiter = '\r\n--' + boundary + '\r\n';
        const closeDelim = '\r\n--' + boundary + '--';

        const uint8Data = new Uint8Array(await blob.arrayBuffer());
        const metadataPart = delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${mimeType}\r\n` +
            'Content-Transfer-Encoding: binary\r\n\r\n';

        const encoder = new TextEncoder();
        const metaBytes = encoder.encode(metadataPart);
        const closeBytes = encoder.encode(closeDelim);

        const fullPayload = new Uint8Array(metaBytes.length + uint8Data.length + closeBytes.length);
        fullPayload.set(metaBytes, 0);
        fullPayload.set(uint8Data, metaBytes.length);
        fullPayload.set(closeBytes, metaBytes.length + uint8Data.length);

        const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: fullPayload
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(`Error subiendo archivo a Google Drive: ${err.error?.message || resp.statusText}`);
        }
        return await resp.json();
    }

    // --- Descarga de archivo ---
    async downloadFile(fileId) {
        if (!fileId) throw new Error('ID de archivo no proporcionado.');

        if (fileId.startsWith('DRIVE-') || this.getMode() === 'local') {
            if (window.appStore) {
                const item = await window.appStore.getBlob(fileId) || await window.appStore.getBlob('QUEUE-' + fileId);
                if (item && item.blob) return item.blob;
            }
            throw new Error('Archivo no encontrado en almacenamiento local.');
        }

        if (this.getMode() === 'relay') {
            const res = await this._relay({ action: 'download', fileId });
            return this._base64ToBlob(res.base64, res.mimeType);
        }

        const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        if (!resp.ok) {
            throw new Error(`Error descargando archivo ${fileId} desde Google Drive: ${resp.statusText}`);
        }
        return await resp.blob();
    }

    // --- Índice general (/Indices/indice_general.json) ---
    /** Programa la sincronización del índice general con el estado más reciente. */
    scheduleIndexSync(provider) {
        this._indexProvider = provider;
        clearTimeout(this._indexTimer);
        this._indexTimer = setTimeout(() => {
            if (this.isRemoteAvailable()) this.syncGeneralIndex(this._indexProvider());
        }, 3000);
    }

    async syncGeneralIndex(indexData) {
        const content = JSON.stringify(Object.assign({ actualizado: new Date().toISOString() }, indexData), null, 2);
        try {
            if (this.getMode() === 'relay') {
                return await this._relay({ action: 'upsertJson', path: ['Indices'], filename: 'indice_general.json', content });
            }
            if (this.getMode() === 'oauth') {
                const indicesFolderId = await this.findOrCreateFolder(this.rootFolderId, 'Indices');
                if (!this._indexFileId) {
                    this._indexFileId = await this._findFileByName(indicesFolderId, 'indice_general.json');
                }
                const res = await this._uploadViaOAuth({
                    folderId: indicesFolderId,
                    filename: 'indice_general.json',
                    mimeType: 'application/json',
                    blob: new Blob([content], { type: 'application/json' }),
                    description: 'Índice general de la aplicación',
                    existingFileId: this._indexFileId
                });
                this._indexFileId = res.id;
                return res;
            }
        } catch (e) {
            console.warn('No se pudo sincronizar indice_general.json en Drive:', e);
        }
    }

    async _findFileByName(folderId, name) {
        const q = `'${folderId}' in parents and name = '${name}' and trashed = false`;
        const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.files?.[0]?.id || null;
    }

    // --- Bitácora de auditoría (/Historial/) ---
    appendAuditLog(auditEntry) {
        this._auditBuffer.push(auditEntry);
        clearTimeout(this._auditTimer);
        this._auditTimer = setTimeout(() => this._flushAuditBuffer(), 800);
    }

    async _flushAuditBuffer() {
        const entries = this._auditBuffer.splice(0);
        if (!entries.length) return;
        try {
            await this._sendAudit(entries);
        } catch (e) {
            console.warn('Bitácora no enviada, se deja en cola:', e);
            this._enqueue({ type: 'audit', entries });
        }
    }

    async _sendAudit(entries) {
        const mode = this.getMode();
        if (mode === 'relay') {
            await this._relay({ action: 'appendAudit', entries });
            return;
        }
        if (mode === 'oauth') {
            const historialFolderId = await this.findOrCreateFolder(this.rootFolderId, 'Historial');
            for (const entry of entries) {
                await this._uploadViaOAuth({
                    folderId: historialFolderId,
                    filename: `evento_${entry.id}.json`,
                    mimeType: 'application/json',
                    blob: new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' }),
                    description: `Auditoría: ${entry.accion}`
                });
            }
            return;
        }
        throw new Error('Sin almacenamiento remoto disponible.');
    }

    // --- Cola de acciones pendientes ---
    _readQueue() {
        try {
            const raw = localStorage.getItem(DRIVE_QUEUE_KEY);
            if (raw !== null) return JSON.parse(raw);
        } catch (e) { /* sin localStorage: se usa la cola en memoria */ }
        return (this._memQueue || []).slice();
    }

    _writeQueue(queue) {
        this._memQueue = queue.slice();
        try {
            localStorage.setItem(DRIVE_QUEUE_KEY, JSON.stringify(queue));
        } catch (e) { /* se conserva en memoria */ }
    }

    _enqueue(item) {
        const queue = this._readQueue();
        queue.push(Object.assign({ qid: Date.now() + '-' + Math.random().toString(36).substr(2, 8), queuedAt: new Date().toISOString() }, item));
        this._writeQueue(queue);
    }

    getPendingCount() {
        return this._readQueue().length;
    }

    async _enqueueUpload({ folderPath, filename, mimeType, blob, description, existingFileId, docId }) {
        const queuedId = QUEUED_ID_PREFIX + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        if (window.appStore) {
            await window.appStore.saveBlob('QUEUE-' + queuedId, blob, filename, mimeType);
        }
        this._enqueue({ type: 'upload', queuedId, folderPath, filename, mimeType, description, existingFileId, docId });
        return { id: queuedId, name: filename, online: false, queued: true, folderId: null };
    }

    async _dropQueued(queuedId) {
        this._writeQueue(this._readQueue().filter(q => q.queuedId !== queuedId));
        if (window.appStore) await window.appStore.clearBlobs('QUEUE-' + queuedId);
    }

    /** Reenvía a Drive todas las acciones pendientes. */
    async flushQueue() {
        if (this._flushing || !this.isRemoteAvailable()) return { sent: 0, pending: this.getPendingCount() };
        this._flushing = true;
        let sent = 0;
        try {
            const queue = this._readQueue();
            for (const item of queue) {
                try {
                    if (item.type === 'audit') {
                        await this._sendAudit(item.entries);
                    } else if (item.type === 'upload') {
                        const stored = window.appStore ? await window.appStore.getBlob('QUEUE-' + item.queuedId) : null;
                        if (stored && stored.blob) {
                            const args = {
                                folderPath: item.folderPath,
                                filename: item.filename,
                                mimeType: item.mimeType,
                                blob: stored.blob,
                                description: item.description,
                                existingFileId: item.existingFileId
                            };
                            const res = this.getMode() === 'relay'
                                ? await this._uploadViaRelay(args)
                                : await this._uploadViaOAuth(Object.assign(args, { folderId: await this._resolvePath(item.folderPath || []) }));
                            this._onQueuedUploadDone(item, res);
                            await window.appStore.clearBlobs('QUEUE-' + item.queuedId);
                        }
                    }
                    // Quitar el elemento enviado (releyendo la cola por si cambió mientras tanto)
                    this._writeQueue(this._readQueue().filter(q => q.qid !== item.qid));
                    sent++;
                } catch (e) {
                    console.warn('Reintento de envío a Drive fallido, se intentará más tarde:', e);
                    break;
                }
            }
            if (sent > 0 && this._indexProvider) {
                await this.syncGeneralIndex(this._indexProvider());
            }
        } finally {
            this._flushing = false;
        }
        return { sent, pending: this.getPendingCount() };
    }

    _onQueuedUploadDone(item, res) {
        const store = window.appStore;
        if (!store || !store.state) return;
        const doc = (store.state.documentos || []).find(d => d.drive_id === item.queuedId);
        if (doc) {
            doc.drive_id = res.id;
            if (res.folderId) doc.drive_folder_id = res.folderId;
            store.persist();
        }
    }

    // --- Comunicación con el puente de Apps Script ---
    async _relay(payload) {
        const url = this.getRelayUrl();
        if (!url) throw new Error('Puente de Drive no configurado.');
        const body = JSON.stringify(Object.assign({ key: this._getRelayKey() }, payload));
        // text/plain evita la solicitud previa CORS (preflight) que Apps Script no admite.
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body,
            redirect: 'follow'
        });
        if (!resp.ok) throw new Error(`Error HTTP ${resp.status} del puente de Drive`);
        const data = await resp.json();
        if (!data.ok) throw new Error(data.error || 'Error desconocido del puente de Drive');
        return data;
    }

    async _blobToBase64(blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    }

    _base64ToBlob(base64, mimeType) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
    }

    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
}

// Singleton global
window.googleDriveClient = new GoogleDriveClient();
