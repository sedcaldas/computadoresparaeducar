/* ==========================================================================
   CLIENTE API - GESTIÓN DOCUMENTAL CALDAS
   Soporta conexión en vivo con Backend FastAPI y Fallback para GitHub Pages
   ========================================================================== */

const API_BASE = window.location.origin.includes(':8050') 
  ? window.location.origin + '/api'
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://127.0.0.1:8050/api' 
      : 'https://api.cpe.educacion.caldas.gov.co/api');

// ----------------- DATOS Y MOCK BACKEND PARA GITHUB PAGES -----------------
const MOCK_STORAGE_KEY = 'cpe_caldas_mock_db_v1';

class MockBackend {
  static getDB() {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    const initial = {
      usuarios: [
        { id: 1, username: 'admin', rol: 'administrador', nombre_completo: 'Administrador del Sistema', email: 'admin.tecnologia@caldas.gov.co' },
        { id: 2, username: 'coordinador_caldas', rol: 'coordinador', nombre_completo: 'Coordinador Departamental Caldas', email: 'coordinador.caldas@cpe.gov.co' },
        { id: 45, username: '117013000306', rol: 'rector', nombre_completo: 'Rector(a) - I.E. MARINO GOMEZ ESTRADA', codigo_dane_ie: '117013000306', email: 'rector.marino@caldas.gov.co' },
        { id: 7, username: '117088000255', rol: 'rector', nombre_completo: 'Rector(a) - I.E. CRISTO REY', codigo_dane_ie: '117088000255', email: 'rector.cristorey@caldas.gov.co' },
        { id: 59, username: '1059812839', rol: 'acudiente', nombre_completo: 'DURBAY PATRICIA BETANCUR CARDONA', documento_estudiante: '1059812839', email: 'acudiente.vargas@gmail.com' }
      ],
      estudiantes: [
        { documento_identidad: '1059812839', nombre_completo: 'MARIA FERNANDA VARGAS BETANCUR', codigo_dane_sede: '117013000306', nombre_sede: 'I.E. MARINO GOMEZ ESTRADA - SEDE PRINCIPAL', nombre_ie: 'INSTITUCION EDUCATIVA MARINO GOMEZ ESTRADA', nombre_mpio: 'Aguadas', tipo_terminal: 'Tableta', serial_asignado: 'TAB-LEN-2026-001', acudiente_nombres: 'DURBAY PATRICIA BETANCUR CARDONA', acudiente_documento: '24370801', acudiente_telefono: '3128945612', doc_id: 1, doc_estado: 'Generado', version_actual: 1 },
        { documento_identidad: '1059812816', nombre_completo: 'EMANUEL RAMIREZ LOPEZ', codigo_dane_sede: '117013000306', nombre_sede: 'I.E. MARINO GOMEZ ESTRADA - SEDE PRINCIPAL', nombre_ie: 'INSTITUCION EDUCATIVA MARINO GOMEZ ESTRADA', nombre_mpio: 'Aguadas', tipo_terminal: 'Tableta', serial_asignado: 'TAB-LEN-2026-002', acudiente_nombres: 'LUZ ADRIANA LÓPEZ MURILLO', acudiente_documento: '24370572', acudiente_telefono: '3147895214', doc_id: 2, doc_estado: 'En revisión del rector', version_actual: 1 },
        { documento_identidad: '1054480366', nombre_completo: 'JUAN JOSE GRISALES SANCHEZ', codigo_dane_sede: '117088000255', nombre_sede: 'I.E. CRISTO REY - SEDE PRINCIPAL', nombre_ie: 'INSTITUCION EDUCATIVA CRISTO REY', nombre_mpio: 'Belalcázar', tipo_terminal: 'Tableta', serial_asignado: 'TAB-LEN-2026-003', acudiente_nombres: 'MARÍA ROSA SÁNCHEZ NOREÑA', acudiente_documento: '24527859', acudiente_telefono: '3114569874', doc_id: 3, doc_estado: 'En revisión del coordinador', version_actual: 1 },
        { documento_identidad: '1089606334', nombre_completo: 'JOSE MIGUEL OROZCO ARISTIZABAL', codigo_dane_sede: '117088000255', nombre_sede: 'I.E. CRISTO REY - SEDE PRINCIPAL', nombre_ie: 'INSTITUCION EDUCATIVA CRISTO REY', nombre_mpio: 'Belalcázar', tipo_terminal: 'Tableta', serial_asignado: 'TAB-LEN-2026-004', acudiente_nombres: 'ALEJANDRA ARISTIZÁBAL VELANDIA', acudiente_documento: '24529213', acudiente_telefono: '3206541289', doc_id: 4, doc_estado: 'Aprobado', version_actual: 1 },
        { documento_identidad: '1055890618', nombre_completo: 'SNEIDER GALLEGO RUIZ', codigo_dane_sede: '117088000255', nombre_sede: 'I.E. CRISTO REY - SEDE PRINCIPAL', nombre_ie: 'INSTITUCION EDUCATIVA CRISTO REY', nombre_mpio: 'Belalcázar', tipo_terminal: 'Portátil', serial_asignado: 'PF4582X005', acudiente_nombres: 'ALBANORA RUIZ VALENCIA', acudiente_documento: '24730051', acudiente_telefono: '3157841236', doc_id: 5, doc_estado: 'Devuelto al acudiente', version_actual: 1 }
      ],
      bolsa_sedes: [
        { codigo_dane_sede: '117013000306', nombre_sede: 'I.E. MARINO GOMEZ ESTRADA - SEDE PRINCIPAL', radicado: '86471', dane_ie: '117013000306', nombre_ie: 'INSTITUCION EDUCATIVA MARINO GOMEZ ESTRADA', nombre_mpio: 'Aguadas', doc26_id: 261, doc26_estado: 'En revisión del coordinador', doc26_version: 1, doc29_id: 291, doc29_estado: 'En revisión del coordinador', doc29_version: 1 },
        { codigo_dane_sede: '117088000255', nombre_sede: 'I.E. CRISTO REY - SEDE PRINCIPAL', radicado: '32741', dane_ie: '117088000255', nombre_ie: 'INSTITUCION EDUCATIVA CRISTO REY', nombre_mpio: 'Belalcázar', doc26_id: 262, doc26_estado: 'Aprobado', doc26_version: 1, doc29_id: 292, doc29_estado: 'Aprobado', doc29_version: 1 },
        { codigo_dane_sede: '217042000255', nombre_sede: 'SEDE VILLA OROZCO', radicado: '9088', dane_ie: '217042000913', nombre_ie: 'INSTITUCION EDUCATIVA EL HORRO', nombre_mpio: 'Anserma', doc26_id: 263, doc26_estado: 'Borrador', doc26_version: 1, doc29_id: 293, doc29_estado: 'Borrador', doc29_version: 1 }
      ],
      documentos: [
        { id: 1, tipo_documento: 'LOG-007-F', codigo_dane_sede: '117013000306', estudiante_documento: '1059812839', nombre_estudiante: 'MARIA FERNANDA VARGAS BETANCUR', nombre_mpio: 'Aguadas', nombre_ie: 'INSTITUCION EDUCATIVA MARINO GOMEZ ESTRADA', nombre_sede: 'I.E. MARINO GOMEZ ESTRADA - SEDE PRINCIPAL', estado: 'Generado', version_actual: 1 },
        { id: 2, tipo_documento: 'LOG-007-F', codigo_dane_sede: '117013000306', estudiante_documento: '1059812816', nombre_estudiante: 'EMANUEL RAMIREZ LOPEZ', nombre_mpio: 'Aguadas', nombre_ie: 'INSTITUCION EDUCATIVA MARINO GOMEZ ESTRADA', nombre_sede: 'I.E. MARINO GOMEZ ESTRADA - SEDE PRINCIPAL', estado: 'En revisión del rector', version_actual: 1 },
        { id: 3, tipo_documento: 'LOG-007-F', codigo_dane_sede: '117088000255', estudiante_documento: '1054480366', nombre_estudiante: 'JUAN JOSE GRISALES SANCHEZ', nombre_mpio: 'Belalcázar', nombre_ie: 'INSTITUCION EDUCATIVA CRISTO REY', nombre_sede: 'I.E. CRISTO REY - SEDE PRINCIPAL', estado: 'En revisión del coordinador', version_actual: 1 },
        { id: 4, tipo_documento: 'LOG-007-F', codigo_dane_sede: '117088000255', estudiante_documento: '1089606334', nombre_estudiante: 'JOSE MIGUEL OROZCO ARISTIZABAL', nombre_mpio: 'Belalcázar', nombre_ie: 'INSTITUCION EDUCATIVA CRISTO REY', nombre_sede: 'I.E. CRISTO REY - SEDE PRINCIPAL', estado: 'Aprobado', version_actual: 1 },
        { id: 5, tipo_documento: 'LOG-007-F', codigo_dane_sede: '117088000255', estudiante_documento: '1055890618', nombre_estudiante: 'SNEIDER GALLEGO RUIZ', nombre_mpio: 'Belalcázar', nombre_ie: 'INSTITUCION EDUCATIVA CRISTO REY', nombre_sede: 'I.E. CRISTO REY - SEDE PRINCIPAL', estado: 'Devuelto al acudiente', version_actual: 1 },
        { id: 261, tipo_documento: 'LOG-026-F', codigo_dane_sede: '117013000306', nombre_estudiante: null, radicado: '86471', nombre_mpio: 'Aguadas', nombre_ie: 'INSTITUCION EDUCATIVA MARINO GOMEZ ESTRADA', nombre_sede: 'I.E. MARINO GOMEZ ESTRADA - SEDE PRINCIPAL', estado: 'En revisión del coordinador', version_actual: 1 },
        { id: 291, tipo_documento: 'LOG-029-F', codigo_dane_sede: '117013000306', nombre_estudiante: null, radicado: '86471', nombre_mpio: 'Aguadas', nombre_ie: 'INSTITUCION EDUCATIVA MARINO GOMEZ ESTRADA', nombre_sede: 'I.E. MARINO GOMEZ ESTRADA - SEDE PRINCIPAL', estado: 'En revisión del coordinador', version_actual: 1 },
        { id: 262, tipo_documento: 'LOG-026-F', codigo_dane_sede: '117088000255', nombre_estudiante: null, radicado: '32741', nombre_mpio: 'Belalcázar', nombre_ie: 'INSTITUCION EDUCATIVA CRISTO REY', nombre_sede: 'I.E. CRISTO REY - SEDE PRINCIPAL', estado: 'Aprobado', version_actual: 1 }
      ],
      auditoria: [
        { id: 1, timestamp: '2026-10-21 16:20:19', username: 'admin', rol: 'administrador', accion: 'INICIALIZACION_SISTEMA', entidad: 'BASE_DE_DATOS', detalles_json: '{"mensaje": "Base cargada desde archivos Excel oficiales"}' },
        { id: 2, timestamp: '2026-10-21 16:30:10', username: 'coordinador_caldas', rol: 'coordinador', accion: 'APROBACION_FINAL', entidad: 'documentos', detalles_json: '{"documento_id": 4, "estado": "Aprobado"}' }
      ]
    };
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  static saveDB(db) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
  }

