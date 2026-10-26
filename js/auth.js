/**
 * auth.js - Autenticación con Google Identity Services (OAuth 2.0) y Credenciales Institucionales
 * Aplicación de Gestión Documental - Secretaría de Educación de Caldas & Computadores para Educar
 * 
 * Cumple con los lineamientos de seguridad y privacidad:
 * - Sin backend. Flujo Token Client de Google Identity Services en el navegador.
 * - Sin claves ni contraseñas en texto plano en el código ni repositorio.
 * - Validación mediante hash criptográfico SHA-256 para credenciales auxiliares.
 */

class AuthService {
    constructor() {
        this.currentUser = null;
        this.tokenClient = null;
        this.gisLoaded = false;
        this.authListeners = [];

        // Hashes SHA-256 autorizados para acceso institucional administrativo
        this._AUTH_HASHES = new Set([
            'e8f0ace3445861db728a3fd04c1c4d15ea246c666add45a3be7a139beef14e4b',
            'd14ba8d691d69021547940c77e8c0e4f6b0905101c28fd12a1a34fec21573c07'
        ]);

        this.DEFAULT_SCOPES = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ');

        this.init();
    }

    init() {
        const storedSession = sessionStorage.getItem('ceducar_auth_session');
        if (storedSession) {
            try {
                this.currentUser = JSON.parse(storedSession);
            } catch (e) {
                sessionStorage.removeItem('ceducar_auth_session');
            }
        }

        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            this.gisLoaded = true;
        } else {
            window.addEventListener('load', () => {
                if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                    this.gisLoaded = true;
                }
            });
        }
    }

    subscribe(callback) {
        this.authListeners.push(callback);
        if (this.currentUser) callback(this.currentUser);
        return () => {
            this.authListeners = this.authListeners.filter(cb => cb !== callback);
        };
    }

    _notify() {
        for (const cb of this.authListeners) {
            try { cb(this.currentUser); } catch (e) { console.error('Error en listener de auth:', e); }
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    async _computeSha256(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuf = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // --- Google OAuth 2.0 (Google Identity Services) ---
    async loginWithGoogle(clientId, preferredRole = null) {
        const targetClientId = clientId || window.appStore?.state?.config?.google_client_id || '145744770636-qt8k12nfam0fmjfkpi66ct0fkq9b9n9j.apps.googleusercontent.com';
        if (!targetClientId) {
            throw new Error('Debe configurar un Client ID de Google Cloud OAuth.');
        }

        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
            throw new Error('La biblioteca de Google Identity Services se está inicializando. Intente nuevamente en un segundo.');
        }

        return new Promise((resolve, reject) => {
            try {
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: targetClientId,
                    scope: this.DEFAULT_SCOPES,
                    callback: async (tokenResponse) => {
                        if (tokenResponse.error) {
                            reject(new Error(`Error de Google OAuth: ${tokenResponse.error_description || tokenResponse.error}`));
                            return;
                        }

                        const accessToken = tokenResponse.access_token;
                        try {
                            const userinfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { 'Authorization': `Bearer ${accessToken}` }
                            });
                            const profile = userinfoResp.ok ? await userinfoResp.json() : {};

                            const email = profile.email || 'usuario@sedcaldas.gov.co';
                            let role = preferredRole || 'coordinador';
                            if (!preferredRole && (email.toLowerCase().includes('admin') || (profile.name && profile.name.toLowerCase().includes('admin')))) {
                                role = 'administrador';
                            }

                            const userSession = {
                                id: profile.sub || 'usr_' + Date.now(),
                                name: profile.name || (role === 'coordinador' ? 'Coordinador CPE' : 'Administrador General'),
                                email: email,
                                picture: profile.picture || '',
                                role: role,
                                authenticated_with: 'google_oauth',
                                access_token: accessToken,
                                login_time: new Date().toISOString()
                            };

                            this.currentUser = userSession;
                            sessionStorage.setItem('ceducar_auth_session', JSON.stringify(userSession));

                            if (window.googleDriveClient) {
                                window.googleDriveClient.setToken(accessToken, profile);
                            }

                            if (window.appStore) {
                                window.appStore.logAudit({
                                    actor: userSession.name,
                                    rol: userSession.role,
                                    accion: 'LOGIN_GOOGLE_OAUTH',
                                    entidad: 'Usuario',
                                    entidad_id: userSession.email,
                                    detalles: `Inicio de sesión exitoso con Google OAuth en carpeta institucional ${window.appStore?.state?.config?.drive_root_folder_id || '1-LaWgOThiWFEXlxiI6gZq_sYwgvXs_51'}.`
                                });
                            }

                            this._notify();
                            resolve(userSession);
                        } catch (err) {
                            reject(err);
                        }
                    }
                });

                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } catch (e) {
                reject(e);
            }
        });
    }

    // --- Autenticación Auxiliar sin claves en texto plano ---
    async loginWithAuxiliaryCredentials({ role, credential, entityId = null }) {
        const cleanCred = String(credential || '').trim();
        const credHash = await this._computeSha256(cleanCred);

        let isValid = false;
        let userName = '';
        let userEmail = '';
        let metadata = {};

        if (role === 'administrador') {
            if (this._AUTH_HASHES.has(credHash)) {
                isValid = true;
                userName = 'Administrador General SED Caldas';
                userEmail = 'admin@sedcaldas.gov.co';
            }
        } else if (role === 'coordinador') {
            if (this._AUTH_HASHES.has(credHash)) {
                isValid = true;
                userName = 'Coordinador CPE - Caldas';
                userEmail = 'coordinador@sedcaldas.gov.co';
            }
        } else if (role === 'rector') {
            const dane = String(entityId || cleanCred).trim();
            const ie = window.appStore ? window.appStore.getInstitucionByDane(dane) : null;
            if (ie && (cleanCred === dane || this._AUTH_HASHES.has(credHash))) {
                isValid = true;
                userName = `Rector(a) - ${ie.nombre}`;
                userEmail = `rector.${dane}@sedcaldas.gov.co`;
                metadata = { dane_ie: dane, nombre_ie: ie.nombre };
            }
        } else if (role === 'acudiente') {
            const inputDoc = cleanCred;
            let est = window.appStore ? window.appStore.getEstudianteByAcudienteDoc(inputDoc) : null;
            if (!est && window.appStore) {
                est = window.appStore.getEstudianteByDoc(inputDoc);
            }
            if (est) {
                isValid = true;
                userName = est.acudiente_nombres || `Acudiente de ${est.nombre_completo}`;
                userEmail = `acudiente.${est.acudiente_documento || est.documento_identidad}@beneficiarios.edu.co`;
                metadata = {
                    documento_estudiante: est.documento_identidad,
                    nombre_estudiante: est.nombre_completo,
                    acudiente_documento: est.acudiente_documento,
                    codigo_dane_sede: est.codigo_dane_sede
                };
            }
        }

        if (!isValid) {
            throw new Error('Credenciales inválidas para el perfil seleccionado.');
        }

        const userSession = {
            id: 'aux_' + Date.now(),
            name: userName,
            email: userEmail,
            role: role,
            authenticated_with: 'institutional_credential',
            metadata: metadata,
            login_time: new Date().toISOString()
        };

        this.currentUser = userSession;
        sessionStorage.setItem('ceducar_auth_session', JSON.stringify(userSession));

        if (window.appStore) {
            window.appStore.logAudit({
                actor: userSession.name,
                rol: userSession.role,
                accion: 'LOGIN_INSTITUCIONAL',
                entidad: 'Usuario',
                entidad_id: userSession.email,
                detalles: `Inicio de sesión para perfil ${role}.`
            });
        }

        this._notify();
        return userSession;
    }

    switchRole(newRole, entityId = null) {
        if (!this.currentUser) return;
        this.currentUser.role = newRole;
        if (newRole === 'coordinador') {
            this.currentUser.name = 'Coordinador CPE - Caldas';
            this.currentUser.email = 'coordinador@sedcaldas.gov.co';
            this.currentUser.metadata = {};
        } else if (newRole === 'administrador') {
            this.currentUser.name = 'Administrador General SED Caldas';
            this.currentUser.email = 'admin@sedcaldas.gov.co';
            this.currentUser.metadata = {};
        } else if (newRole === 'rector' && entityId) {
            const ie = window.appStore ? window.appStore.getInstitucionByDane(entityId) : null;
            this.currentUser.metadata = { dane_ie: entityId, nombre_ie: ie ? ie.nombre : '' };
            this.currentUser.name = ie ? `Rector(a) - ${ie.nombre}` : this.currentUser.name;
        } else if (newRole === 'acudiente' && entityId) {
            const est = window.appStore ? window.appStore.getEstudianteByDoc(entityId) : null;
            if (est) {
                this.currentUser.metadata = {
                    documento_estudiante: entityId,
                    nombre_estudiante: est.nombre_completo,
                    acudiente_documento: est.acudiente_documento,
                    codigo_dane_sede: est.codigo_dane_sede
                };
                this.currentUser.name = est.acudiente_nombres || `Acudiente de ${est.nombre_completo}`;
            }
        }
        sessionStorage.setItem('ceducar_auth_session', JSON.stringify(this.currentUser));
        this._notify();
    }

    logout() {
        if (this.currentUser && window.appStore) {
            window.appStore.logAudit({
                actor: this.currentUser.name,
                rol: this.currentUser.role,
                accion: 'LOGOUT',
                entidad: 'Usuario',
                entidad_id: this.currentUser.email,
                detalles: `Cierre de sesión.`
            });
        }

        this.currentUser = null;
        sessionStorage.removeItem('ceducar_auth_session');

        if (window.googleDriveClient) {
            window.googleDriveClient.setToken(null, null);
        }

        this._notify();
    }
}

// Singleton global
window.authService = new AuthService();
