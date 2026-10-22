/**
 * app.js - Controlador Principal de la Aplicación SPA
 * Secretaría de Educación de Caldas & Computadores para Educar
 * 
 * Orquestador 100% Client-Side para GitHub Pages:
 * - Sin backend ni servidores intermedios.
 * - Sin claves visibles ni expuestas en la interfaz.
 * - Nombres de Instituciones Educativas en orden ascendente y filtrables por municipio.
 * - Pregeneración masiva de formatos en Google Drive.
 * - Los documentos cargados actualizan los documentos originales.
 */

class ApplicationController {
    constructor() {
        this.currentTab = 'principal';
        this.selectedDocForAction = null;
        this.selectedEntityForUpload = null;
        this.rectorMpioFilter = '';
        this.loginMpioFilter = '';
        this.coordFilterMpio = '';
        this.coordFilterIE = '';
        this.coordFilterTipo = '';
        this.coordFilterEstado = '';
    }

    async init() {
        await window.appStore.init();

        window.authService.subscribe((user) => this.render());
        window.appStore.subscribe(() => this.renderDashboard());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
        });

        if (window.googleDriveClient && window.googleDriveClient.hasActiveToken()) {
            await window.googleDriveClient.testConnection();
        }

        this.render();
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✓', error: '✕', warning: '⚠' };
        toast.innerHTML = `<strong>${icons[type] || '•'}</strong> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    render() {
        const appRoot = document.getElementById('app-root');
        if (!appRoot) return;

        const user = window.authService.getCurrentUser();
        this.updateHeaderSession(user);

        if (!user) {
            appRoot.innerHTML = this.renderLoginView();
            this.bindLoginEvents();
        } else {
            appRoot.innerHTML = `
                <div class="disclaimer-banner">
                    <div>
                        <strong>Sistema de Gestión Documental Caldas:</strong>
                        Gestión y control de dotaciones tecnológicas por municipio, institución y sede educativa.
                    </div>
                </div>
                <div id="dashboard-content">
                    ${this.getDashboardHtmlForRole(user.role)}
                </div>
            `;
            this.bindDashboardEvents(user.role);
        }
    }

    renderDashboard() {
        const user = window.authService.getCurrentUser();
        if (!user) return;
        const container = document.getElementById('dashboard-content');
        if (container) {
            container.innerHTML = this.getDashboardHtmlForRole(user.role);
            this.bindDashboardEvents(user.role);
        }
    }

    updateHeaderSession(user) {
        const rolesNav = document.getElementById('header-roles-nav');
        const sessionArea = document.getElementById('header-session-area');

        // Determinar rol activo únicamente cuando hay sesión autenticada
        const currentRole = user ? user.role : null;

        // Mostrar ÚNICAMENTE las opciones de rol de CPE y Administrador en el encabezado
        if (rolesNav) {
            rolesNav.innerHTML = `
                <button type="button" id="header-btn-cpe" class="header-role-btn ${currentRole === 'coordinador' ? 'active' : ''}" onclick="appController.handleHeaderRoleSelect('coordinador')">
                    🏛️ CPE
                </button>
                <button type="button" id="header-btn-admin" class="header-role-btn ${currentRole === 'administrador' ? 'active' : ''}" onclick="appController.handleHeaderRoleSelect('administrador')">
                    ⚙️ Administrador
                </button>
            `;
        }

        if (!sessionArea) return;

        if (user) {
            const roleDisplay = user.role === 'coordinador' ? 'CPE' : (user.role.charAt(0).toUpperCase() + user.role.slice(1));
            const pillClass = user.role === 'coordinador' ? 'cpe' : user.role;
            sessionArea.innerHTML = `
                <div class="user-badge">
                    <span>${user.name}</span>
                    <span class="role-pill ${pillClass}">${roleDisplay}</span>
                </div>
                <button class="btn btn-outline btn-sm" style="color:white; border-color:rgba(255,255,255,0.4);" onclick="window.authService.logout()">Salir</button>
            `;
        } else {
            sessionArea.innerHTML = '';
        }
    }

    handleHeaderRoleSelect(role) {
        if (role !== 'coordinador' && role !== 'administrador') return;
        const user = window.authService.getCurrentUser();
        // Si el usuario ya está autenticado con permisos de staff (coordinador o administrador), puede alternar directamente
        if (user && (user.role === 'coordinador' || user.role === 'administrador')) {
            window.authService.switchRole(role);
            const roleName = role === 'coordinador' ? 'CPE' : 'Administrador';
            this.showToast(`Perfil activo: ${roleName}`);
            this.updateHeaderSession(window.authService.getCurrentUser());
            return;
        }

        // Si no está autenticado o está como rector/otro, abrir modal de autenticación institucional de staff
        this.openStaffLoginModal(role);
    }

    openStaffLoginModal(role) {
        const modal = document.getElementById('modal-staff-login');
        const titleEl = document.getElementById('staff-modal-title');
        const descEl = document.getElementById('staff-modal-desc');
        const roleInput = document.getElementById('staff-login-role');
        const passInput = document.getElementById('staff-login-password');
        const btnEl = document.getElementById('staff-login-btn');

        if (!modal) return;

        if (role === 'coordinador') {
            if (titleEl) titleEl.textContent = '🏛️ Acceso Oficial CPE';
            if (descEl) descEl.textContent = 'Ingrese la contraseña institucional autorizada para el equipo departamental de Computadores para Educar.';
            if (roleInput) roleInput.value = 'coordinador';
            if (btnEl) btnEl.textContent = 'Ingresar como CPE';
        } else {
            if (titleEl) titleEl.textContent = '⚙️ Acceso Oficial Administrador';
            if (descEl) descEl.textContent = 'Ingrese la contraseña maestra autorizada para el Administrador del Sistema SED Caldas.';
            if (roleInput) roleInput.value = 'administrador';
            if (btnEl) btnEl.textContent = 'Ingresar como Administrador';
        }

        if (passInput) passInput.value = '';
        modal.style.display = 'flex';
        setTimeout(() => passInput?.focus(), 100);
    }

    async confirmStaffLogin() {
        const roleInput = document.getElementById('staff-login-role');
        const passInput = document.getElementById('staff-login-password');
        const role = roleInput ? roleInput.value : 'coordinador';
        const password = passInput ? passInput.value : '';

        if (!password) {
            alert('Por favor ingrese la contraseña institucional.');
            return;
        }

        try {
            await window.authService.loginWithAuxiliaryCredentials({
                role: role,
                credential: password
            });
            this.closeAllModals();
            const roleName = role === 'coordinador' ? 'CPE' : 'Administrador';
            this.showToast(`Bienvenido al panel institucional de ${roleName}`);
        } catch (err) {
            alert(err.message || 'Contraseña institucional incorrecta.');
        }
    }

    // =========================================================================
    // VISTA DE INICIO DE SESIÓN EXCLUSIVA DE RECTORÍA
    // =========================================================================
    renderLoginView() {
        const store = window.appStore;
        const mpios = store.getMunicipios();
        const mpioOptions = `<option value="">-- Todos los Municipios de Caldas --</option>` + 
            mpios.map(m => `<option value="${m.codigo}" ${this.loginMpioFilter === m.codigo ? 'selected' : ''}>${m.nombre}</option>`).join('');

        const ies = store.getInstituciones(this.loginMpioFilter); // Orden ascendente A-Z
        const ieOptions = ies.map(i => `<option value="${i.codigo_dane}">${i.nombre} (${i.codigo_dane})</option>`).join('');

        return `
            <div class="login-hero" style="max-width: 540px; margin: 2rem auto;">
                <div class="login-header" style="background: linear-gradient(135deg, var(--navy) 0%, var(--primary) 100%);">
                    <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem;">🏫</span>
                    <h2 style="color: white; font-size: 1.4rem; margin-bottom: 0.25rem;">Portal Institucional de Rectoría</h2>
                    <p style="color: rgba(255,255,255,0.85); font-size: 0.85rem; margin: 0;">Secretaría de Educación de Caldas &middot; Computadores para Educar</p>
                </div>
                <div class="login-body">
                    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.3rem;">ℹ️</span>
                        <div style="font-size: 0.85rem; color: #1E40AF; line-height: 1.4;">
                            <strong>Autenticación de Establecimientos Educativos:</strong><br>
                            Seleccione su municipio e institución educativa para formalizar y consultar dotaciones.
                        </div>
                    </div>

                    <form id="login-form" onsubmit="event.preventDefault(); appController.handleAuxLogin();">
                        <input type="hidden" id="login-selected-role" value="rector">

                        <div class="form-group">
                            <label class="form-label" for="login-filter-mpio">1. Municipio</label>
                            <select id="login-filter-mpio" class="form-select" onchange="appController.handleLoginMpioFilter(this.value)">
                                ${mpioOptions}
                            </select>
                            <span class="form-hint">Filtre para ubicar rápidamente su institución educativa.</span>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="login-entity-id">2. Institución Educativa (Orden Ascendente A-Z)</label>
                            <select id="login-entity-id" class="form-select" required>
                                ${ieOptions}
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="login-password">3. Contraseña Institucional</label>
                            <input type="password" id="login-password" class="form-control" placeholder="••••••••••••" required autocomplete="current-password">
                            <span class="form-hint">Ingrese la clave de acceso institucional o código DANE asignado a su institución.</span>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top: 1.25rem; font-weight: 700;">
                            Ingresar al Portal de Rectoría
                        </button>
                    </form>

                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); text-align: center; font-size: 0.8rem; color: var(--text-muted);">
                        <span>🏛️ Funcionarios autorizados de <strong>CPE</strong> y <strong>Administración</strong> acceden desde el encabezado superior.</span>
                    </div>
                </div>
            </div>
        `;
    }

    selectLoginRole(role) {
        this.handleHeaderRoleSelect(role);
    }

    handleLoginMpioFilter(codigoMunicipio) {
        this.loginMpioFilter = codigoMunicipio;
        const ieSelect = document.getElementById('login-entity-id');
        if (!ieSelect) return;
        const ies = window.appStore.getInstituciones(codigoMunicipio); // Ordenadas ascendente
        ieSelect.innerHTML = ies.map(i => `<option value="${i.codigo_dane}">${i.nombre} (${i.codigo_dane})</option>`).join('');
    }

    async handleAuxLogin() {
        const role = document.getElementById('login-selected-role')?.value || 'rector';
        const pass = document.getElementById('login-password')?.value || '';
        const entityId = document.getElementById('login-entity-id')?.value || null;

        try {
            await window.authService.loginWithAuxiliaryCredentials({
                role,
                credential: pass,
                entityId
            });
            this.showToast(`Bienvenido al sistema institucional`);
        } catch (e) {
            alert(e.message);
        }
    }

    async handleGoogleOAuthLogin() {
        const config = window.appStore.state.config;
        try {
            await window.authService.loginWithGoogle(config.google_client_id);
            this.showToast('Autenticado exitosamente con Google Drive');
        } catch (e) {
            alert(e.message);
        }
    }

    // =========================================================================
    // VISTAS SEGÚN EL ROL AUTENTICADO
    // =========================================================================
    getDashboardHtmlForRole(role) {
        switch (role) {
            case 'acudiente': return this.renderAcudienteView();
            case 'rector': return this.renderRectorView();
            case 'coordinador': return this.renderCoordinadorView();
            case 'administrador': return this.renderAdminView();
            default: return `<p>Perfil no reconocido.</p>`;
        }
    }

    // --- 1. VISTA ACUDIENTE (SIMPLICIDAD EXTREMA) ---
    renderAcudienteView() {
        const user = window.authService.getCurrentUser();
        const docEst = user.metadata?.documento_estudiante || '1059812839';
        const est = window.appStore.getEstudianteByDoc(docEst);
        const asig = window.appStore.getAsignacionByDoc(docEst);
        const doc = window.appStore.findDocumento('LOG-007-F', est?.codigo_dane_sede, docEst);

        const estadoDoc = doc ? doc.estado : 'Generado';
        const isDevuelto = estadoDoc === 'Devuelto al acudiente';

        let returnAlert = '';
        if (isDevuelto) {
            const versiones = window.appStore.getVersiones(doc.id);
            const ultDev = versiones.find(v => v.estado.includes('Devuelto'));
            returnAlert = `
                <div style="background-color: var(--danger-light); border: 2px solid var(--danger); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem; text-align: left;">
                    <h4 style="color: #991B1B; margin-bottom: 0.25rem;">⚠️ El documento necesita corrección</h4>
                    <p style="font-size: 0.9rem; color: #7F1D1D;"><strong>Observaciones del Rector/Coordinador:</strong> ${ultDev?.comentarios || 'Por favor revise la firma y vuelva a subir el documento legible.'}</p>
                </div>
            `;
        }

        return `
            <div class="acudiente-hero">
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-family: var(--font-heading); color: var(--navy); font-size: 1.75rem;">Legalización de Equipo para Estudiante</h2>
                    <p style="color: var(--text-muted); font-size: 1rem;">
                        Estudiante: <strong>${est?.nombre_completo || 'Estudiante Beneficiario'}</strong> | 
                        Terminal asignada: <strong>${asig?.tipo_terminal || 'Tableta'}</strong> | 
                        Serial oficial: <strong>${asig?.serial_asignado || est?.serial_terminal || 'S/N'}</strong>
                    </p>
                    <div style="margin-top: 0.5rem;">
                        <span class="badge-estado ${this._getBadgeClass(estadoDoc)}" style="font-size: 0.9rem; padding: 0.35rem 1rem;">
                            Estado actual: ${estadoDoc}
                        </span>
                    </div>
                </div>

                ${returnAlert}

                <!-- PASO 1: DESCARGAR FORMATO PRELLENADO -->
                <div class="step-card active-step">
                    <div class="step-number">1</div>
                    <h3>Descargar Formato Prellenado (LOG-007-F)</h3>
                    <p>Su formato se encuentra pregenerado con los datos de su institución, sede y estudiante listo para firmar.</p>
                    <button class="btn btn-primary btn-lg" onclick="appController.handleAcudienteDownloadDoc('${docEst}')">
                        📥 Descargar Formato Word (.docx)
                    </button>
                </div>

                <!-- PASO 2: FIRMAR -->
                <div class="step-card">
                    <div class="step-number">2</div>
                    <h3>Firmar el documento</h3>
                    <p>Imprima o abra el archivo en su dispositivo y estampe su firma física o digital en la casilla de <strong>Firma Acudiente</strong>.</p>
                </div>

                <!-- PASO 3: SUBIR FORMATO FIRMADO -->
                <div class="step-card active-step">
                    <div class="step-number">3</div>
                    <h3>Subir Formato Firmado</h3>
                    <p>Suba una foto clara o archivo escaneado (PDF o Word) del formato firmado. Esto actualizará el documento original.</p>
                    
                    <div class="dropzone" id="acudiente-dropzone" onclick="document.getElementById('acudiente-file-input').click()">
                        <div class="dropzone-icon">📄</div>
                        <strong>Haga clic aquí o arrastre su archivo firmado</strong>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Formatos aceptados: PDF, DOCX, JPG o PNG</p>
                    </div>
                    <input type="file" id="acudiente-file-input" style="display: none;" accept=".pdf,.docx,.jpg,.png" onchange="appController.handleAcudienteUploadFile(this.files[0], '${docEst}')">
                </div>
            </div>
        `;
    }

    // --- 2. VISTA RECTOR (CON FILTRO DE MUNICIPIO Y ORDEN ASCENDENTE) ---
    renderRectorView() {
        const user = window.authService.getCurrentUser();
        const store = window.appStore;
        const mpios = store.getMunicipios();
        const mpioOptions = `<option value="">-- Todos los Municipios --</option>` + mpios.map(m => `<option value="${m.codigo}" ${this.rectorMpioFilter === m.codigo ? 'selected' : ''}>${m.nombre}</option>`).join('');

        const ies = store.getInstituciones(this.rectorMpioFilter); // Ordenadas ascendente
        const daneIE = user.metadata?.dane_ie || ies[0]?.codigo_dane;
        const currentIE = store.getInstitucionByDane(daneIE) || ies[0];
        const sedes = store.getSedes(currentIE?.codigo_dane);

        const ieOptions = ies.map(i => `<option value="${i.codigo_dane}" ${i.codigo_dane === currentIE?.codigo_dane ? 'selected' : ''}>${i.nombre} (${i.codigo_dane})</option>`).join('');

        return `
            <div class="card">
                <div class="card-header">
                    <div>
                        <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Institución Seleccionada:</span>
                        <h3 class="card-title">${currentIE?.nombre || 'Institución Educativa'}</h3>
                    </div>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <div style="min-width: 200px;">
                            <label style="font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 2px;">Filtrar por Municipio:</label>
                            <select class="form-select" onchange="appController.handleRectorMpioFilter(this.value)">
                                ${mpioOptions}
                            </select>
                        </div>
                        <div style="min-width: 320px;">
                            <label style="font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 2px;">Institución Educativa (A-Z):</label>
                            <select class="form-select" onchange="window.authService.switchRole('rector', this.value)">
                                ${ieOptions}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="nav-tabs">
                <button class="nav-tab-btn ${this.currentTab === 'principal' ? 'active' : ''}" onclick="appController.switchTab('principal')">
                    📦 Formatos Bolsa Tecnológica (LOG-026 / LOG-029)
                </button>
                <button class="nav-tab-btn ${this.currentTab === 'estudiantes' ? 'active' : ''}" onclick="appController.switchTab('estudiantes')">
                    🎓 Legalización Equipos Estudiantes (LOG-007)
                </button>
            </div>

            ${this.currentTab === 'principal' ? this._renderRectorBolsaTab(sedes) : this._renderRectorEstudiantesTab(sedes)}
        `;
    }

    handleRectorMpioFilter(codigoMpio) {
        this.rectorMpioFilter = codigoMpio;
        const ies = window.appStore.getInstituciones(codigoMpio);
        if (ies.length > 0) {
            window.authService.switchRole('rector', ies[0].codigo_dane);
        } else {
            this.renderDashboard();
        }
    }

    _renderRectorBolsaTab(sedes) {
        const store = window.appStore;
        const rows = sedes.map(sede => {
            const doc26 = store.findDocumento('LOG-026-F', sede.codigo_dane_sede);
            const doc29 = store.findDocumento('LOG-029-F', sede.codigo_dane_sede);
            const elementos = store.getElementosBolsa(sede.codigo_dane_sede);
            const totalItems = elementos.reduce((acc, el) => acc + el.cantidad, 0);
            const serialCount = elementos.filter(e => e.serial && e.serial !== 'NO APLICA').length;

            return `
                <tr>
                    <td>
                        <strong>${sede.nombre}</strong><br>
                        <small style="color: var(--text-muted);">DANE: ${sede.codigo_dane_sede} | Radicado: ${sede.radicado || 'S/N'}</small>
                    </td>
                    <td>
                        <span class="badge-estado ${this._getBadgeClass(doc26?.estado || 'Generado')}">
                            ${doc26?.estado || 'Generado'}
                        </span>
                        <div style="margin-top: 0.35rem; display: flex; gap: 0.25rem;">
                            <button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="appController.handleDownloadDoc('${doc26?.id || 'DOC-026-' + sede.codigo_dane_sede}')">Descargar</button>
                            <button class="btn btn-primary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="appController.openSubmitBolsaModal('${doc26?.id || 'DOC-026-' + sede.codigo_dane_sede}')">Subir / Remitir</button>
                        </div>
                    </td>
                    <td>
                        <span class="badge-estado ${this._getBadgeClass(doc29?.estado || 'Generado')}">
                            ${doc29?.estado || 'Generado'}
                        </span>
                        <div style="margin-top: 0.35rem; display: flex; gap: 0.25rem;">
                            <button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="appController.handleDownloadDoc('${doc29?.id || 'DOC-029-' + sede.codigo_dane_sede}')">Descargar</button>
                            <button class="btn btn-primary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="appController.openSubmitBolsaModal('${doc29?.id || 'DOC-029-' + sede.codigo_dane_sede}')">Subir / Remitir</button>
                        </div>
                    </td>
                    <td>
                        <strong>${totalItems}</strong> elementos<br>
                        <small style="color: var(--primary); font-weight: 600;">🔑 ${serialCount} serial(es)</small>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Sedes Beneficiarias y Formatos Pregenerados</h4>
                </div>
                <div class="table-responsive">
                    <table class="table-custom">
                        <thead>
                            <tr>
                                <th>Sede Educativa</th>
                                <th>LOG-026-F (Acta de Entrega Word)</th>
                                <th>LOG-029-F (Informe Validación Excel Corregido)</th>
                                <th>Total Elementos</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="4">No hay sedes para esta institución.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _renderRectorEstudiantesTab(sedes) {
        const store = window.appStore;
        let allStudents = [];
        sedes.forEach(s => {
            const sts = store.getEstudiantes(s.codigo_dane_sede);
            allStudents = allStudents.concat(sts);
        });

        const rows = allStudents.map(est => {
            const asig = store.getAsignacionByDoc(est.documento_identidad);
            const doc = store.findDocumento('LOG-007-F', est.codigo_dane_sede, est.documento_identidad);
            const estado = doc ? doc.estado : 'Generado';

            return `
                <tr>
                    <td>
                        <strong>${est.nombre_completo}</strong><br>
                        <small style="color: var(--text-muted);">Doc: ${est.documento_identidad} | ${asig?.tipo_terminal || 'Tableta'}</small><br>
                        <small style="color: var(--primary); font-weight: 600;">🔑 Serial: ${asig?.serial_asignado || est.serial_terminal || 'S/N'}</small>
                    </td>
                    <td>
                        ${est.acudiente_nombres || 'No registrado'}<br>
                        <small style="color: var(--text-muted);">Doc: ${est.acudiente_documento || 'S/N'}</small>
                    </td>
                    <td>
                        <span class="badge-estado ${this._getBadgeClass(estado)}">${estado}</span>
                    </td>
                    <td>
                        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                            <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="appController.handleDownloadDoc('${doc?.id || 'DOC-007-' + est.documento_identidad}')">
                                Descargar Word
                            </button>
                            ${doc && (doc.estado === 'En revisión del rector' || doc.estado === 'Generado') ? `
                                <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="appController.handleApproveLog007Rector('${doc.id}')">Aprobar</button>
                                <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="appController.openReturnModal('${doc.id}', 'acudiente')">Devolver</button>
                            ` : ''}
                            <button class="btn btn-accent" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="appController.openUploadOnBehalfModal('${doc?.id || 'DOC-007-' + est.documento_identidad}', 'acudiente')">
                                Cargar por Acudiente
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Estudiantes Beneficiarios (LOG-007-F Pregenerados)</h4>
                </div>
                <div class="table-responsive">
                    <table class="table-custom">
                        <thead>
                            <tr>
                                <th>Estudiante</th>
                                <th>Acudiente</th>
                                <th>Estado Documental</th>
                                <th>Acciones de Rectoría</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="4">No hay estudiantes en estas sedes.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // --- 3. VISTA COORDINADOR ---
    renderCoordinadorView() {
        const store = window.appStore;
        const docs = store.getDocumentos();

        const totalDocs = docs.length;
        const enRevision = docs.filter(d => d.estado.includes('revisión')).length;
        const aprobados = docs.filter(d => d.estado === 'Aprobado').length;
        const devueltos = docs.filter(d => d.estado.includes('Devuelto')).length;

        return `
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon">📑</div>
                    <div class="metric-data">
                        <h3>${totalDocs}</h3>
                        <p>Formatos Pregenerados</p>
                    </div>
                </div>
                <div class="metric-card warning">
                    <div class="metric-icon">⏳</div>
                    <div class="metric-data">
                        <h3>${enRevision}</h3>
                        <p>Pendientes de Revisión</p>
                    </div>
                </div>
                <div class="metric-card success">
                    <div class="metric-icon">✅</div>
                    <div class="metric-data">
                        <h3>${aprobados}</h3>
                        <p>Aprobados Formalmente</p>
                    </div>
                </div>
                <div class="metric-card danger">
                    <div class="metric-icon">↩️</div>
                    <div class="metric-data">
                        <h3>${devueltos}</h3>
                        <p>Devueltos con Novedades</p>
                    </div>
                </div>
            </div>

            <div class="nav-tabs">
                <button class="nav-tab-btn ${this.currentTab === 'principal' ? 'active' : ''}" onclick="appController.switchTab('principal')">
                    📥 Bandeja de Revisión y Aprobación CPE
                </button>
                <button class="nav-tab-btn ${this.currentTab === 'descargas' ? 'active' : ''}" onclick="appController.switchTab('descargas')">
                    📦 Descargas Masivas ZIP CPE con Manifiesto
                </button>
            </div>

            ${this.currentTab === 'principal' ? this._renderCoordinadorInboxTab(docs) : this._renderCoordinadorDescargasTab()}
        `;
    }

    setCoordFilter(key, val) {
        if (key === 'mpio') {
            this.coordFilterMpio = val;
            this.coordFilterIE = '';
        } else if (key === 'ie') {
            this.coordFilterIE = val;
        } else if (key === 'tipo') {
            this.coordFilterTipo = val;
        } else if (key === 'estado') {
            this.coordFilterEstado = val;
        }
        this.renderDashboard();
    }

    _renderCoordinadorInboxTab(docs) {
        const store = window.appStore;
        const mpios = store.getMunicipios();
        const filterMpio = this.coordFilterMpio || '';
        const filterIE = this.coordFilterIE || '';
        const filterTipo = this.coordFilterTipo || '';
        const filterEstado = this.coordFilterEstado || '';

        const mpioOptions = `<option value="">-- Todos los Municipios --</option>` + mpios.map(m => `<option value="${m.codigo}" ${filterMpio === m.codigo ? 'selected' : ''}>${m.nombre}</option>`).join('');
        const ies = store.getInstituciones(filterMpio); // Siempre en orden ascendente
        const ieOptions = `<option value="">-- Todas las Instituciones (A-Z) --</option>` + ies.map(i => `<option value="${i.codigo_dane}" ${filterIE === i.codigo_dane ? 'selected' : ''}>${i.nombre}</option>`).join('');

        let filteredDocs = docs;
        if (filterMpio) {
            filteredDocs = filteredDocs.filter(d => {
                const sede = store.getSedeByDane(d.codigo_dane_sede);
                if (!sede) return false;
                const ie = store.getInstitucionByDane(sede.codigo_dane_ie);
                return ie && String(ie.codigo_municipio) === String(filterMpio);
            });
        }
        if (filterIE) {
            filteredDocs = filteredDocs.filter(d => {
                const sede = store.getSedeByDane(d.codigo_dane_sede);
                return sede && String(sede.codigo_dane_ie) === String(filterIE);
            });
        }
        if (filterTipo) {
            filteredDocs = filteredDocs.filter(d => d.tipo_documento === filterTipo);
        }
        if (filterEstado) {
            filteredDocs = filteredDocs.filter(d => d.estado === filterEstado);
        }

        const rows = filteredDocs.map(doc => {
            const sede = store.getSedeByDane(doc.codigo_dane_sede);
            const est = doc.estudiante_documento ? store.getEstudianteByDoc(doc.estudiante_documento) : null;

            let serialText = '';
            if (est) {
                const asig = store.getAsignacionByDoc(est.documento_identidad);
                const sNum = asig?.serial_asignado || est.serial_terminal;
                if (sNum) serialText = `<small style="color: var(--primary); font-weight: 600; display: block;">🔑 Serial: ${sNum}</small>`;
            } else {
                const elems = store.getElementosBolsa(doc.codigo_dane_sede);
                const serCount = elems.filter(e => e.serial && e.serial !== 'NO APLICA').length;
                if (serCount > 0) serialText = `<small style="color: var(--primary); font-weight: 600; display: block;">🔑 ${serCount} serial(es)</small>`;
            }

            return `
                <tr>
                    <td><strong>${doc.tipo_documento}</strong></td>
                    <td>
                        ${sede ? sede.nombre : 'Sede ' + doc.codigo_dane_sede}<br>
                        <small style="color: var(--text-muted);">Radicado: ${doc.radicado || 'S/N'}</small>
                    </td>
                    <td>
                        ${est ? `${est.nombre_completo} (${est.documento_identidad})` : 'Bolsa Institucional'}
                        ${serialText}
                    </td>
                    <td><span class="badge-estado ${this._getBadgeClass(doc.estado)}">${doc.estado}</span></td>
                    <td>v0${doc.version_actual}</td>
                    <td>
                        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                            <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="appController.handleDownloadDoc('${doc.id}')">Descargar</button>
                            <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="appController.openDocHistoryModal('${doc.id}')">Historial</button>
                            ${doc.estado !== 'Aprobado' ? `
                                <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="appController.handleApproveCoordinador('${doc.id}')">Aprobar</button>
                                <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="appController.openReturnModal('${doc.id}', 'rector')">Devolver</button>
                            ` : ''}
                            <button class="btn btn-accent" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="appController.openUploadOnBehalfModal('${doc.id}', 'rector')">Cargar por Rector</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="card">
                <div class="card-header" style="flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h4 class="card-title">Expedientes Documentales Pregenerados y en Trámite</h4>
                        <small style="color: var(--text-muted);">Mostrando ${filteredDocs.length} de ${docs.length} formatos</small>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="appController.handlePregenerateAllDrive()">
                        🚀 Pregenerar y Sincronizar Formatos en Google Drive
                    </button>
                </div>
                
                <!-- Barra de Filtros: Municipio, Institución A-Z, Formato y Estado -->
                <div style="padding: 1rem 1.5rem; background: #f8fafc; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.75rem;">
                    <div>
                        <label style="font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 2px;">Filtrar por Municipio:</label>
                        <select class="form-select" onchange="appController.setCoordFilter('mpio', this.value)">
                            ${mpioOptions}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 2px;">Institución Educativa (A-Z):</label>
                        <select class="form-select" onchange="appController.setCoordFilter('ie', this.value)">
                            ${ieOptions}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 2px;">Tipo de Formato:</label>
                        <select class="form-select" onchange="appController.setCoordFilter('tipo', this.value)">
                            <option value="">-- Todos los Formatos --</option>
                            <option value="LOG-026-F" ${filterTipo === 'LOG-026-F' ? 'selected' : ''}>LOG-026-F (Bolsa Word)</option>
                            <option value="LOG-029-F" ${filterTipo === 'LOG-029-F' ? 'selected' : ''}>LOG-029-F (Bolsa Excel)</option>
                            <option value="LOG-007-F" ${filterTipo === 'LOG-007-F' ? 'selected' : ''}>LOG-007-F (Estudiantes Word)</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 2px;">Estado Documental:</label>
                        <select class="form-select" onchange="appController.setCoordFilter('estado', this.value)">
                            <option value="">-- Todos los Estados --</option>
                            <option value="Generado" ${filterEstado === 'Generado' ? 'selected' : ''}>Generado / Pregenerado</option>
                            <option value="En revisión del coordinador" ${filterEstado === 'En revisión del coordinador' ? 'selected' : ''}>En revisión del coordinador</option>
                            <option value="Aprobado" ${filterEstado === 'Aprobado' ? 'selected' : ''}>Aprobado</option>
                            <option value="Devuelto al rector" ${filterEstado === 'Devuelto al rector' ? 'selected' : ''}>Devuelto al rector</option>
                            <option value="Devuelto al acudiente" ${filterEstado === 'Devuelto al acudiente' ? 'selected' : ''}>Devuelto al acudiente</option>
                        </select>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table-custom">
                        <thead>
                            <tr>
                                <th>Formato</th>
                                <th>Sede / Radicado</th>
                                <th>Beneficiario</th>
                                <th>Estado</th>
                                <th>Versión</th>
                                <th>Acciones de Gestión CPE</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No hay documentos que coincidan con los filtros seleccionados.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _renderCoordinadorDescargasTab() {
        const store = window.appStore;
        const mpios = store.getMunicipios();
        const mpioOptions = mpios.map(m => `<option value="${m.codigo}">${m.nombre}</option>`).join('');

        return `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Generación de Paquetes ZIP por Filtro con Manifiesto CSV</h4>
                </div>
                <div class="card-body">
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
                        Permite consolidar y descargar al equipo de CPE los archivos pregenerados y legalizados, generando automáticamente el archivo <code>MANIFIESTO_DOCUMENTAL.csv</code> con metadatos oficiales.
                    </p>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-group">
                            <label class="form-label">Municipio</label>
                            <select id="zip-filter-mpio" class="form-select">
                                <option value="">Todos los Municipios</option>
                                ${mpioOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo Documental</label>
                            <select id="zip-filter-tipo" class="form-select">
                                <option value="">Todos los Formatos</option>
                                <option value="LOG-026-F">LOG-026-F (Bolsa Word)</option>
                                <option value="LOG-029-F">LOG-029-F (Bolsa Excel Corregido)</option>
                                <option value="LOG-007-F">LOG-007-F (Estudiantes Word)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Estado</label>
                            <select id="zip-filter-estado" class="form-select">
                                <option value="">Todos los Estados</option>
                                <option value="Aprobado">Solo Aprobados</option>
                                <option value="En revisión del coordinador">En revisión del coordinador</option>
                                <option value="Generado">Generados / Pregenerados</option>
                            </select>
                        </div>
                    </div>

                    <button class="btn btn-primary btn-lg" onclick="appController.handleDownloadCoordinatorZip()">
                        📦 Descargar Paquete ZIP Consolidado
                    </button>
                </div>
            </div>
        `;
    }

    // --- 4. VISTA ADMINISTRADOR ---
    renderAdminView() {
        return `
            <div class="nav-tabs">
                <button class="nav-tab-btn ${this.currentTab === 'principal' ? 'active' : ''}" onclick="appController.switchTab('principal')">
                    📊 Panel General & CRUD
                </button>
                <button class="nav-tab-btn ${this.currentTab === 'excel' ? 'active' : ''}" onclick="appController.switchTab('excel')">
                    📁 Importación Excel Versionada
                </button>
                <button class="nav-tab-btn ${this.currentTab === 'seriales' ? 'active' : ''}" onclick="appController.switchTab('seriales')">
                    🔢 Actualización de Seriales
                </button>
                <button class="nav-tab-btn ${this.currentTab === 'auditoria' ? 'active' : ''}" onclick="appController.switchTab('auditoria')">
                    📋 Bitácora de Auditoría
                </button>
            </div>

            ${this._renderAdminTabContent()}
        `;
    }

    _renderAdminTabContent() {
        switch (this.currentTab) {
            case 'excel': return this._renderAdminExcelTab();
            case 'seriales': return this._renderAdminSerialesTab();
            case 'auditoria': return this._renderAdminAuditoriaTab();
            case 'principal':
            default: return this._renderAdminCrudTab();
        }
    }

    _renderAdminCrudTab() {
        const store = window.appStore;
        return `
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon">🏙️</div>
                    <div class="metric-data">
                        <h3>${store.getMunicipios().length}</h3>
                        <p>Municipios Registrados</p>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">🏫</div>
                    <div class="metric-data">
                        <h3>${store.getInstituciones().length}</h3>
                        <p>Instituciones Educativas</p>
                    </div>
                </div>
                <div class="metric-card accent">
                    <div class="metric-icon">📍</div>
                    <div class="metric-data">
                        <h3>${store.getSedes().length}</h3>
                        <p>Sedes Beneficiarias</p>
                    </div>
                </div>
                <div class="metric-card success">
                    <div class="metric-icon">👨‍🎓</div>
                    <div class="metric-data">
                        <h3>${store.getEstudiantes().length}</h3>
                        <p>Estudiantes Beneficiarios</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Mantenimiento de Expedientes y Google Drive</h4>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-primary btn-sm" onclick="appController.handlePregenerateAllDrive()">🚀 Pregenerar Formatos en Drive</button>
                        <button class="btn btn-outline btn-sm" onclick="window.appStore.exportBackup()">💾 Descargar Respaldo JSON</button>
                        <button class="btn btn-danger btn-sm" onclick="appController.handleResetSeed()">♻️ Restaurar Datos Iniciales</button>
                    </div>
                </div>
                <div class="card-body">
                    <p style="color: var(--text-muted); font-size: 0.85rem;">
                        La base cuenta con <strong>${store.state.documentos.length}</strong> formatos institucionales pregenerados (LOG-026-F, LOG-029-F y LOG-007-F). Los documentos cargados por acudientes y rectores actualizan automáticamente los documentos originales.
                    </p>
                </div>
            </div>
        `;
    }

    _renderAdminExcelTab() {
        return `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Importar Nuevas Versiones de Archivos Fuente Excel</h4>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                        <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem;">
                            <h4 style="margin-bottom: 0.5rem;">1. BOLSA TECNOLOGICA CALDAS.xlsx</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                                Actualiza la distribución de elementos, cantidades, radicados y sedes para LOG-026-F y LOG-029-F.
                            </p>
                            <input type="file" id="excel-bolsa-input" accept=".xlsx" style="display: none;" onchange="appController.handleBolsaFileSelect(this.files[0])">
                            <button class="btn btn-primary" onclick="document.getElementById('excel-bolsa-input').click()">
                                Cargar Archivo Bolsa (.xlsx)
                            </button>
                        </div>

                        <div style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem;">
                            <h4 style="margin-bottom: 0.5rem;">2. BASE ESTUDIANTES CALDAS.xlsx</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                                Actualiza los estudiantes beneficiarios, acudientes y asignaciones para LOG-007-F.
                            </p>
                            <input type="file" id="excel-est-input" accept=".xlsx" style="display: none;" onchange="appController.handleEstudiantesFileSelect(this.files[0])">
                            <button class="btn btn-primary" onclick="document.getElementById('excel-est-input').click()">
                                Cargar Archivo Estudiantes (.xlsx)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _renderAdminSerialesTab() {
        const store = window.appStore;
        const ests = store.getEstudiantes().slice(0, 50);

        const rows = ests.map(e => {
            const asig = store.getAsignacionByDoc(e.documento_identidad);
            return `
                <tr>
                    <td>${e.documento_identidad}</td>
                    <td>${e.nombre_completo}</td>
                    <td>${asig?.tipo_terminal || 'Tableta'}</td>
                    <td>
                        <input type="text" class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" 
                               value="${asig?.serial_asignado || ''}" 
                               onchange="appController.handleInlineSerialUpdate('${e.documento_identidad}', this.value)">
                    </td>
                    <td>${asig?.estado_despacho || 'Despacho Programado'}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Gestión y Actualización Masiva de Seriales</h4>
                    <div>
                        <input type="file" id="serial-batch-input" accept=".xlsx,.csv" style="display: none;" onchange="appController.handleSerialBatchFile(this.files[0])">
                        <button class="btn btn-outline btn-sm" onclick="document.getElementById('serial-batch-input').click()">📥 Importar Lote de Seriales</button>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table-custom">
                        <thead>
                            <tr>
                                <th>Doc. Estudiante</th>
                                <th>Nombre Completo</th>
                                <th>Terminal</th>
                                <th>Serial Asignado</th>
                                <th>Estado Despacho</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    _renderAdminAuditoriaTab() {
        const logs = window.appStore.getAuditoria(100);
        const rows = logs.map(l => `
            <tr>
                <td><small style="color: var(--text-muted);">${new Date(l.timestamp).toLocaleString()}</small></td>
                <td><strong>${l.actor}</strong><br><small style="color: var(--text-muted);">${l.rol}</small></td>
                <td><code>${l.accion}</code></td>
                <td>${l.entidad}</td>
                <td><small>${l.detalles}</small></td>
            </tr>
        `).join('');

        return `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Registro de Eventos y Auditoría de Trazabilidad</h4>
                </div>
                <div class="table-responsive">
                    <table class="table-custom">
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Actor & Perfil</th>
                                <th>Acción</th>
                                <th>Entidad</th>
                                <th>Detalles del Evento</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="5">No hay eventos registrados.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // EVENTOS Y ACCIONES DE DOCUMENTOS
    // =========================================================================
    switchTab(tabName) {
        this.currentTab = tabName;
        this.renderDashboard();
    }

    async handlePregenerateAllDrive() {
        if (!confirm('¿Desea pregenerar e inicializar todos los 208 formatos institucionales en Google Drive?')) return;
        try {
            this.showToast('Iniciando pregeneración de formatos...');
            const res = await window.documentGenerator.pregenerateAllFormats({
                onProgress: (cur, tot, desc) => {
                    this.showToast(`Generando ${cur}/${tot}: ${desc}`);
                }
            });
            this.showToast(`¡Listo! Se pregeneraron ${res.totalPregenerados} expedientes en Google Drive.`);
            this.renderDashboard();
        } catch (e) {
            alert('Error en pregeneración: ' + e.message);
        }
    }

    async handleDownloadDoc(docId) {
        const store = window.appStore;
        let doc = store.getDocumentoById(docId);
        
        // Si no se encuentra por ID directo, buscar por prefijo
        if (!doc) {
            if (docId.startsWith('DOC-026-')) {
                const dane = docId.replace('DOC-026-', '');
                doc = store.findDocumento('LOG-026-F', dane);
            } else if (docId.startsWith('DOC-029-')) {
                const dane = docId.replace('DOC-029-', '');
                doc = store.findDocumento('LOG-029-F', dane);
            } else if (docId.startsWith('DOC-007-')) {
                const docEst = docId.replace('DOC-007-', '');
                const est = store.getEstudianteByDoc(docEst);
                doc = store.findDocumento('LOG-007-F', est?.codigo_dane_sede, docEst);
            }
        }

        if (!doc) return;

        try {
            let blob = null;

            // Para LOG-029-F en estado generado/borrador, generar siempre en tiempo real para asegurar archivo 100% fresco, libre de errores y con seriales vigentes
            if (doc.tipo_documento === 'LOG-029-F' && (doc.estado === 'Generado' || doc.estado === 'Borrador')) {
                const gen = await window.documentGenerator.generateLog029(doc.codigo_dane_sede, doc.version_actual, doc.estado);
                blob = gen.blob;
            } else {
                // Regla: Los documentos cargados por usuario actualizan los originales -> Buscar primero el blob activo
                const blobItem = await store.getBlob(`DOC-${doc.id}-active`) || await store.getBlob(`DOC-${doc.id}-v${doc.version_actual}`);
                blob = blobItem?.blob;

                if (!blob && window.googleDriveClient && doc.drive_id && !doc.drive_id.startsWith('DRIVE-')) {
                    blob = await window.googleDriveClient.downloadFile(doc.drive_id);
                }

                if (!blob) {
                    // Generar en tiempo real si aún no tenía blob en caché
                    if (doc.tipo_documento === 'LOG-026-F') {
                        const gen = await window.documentGenerator.generateLog026(doc.codigo_dane_sede, doc.version_actual, doc.estado);
                        blob = gen.blob;
                    } else if (doc.tipo_documento === 'LOG-029-F') {
                        const gen = await window.documentGenerator.generateLog029(doc.codigo_dane_sede, doc.version_actual, doc.estado);
                        blob = gen.blob;
                    } else if (doc.tipo_documento === 'LOG-007-F') {
                        const gen = await window.documentGenerator.generateLog007(doc.estudiante_documento, doc.version_actual, doc.estado);
                        blob = gen.blob;
                    }
                }
            }

            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = doc.nombre_archivo;
                a.click();
                URL.revokeObjectURL(url);
                this.showToast(`Descargando ${doc.nombre_archivo}`);
            }
        } catch (e) {
            alert('Error descargando archivo: ' + e.message);
        }
    }

    async handleAcudienteDownloadDoc(docEst) {
        const store = window.appStore;
        const est = store.getEstudianteByDoc(docEst);
        let doc = store.findDocumento('LOG-007-F', est?.codigo_dane_sede, docEst);

        if (!doc) {
            const gen = await window.documentGenerator.generateLog007(docEst, 1, 'Generado');
            doc = gen.docRecord;
        }

        await this.handleDownloadDoc(doc.id);
    }

    async handleAcudienteUploadFile(file, docEst) {
        if (!file) return;
        const store = window.appStore;
        const est = store.getEstudianteByDoc(docEst);
        let doc = store.findDocumento('LOG-007-F', est?.codigo_dane_sede, docEst);

        if (!doc) {
            const gen = await window.documentGenerator.generateLog007(docEst, 1, 'Generado');
            doc = gen.docRecord;
        }

        try {
            await window.approvalWorkflow.uploadSignedDocumentByAcudiente(doc.id, file, file.name);
            this.showToast('Documento firmado cargado exitosamente. Ha actualizado el expediente original.');
            this.render();
        } catch (e) {
            alert('Error cargando documento: ' + e.message);
        }
    }

    async handleApproveLog007Rector(docId) {
        if (!confirm('¿Confirma que el formato LOG-007-F está correctamente firmado y legalizado para remitir a CPE?')) return;
        try {
            await window.approvalWorkflow.approveLog007ByRector(docId);
            this.showToast('Documento aprobado por rectoría y enviado a CPE.');
            this.renderDashboard();
        } catch (e) {
            alert(e.message);
        }
    }

    async handleApproveCoordinador(docId) {
        if (!confirm('¿Confirma la aprobación formal definitiva de este expediente?')) return;
        try {
            await window.approvalWorkflow.approveDocumentByCoordinador(docId);
            this.showToast('Expediente aprobado formalmente por CPE.');
            this.renderDashboard();
        } catch (e) {
            alert(e.message);
        }
    }

    async handleDownloadCoordinatorZip() {
        const mpio = document.getElementById('zip-filter-mpio')?.value || '';
        const tipo = document.getElementById('zip-filter-tipo')?.value || '';
        const estado = document.getElementById('zip-filter-estado')?.value || '';

        try {
            this.showToast('Empaquetando documentos y generando manifiesto CSV...');
            await window.documentGenerator.generateCoordinatorZip({
                codigo_municipio: mpio,
                tipo_documento: tipo,
                estado: estado
            });
            this.showToast('Paquete ZIP descargado exitosamente');
        } catch (e) {
            alert(e.message);
        }
    }

    // --- MODALES ---
    openReturnModal(docId, targetActor) {
        this.selectedDocForAction = docId;
        const modal = document.getElementById('modal-return');
        if (!modal) return;
        document.getElementById('return-target-text').innerText = targetActor === 'acudiente' ? 'al Acudiente' : 'al Rector';
        document.getElementById('return-motivo').value = '';
        document.getElementById('return-observaciones').value = '';
        modal.style.display = 'flex';
    }

    async confirmReturnDoc() {
        const motivo = document.getElementById('return-motivo').value.trim();
        const obs = document.getElementById('return-observaciones').value.trim();
        if (!motivo || !obs) {
            alert('Por favor complete el motivo y las observaciones.');
            return;
        }

        const user = window.authService.getCurrentUser();
        try {
            if (user.role === 'rector') {
                await window.approvalWorkflow.returnLog007ToAcudiente(this.selectedDocForAction, motivo, obs);
            } else {
                await window.approvalWorkflow.returnDocumentToRectorByCoordinador(this.selectedDocForAction, motivo, obs);
            }
            this.closeAllModals();
            this.showToast('Documento devuelto con observaciones registradas.');
            this.renderDashboard();
        } catch (e) {
            alert(e.message);
        }
    }

    openUploadOnBehalfModal(docId, targetActor) {
        this.selectedDocForAction = docId;
        const modal = document.getElementById('modal-behalf');
        if (!modal) return;
        document.getElementById('behalf-target-text').innerText = targetActor === 'acudiente' ? 'del Acudiente' : 'del Rector';
        document.getElementById('behalf-motivo').value = '';
        modal.style.display = 'flex';
    }

    async confirmUploadOnBehalf() {
        const motivo = document.getElementById('behalf-motivo').value.trim();
        const fileInput = document.getElementById('behalf-file-input');
        const file = fileInput.files[0];

        if (!motivo) {
            alert('Debe especificar el motivo institucional de la actuación en nombre de otra persona.');
            return;
        }
        if (!file) {
            alert('Debe seleccionar el archivo a cargar.');
            return;
        }

        const user = window.authService.getCurrentUser();
        try {
            if (user.role === 'rector') {
                await window.approvalWorkflow.uploadLog007OnBehalfOfAcudiente(this.selectedDocForAction, file, file.name, motivo);
            } else {
                await window.approvalWorkflow.uploadDocumentOnBehalfOfRector(this.selectedDocForAction, file, file.name, motivo);
            }
            this.closeAllModals();
            this.showToast('Documento cargado actualizando el original.');
            this.renderDashboard();
        } catch (e) {
            alert(e.message);
        }
    }

    openSubmitBolsaModal(docId) {
        this.selectedDocForAction = docId;
        const modal = document.getElementById('modal-submit-bolsa');
        if (modal) modal.style.display = 'flex';
    }

    async confirmSubmitBolsa() {
        const file = document.getElementById('submit-bolsa-file').files[0];
        const comments = document.getElementById('submit-bolsa-comments').value.trim();
        try {
            await window.approvalWorkflow.submitBolsaDocumentByRector(this.selectedDocForAction, file, file?.name, comments);
            this.closeAllModals();
            this.showToast('Formato remitido a CPE (documento original actualizado).');
            this.renderDashboard();
        } catch (e) {
            alert(e.message);
        }
    }

    openDriveConfigModal() {
        const modal = document.getElementById('modal-drive-config');
        if (!modal) return;
        const config = window.appStore.state.config;
        document.getElementById('config-client-id').value = config.google_client_id || '145744770636-qt8k12nfam0fmjfkpi66ct0fkq9b9n9j.apps.googleusercontent.com';
        document.getElementById('config-folder-id').value = config.drive_root_folder_id || '1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51';
        modal.style.display = 'flex';
    }

    async saveDriveConfig() {
        const clientId = document.getElementById('config-client-id').value.trim();
        const folderId = document.getElementById('config-folder-id').value.trim();

        window.appStore.state.config.google_client_id = clientId;
        window.appStore.state.config.drive_root_folder_id = folderId;
        window.appStore.persist();

        if (window.googleDriveClient) {
            window.googleDriveClient.rootFolderId = folderId;
        }

        this.closeAllModals();
        this.showToast('Configuración de Google Drive guardada.');
        this.updateHeaderSession(window.authService.getCurrentUser());
    }

    openDocHistoryModal(docId) {
        const store = window.appStore;
        const doc = store.getDocumentoById(docId);
        if (!doc) return;

        const versiones = store.getVersiones(docId);
        const rows = versiones.map(v => `
            <tr>
                <td>v0${v.version_num}</td>
                <td><span class="badge-estado ${this._getBadgeClass(v.estado)}">${v.estado}</span></td>
                <td><strong>${v.actor}</strong> (${v.rol})</td>
                <td>${v.comentarios || 'Sin observaciones'}</td>
                <td><small>${new Date(v.fecha).toLocaleString()}</small></td>
            </tr>
        `).join('');

        const modal = document.getElementById('modal-doc-history');
        if (!modal) return;
        document.getElementById('history-doc-title').innerText = `${doc.tipo_documento} - ${doc.nombre_archivo}`;
        document.getElementById('history-table-body').innerHTML = rows;
        modal.style.display = 'flex';
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    }

    // --- IMPORTACIONES Y SERIALES ---
    async handleBolsaFileSelect(file) {
        if (!file) return;
        try {
            this.showToast('Analizando archivo Excel...');
            const preview = await window.dataImporter.parseBolsaExcel(file);
            const confirmed = confirm(
                `Vista previa de importación:\n` +
                `- Total de sedes encontradas: ${preview.totalRows}\n` +
                `- Sedes nuevas: ${preview.newCount}\n` +
                `- Sedes actualizadas: ${preview.modifiedCount}\n` +
                `- Duplicados detectados: ${preview.duplicates.length}\n\n` +
                `¿Desea aplicar estos cambios a la base local y sincronizar con Drive?`
            );
            if (confirmed) {
                await window.dataImporter.applyBolsaImport(preview);
                this.showToast('Base de Bolsa Tecnológica actualizada exitosamente.');
                this.renderDashboard();
            }
        } catch (e) {
            alert('Error en importación: ' + e.message);
        }
    }

    async handleEstudiantesFileSelect(file) {
        if (!file) return;
        try {
            this.showToast('Analizando archivo de estudiantes...');
            const preview = await window.dataImporter.parseEstudiantesExcel(file);
            const confirmed = confirm(
                `Vista previa de estudiantes:\n` +
                `- Total de estudiantes beneficiarios: ${preview.totalRows}\n` +
                `- Estudiantes nuevos: ${preview.newCount}\n` +
                `- Estudiantes actualizados: ${preview.modifiedCount}\n` +
                `- Advertencias / incompletos: ${preview.warnings.length}\n\n` +
                `¿Desea aplicar estos cambios a la base local?`
            );
            if (confirmed) {
                await window.dataImporter.applyEstudiantesImport(preview);
                this.showToast('Base de estudiantes actualizada exitosamente.');
                this.renderDashboard();
            }
        } catch (e) {
            alert('Error en importación: ' + e.message);
        }
    }

    async handleInlineSerialUpdate(docEst, newSerial) {
        try {
            window.appStore.updateSerial(docEst, newSerial, 'Administrador', 'Administrador', 'Edición directa en tabla');
            this.showToast(`Serial actualizado para ${docEst}`);
        } catch (e) {
            alert(e.message);
        }
    }

    async handleSerialBatchFile(file) {
        if (!file) return;
        try {
            this.showToast('Analizando lote de seriales...');
            const preview = await window.dataImporter.parseSerialesExcel(file);
            const confirmed = confirm(
                `Lote de seriales detectado:\n` +
                `- Total seriales listados: ${preview.totalRows}\n` +
                `- Conflictos / vacíos: ${preview.conflicts.length}\n` +
                `- Estudiantes no encontrados: ${preview.notFound.length}\n\n` +
                `¿Desea aplicar la actualización masiva?`
            );
            if (confirmed) {
                await window.dataImporter.applySerialUpdates(preview.updates);
                this.showToast(`${preview.updates.length} seriales actualizados.`);
                this.renderDashboard();
            }
        } catch (e) {
            alert('Error importando seriales: ' + e.message);
        }
    }

    async handleResetSeed() {
        if (!confirm('¿Está seguro de restaurar los datos semilla oficiales? Esto reiniciará cambios locales.')) return;
        await window.appStore.loadSeedData();
        this.showToast('Datos semilla restaurados.');
        this.render();
    }

    _getBadgeClass(estado) {
        if (!estado) return 'generado';
        const s = estado.toLowerCase();
        if (s.includes('aprobado')) return 'aprobado';
        if (s.includes('devuelto')) return 'devuelto';
        if (s.includes('revisión') || s.includes('revision')) return 'revision';
        if (s.includes('pendiente')) return 'pendiente';
        if (s.includes('generado')) return 'generado';
        return 'borrador';
    }

    bindLoginEvents() {}
    bindDashboardEvents(role) {}
}

window.appController = new ApplicationController();
window.addEventListener('DOMContentLoaded', () => {
    window.appController.init();
});
