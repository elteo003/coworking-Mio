/**
 * Classe per gestire il modal di autenticazione
 * Gestisce login, registrazione e toggle password
 */
class AuthModal {
    constructor() {
        this.modal = null;
        this.currentTab = 'login';
        this.isInitialized = false;

        // Bind dei metodi
        this.handleLoginSubmit = this.handleLoginSubmit.bind(this);
        this.handleRegistrationSubmit = this.handleRegistrationSubmit.bind(this);
        this.togglePassword = this.togglePassword.bind(this);
        this.switchTab = this.switchTab.bind(this);
    }

    /**
     * Inizializza il modal
     */
    init() {
        if (this.isInitialized) return;

        console.log('🔐 Inizializzazione AuthModal...');

        // Crea il modal se non esiste
        this.createModal();

        // Configura form handlers
        this.setupFormHandlers();

        this.isInitialized = true;
        console.log('✅ AuthModal inizializzato');
    }

    /**
     * Crea il modal HTML se non esiste
     */
    createModal() {
        // Verifica se il modal esiste già
        if (document.getElementById('authModal')) {
            this.modal = document.getElementById('authModal');
            return;
        }

        const modalHTML = `
            <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="authModalLabel">Accedi o Registrati</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Tab Navigation -->
                            <ul class="nav nav-tabs nav-fill mb-4" id="authTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="login-tab" data-bs-toggle="tab" data-bs-target="#login" type="button" role="tab">
                                        <i class="fas fa-sign-in-alt me-2"></i>Accedi
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="registrazione-tab" data-bs-toggle="tab" data-bs-target="#registrazione" type="button" role="tab">
                                        <i class="fas fa-user-plus me-2"></i>Registrati
                                    </button>
                                </li>
                            </ul>

                            <!-- Tab Content -->
                            <div class="tab-content" id="authTabsContent">
                                <!-- Login Tab -->
                                <div class="tab-pane fade show active" id="login" role="tabpanel">
                                    <form id="loginForm">
                                        <div class="mb-3">
                                            <label for="loginEmail" class="form-label">
                                                <i class="fas fa-envelope me-2"></i>Email
                                            </label>
                                            <input type="email" class="form-control form-control-lg" id="loginEmail" required placeholder="Inserisci la tua email">
                                        </div>
                                        <div class="mb-4">
                                            <label for="loginPassword" class="form-label">
                                                <i class="fas fa-lock me-2"></i>Password
                                            </label>
                                            <div class="input-group">
                                                <input type="password" class="form-control form-control-lg" id="loginPassword" required placeholder="Inserisci la tua password">
                                                <button class="btn btn-outline-secondary" type="button" id="toggleLoginPassword">
                                                    <i class="fas fa-eye" id="loginPasswordIcon"></i>
                                                </button>
                                            </div>
                                            <div class="invalid-feedback" id="loginPassword-error"></div>
                                        </div>
                                        <button type="submit" class="btn btn-primary btn-lg w-100">
                                            <i class="fas fa-sign-in-alt me-2"></i>Accedi
                                        </button>
                                    </form>
                                </div>

                                <!-- Registrazione Tab -->
                                <div class="tab-pane fade" id="registrazione" role="tabpanel">
                                    <form id="registrazioneForm">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="regNome" class="form-label">
                                                        <i class="fas fa-user me-2"></i>Nome
                                                    </label>
                                                    <input type="text" class="form-control" id="regNome" required placeholder="Il tuo nome">
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="regCognome" class="form-label">
                                                        <i class="fas fa-user me-2"></i>Cognome
                                                    </label>
                                                    <input type="text" class="form-control" id="regCognome" required placeholder="Il tuo cognome">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <label for="regEmail" class="form-label">
                                                <i class="fas fa-envelope me-2"></i>Email
                                            </label>
                                            <input type="email" class="form-control" id="regEmail" required placeholder="La tua email">
                                        </div>
                                        <div class="mb-3">
                                            <label for="regPassword" class="form-label">
                                                <i class="fas fa-lock me-2"></i>Password
                                            </label>
                                            <div class="input-group">
                                                <input type="password" class="form-control" id="regPassword" required placeholder="Scegli una password sicura">
                                                <button class="btn btn-outline-secondary" type="button" id="toggleRegPassword">
                                                    <i class="fas fa-eye" id="regPasswordIcon"></i>
                                                </button>
                                            </div>
                                            <div class="invalid-feedback" id="regPassword-error"></div>
                                            
                                            <!-- Barra di forza password -->
                                            <div class="password-strength-container mt-2">
                                                <div class="password-strength-bar">
                                                    <div class="password-strength-fill" id="passwordStrengthFill"></div>
                                                </div>
                                                <small class="password-strength-text" id="passwordStrengthText">Inserisci una password</small>
                                            </div>
                                            
                                            <!-- Requisiti password -->
                                            <div class="password-requirements mt-2">
                                                <div class="requirement-item" id="req-length">
                                                    <i class="fas fa-times text-danger me-2"></i>
                                                    <span>Almeno 6 caratteri</span>
                                                </div>
                                                <div class="requirement-item" id="req-lowercase">
                                                    <i class="fas fa-times text-danger me-2"></i>
                                                    <span>Almeno una lettera minuscola</span>
                                                </div>
                                                <div class="requirement-item" id="req-uppercase">
                                                    <i class="fas fa-times text-danger me-2"></i>
                                                    <span>Almeno una lettera maiuscola</span>
                                                </div>
                                                <div class="requirement-item" id="req-number">
                                                    <i class="fas fa-times text-danger me-2"></i>
                                                    <span>Almeno un numero</span>
                                                </div>
                                                <div class="requirement-item" id="req-special">
                                                    <i class="fas fa-times text-danger me-2"></i>
                                                    <span>Almeno un carattere speciale</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <label for="regConfirmPassword" class="form-label">
                                                <i class="fas fa-lock me-2"></i>Conferma Password
                                            </label>
                                            <div class="input-group">
                                                <input type="password" class="form-control" id="regConfirmPassword" required placeholder="Conferma la password">
                                                <button class="btn btn-outline-secondary" type="button" id="toggleRegConfirmPassword">
                                                    <i class="fas fa-eye" id="regConfirmPasswordIcon"></i>
                                                </button>
                                            </div>
                                            <div class="invalid-feedback" id="regConfirmPassword-error"></div>
                                        </div>
                                        <div class="mb-3">
                                            <label for="regTelefono" class="form-label">
                                                <i class="fas fa-phone me-2"></i>Telefono
                                            </label>
                                            <input type="tel" class="form-control" id="regTelefono" placeholder="Il tuo numero di telefono">
                                        </div>
                                        <div class="mb-4">
                                            <label for="regRuolo" class="form-label">
                                                <i class="fas fa-user-tag me-2"></i>Ruolo
                                            </label>
                                            <select class="form-select" id="regRuolo" required>
                                                <option value="">Seleziona ruolo</option>
                                                <option value="cliente">Cliente</option>
                                                <option value="gestore">Gestore</option>
                                            </select>
                                        </div>
                                        <button type="submit" class="btn btn-primary btn-lg w-100">
                                            <i class="fas fa-user-plus me-2"></i>Registrati
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inserisci il modal nel body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('authModal');
    }

    /**
     * Configura gli event listeners
     */
    setupEventListeners() {
        // Rimuovi event listeners esistenti per evitare duplicazioni
        this.removeEventListeners();

        // Toggle password per login
        const toggleLoginPassword = document.getElementById('toggleLoginPassword');
        if (toggleLoginPassword) {
            this.toggleLoginPasswordHandler = () => this.togglePassword('loginPassword', 'loginPasswordIcon');
            toggleLoginPassword.addEventListener('click', this.toggleLoginPasswordHandler);
        }

        // Toggle password per registrazione
        const toggleRegPassword = document.getElementById('toggleRegPassword');
        if (toggleRegPassword) {
            this.toggleRegPasswordHandler = () => this.togglePassword('regPassword', 'regPasswordIcon');
            toggleRegPassword.addEventListener('click', this.toggleRegPasswordHandler);
        }

        // Toggle password per conferma registrazione
        const toggleRegConfirmPassword = document.getElementById('toggleRegConfirmPassword');
        if (toggleRegConfirmPassword) {
            this.toggleRegConfirmPasswordHandler = () => this.togglePassword('regConfirmPassword', 'regConfirmPasswordIcon');
            toggleRegConfirmPassword.addEventListener('click', this.toggleRegConfirmPasswordHandler);
        }

        // Validazione password in tempo reale
        const regPasswordInput = document.getElementById('regPassword');
        if (regPasswordInput) {
            this.passwordValidationHandler = () => this.validatePasswordStrength();
            regPasswordInput.addEventListener('input', this.passwordValidationHandler);
        }

        // Gestione cambio tab
        const authTabs = document.querySelectorAll('#authTabs .nav-link');
        authTabs.forEach(tab => {
            this.tabHandler = (e) => this.switchTab(e.target.getAttribute('data-bs-target'));
            tab.addEventListener('click', this.tabHandler);
        });
    }

    /**
     * Rimuove gli event listeners esistenti
     */
    removeEventListeners() {
        const toggleLoginPassword = document.getElementById('toggleLoginPassword');
        if (toggleLoginPassword && this.toggleLoginPasswordHandler) {
            toggleLoginPassword.removeEventListener('click', this.toggleLoginPasswordHandler);
        }

        const toggleRegPassword = document.getElementById('toggleRegPassword');
        if (toggleRegPassword && this.toggleRegPasswordHandler) {
            toggleRegPassword.removeEventListener('click', this.toggleRegPasswordHandler);
        }

        const toggleRegConfirmPassword = document.getElementById('toggleRegConfirmPassword');
        if (toggleRegConfirmPassword && this.toggleRegConfirmPasswordHandler) {
            toggleRegConfirmPassword.removeEventListener('click', this.toggleRegConfirmPasswordHandler);
        }

        const regPasswordInput = document.getElementById('regPassword');
        if (regPasswordInput && this.passwordValidationHandler) {
            regPasswordInput.removeEventListener('input', this.passwordValidationHandler);
        }

        const authTabs = document.querySelectorAll('#authTabs .nav-link');
        authTabs.forEach(tab => {
            if (this.tabHandler) {
                tab.removeEventListener('click', this.tabHandler);
            }
        });
    }

    /**
     * Configura i form handlers
     */
    setupFormHandlers() {
        // Form di login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLoginSubmit);
        }

        // Form di registrazione
        const registrazioneForm = document.getElementById('registrazioneForm');
        if (registrazioneForm) {
            registrazioneForm.addEventListener('submit', this.handleRegistrationSubmit);
        }
    }

    /**
     * Toggle mostra/nascondi password
     */
    togglePassword(inputId, iconId) {
        const passwordInput = document.getElementById(inputId);
        const passwordIcon = document.getElementById(iconId);

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordIcon.classList.remove('fa-eye');
            passwordIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            passwordIcon.classList.remove('fa-eye-slash');
            passwordIcon.classList.add('fa-eye');
        }
    }

    /**
     * Valida la forza della password e aggiorna i requisiti
     */
    validatePasswordStrength() {
        const password = document.getElementById('regPassword').value;
        const strengthFill = document.getElementById('passwordStrengthFill');
        const strengthText = document.getElementById('passwordStrengthText');

        // Controlla i requisiti
        const requirements = {
            length: password.length >= 6,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        // Aggiorna i requisiti visivamente
        this.updateRequirement('req-length', requirements.length);
        this.updateRequirement('req-lowercase', requirements.lowercase);
        this.updateRequirement('req-uppercase', requirements.uppercase);
        this.updateRequirement('req-number', requirements.number);
        this.updateRequirement('req-special', requirements.special);

        // Calcola la forza della password
        const score = Object.values(requirements).filter(Boolean).length;
        const strength = this.calculatePasswordStrength(score, password.length);

        // Aggiorna la barra di forza
        this.updatePasswordStrengthBar(strengthFill, strengthText, strength);
    }

    /**
     * Aggiorna un singolo requisito
     */
    updateRequirement(reqId, isValid) {
        const reqElement = document.getElementById(reqId);
        if (!reqElement) return;

        const icon = reqElement.querySelector('i');
        const text = reqElement.querySelector('span');

        if (isValid) {
            icon.className = 'fas fa-check text-success me-2';
            text.style.color = 'var(--success)';
        } else {
            icon.className = 'fas fa-times text-danger me-2';
            text.style.color = 'var(--gray-600)';
        }
    }

    /**
     * Calcola la forza della password
     */
    calculatePasswordStrength(score, length) {
        if (score === 0) return { level: 0, text: 'Inserisci una password', color: '#e5e7eb' };
        if (score === 1) return { level: 1, text: 'Molto debole', color: '#ef4444' };
        if (score === 2) return { level: 2, text: 'Debole', color: '#f97316' };
        if (score === 3) return { level: 3, text: 'Media', color: '#eab308' };
        if (score === 4) return { level: 4, text: 'Forte', color: '#22c55e' };
        if (score === 5 && length >= 8) return { level: 5, text: 'Molto forte', color: '#10b981' };
        return { level: 4, text: 'Forte', color: '#22c55e' };
    }

    /**
     * Aggiorna la barra di forza password
     */
    updatePasswordStrengthBar(fillElement, textElement, strength) {
        if (!fillElement || !textElement) return;

        const percentage = (strength.level / 5) * 100;
        fillElement.style.width = `${percentage}%`;
        fillElement.style.backgroundColor = strength.color;
        textElement.textContent = strength.text;
        textElement.style.color = strength.color;
    }

    /**
     * Cambia tab attivo
     */
    switchTab(targetTab) {
        this.currentTab = targetTab.replace('#', '');
        console.log('🔄 Cambio tab a:', this.currentTab);
    }

    /**
     * Passa al tab login
     */
    switchToLoginTab() {
        // Attiva il tab login
        const loginTab = document.getElementById('login-tab');
        const registrazioneTab = document.getElementById('registrazione-tab');
        const loginContent = document.getElementById('login');
        const registrazioneContent = document.getElementById('registrazione');

        if (loginTab && registrazioneTab && loginContent && registrazioneContent) {
            // Rimuovi active da registrazione
            registrazioneTab.classList.remove('active');
            registrazioneContent.classList.remove('show', 'active');

            // Attiva login
            loginTab.classList.add('active');
            loginContent.classList.add('show', 'active');

            this.currentTab = 'login';
            console.log('🔄 Passato al tab login');
        }
    }

    /**
     * Gestisce il submit del form di login
     */
    async handleLoginSubmit(e) {
        e.preventDefault();
        console.log('🔐 Tentativo di login...');

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            // Usa la funzione di login esistente da main.js
            if (window.handleLogin) {
                const result = await window.handleLogin(null, email, password);
                if (result && result.success) {
                    this.showSuccess('Login effettuato con successo!');
                    this.hide(); // Chiudi il modal
                    // La funzione handleLogin gestirà il redirect
                }
            } else {
                console.error('❌ Funzione handleLogin non disponibile');
                this.showError('Errore: Funzione di login non disponibile');
            }
        } catch (error) {
            console.error('❌ Errore login:', error);
            this.showError('Errore durante il login: ' + error.message);
        }
    }

    /**
     * Gestisce il submit del form di registrazione
     */
    async handleRegistrationSubmit(e) {
        e.preventDefault();
        console.log('📝 Tentativo di registrazione...');

        const nome = document.getElementById('regNome').value;
        const cognome = document.getElementById('regCognome').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const telefono = document.getElementById('regTelefono').value;
        const ruolo = document.getElementById('regRuolo').value;

        // Validazione
        if (password !== confirmPassword) {
            this.showError('Le password non coincidono');
            return;
        }

        try {
            // Usa la funzione di registrazione esistente da main.js
            if (window.handleRegistration) {
                // Passa i parametri direttamente alla funzione
                const result = await window.handleRegistration(null, nome, cognome, email, password, telefono, ruolo);
                if (result && result.success) {
                    this.showSuccess('Registrazione completata! Ora puoi effettuare il login.');
                    // Passa al tab login
                    this.switchToLoginTab();
                    // Pulisci il form di registrazione
                    document.getElementById('registrazioneForm').reset();
                }
            } else {
                console.error('❌ Funzione handleRegistration non disponibile');
                this.showError('Errore: Funzione di registrazione non disponibile');
            }
        } catch (error) {
            console.error('❌ Errore registrazione:', error);
            this.showError('Errore durante la registrazione: ' + error.message);
        }
    }

    /**
     * Mostra il modal
     */
    show() {
        if (!this.modal) {
            this.init();
        }

        // Aggiungi event listeners quando il modal viene mostrato
        this.setupEventListeners();

        const bootstrapModal = new bootstrap.Modal(this.modal);
        bootstrapModal.show();
        console.log('🔓 Modal di autenticazione aperto');
    }

    /**
     * Nasconde il modal
     */
    hide() {
        if (this.modal) {
            const bootstrapModal = bootstrap.Modal.getInstance(this.modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            }
        }

        // Rimuovi event listeners quando il modal viene chiuso
        this.removeEventListeners();
    }

    /**
     * Mostra un errore
     */
    showError(message) {
        // Crea una notifica di errore
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Inserisci l'errore nel modal
        const modalBody = this.modal.querySelector('.modal-body');
        modalBody.insertBefore(alertDiv, modalBody.firstChild);

        // Rimuovi automaticamente dopo 5 secondi
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }

    /**
     * Mostra un successo
     */
    showSuccess(message) {
        // Crea una notifica di successo
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Inserisci il successo nel modal
        const modalBody = this.modal.querySelector('.modal-body');
        modalBody.insertBefore(alertDiv, modalBody.firstChild);

        // Rimuovi automaticamente dopo 3 secondi
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 3000);
    }

    /**
     * Pulisce i form
     */
    clearForms() {
        const forms = ['loginForm', 'registrazioneForm'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.reset();
            }
        });

        // Pulisci gli errori
        const errorElements = this.modal.querySelectorAll('.invalid-feedback');
        errorElements.forEach(error => error.textContent = '');

        // Reset della barra di forza password
        this.resetPasswordStrength();
    }

    /**
     * Reset della barra di forza password
     */
    resetPasswordStrength() {
        const strengthFill = document.getElementById('passwordStrengthFill');
        const strengthText = document.getElementById('passwordStrengthText');

        if (strengthFill) {
            strengthFill.style.width = '0%';
            strengthFill.style.backgroundColor = 'var(--gray-300)';
        }

        if (strengthText) {
            strengthText.textContent = 'Inserisci una password';
            strengthText.style.color = 'var(--gray-500)';
        }

        // Reset dei requisiti
        const requirements = ['req-length', 'req-lowercase', 'req-uppercase', 'req-number', 'req-special'];
        requirements.forEach(reqId => {
            this.updateRequirement(reqId, false);
        });
    }
}

// Esporta la classe per uso globale
window.AuthModal = AuthModal;

// Crea un'istanza globale
window.authModal = new AuthModal();

// Funzione globale per mostrare il modal
window.showLoginModal = function () {
    window.authModal.show();
};

console.log('🔐 AuthModal caricato e pronto per l\'uso');
