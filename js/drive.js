/**
 * drive.js - Cliente de integración directa con Google Drive API v3
 * Aplicación de Gestión Documental - Secretaría de Educación de Caldas & Computadores para Educar
 * 
 * Cumple estrictamente con la arquitectura estática:
 * - Sin backend ni servidores intermedios.
 * - Llamadas REST directas a https://www.googleapis.com/drive/v3 desde el navegador.
 * - Estructura jerárquica estricta por Municipio, IE, Sede y Formatos.
 * - Almacenamiento de índices en Drive (/Indices/ e /Historial/).
 * - Actualización de archivos originales en Google Drive.
 */

class GoogleDriveClient {
    constructor() {
        this.accessToken = null;
        this.rootFolderId = '1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51';
        this.rootFolderName = 'Bolsa_Tecnologica_Caldas';
        this.folderCache = new Map();
        this.isOnline = false;
        this.currentUser = null;
    }

    setToken(token, user = null) {
        this.accessToken = token;
        this.isOnline = !!token;
        this.currentUser = user;
    }

    hasActiveToken() {
        return !!this.accessToken;
    }

    // --- Verificación y diagnóstico de permisos en Drive ---
    async testConnection() {
        if (!this.accessToken) {
            return {
                connected: false,
                mode: 'LOCAL_DRIVE',
                message: 'Almacenamiento local activo. Inicie sesión con Google Workspace para sincronización remota en la nube.'
            };
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

            // Verificar acceso a la carpeta raíz
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
                message: `Conectado a Google Drive como ${data.user.displayName} (${data.user.emailAddress})`
            };
        } catch (e) {
            console.error('Error probando conexión a Drive:', e);
            return {
                connected: false,
                mode: 'ERROR_AUTH',
                message: `Fallo de autenticación con Google Drive: ${e.message}`
            };
        }
    }

    // --- Búsqueda y creación de carpetas ---
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

        // Buscar carpeta existente
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

        // Crear carpeta si no existe
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

    // --- Construcción de la ruta jerárquica obligatoria según SKILLs.md ---
    async getTargetFolderForDocument({ codigo_mpio, nombre_mpio, dane_ie, nombre_ie, dane_sede, nombre_sede, tipo_documento, estado, documento_estudiante = null }) {
        let currentFolder = this.rootFolderId;

        const safe = (str) => String(str || '').trim().replace(/[\/\\?%*:|"<>]/g, '_');
        const mpioFolder = `${safe(codigo_mpio)}_${safe(nombre_mpio)}`;
        const ieFolder = `${safe(dane_ie)}_${safe(nombre_ie)}`;
        const sedeFolder = `${safe(dane_sede)}_${safe(nombre_sede)}`;

        // Jerarquía: /Bolsa_Tecnologica_Caldas/{MPIO}/{IE}/{SEDE}/
        currentFolder = await this.findOrCreateFolder(currentFolder, mpioFolder);
        currentFolder = await this.findOrCreateFolder(currentFolder, ieFolder);
        currentFolder = await this.findOrCreateFolder(currentFolder, sedeFolder);

        // Subcarpeta por tipo documental
        currentFolder = await this.findOrCreateFolder(currentFolder, tipo_documento);

        // Si es LOG-007-F, añadir nivel de documento del estudiante
        if (tipo_documento === 'LOG-007-F' && documento_estudiante) {
            currentFolder = await this.findOrCreateFolder(currentFolder, safe(documento_estudiante));
        }

        // Subcarpeta por estado
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
        const estadoFolderName = estadoCarpetaMap[estado] || 'Generados';
        currentFolder = await this.findOrCreateFolder(currentFolder, estadoFolderName);

        return {
            folderId: currentFolder,
            relativePath: `/${mpioFolder}/${ieFolder}/${sedeFolder}/${tipo_documento}/${tipo_documento === 'LOG-007-F' && documento_estudiante ? safe(documento_estudiante) + '/' : ''}${estadoFolderName}`
        };
    }

    // --- Subida y Actualización de archivos con Multipart Upload ---
    async uploadFile({ folderId, filename, mimeType, blob, description = '', existingFileId = null }) {
        if (!this.accessToken) {
            const driveId = existingFileId || ('DRIVE-FILE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6));
            if (window.appStore) {
                await window.appStore.saveBlob(driveId, blob, filename, mimeType);
            }
            return {
                id: driveId,
                name: filename,
                webViewLink: '#',
                online: false
            };
        }

        // Si ya existe en Drive y se debe actualizar el archivo original
        if (existingFileId && !existingFileId.startsWith('DRIVE-')) {
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
                    const patched = await patchResp.json();
                    return patched;
                }
            } catch (errPatch) {
                console.warn('Actualización directa falló, procediendo a carga con metadatos:', errPatch);
            }
        }

        // Subida Multipart a Google Drive v3
        const metadata = {
            name: filename,
            mimeType: mimeType,
            parents: [folderId],
            description: description
        };

        const boundary = '-------ceducar_multipart_boundary_' + Date.now();
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Data = new Uint8Array(arrayBuffer);

        const metadataPart = delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${mimeType}\r\n` +
            'Content-Transfer-Encoding: binary\r\n\r\n';

        const encoder = new TextEncoder();
        const metaBytes = encoder.encode(metadataPart);
        const closeBytes = encoder.encode(close_delim);

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

        const uploadedFile = await resp.json();
        return uploadedFile;
    }

    // --- Descarga de archivo desde Google Drive ---
    async downloadFile(fileId) {
        if (!fileId) throw new Error('ID de archivo no proporcionado.');

        if (!this.accessToken || fileId.startsWith('DRIVE-')) {
            if (window.appStore) {
                const item = await window.appStore.getBlob(fileId);
                if (item && item.blob) return item.blob;
            }
            throw new Error('Archivo no encontrado en almacenamiento local.');
        }

        const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });

        if (!resp.ok) {
            throw new Error(`Error descargando archivo ${fileId} desde Google Drive: ${resp.statusText}`);
        }

        return await resp.blob();
    }

    // --- Sincronización de Índices en /Indices/ y /Historial/ ---
    async syncGeneralIndex(indexData) {
        try {
            const indicesFolderId = await this.findOrCreateFolder(this.rootFolderId, 'Indices');
            const blob = new Blob([JSON.stringify(indexData, null, 2)], { type: 'application/json' });
            return await this.uploadFile({
                folderId: indicesFolderId,
                filename: 'indice_general.json',
                mimeType: 'application/json',
                blob: blob,
                description: `Índice general actualizado el ${new Date().toISOString()}`
            });
        } catch (e) {
            console.warn('No se pudo sincronizar indice_general.json en Drive:', e);
        }
    }

    async appendAuditLog(auditEntry) {
        try {
            const historialFolderId = await this.findOrCreateFolder(this.rootFolderId, 'Historial');
            const blob = new Blob([JSON.stringify(auditEntry, null, 2)], { type: 'application/json' });
            return await this.uploadFile({
                folderId: historialFolderId,
                filename: `evento_${auditEntry.id}.json`,
                mimeType: 'application/json',
                blob: blob,
                description: `Auditoría: ${auditEntry.accion}`
            });
        } catch (e) {
            console.warn('No se pudo registrar evento de auditoría en Drive:', e);
        }
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
