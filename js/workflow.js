/**
 * workflow.js - Máquina de Estados y Flujos de Aprobación Documental
 * Aplicación de Gestión Documental - Secretaría de Educación de Caldas & Computadores para Educar
 * 
 * Flujo de Estados según SKILLs.md:
 * Borrador → Generado → Pendiente de firma/carga → En revisión del rector →
 * Devuelto al acudiente → En revisión del coordinador → Devuelto al rector → Aprobado
 * 
 * REGLA FUNDAMENTAL: Los documentos que se carguen actualizan los documentos originales.
 */

class ApprovalWorkflowEngine {
    constructor() {
        this.ESTADOS = {
            BORRADOR: 'Borrador',
            GENERADO: 'Generado',
            PENDIENTE_FIRMA: 'Pendiente de firma/carga',
            REVISION_RECTOR: 'En revisión del rector',
            DEVUELTO_ACUDIENTE: 'Devuelto al acudiente',
            REVISION_COORDINADOR: 'En revisión del coordinador',
            DEVUELTO_RECTOR: 'Devuelto al rector',
            APROBADO: 'Aprobado'
        };
    }

    // =========================================================================
    // ACCIONES DEL ACUDIENTE (LOG-007-F)
    // =========================================================================

    /**
     * El acudiente sube el documento firmado (fuera de la aplicación).
     * Actualiza el documento original y pasa al estado "En revisión del rector".
     */
    async uploadSignedDocumentByAcudiente(documentoId, fileBlob, filename, comentarios = '') {
        const store = window.appStore;
        const doc = store.getDocumentoById(documentoId);
        if (!doc) throw new Error('Documento original no encontrado.');
        this._assertAccess(doc);

        const user = window.authService?.getCurrentUser() || { name: 'Acudiente', role: 'acudiente' };
        const newVersion = (doc.version_actual || 1) + 1;

        // Actualización estricta del documento original
        doc.version_actual = newVersion;
        doc.estado = this.ESTADOS.REVISION_RECTOR;
        doc.nombre_archivo = filename || `LOG-007-F_${doc.codigo_dane_sede}_${doc.estudiante_documento}_v0${newVersion}_firmado.pdf`;
        doc.actor_ultima_accion = user.name;
        doc.updated_at = new Date().toISOString();

        // Guardar el blob como versión histórica y como archivo activo actual
        await store.saveBlob(`DOC-${doc.id}-v${newVersion}`, fileBlob, doc.nombre_archivo, fileBlob.type);
        await store.saveBlob(`DOC-${doc.id}-active`, fileBlob, doc.nombre_archivo, fileBlob.type);

        // Guardar cambios en el documento original
        store.saveDocumento(doc, user.name, user.role, comentarios || 'Documento firmado cargado por el acudiente.');

        // Actualizar archivo en Google Drive
        await this._syncWithDrive(doc, fileBlob, 'Carga de documento firmado por acudiente');

        return doc;
    }

    // =========================================================================
    // ACCIONES DEL RECTOR (LOG-007-F, LOG-026-F, LOG-029-F)
    // =========================================================================

    /**
     * El rector aprueba el LOG-007-F del estudiante y lo remite al coordinador.
     */
    async approveLog007ByRector(documentoId, comentarios = '') {
        const store = window.appStore;
        const doc = store.getDocumentoById(documentoId);
        if (!doc) throw new Error('Documento original no encontrado.');
        this._assertAccess(doc);
        if (doc.tipo_documento !== 'LOG-007-F') throw new Error('Esta acción solo aplica a LOG-007-F.');

        const user = window.authService?.getCurrentUser() || { name: 'Rector', role: 'rector' };

        doc.estado = this.ESTADOS.REVISION_COORDINADOR;
        doc.actor_ultima_accion = user.name;
        doc.updated_at = new Date().toISOString();

        store.saveDocumento(doc, user.name, user.role, comentarios || 'Aprobado por el rector y remitido al coordinador.');
        return doc;
    }

    /**
     * El rector devuelve el LOG-007-F al acudiente con observaciones.
     */
    async returnLog007ToAcudiente(documentoId, motivo, observaciones) {
        if (!motivo || !observaciones) {
            throw new Error('Debe especificar un motivo y observaciones claras para devolver el documento.');
        }

        const store = window.appStore;
        const doc = store.getDocumentoById(documentoId);
        if (!doc) throw new Error('Documento original no encontrado.');
        this._assertAccess(doc);

        const user = window.authService?.getCurrentUser() || { name: 'Rector', role: 'rector' };

        doc.estado = this.ESTADOS.DEVUELTO_ACUDIENTE;
        doc.actor_ultima_accion = user.name;
        doc.updated_at = new Date().toISOString();

        const detalle = `Devuelto al acudiente. Motivo: ${motivo}. Observaciones: ${observaciones}`;
        store.saveDocumento(doc, user.name, user.role, detalle);
        return doc;
    }

