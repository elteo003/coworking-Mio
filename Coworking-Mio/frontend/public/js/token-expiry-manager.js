/**
 * Token Expiry Manager
 * Gestisce automaticamente la scadenza del token JWT e mostra un modal elegante
 */
class TokenExpiryManager {
    constructor() {
        this.checkInterval = null;
        this.warningShown = false;
        this.modalShown = false;
        this.warningTime = 5 * 60 * 1000; // 5 minuti prima della scadenza
        this.checkFrequency = 30 * 1000; // Controlla ogni 30 secondi

        this.init();
    }

    init() {
        console.log('🔐 Token Expiry Manager inizializzato');
        this.createModal();
        this.startTokenCheck();
        this.setupEventListeners();
    }

    createModal() {
        // Crea il modal HTML se non esiste
        if (document.getElementById('tokenExpiryModal')) return;

        const modalHTML = `
            <div id="tokenExpiryModal" class="token-expiry-modal">
                <div class="token-expiry-content">
                    <div class="token-expiry-icon">🔐</div>
                    <h3 class="token-expiry-title">Sessione Scaduta</h3>
                    <p class="token-expiry-message">
                        La tua sessione è scaduta per motivi di sicurezza.<br>
                        Effettua nuovamente il login per continuare.
                    </p>
                    <div class="token-expiry-actions">
                        <button id="tokenExpiryLoginBtn" class="token-expiry-btn token-expiry-btn-primary">
                            <i class="fas fa-sign-in-alt"></i>
                            Accedi
                        </button>
                        <button id="tokenExpiryRefreshBtn" class="token-expiry-btn token-expiry-btn-secondary">
                            <i class="fas fa-refresh"></i>
                            Ricarica
                        </button>
                    </div>
                    <div class="token-expiry-timer">
                        Reindirizzamento automatico in <span id="tokenExpiryCountdown">10</span> secondi
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('✅ Modal token expiry creato');
    }

    setupEventListeners() {
        // Pulsante Login
        const loginBtn = document.getElementById('tokenExpiryLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.handleLogin();
            });
        }

        // Pulsante Ricarica
        const refreshBtn = document.getElementById('tokenExpiryRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.handleRefresh();
            });
        }

        // Chiudi modal cliccando fuori
        const modal = document.getElementById('tokenExpiryModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.handleRefresh();
                }
            });
        }

        // Gestione tasto ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalShown) {
                this.handleRefresh();
            }
        });
    }

    startTokenCheck() {
        // Controlla immediatamente
        this.checkTokenExpiry();

        // Poi controlla periodicamente
        this.checkInterval = setInterval(() => {
            this.checkTokenExpiry();
        }, this.checkFrequency);

        console.log('🔄 Controllo token avviato (ogni 30 secondi)');
    }

    checkTokenExpiry() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('⚠️ Nessun token trovato');
            return;
        }

        try {
            const payload = this.parseJWT(token);
            if (!payload || !payload.exp) {
                console.log('⚠️ Token malformato');
                this.showExpiredModal();
                return;
            }

            const now = Math.floor(Date.now() / 1000);
            const expiryTime = payload.exp;
            const timeUntilExpiry = (expiryTime - now) * 1000;

            console.log(`🔍 Token scade in: ${Math.floor(timeUntilExpiry / 1000 / 60)} minuti`);

            // Se il token è già scaduto
            if (timeUntilExpiry <= 0) {
                console.log('❌ Token scaduto');
                this.showExpiredModal();
                return;
            }

            // Se mancano meno di 5 minuti, mostra avviso
            if (timeUntilExpiry <= this.warningTime && !this.warningShown) {
                console.log('⚠️ Token in scadenza tra poco');
                this.showWarningModal(timeUntilExpiry);
                this.warningShown = true;
            }

        } catch (error) {
            console.error('❌ Errore controllo token:', error);
            this.showExpiredModal();
        }
    }

    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Errore parsing JWT:', error);
            return null;
        }
    }

    showWarningModal(timeUntilExpiry) {
        const minutes = Math.floor(timeUntilExpiry / 1000 / 60);
        const seconds = Math.floor((timeUntilExpiry % (1000 * 60)) / 1000);

        // Mostra notifica toast invece di modal per l'avviso
        this.showToast(`La tua sessione scadrà tra ${minutes}:${seconds.toString().padStart(2, '0')}`, 'warning');
    }

    showExpiredModal() {
        if (this.modalShown) return;

        this.modalShown = true;
        const modal = document.getElementById('tokenExpiryModal');
        if (modal) {
            modal.classList.add('show');
            this.startCountdown();
        }

        // Pulisci il token scaduto
        localStorage.removeItem('authToken');
        console.log('🗑️ Token scaduto rimosso dal localStorage');
    }

    startCountdown() {
        let countdown = 10;
        const countdownElement = document.getElementById('tokenExpiryCountdown');

        const timer = setInterval(() => {
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }

            countdown--;

            if (countdown < 0) {
                clearInterval(timer);
                this.handleRefresh();
            }
        }, 1000);
    }

    handleLogin() {
        console.log('🔐 Redirect al login');
        this.hideModal();

        // Redirect alla pagina di login
        window.location.href = 'login.html';
    }

    handleRefresh() {
        console.log('🔄 Ricarica pagina');
        this.hideModal();

        // Ricarica la pagina corrente
        window.location.reload();
    }

    hideModal() {
        const modal = document.getElementById('tokenExpiryModal');
        if (modal) {
            modal.classList.remove('show');
            this.modalShown = false;
        }
    }

    showToast(message, type = 'info') {
        // Crea toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'warning' ? '#ffa726' : '#007bff'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Rimuovi dopo 5 secondi
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    // Metodo pubblico per controllare manualmente
    checkNow() {
        this.checkTokenExpiry();
    }

    // Metodo pubblico per fermare il controllo
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('🛑 Controllo token fermato');
    }

    // Metodo pubblico per riavviare il controllo
    restart() {
        this.stop();
        this.warningShown = false;
        this.modalShown = false;
        this.startTokenCheck();
        console.log('🔄 Controllo token riavviato');
    }
}

// Inizializza automaticamente quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza solo se non è già stato fatto
    if (!window.tokenExpiryManager) {
        window.tokenExpiryManager = new TokenExpiryManager();
        console.log('✅ Token Expiry Manager avviato automaticamente');
    }
});

// Aggiungi stili CSS per le animazioni toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(toastStyles);

// Esporta per uso globale
window.TokenExpiryManager = TokenExpiryManager;