  static handle(endpoint, options) {
    const db = MockBackend.getDB();
    const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : {}) : {};

    // 1. Auth Login
    if (endpoint === '/auth/login') {
      const { username, password } = body;
      let matched = db.usuarios.find(u => u.username === username);
      if (!matched) {
        if (username === 'admin') matched = db.usuarios[0];
        else if (username === 'coordinador_caldas') matched = db.usuarios[1];
        else if (username.startsWith('117')) matched = { id: 45, username, rol: 'rector', nombre_completo: `Rector(a) DANE ${username}`, codigo_dane_ie: username };
        else matched = { id: 59, username, rol: 'acudiente', nombre_completo: `Acudiente Estudiante ${username}`, documento_estudiante: username };
      }
      return {
        access_token: 'mock-jwt-token-' + matched.id,
        token_type: 'bearer',
        user: matched
      };
    }

    // 2. Dashboard Stats
    if (endpoint === '/stats') {
      return {
        total_estudiantes: 90,
        total_sedes: 67,
        total_instituciones: 65,
        total_documentos: db.documentos.length + 80,
        por_estado: {
          'Aprobado': db.documentos.filter(d => d.estado === 'Aprobado').length + 15,
          'En revisión del coordinador': db.documentos.filter(d => d.estado.includes('coordinador')).length + 10,
          'En revisión del rector': db.documentos.filter(d => d.estado.includes('rector')).length + 8,
          'Generado': 40
        },
        por_formato: {
          'LOG-007-F': 90,
          'LOG-026-F': 43,
          'LOG-029-F': 43
        }
      };
    }