    /**
     * El rector carga LOG-007-F en nombre del acudiente cuando este no puede hacerlo.
     * Actualiza el documento original y registra la justificación.
     */
    async uploadLog007OnBehalfOfAcudiente(documentoId, fileBlob, filename, motivoRepresentacion) {
        if (!motivoRepresentacion) {
            throw new Error('Debe registrar el motivo por el cual carga el documento en nombre del acudiente.');
        }

        const store = window.appStore;
        const doc = store.getDocumentoById(documentoId);
        if (!doc) throw new Error('Documento original no encontrado.');
        this._assertAccess(doc);

        const user = window.authService?.getCurrentUser() || { name: 'Rector', role: 'rector' };
        const newVersion = (doc.version_actual || 1) + 1;

        doc.version_actual = newVersion;
        doc.estado = this.ESTADOS.REVISION_COORDINADOR;
        doc.nombre_archivo = filename || `LOG-007-F_${doc.codigo_dane_sede}_${doc.estudiante_documento}_v0${newVersion}_firmado.pdf`;
        doc.actor_ultima_accion = user.name;
        doc.updated_at = new Date().toISOString();

        await store.saveBlob(`DOC-${doc.id}-v${newVersion}`, fileBlob, doc.nombre_archivo, fileBlob.type);
        await store.saveBlob(`DOC-${doc.id}-active`, fileBlob, doc.nombre_archivo, fileBlob.type);

        const detalle = `Cargado por el Rector en nombre del acudiente. Motivo: ${motivoRepresentacion}`;
        store.saveDocumento(doc, `${user.name} (en nombre del acudiente)`, user.role, detalle);

        await this._syncWithDrive(doc, fileBlob, detalle);
        return doc;
    }

    /**
     * El rector remite LOG-026-F o LOG-029-F al coordinador tras completar la información.
     * Actualiza el documento original si se adjunta un archivo editado.
     */
    async submitBolsaDocumentByRector(documentoId, fileBlob = null, filename = '', comentarios = '') {
        const store = window.appStore;
        const doc = store.getDocumentoById(documentoId);
        if (!doc) throw new Error('Documento original no encontrado.');
        this._assertAccess(doc);

        const user = window.authService?.getCurrentUser() || { name: 'Rector', role: 'rector' };

        if (fileBlob) {
            const newVersion = (doc.version_actual || 1) + 1;
            doc.version_actual = newVersion;
            doc.nombre_archivo = filename || doc.nombre_archivo;
            await store.saveBlob(`DOC-${doc.id}-v${newVersion}`, fileBlob, doc.nombre_archivo, fileBlob.type);
            await store.saveBlob(`DOC-${doc.id}-active`, fileBlob, doc.nombre_archivo, fileBlob.type);
        }

        doc.estado = this.ESTADOS.REVISION_COORDINADOR;
        doc.actor_ultima_accion = user.name;
        doc.updated_at = new Date().toISOString();

        const detalle = comentarios || `Remitido al coordinador para revisión y validación institucional.`;
        store.saveDocumento(doc, user.name, user.role, detalle);

        if (fileBlob) {
            await this._syncWithDrive(doc, fileBlob, detalle);
        }
        return doc;
    }

    // =========================================================================
    // ACCIONES DEL COORDINADOR (LOG-007-F, LOG-026-F, LOG-029-F)
    // =========================================================================

    /**
     * El coordinador aprueba formalmente cualquier documento.
     */
    async approveDocumentByCoordinador(documentoId, comentarios = '') {
        const store = window.appStore;
        const doc = store.getDocumentoById(documentoId);
        if (!doc) throw new Error('Documento original no encontrado.');
        this._assertAccess(doc);

        const user = window.authService?.getCurrentUser() || { name: 'Coordinador', role: 'coordinador' };

        doc.estado = this.ESTADOS.APROBADO;
        doc.actor_ultima_accion = user.name;
        doc.updated_at = new Date().toISOString();

        const detalle = comentarios || 'Documento validado y aprobado formalmente por la Coordinación Departamental.';
        store.saveDocumento(doc, user.name, user.role, detalle);

        let blobItem = await store.getBlob(`DOC-${doc.id}-active`) || await store.getBlob(`DOC-${doc.id}-v${doc.version_actual}`);
        if (!blobItem || !blobItem.blob) {
            try {
                let genBlob = null;
                if (doc.tipo_documento === 'LOG-026-F' && doc.codigo_dane_sede) {
                    const gen = await window.documentGenerator.generateLog026(doc.codigo_dane_sede, doc.version_actual, doc.estado);
                    genBlob = gen.blob;
                } else if (doc.tipo_documento === 'LOG-029-F' && doc.codigo_dane_sede) {
                    const gen = await window.documentGenerator.generateLog029(doc.codigo_dane_sede, doc.version_actual, doc.estado);
                    genBlob = gen.blob;
                } else if (doc.tipo_documento === 'LOG-007-F' && doc.estudiante_documento) {
                    const gen = await window.documentGenerator.generateLog007(doc.estudiante_documento, doc.version_actual, doc.estado);
                    genBlob = gen.blob;
                }
                if (genBlob) {
                    await store.saveBlob(`DOC-${doc.id}-v${doc.version_actual}`, genBlob, doc.nombre_archivo, genBlob.type);
                    await store.saveBlob(`DOC-${doc.id}-active`, genBlob, doc.nombre_archivo, genBlob.type);
                    blobItem = { blob: genBlob };
                }
            } catch (errGen) {
                console.warn('Aviso generando blob para documento aprobado:', errGen);
            }
        }

        if (blobItem && blobItem.blob) {
            await this._syncWithDrive(doc, blobItem.blob, 'Aprobación formal');
        }

        return doc;
    }

