/* ==========================================================================
   CLIENTE API - GESTIÓN DOCUMENTAL CALDAS
   Soporta conexión en vivo con Backend FastAPI y Fallback para GitHub Pages
   ========================================================================== */

const API_BASE = window.location.origin.includes(':8050') 
  ? window.location.origin + '/api'
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://127.0.0.1:8050/api' 
      : 'https://api.cpe.educacion.caldas.gov.co/api');

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
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
      console.warn(`[API] Fallo en ${endpoint}:`, err.message);
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
    return `${API_BASE}/documentos/${docId}/descargar?token=${this.token || ''}`;
  }
}

window.api = new ApiClient();