    // 3. Acudiente Expediente
    if (endpoint === '/acudiente/expediente') {
      const est = db.estudiantes[0];
      const doc = db.documentos.find(d => d.id === est.doc_id) || db.documentos[0];
      return {
        estudiante: est,
        documento: doc,
        observaciones: doc.estado.includes('Devuelto') ? [{ comentarios: 'Firma poco legible, favor tomar fotografía con mejor luz.' }] : []
      };
    }

    if (endpoint === '/acudiente/cargar-firmado') {
      const doc = db.documentos[0];
      doc.estado = 'En revisión del rector';
      doc.version_actual += 1;
      db.auditoria.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        username: 'acudiente',
        rol: 'acudiente',
        accion: 'CARGAR_FIRMADO',
        entidad: 'documentos',
        detalles_json: '{"mensaje": "Documento firmado cargado por acudiente"}'
      });
      MockBackend.saveDB(db);
      return { success: true, nuevo_estado: doc.estado, version: doc.version_actual };
    }

    // 4. Rector Estudiantes & Bolsa
    if (endpoint === '/rector/estudiantes') {
      return db.estudiantes;
    }

    if (endpoint === '/rector/documentos-bolsa') {
      return db.bolsa_sedes;
    }

    if (endpoint === '/rector/generar-bolsa') {
      return { success: true, message: 'Formatos generados' };
    }

    if (endpoint === '/rector/revisar-documento') {
      const { documento_id, accion, comentarios } = body;
      const doc = db.documentos.find(d => d.id === documento_id);
      if (doc) {
        doc.estado = accion === 'aprobar_rector' ? 'En revisión del coordinador' : 'Devuelto al acudiente';
        doc.version_actual += 1;
        db.auditoria.unshift({
          id: Date.now(),
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          username: 'rector',
          rol: 'rector',
          accion: accion.toUpperCase(),
          entidad: 'documentos',
          detalles_json: JSON.stringify({ comentarios })
        });
        MockBackend.saveDB(db);
      }
      return { success: true, nuevo_estado: doc ? doc.estado : 'Actualizado' };
    }

    if (endpoint === '/rector/cargar-en-nombre-acudiente') {
      return { success: true, nuevo_estado: 'En revisión del rector' };
    }

    // 5. Coordinador
    if (endpoint.startsWith('/coordinador/documentos-revision')) {
      return db.documentos;
    }

    if (endpoint === '/coordinador/revisar-documento') {
      const { documento_id, accion, comentarios } = body;
      const doc = db.documentos.find(d => d.id === documento_id);
      if (doc) {
        doc.estado = accion === 'aprobar_coordinador' ? 'Aprobado' : 'Devuelto al rector';
        doc.version_actual += 1;
        db.auditoria.unshift({
          id: Date.now(),
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          username: 'coordinador_caldas',
          rol: 'coordinador',
          accion: accion.toUpperCase(),
          entidad: 'documentos',
          detalles_json: JSON.stringify({ comentarios })
        });
        MockBackend.saveDB(db);
      }
      return { success: true, nuevo_estado: doc ? doc.estado : 'Actualizado' };
    }

    // 6. Admin
    if (endpoint === '/admin/usuarios') {
      return db.usuarios;
    }

    if (endpoint === '/admin/serials/preview') {
      const records = body.registros || [];
      return {
        total_recibidos: records.length,
        total_validos: records.length,
        total_conflictos: 0,
        total_sin_cambio: 0,
        actualizaciones_validas: records.map(r => ({
          documento: r.documento_estudiante,
          nombre: 'ESTUDIANTE CALDAS BENEFICIARIO',
          sede: 'SEDE PRINCIPAL',
          tipo_terminal: 'Tableta',
          serial_anterior: '0',
          serial_nuevo: r.nuevo_serial
        })),
        conflictos: [],
        listo_para_aplicar: true
      };
    }

    if (endpoint === '/admin/serials/apply') {
      return { success: true, actualizaciones_aplicadas: (body.registros || []).length, mensaje: 'Seriales actualizados exitosamente en modo demostración.' };
    }

    if (endpoint === '/admin/generar-masivo') {
      return { success: true, generados: 90, errores: [] };
    }

    if (endpoint.startsWith('/admin/auditoria')) {
      return db.auditoria;
    }

    if (endpoint === '/admin/drive-status') {
      return {
        root_folder_id: '1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51',
        has_real_credentials: true,
        mirror_path: '/Bolsa_Tecnologica_Caldas/',
        status: 'Conectado a estructura institucional /Bolsa_Tecnologica_Caldas/'
      };
    }

    return { success: true };
  }
}

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    this.isMockMode = false;
  }

  setSession(token, user) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  clearSession() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  }

  async request(endpoint, options = {}) {
    // Si ya detectamos que estamos en modo estático/mock (GitHub Pages) o no hay backend
    if (this.isMockMode) {
      console.log(`[API Mock] Atendiendo ${endpoint}`);
      return MockBackend.handle(endpoint, options);
    }

    const headers = options.headers || {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        this.clearSession();
        window.location.reload();
        throw new Error('Sesión expirada');
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || data.message || 'Error en la petición');
        }
        return data;
      } else if (contentType.includes('application/zip') || contentType.includes('octet-stream') || contentType.includes('docx') || contentType.includes('xlsx')) {
        if (!response.ok) throw new Error('Error al descargar archivo');
        return await response.blob();
      } else {
        return await response.text();
      }
    } catch (err) {
      // Si falla la conexión por red (Failed to fetch en GitHub Pages), activar fallback transparente
      if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
        console.warn(`[API] Fallo de red con ${API_BASE}. Activando modo demostración local para GitHub Pages.`);
        this.isMockMode = true;
        
        // Notificar en la interfaz si existe contenedor
        const banner = document.getElementById('demo-mode-notice');
        if (banner) banner.style.display = 'block';

        return MockBackend.handle(endpoint, options);
      }
      throw err;
    }
  }

  // Auth
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.setSession(data.access_token, data.user);
    return data;
  }

  async getMe() {
    return await this.request('/auth/me');
  }

  // Dashboard Stats
  async getStats() {
    return await this.request('/stats');
  }

  // Acudiente
  async getAcudienteExpediente() {
    return await this.request('/acudiente/expediente');
  }

  async uploadAcudienteFirmado(file, comentario) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('comentario', comentario);
    return await this.request('/acudiente/cargar-firmado', {
      method: 'POST',
      body: formData
    });
  }

  // Rector
  async getRectorEstudiantes() {
    return await this.request('/rector/estudiantes');
  }

  async getRectorBolsa() {
    return await this.request('/rector/documentos-bolsa');
  }

  async rectorGenerarBolsa(daneSede) {
    const formData = new FormData();
    formData.append('dane_sede', daneSede);
    return await this.request('/rector/generar-bolsa', {
      method: 'POST',
      body: formData
    });
  }

  async rectorRevisarDoc(documentoId, accion, comentarios) {
    return await this.request('/rector/revisar-documento', {
      method: 'POST',
      body: JSON.stringify({
        documento_id: documentoId,
        accion: accion,
        comentarios: comentarios
      })
    });
  }

  async rectorUploadOnBehalf(documentoId, file, motivo, comentario) {
    const formData = new FormData();
    formData.append('documento_id', documentoId);
    formData.append('file', file);
    formData.append('motivo', motivo);
    formData.append('comentario', comentario);
    return await this.request('/rector/cargar-en-nombre-acudiente', {
      method: 'POST',
      body: formData
    });
  }

  // Coordinador
  async getCoordinadorDocs(filtros = {}) {
    const params = new URLSearchParams(filtros).toString();
    return await this.request(`/coordinador/documentos-revision?${params}`);
  }

  async coordinadorRevisarDoc(documentoId, accion, comentarios) {
    return await this.request('/coordinador/revisar-documento', {
      method: 'POST',
      body: JSON.stringify({
        documento_id: documentoId,
        accion: accion,
        comentarios: comentarios
      })
    });
  }

  async coordinadorUploadOnBehalf(documentoId, file, accion, motivo, comentario) {
    const formData = new FormData();
    formData.append('documento_id', documentoId);
    if (file) formData.append('file', file);
    formData.append('accion', accion);
    formData.append('motivo', motivo);
    formData.append('comentario', comentario);
    return await this.request('/coordinador/cargar-en-nombre-rector', {
      method: 'POST',
      body: formData
    });
  }

  getZipDownloadUrl(filtros = {}) {
    if (this.isMockMode) {
      return 'data:application/zip;base64,UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==';
    }
    const params = new URLSearchParams(filtros);
    if (this.token) params.append('token', this.token);
    return `${API_BASE}/coordinador/descargar-lote-zip?${params.toString()}`;
  }

  // Admin
  async getAdminUsers() {
    return await this.request('/admin/usuarios');
  }

  async previewSerials(registros) {
    return await this.request('/admin/serials/preview', {
      method: 'POST',
      body: JSON.stringify({ registros })
    });
  }

  async applySerials(registros, motivo) {
    return await this.request('/admin/serials/apply', {
      method: 'POST',
      body: JSON.stringify({ registros, motivo })
    });
  }

  async adminGenerarMasivo(tipoFormato) {
    const formData = new FormData();
    formData.append('tipo_formato', tipoFormato);
    return await this.request('/admin/generar-masivo', {
      method: 'POST',
      body: formData
    });
  }

  async getAuditLogs(limit = 100) {
    return await this.request(`/admin/auditoria?limit=${limit}`);
  }

  async getDriveStatus() {
    return await this.request('/admin/drive-status');
  }

  getDocumentDownloadUrl(docId) {
    if (this.isMockMode) {
      return '#';
    }
    return `${API_BASE}/documentos/${docId}/descargar?token=${this.token || ''}`;
  }
}

window.api = new ApiClient();