    /**
     * El coordinador devuelve un documento al rector por inconsistencias u observaciones.
     */
    async returnDocumentToRectorByCoordinador(documentoId, motivo, observaciones) {
        if (!motivo || !observaciones) {
            throw new Error('Debe especificar el motivo y las observaciones de inconsistencia para devolver el documento.');
        }

        const store = window.appStore;
        const doc = store.getDocumentoById(documentoId);
        if (!doc) throw new Error('Documento original no encontrado.');
        this._assertAccess(doc);

        const user = window.authService?.getCurrentUser() || { name: 'Coordinador', role: 'coordinador' };

        doc.estado = this.ESTADOS.DEVUELTO_RECTOR;
        doc.actor_ultima_accion = user.name;
        doc.updated_at = new Date().toISOString();

        const detalle = `Devuelto al Rector. Motivo: ${motivo}. Observaciones: ${observaciones}`;
        store.saveDocumento(doc, user.name, user.role, detalle);
        return doc;
    }

    /**
     * El coordinador carga un documento en nombre del rector cuando sea necesario.
     * Actualiza el documento original y registra trazabilidad.
     */
    async uploadDocumentOnBehalfOfRector(documentoId, fileBlob, filename, motivoRepresentacion) {
        if (!motivoRepresentacion) {
            throw new Error('Debe registrar el motivo de la actuación en nombre del rector.');
        }

        const store = window.appStore;
        const doc = store.getDocumentoById(documentoId);
        if (!doc) throw new Error('Documento original no encontrado.');
        this._assertAccess(doc);

        const user = window.authService?.getCurrentUser() || { name: 'Coordinador', role: 'coordinador' };
        const newVersion = (doc.version_actual || 1) + 1;

        doc.version_actual = newVersion;
        doc.estado = this.ESTADOS.APROBADO;
        doc.nombre_archivo = filename || doc.nombre_archivo;
        doc.actor_ultima_accion = user.name;
        doc.updated_at = new Date().toISOString();

        await store.saveBlob(`DOC-${doc.id}-v${newVersion}`, fileBlob, doc.nombre_archivo, fileBlob.type);
        await store.saveBlob(`DOC-${doc.id}-active`, fileBlob, doc.nombre_archivo, fileBlob.type);

        const detalle = `Cargado y legalizado por Coordinación en nombre del Rector. Motivo: ${motivoRepresentacion}`;
        store.saveDocumento(doc, `${user.name} (en nombre del Rector)`, user.role, detalle);

        await this._syncWithDrive(doc, fileBlob, detalle);
        return doc;
    }

    // =========================================================================
    // HELPER DE SINCRONIZACIÓN CON GOOGLE DRIVE
    // =========================================================================
    /** Impide que un rector (o acudiente) actúe sobre documentos de otra institución. */
    _assertAccess(doc) {
        const auth = window.authService;
        if (auth && auth.getCurrentUser() && !auth.canAccessSede(doc.codigo_dane_sede)) {
            throw new Error('No tiene permisos sobre documentos de otra institución educativa.');
        }
    }

    async _syncWithDrive(doc, blob, description) {
        if (!window.googleDriveClient) return;

        try {
            const store = window.appStore;
            const sede = store.getSedeByDane(doc.codigo_dane_sede);
            const ie = sede ? store.getInstitucionByDane(sede.codigo_dane_ie) : null;
            const mpio = ie ? store.getMunicipios().find(m => String(m.codigo) === String(ie.codigo_municipio)) : null;

            const target = await window.googleDriveClient.getTargetFolderForDocument({
                codigo_mpio: mpio ? mpio.codigo : '17000',
                nombre_mpio: mpio ? mpio.nombre : 'Caldas',
                dane_ie: ie ? ie.codigo_dane : '000000',
                nombre_ie: ie ? ie.nombre : 'IE',
                dane_sede: doc.codigo_dane_sede,
                nombre_sede: sede ? sede.nombre : 'Sede',
                tipo_documento: doc.tipo_documento,
                estado: doc.estado,
                documento_estudiante: doc.estudiante_documento
            });

            const uploadRes = await window.googleDriveClient.uploadFile({
                folderId: target.folderId,
                folderPath: target.pathSegments,
                docId: doc.id,
                filename: doc.nombre_archivo,
                mimeType: blob.type || 'application/octet-stream',
                blob: blob,
                description: description,
                existingFileId: doc.drive_id
            });

            doc.drive_id = uploadRes.id;
            doc.drive_folder_id = target.folderId;
            doc.drive_path = target.relativePath;
            store.persist();
        } catch (e) {
            console.warn('Advertencia en sincronización Drive del workflow:', e);
        }
    }
}

// Singleton global
window.approvalWorkflow = new ApprovalWorkflowEngine();
