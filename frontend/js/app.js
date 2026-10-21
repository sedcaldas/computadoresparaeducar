/* ==========================================================================
   APLICACIÓN PRINCIPAL - GESTIÓN DOCUMENTAL COMPUTADORES PARA EDUCAR
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let currentModalAction = null;

async function initApp() {
  setupGlobalListeners();
  
  if (window.api.currentUser) {
    renderAppShell();
  } else {
    renderLoginView();
  }
}

function setupGlobalListeners() {
  // Modal close buttons
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  // Close modal when clicking on overlay
  const overlay = document.getElementById('global-modal');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }
}

// ----------------- CONTROL DE SESIÓN Y VISTAS -----------------

function renderLoginView() {
  const container = document.getElementById('app-root');
  document.getElementById('user-header-nav').innerHTML = '';

  container.innerHTML = `
    <div style="max-width: 440px; margin: 40px auto; padding: 20px;">
      <div class="card" style="padding: 32px; box-shadow: var(--shadow-lg); border-top: 4px solid var(--primary);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div class="brand-badge" style="width: 56px; height: 56px; margin: 0 auto 12px; font-size: 1.8rem;">📄</div>
          <h2 style="color: var(--primary-dark); font-size: 1.35rem; font-weight: 800;">Acceso Institucional</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">Secretaría de Educación de Caldas & Computadores para Educar</p>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label for="username">Usuario / Identificación</label>
            <input type="text" id="username" placeholder="Cédula, DANE IE o alias" required autocomplete="username">
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <input type="password" id="password" placeholder="••••••••" required autocomplete="current-password">
          </div>

          <div id="login-error" class="alert alert-danger" style="display: none; padding: 10px 14px; font-size: 0.82rem;"></div>

          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 0.95rem; margin-top: 8px;">
            Ingresar al Portal
          </button>
        </form>

        <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-color); text-align: center;">
          <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 10px; font-weight: 600;">
            ACCESO RÁPIDO PARA EVALUACIÓN / DEMO:
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="quickLogin('admin', 'gcaldas2026*')">🔑 Admin</button>
            <button class="btn btn-secondary btn-sm" onclick="quickLogin('coordinador_caldas', 'gcaldas2026*')">📋 Coordinador</button>
            <button class="btn btn-secondary btn-sm" onclick="quickLogin('117013000306', '117013000306')">🏫 Rector (Aguadas)</button>
            <button class="btn btn-secondary btn-sm" onclick="quickLogin('1059812839', '1059812839')">👨‍👧 Acudiente</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value;
    const errBox = document.getElementById('login-error');
    errBox.style.display = 'none';

    try {
      await window.api.login(u, p);
      renderAppShell();
    } catch (err) {
      errBox.innerText = err.message || 'Credenciales incorrectas.';
      errBox.style.display = 'flex';
    }
  });
}

async function quickLogin(u, p) {
  try {
    await window.api.login(u, p);
    renderAppShell();
  } catch (err) {
    alert("Error en login demo: " + err.message);
  }
}

function logout() {
  window.api.clearSession();
  renderLoginView();
}

function renderAppShell() {
  const user = window.api.currentUser;
  
  // Render user header
  document.getElementById('user-header-nav').innerHTML = `
    <div style="text-align: right; line-height: 1.2;">
      <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${user.nombre_completo}</div>
      <div style="font-size: 0.72rem; color: var(--text-muted);">${user.email || user.username}</div>
    </div>
    <span class="role-pill role-${user.rol}">${user.rol}</span>
    <button class="btn btn-secondary btn-sm" onclick="logout()" title="Cerrar sesión">Salir</button>
  `;

  const container = document.getElementById('app-root');
  
  if (user.rol === 'acudiente') {
    renderAcudienteView(container);
  } else if (user.rol === 'rector') {
    renderRectorView(container);
  } else if (user.rol === 'coordinador') {
    renderCoordinadorView(container);
  } else if (user.rol === 'administrador') {
    renderAdminView(container);
  }
}

// ----------------- VISTA ACUDIENTE -----------------

async function renderAcudienteView(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="font-size: 1.5rem; color: var(--primary);">Cargando expediente del estudiante...</div>
    </div>
  `;

  try {
    const data = await window.api.getAcudienteExpediente();
    const est = data.estudiante;
    const doc = data.documento;
    const obs = data.observaciones || [];

    const isDevuelto = doc.estado.includes('Devuelto');
    const isAprobado = doc.estado === 'Aprobado';
    const isRevision = doc.estado.includes('revisión');

    container.innerHTML = `
      <div class="acudiente-hero">
        <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 6px;">
          Acta de Entrega de Equipo Tecnológico
        </h2>
        <p style="opacity: 0.9; font-size: 0.95rem;">
          Programa Computadores para Educar — Secretaría de Educación de Caldas
        </p>
      </div>

      <!-- Alertas de estado -->
      ${isDevuelto ? `
        <div class="alert alert-warning">
          <div style="font-size: 1.4rem;">⚠️</div>
          <div>
            <strong>El documento necesita corrección:</strong><br>
            ${obs.length > 0 ? obs[0].comentarios : 'Por favor verifique las firmas y vuelva a cargar.'}
          </div>
        </div>
      ` : ''}

      ${isAprobado ? `
        <div class="alert alert-success">
          <div style="font-size: 1.4rem;">✅</div>
          <div>
            <strong>¡Documento Aprobado Exitosamente!</strong><br>
            El acta de entrega cuenta con la aprobación formal del Rector y de la Coordinación Departamental.
          </div>
        </div>
      ` : ''}

      ${isRevision ? `
        <div class="alert alert-warning" style="background: rgba(37, 99, 235, 0.1); border-color: rgba(37, 99, 235, 0.3); color: #1E40AF;">
          <div style="font-size: 1.4rem;">⏳</div>
          <div>
            <strong>Documento en proceso de revisión:</strong><br>
            Estado actual: <strong>${doc.estado}</strong>. Le notificaremos cuando sea validado.
          </div>
        </div>
      ` : ''}

      <!-- Información del Estudiante y Equipo -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">👦 Datos del Menor Beneficiario</h3>
          <span class="status-badge status-${doc.estado.replace(/\s+/g, '')}">${doc.estado}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; font-size: 0.9rem;">
          <div><span style="color: var(--text-muted);">Estudiante:</span><br><strong>${est.nombre_completo}</strong></div>
          <div><span style="color: var(--text-muted);">Documento Identidad:</span><br><strong>${est.documento_identidad}</strong></div>
          <div><span style="color: var(--text-muted);">Sede Educativa:</span><br><strong>${est.nombre_sede}</strong></div>
          <div><span style="color: var(--text-muted);">Municipio:</span><br><strong>${est.nombre_mpio}</strong></div>
          <div><span style="color: var(--text-muted);">Equipo Asignado:</span><br><strong>${est.tipo_terminal || 'Tableta'}</strong></div>
          <div><span style="color: var(--text-muted);">Acudiente Registrado:</span><br><strong>${est.acudiente_nombres || 'No registrado'}</strong></div>
        </div>
      </div>

      <!-- FLUJO EN 3 PASOS SIMPLES -->
      <h3 style="color: var(--primary-dark); font-size: 1.25rem; font-weight: 800; margin-bottom: 16px;">
        Instrucciones para Legalizar la Entrega (3 Pasos):
      </h3>

      <!-- PASO 1 -->
      <div class="step-card active">
        <div style="display: flex; align-items: flex-start;">
          <div class="step-number">1</div>
          <div style="flex: 1;">
            <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--primary-dark);">Descargar el Formato Oficial</h4>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 4px;">
              Descargue el acta oficial pre-diligenciada con los datos de su hijo(a) y su institución educativa.
            </p>
            <a href="${window.api.getDocumentDownloadUrl(doc.id)}" target="_blank" class="step-action-btn btn-download">
              📥 Descargar Acta LOG-007-F
            </a>
          </div>
        </div>
      </div>

      <!-- PASO 2 -->
      <div class="step-card">
        <div style="display: flex; align-items: flex-start;">
          <div class="step-number">2</div>
          <div style="flex: 1;">
            <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--primary-dark);">Firmar Físicamente el Documento</h4>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 4px;">
              Imprima la hoja o solicítela en la sede educativa. Firme a mano en la casilla del acudiente y tome una foto clara y legible con su celular.
            </p>
          </div>
        </div>
      </div>

      <!-- PASO 3 -->
      <div class="step-card ${isAprobado ? '' : 'active'}">
        <div style="display: flex; align-items: flex-start;">
          <div class="step-number">3</div>
          <div style="flex: 1;">
            <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--primary-dark);">Subir el Documento Firmado</h4>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 4px;">
              Adjunte la fotografía o archivo PDF del acta con su firma manuscrita para enviarla a revisión del Rector.
            </p>

            ${!isAprobado ? `
              <form id="form-upload-signed" style="margin-top: 14px;">
                <div class="form-group" style="max-width: 420px;">
                  <input type="file" id="file-signed" accept=".pdf,image/*,.docx" required style="padding: 10px; background: var(--bg-alt);">
                </div>
                <div class="form-group" style="max-width: 420px;">
                  <input type="text" id="comentario-signed" placeholder="Observación opcional (ej. Firmado por madre)" style="font-size: 0.85rem;">
                </div>
                <button type="submit" class="step-action-btn btn-upload">
                  📤 Subir Formato Firmado y Enviar al Rector
                </button>
              </form>
            ` : `
              <div style="margin-top: 10px; color: var(--success); font-weight: 700;">
                ✓ Proceso completado exitosamente. No se requieren más acciones.
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    const uploadForm = document.getElementById('form-upload-signed');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('file-signed');
        if (!fileInput.files.length) return alert('Por favor seleccione un archivo.');
        const file = fileInput.files[0];
        const comment = document.getElementById('comentario-signed').value;

        try {
          await window.api.uploadAcudienteFirmado(file, comment);
          alert('¡Documento cargado exitosamente! Ha sido remitido al Rector para revisión.');
          renderAcudienteView(container);
        } catch (err) {
          alert('Error al cargar documento: ' + err.message);
        }
      });
    }

  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger" style="margin: 40px auto; max-width: 600px;">
        Error al cargar expediente: ${err.message}
      </div>
    `;
  }
}

// ----------------- VISTA RECTOR -----------------

async function renderRectorView(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div>
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--primary-dark);">Mesa de Revisión del Rector</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Gestión de actas individuales y dotación de Bolsa Tecnológica</p>
      </div>
    </div>

    <div class="tab-nav">
      <button class="tab-btn active" onclick="switchRectorTab('estudiantes')">Actas de Estudiantes (LOG-007-F)</button>
      <button class="tab-btn" onclick="switchRectorTab('bolsa')">Bolsa Tecnológica (LOG-026-F / LOG-029-F)</button>
    </div>

    <div id="rector-tab-content">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">Cargando registros...</div>
    </div>
  `;

  loadRectorEstudiantes();
}

window.switchRectorTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'estudiantes') loadRectorEstudiantes();
  if (tab === 'bolsa') loadRectorBolsa();
};

async function loadRectorEstudiantes() {
  const content = document.getElementById('rector-tab-content');
  try {
    const list = await window.api.getRectorEstudiantes();
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">👦 Estudiantes Beneficiarios Asignados (${list.length})</h3>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre del Estudiante</th>
                <th>Sede Educativa</th>
                <th>Terminal</th>
                <th>Serial</th>
                <th>Estado Documento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(e => `
                <tr>
                  <td><strong>${e.documento_identidad}</strong></td>
                  <td>${e.nombre_completo}</td>
                  <td>${e.nombre_sede}</td>
                  <td>${e.tipo_terminal || 'Tableta'}</td>
                  <td><code>${e.serial_asignado || '0'}</code></td>
                  <td><span class="status-badge status-${(e.doc_estado || 'Pendiente').replace(/\s+/g, '')}">${e.doc_estado || 'Sin generar'}</span></td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      ${e.doc_id ? `
                        <a href="${window.api.getDocumentDownloadUrl(e.doc_id)}" target="_blank" class="btn btn-secondary btn-sm" title="Descargar acta">📥</a>
                        <button class="btn btn-primary btn-sm" onclick="openReviewModal(${e.doc_id}, '${e.nombre_completo}', '${e.doc_estado}', 'rector')">Revisar</button>
                      ` : ''}
                      <button class="btn btn-secondary btn-sm" onclick="openOnBehalfModal(${e.doc_id || 0}, '${e.documento_identidad}', '${e.nombre_completo}')" title="Cargar en nombre del acudiente">👤 En nombre</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
  }
}

async function loadRectorBolsa() {
  const content = document.getElementById('rector-tab-content');
  try {
    const list = await window.api.getRectorBolsa();

    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📦 Dotaciones de Bolsa Tecnológica por Sede</h3>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Sede Educativa</th>
                <th>Código DANE Sede</th>
                <th>Radicado</th>
                <th>LOG-026-F (Acta Word)</th>
                <th>LOG-029-F (Informe Excel)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => `
                <tr>
                  <td><strong>${s.nombre_sede}</strong></td>
                  <td>${s.codigo_dane_sede}</td>
                  <td>${s.radicado || 'N/A'}</td>
                  <td>
                    ${s.doc26_id ? `
                      <span class="status-badge status-${(s.doc26_estado || '').replace(/\s+/g, '')}">${s.doc26_estado} (v${s.doc26_version})</span>
                      <a href="${window.api.getDocumentDownloadUrl(s.doc26_id)}" target="_blank" class="btn btn-secondary btn-sm">📥 Word</a>
                    ` : '<span style="color: var(--text-muted);">No generado</span>'}
                  </td>
                  <td>
                    ${s.doc29_id ? `
                      <span class="status-badge status-${(s.doc29_estado || '').replace(/\s+/g, '')}">${s.doc29_estado} (v${s.doc29_version})</span>
                      <a href="${window.api.getDocumentDownloadUrl(s.doc29_id)}" target="_blank" class="btn btn-secondary btn-sm">📥 Excel</a>
                    ` : '<span style="color: var(--text-muted);">No generado</span>'}
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      ${!s.doc26_id || !s.doc29_id ? `
                        <button class="btn btn-primary btn-sm" onclick="generateBolsa('${s.codigo_dane_sede}')">⚡ Generar</button>
                      ` : `
                        <button class="btn btn-primary btn-sm" onclick="remitBolsa(${s.doc26_id}, ${s.doc29_id})">🚀 Remitir a Coord.</button>
                      `}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
  }
}

window.generateBolsa = async function(daneSede) {
  try {
    await window.api.rectorGenerarBolsa(daneSede);
    alert('Documentos LOG-026-F y LOG-029-F generados exitosamente.');
    loadRectorBolsa();
  } catch (err) {
    alert('Error al generar: ' + err.message);
  }
};

window.remitBolsa = async function(doc26Id, doc29Id) {
  if (!confirm('¿Confirma que ha verificado los elementos y desea remitir los formatos al Coordinador para aprobación final?')) return;
  try {
    await window.api.rectorRevisarDoc(doc26Id, 'enviar_coordinador', 'Remitido formalmente por el rector');
    await window.api.rectorRevisarDoc(doc29Id, 'enviar_coordinador', 'Remitido formalmente por el rector');
    alert('Formatos remitidos exitosamente al Coordinador Departamental.');
    loadRectorBolsa();
  } catch (err) {
    alert('Error al remitir: ' + err.message);
  }
};

// ----------------- VISTA COORDINADOR -----------------

async function renderCoordinadorView(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--primary-dark);">Centro de Aprobación del Coordinador</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Control documental departamental y exportación de paquetes oficiales</p>
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="downloadCoordinatorZip()">
          📦 Descargar Paquete ZIP con Manifiesto
        </button>
      </div>
    </div>

    <!-- Barra de Filtros -->
    <div class="card" style="padding: 16px; margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        <div>
          <label style="font-size: 0.78rem;">Filtrar por Formato</label>
          <select id="coord-filter-formato" onchange="loadCoordinadorDocs()">
            <option value="">Todos los formatos</option>
            <option value="LOG-007-F">LOG-007-F (Estudiantes)</option>
            <option value="LOG-026-F">LOG-026-F (Bolsa Word)</option>
            <option value="LOG-029-F">LOG-029-F (Bolsa Excel)</option>
          </select>
        </div>
        <div>
          <label style="font-size: 0.78rem;">Filtrar por Municipio</label>
          <input type="text" id="coord-filter-mpio" placeholder="Buscar municipio..." oninput="loadCoordinadorDocs()">
        </div>
      </div>
    </div>

    <div id="coordinador-table-container">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">Cargando expedientes...</div>
    </div>
  `;

  loadCoordinadorDocs();
}

async function loadCoordinadorDocs() {
  const container = document.getElementById('coordinador-table-container');
  const formato = document.getElementById('coord-filter-formato')?.value || '';
  const mpio = document.getElementById('coord-filter-mpio')?.value || '';

  try {
    const list = await window.api.getCoordinadorDocs({ formato });
    const filtered = list.filter(d => !mpio || (d.nombre_mpio && d.nombre_mpio.toLowerCase().includes(mpio.toLowerCase())));

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📄 Expedientes Documentales (${filtered.length})</h3>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Formato</th>
                <th>Municipio</th>
                <th>Institución / Sede</th>
                <th>Beneficiario / Radicado</th>
                <th>Versión</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(d => `
                <tr>
                  <td>#${d.id}</td>
                  <td><strong>${d.tipo_documento}</strong></td>
                  <td>${d.nombre_mpio}</td>
                  <td>
                    <div style="font-weight: 600;">${d.nombre_ie}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${d.nombre_sede}</div>
                  </td>
                  <td>
                    ${d.nombre_estudiante ? `👦 ${d.nombre_estudiante}` : `Rad: ${d.radicado || 'N/A'}`}
                  </td>
                  <td>v${d.version_actual}</td>
                  <td><span class="status-badge status-${(d.estado || '').replace(/\s+/g, '')}">${d.estado}</span></td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <a href="${window.api.getDocumentDownloadUrl(d.id)}" target="_blank" class="btn btn-secondary btn-sm" title="Descargar documento">📥</a>
                      <button class="btn btn-primary btn-sm" onclick="openReviewModal(${d.id}, '${d.tipo_documento} (${d.nombre_sede})', '${d.estado}', 'coordinador')">
                        Decisión
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
  }
}

window.downloadCoordinatorZip = function() {
  const formato = document.getElementById('coord-filter-formato')?.value || '';
  const url = window.api.getZipDownloadUrl({ formato });
  window.open(url, '_blank');
};

// ----------------- VISTA ADMINISTRADOR -----------------

async function renderAdminView(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div>
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--primary-dark);">Consola de Administración Central</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Supervisión global, actualización de seriales, generación masiva y auditoría</p>
      </div>
    </div>

    <!-- METRICAS DASHBOARD -->
    <div id="admin-stats-grid" class="stat-grid"></div>

    <div class="tab-nav">
      <button class="tab-btn active" onclick="switchAdminTab('seriales')">Actualizador de Seriales</button>
      <button class="tab-btn" onclick="switchAdminTab('generacion')">Generación Masiva</button>
      <button class="tab-btn" onclick="switchAdminTab('usuarios')">Gestión de Usuarios</button>
      <button class="tab-btn" onclick="switchAdminTab('auditoria')">Bitácora de Auditoría</button>
    </div>

    <div id="admin-tab-content"></div>
  `;

  loadAdminStats();
  switchAdminTab('seriales');
}

async function loadAdminStats() {
  const grid = document.getElementById('admin-stats-grid');
  try {
    const stats = await window.api.getStats();
    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--primary-soft); color: var(--primary);">👦</div>
        <div>
          <div class="stat-val">${stats.total_estudiantes}</div>
          <div class="stat-lbl">Estudiantes Beneficiarios</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--gold-soft); color: var(--gold-dark);">🏫</div>
        <div>
          <div class="stat-val">${stats.total_sedes}</div>
          <div class="stat-lbl">Sedes Educativas</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--accent-soft); color: var(--accent);">📄</div>
        <div>
          <div class="stat-val">${stats.total_documentos}</div>
          <div class="stat-lbl">Documentos en Sistema</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--success-soft); color: var(--success);">✅</div>
        <div>
          <div class="stat-val">${stats.por_estado?.['Aprobado'] || 0}</div>
          <div class="stat-lbl">Expedientes Aprobados</div>
        </div>
      </div>
    `;
  } catch (err) {
    console.warn(err);
  }
}

window.switchAdminTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target?.classList.add('active');
  const c = document.getElementById('admin-tab-content');

  if (tab === 'seriales') renderAdminSeriales(c);
  if (tab === 'generacion') renderAdminGeneracion(c);
  if (tab === 'usuarios') renderAdminUsuarios(c);
  if (tab === 'auditoria') renderAdminAuditoria(c);
};

function renderAdminSeriales(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">🔢 Actualización Controlada de Seriales (Sección 9.2)</h3>
      </div>
      <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 16px;">
        Ingrese los registros a actualizar en formato CSV o texto (<code>documento,nuevo_serial</code>). El sistema ejecutará una validación previa detectando conflictos y duplicados antes de aplicar los cambios.
      </p>

      <div class="form-group">
        <label>Pegar Registros (Documento Estudiante, Nuevo Serial)</label>
        <textarea id="serials-input" rows="5" placeholder="1059812839,PF4582X001&#10;1059812816,PF4582X002"></textarea>
      </div>

      <div class="form-group">
        <label>Motivo de la actualización</label>
        <input type="text" id="serials-motive" value="Despacho confirmado por operador logístico">
      </div>

      <button class="btn btn-primary" onclick="previewSerialsAction()">🔍 Validar y Ver Vista Previa</button>

      <div id="serials-preview-area" style="margin-top: 20px;"></div>
    </div>
  `;
}

window.previewSerialsAction = async function() {
  const raw = document.getElementById('serials-input').value.trim();
  const area = document.getElementById('serials-preview-area');
  if (!raw) return alert('Por favor ingrese al menos un registro.');

  const lines = raw.split('\n');
  const records = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 2) {
      records.push({
        documento_estudiante: parts[0].trim(),
        nuevo_serial: parts[1].trim()
      });
    }
  }

  try {
    const res = await window.api.previewSerials(records);
    area.innerHTML = `
      <div style="background: var(--bg-alt); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <strong>Resultado de la validación:</strong><br>
        Recibidos: ${res.total_recibidos} | Válidos: ${res.total_validos} | Conflictos: <span style="color: var(--danger); font-weight: bold;">${res.total_conflictos}</span> | Sin cambio: ${res.total_sin_cambio}
      </div>

      ${res.conflictos.length > 0 ? `
        <div class="alert alert-danger">
          <strong>Conflictos detectados (Impiden aplicar cambios):</strong>
          <ul>
            ${res.conflictos.map(c => `<li>Doc ${c.documento} (Serial: ${c.serial}): ${c.error}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${res.actualizaciones_validas.length > 0 ? `
        <div class="table-responsive" style="margin-bottom: 16px;">
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Estudiante</th>
                <th>Sede</th>
                <th>Terminal</th>
                <th>Serial Anterior</th>
                <th>Serial Nuevo</th>
              </tr>
            </thead>
            <tbody>
              ${res.actualizaciones_validas.map(v => `
                <tr>
                  <td>${v.documento}</td>
                  <td>${v.nombre}</td>
                  <td>${v.sede}</td>
                  <td>${v.tipo_terminal}</td>
                  <td><code>${v.serial_anterior}</code></td>
                  <td><code style="color: var(--primary); font-weight: bold;">${v.serial_nuevo}</code></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${res.listo_para_aplicar ? `
          <button class="btn btn-primary" onclick='applySerialsAction(${JSON.stringify(res.actualizaciones_validas)})'>
            ✅ Confirmar y Aplicar ${res.total_validos} Actualizaciones con Trazabilidad
          </button>
        ` : ''}
      ` : ''}
    `;
  } catch (err) {
    area.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
  }
};

window.applySerialsAction = async function(validRecords) {
  const motive = document.getElementById('serials-motive').value;
  try {
    const res = await window.api.applySerials(validRecords, motive);
    alert(res.mensaje);
    document.getElementById('serials-preview-area').innerHTML = `
      <div class="alert alert-success">${res.mensaje}</div>
    `;
    document.getElementById('serials-input').value = '';
  } catch (err) {
    alert('Error al aplicar seriales: ' + err.message);
  }
};

function renderAdminGeneracion(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">⚡ Generación y Regeneración Masiva de Formatos (Sección 3)</h3>
      </div>
      <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">
        Ejecute la generación masiva de actas Word e informes Excel a partir de los datos base cargados.
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
        <div class="card" style="margin-bottom: 0;">
          <h4 style="font-weight: 700; color: var(--primary-dark);">LOG-007-F (.docx)</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 6px 0 14px;">
            Actas individuales de entrega directa para los 90 estudiantes beneficiarios de Caldas.
          </p>
          <button class="btn btn-primary btn-sm" onclick="triggerBulkGen('LOG-007-F')">Generar LOG-007-F</button>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <h4 style="font-weight: 700; color: var(--primary-dark);">LOG-026-F (.docx)</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 6px 0 14px;">
            Actas de verificación de Bolsa Tecnológica por institución y sede educativa.
          </p>
          <button class="btn btn-primary btn-sm" onclick="triggerBulkGen('LOG-026-F')">Generar LOG-026-F</button>
        </div>

        <div class="card" style="margin-bottom: 0;">
          <h4 style="font-weight: 700; color: var(--primary-dark);">LOG-029-F (.xlsx)</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 6px 0 14px;">
            Informes de validación de elementos en Excel preservando fórmulas oficiales.
          </p>
          <button class="btn btn-primary btn-sm" onclick="triggerBulkGen('LOG-029-F')">Generar LOG-029-F</button>
        </div>
      </div>

      <div id="bulk-gen-result" style="margin-top: 20px;"></div>
    </div>
  `;
}

window.triggerBulkGen = async function(formato) {
  const resultDiv = document.getElementById('bulk-gen-result');
  resultDiv.innerHTML = '<div style="color: var(--primary);">Generando documentos en lote... por favor espere.</div>';
  try {
    const res = await window.api.adminGenerarMasivo(formato);
    resultDiv.innerHTML = `
      <div class="alert alert-success">
        <strong>Generación completada:</strong> Se procesaron exitosamente ${res.generados} documentos de tipo ${formato}.
      </div>
    `;
    loadAdminStats();
  } catch (err) {
    resultDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
  }
};

async function renderAdminUsuarios(container) {
  try {
    const users = await window.api.getAdminUsers();
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">👥 Directorio de Usuarios del Sistema (${users.length})</h3>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Nombre Completo</th>
                <th>DANE IE / Sede / Estudiante</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>${u.id}</td>
                  <td><strong>${u.username}</strong></td>
                  <td><span class="role-pill role-${u.rol}">${u.rol}</span></td>
                  <td>${u.nombre_completo}</td>
                  <td><code>${u.codigo_dane_ie || u.documento_estudiante || 'Global'}</code></td>
                  <td>${u.active ? '🟢 Activo' : '🔴 Inactivo'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
  }
}

async function renderAdminAuditoria(container) {
  try {
    const logs = await window.api.getAuditLogs(50);
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📜 Bitácora de Auditoría Integral (Sección 16)</h3>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td style="white-space: nowrap; font-size: 0.78rem;">${l.timestamp}</td>
                  <td><strong>${l.username || 'Sistema'}</strong></td>
                  <td><span class="role-pill role-${l.rol}">${l.rol || 'sistema'}</span></td>
                  <td><code>${l.accion}</code></td>
                  <td>${l.entidad}</td>
                  <td style="font-size: 0.78rem; max-width: 320px; overflow: hidden; text-overflow: ellipsis;">${l.detalles_json || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
  }
}

// ----------------- MODALES REUTILIZABLES -----------------

window.openReviewModal = function(docId, docName, currentState, reviewerRole) {
  currentModalAction = { docId, reviewerRole };
  const overlay = document.getElementById('global-modal');
  const body = document.getElementById('modal-body-content');
  const title = document.getElementById('modal-title');

  title.innerText = `Revisión Documental: ${docName}`;

  let optionsHtml = '';
  if (reviewerRole === 'rector') {
    optionsHtml = `
      <div class="form-group">
        <label>Decisión del Rector:</label>
        <select id="modal-decision" onchange="toggleCommentRequirement()">
          <option value="aprobar_rector">✅ Aprobar y Remitir al Coordinador</option>
          <option value="devolver_acudiente">❌ Devolver al Acudiente por Inconsistencias</option>
        </select>
      </div>
    `;
  } else if (reviewerRole === 'coordinador') {
    optionsHtml = `
      <div class="form-group">
        <label>Decisión del Coordinador:</label>
        <select id="modal-decision" onchange="toggleCommentRequirement()">
          <option value="aprobar_coordinador">✅ Aprobar Formalmente (Aprobado Final)</option>
          <option value="devolver_rector">❌ Devolver al Rector para Subsanación</option>
        </select>
      </div>
    `;
  }

  body.innerHTML = `
    <p style="margin-bottom: 14px; font-size: 0.88rem; color: var(--text-muted);">
      Estado actual: <strong>${currentState}</strong>
    </p>
    ${optionsHtml}
    <div class="form-group">
      <label id="modal-comment-label">Observaciones / Motivo (Obligatorio en caso de devolución):</label>
      <textarea id="modal-comment" rows="3" placeholder="Especifique con claridad los hallazgos o visto bueno..."></textarea>
    </div>
    <div id="modal-err" class="alert alert-danger" style="display: none; padding: 10px;"></div>
  `;

  document.getElementById('modal-submit-btn').onclick = submitReviewAction;
  overlay.classList.add('open');
};

window.toggleCommentRequirement = function() {
  const dec = document.getElementById('modal-decision').value;
  const lbl = document.getElementById('modal-comment-label');
  if (dec.includes('devolver')) {
    lbl.innerHTML = '<span style="color: var(--danger); font-weight: bold;">* Observaciones / Motivo OBLIGATORIO de Devolución:</span>';
  } else {
    lbl.innerHTML = 'Observaciones adicionales (Opcional):';
  }
};

async function submitReviewAction() {
  const dec = document.getElementById('modal-decision').value;
  const com = document.getElementById('modal-comment').value.trim();
  const errBox = document.getElementById('modal-err');

  if (dec.includes('devolver') && (!com || com.length < 5)) {
    errBox.innerText = 'La devolución exige un motivo y observaciones claras de corrección.';
    errBox.style.display = 'block';
    return;
  }

  try {
    if (currentModalAction.reviewerRole === 'rector') {
      await window.api.rectorRevisarDoc(currentModalAction.docId, dec, com);
    } else {
      await window.api.coordinadorRevisarDoc(currentModalAction.docId, dec, com);
    }
    closeModal();
    alert('Decisión registrada exitosamente.');
    renderAppShell();
  } catch (err) {
    errBox.innerText = err.message;
    errBox.style.display = 'block';
  }
}

window.openOnBehalfModal = function(docId, studentDoc, studentName) {
  const overlay = document.getElementById('global-modal');
  const body = document.getElementById('modal-body-content');
  const title = document.getElementById('modal-title');

  title.innerText = `Carga en Nombre del Acudiente: ${studentName}`;

  body.innerHTML = `
    <div class="alert alert-warning" style="font-size: 0.82rem;">
      Esta acción quedará registrada en la bitácora de auditoría con su usuario, fecha y el motivo formal suministrado.
    </div>
    <div class="form-group">
      <label>* Motivo formal por el cual actúa en representación del acudiente:</label>
      <input type="text" id="onbehalf-motive" placeholder="Ej. Acudiente sin conectividad en zona rural veredal" required>
    </div>
    <div class="form-group">
      <label>* Archivo físico firmado (PDF, imagen o Word):</label>
      <input type="file" id="onbehalf-file" accept=".pdf,image/*,.docx" required>
    </div>
    <div class="form-group">
      <label>Comentario adicional:</label>
      <input type="text" id="onbehalf-comment" placeholder="Observaciones opcionales">
    </div>
    <div id="modal-err" class="alert alert-danger" style="display: none; padding: 10px;"></div>
  `;

  document.getElementById('modal-submit-btn').onclick = async () => {
    const motive = document.getElementById('onbehalf-motive').value.trim();
    const file = document.getElementById('onbehalf-file').files[0];
    const comment = document.getElementById('onbehalf-comment').value;
    const errBox = document.getElementById('modal-err');

    if (!motive || motive.length < 5) {
      errBox.innerText = 'Debe especificar el motivo formal de representación.';
      errBox.style.display = 'block';
      return;
    }
    if (!file) {
      errBox.innerText = 'Por favor seleccione el archivo firmado.';
      errBox.style.display = 'block';
      return;
    }

    try {
      await window.api.rectorUploadOnBehalf(docId, file, motive, comment);
      closeModal();
      alert('Documento cargado en nombre del acudiente exitosamente.');
      renderAppShell();
    } catch (err) {
      errBox.innerText = err.message;
      errBox.style.display = 'block';
    }
  };

  overlay.classList.add('open');
};

window.closeModal = function() {
  document.getElementById('global-modal').classList.remove('open');
};
