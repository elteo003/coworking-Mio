/**
 * Error Handler con Retry Strategy
 * Gestisce errori con retry automatico e backoff esponenziale
 */
class ErrorHandler {
    constructor() {
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2
        };

        this.errorTypes = {
            NETWORK_ERROR: 'network_error',
            TIMEOUT_ERROR: 'timeout_error',
            SERVER_ERROR: 'server_error',
            AUTH_ERROR: 'auth_error',
            VALIDATION_ERROR: 'validation_error'
        };
    }

    /**
     * Esegue operazione con retry automatico
     * @param {Function} operation - Operazione da eseguire
     * @param {Object} context - Contesto per logging
     * @returns {Promise<any>} Risultato dell'operazione
     */
    async withRetry(operation, context = {}) {
        let lastError;
        const startTime = performance.now();

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const result = await operation();

                if (attempt > 0) {
                    const duration = performance.now() - startTime;
                    console.log(`✅ Operazione riuscita dopo ${attempt} retry (${duration.toFixed(2)}ms):`, context.operation || 'operation');
                }

                return result;
            } catch (error) {
                lastError = error;

                // Non ritentare per errori di validazione o autenticazione
                if (this.shouldNotRetry(error)) {
                    console.error(`❌ Errore non retryable:`, error.message);
                    throw error;
                }

                if (attempt === this.retryConfig.maxRetries) {
                    break;
                }

                // Calcola delay con backoff esponenziale
                const delay = this.calculateDelay(attempt);

                console.warn(`⚠️ Retry attempt ${attempt + 1}/${this.retryConfig.maxRetries} per ${context.operation || 'operation'}:`, error.message);
                console.log(`⏳ Attendo ${delay}ms prima del prossimo tentativo...`);

                await this.delay(delay);
            }
        }

        const duration = performance.now() - startTime;
        console.error(`❌ Operazione fallita dopo ${this.retryConfig.maxRetries + 1} tentativi (${duration.toFixed(2)}ms):`, lastError.message);
        throw lastError;
    }

    /**
     * Determina se un errore non dovrebbe essere ritentato
     */
    shouldNotRetry(error) {
        const status = error.status || error.response?.status;

        // Errori di validazione (400) o autenticazione (401, 403)
        if (status && [400, 401, 403].includes(status)) {
            return true;
        }

        // Errori di validazione specifici
        if (error.message && error.message.includes('validation')) {
            return true;
        }

        return false;
    }

    /**
     * Calcola delay con backoff esponenziale
     */
    calculateDelay(attempt) {
        const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt);
        return Math.min(delay, this.retryConfig.maxDelay);
    }

    /**
     * Utility per delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Gestisce errori specifici per prenotazioni
     */
    async handlePrenotazioneError(error, context = {}) {
        const errorType = this.classifyError(error);

        switch (errorType) {
            case this.errorTypes.NETWORK_ERROR:
                return this.handleNetworkError(error, context);
            case this.errorTypes.SERVER_ERROR:
                return this.handleServerError(error, context);
            case this.errorTypes.AUTH_ERROR:
                return this.handleAuthError(error, context);
            case this.errorTypes.VALIDATION_ERROR:
                return this.handleValidationError(error, context);
            default:
                return this.handleGenericError(error, context);
        }
    }

    /**
     * Classifica il tipo di errore
     */
    classifyError(error) {
        if (!navigator.onLine) {
            return this.errorTypes.NETWORK_ERROR;
        }

        const status = error.status || error.response?.status;

        if (status >= 500) {
            return this.errorTypes.SERVER_ERROR;
        }

        if (status === 401 || status === 403) {
            return this.errorTypes.AUTH_ERROR;
        }

        if (status === 400 || status === 422) {
            return this.errorTypes.VALIDATION_ERROR;
        }

        return this.errorTypes.NETWORK_ERROR;
    }

    /**
     * Gestisce errori di rete
     */
    handleNetworkError(error, context) {
        console.error('🌐 Errore di rete:', error.message);
        return {
            type: 'network',
            message: 'Problema di connessione. Verifica la tua connessione internet.',
            retryable: true
        };
    }

    /**
     * Gestisce errori del server
     */
    handleServerError(error, context) {
        console.error('🖥️ Errore del server:', error.message);
        return {
            type: 'server',
            message: 'Errore del server. Riprova tra qualche momento.',
            retryable: true
        };
    }

    /**
     * Gestisce errori di autenticazione
     */
    handleAuthError(error, context) {
        console.error('🔐 Errore di autenticazione:', error.message);
        return {
            type: 'auth',
            message: 'Sessione scaduta. Effettua nuovamente il login.',
            retryable: false,
            action: 'redirect_to_login'
        };
    }

    /**
     * Gestisce errori di validazione
     */
    handleValidationError(error, context) {
        console.error('✅ Errore di validazione:', error.message);
        return {
            type: 'validation',
            message: error.message || 'Dati non validi.',
            retryable: false
        };
    }

    /**
     * Gestisce errori generici
     */
    handleGenericError(error, context) {
        console.error('❓ Errore generico:', error.message);
        return {
            type: 'generic',
            message: 'Si è verificato un errore imprevisto.',
            retryable: true
        };
    }
}

// Istanza globale
window.ErrorHandler = new ErrorHandler();
