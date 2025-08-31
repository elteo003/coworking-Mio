/**
 * Cache Manager Intelligente per Prenotazioni
 * Gestisce cache con TTL, invalidazione e richieste duplicate
 */
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.defaultTTL = 30000; // 30 secondi
        this.cleanupInterval = 60000; // 1 minuto

        // Avvia pulizia automatica
        this.startCleanup();
    }

    /**
     * Ottiene dati dalla cache o li recupera se non presenti
     * @param {string} key - Chiave della cache
     * @param {Function} fetcher - Funzione per recuperare i dati
     * @param {number} ttl - Time to live in millisecondi
     * @returns {Promise<any>} Dati dalla cache o fetch
     */
    async get(key, fetcher, ttl = this.defaultTTL) {
        // Controlla se c'è una richiesta in corso per evitare duplicati
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        // Controlla cache esistente
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data;
        }


        // Crea Promise condivisa per evitare richieste duplicate
        const promise = this.executeFetch(key, fetcher, ttl);
        this.pendingRequests.set(key, promise);

        try {
            const result = await promise;
            return result;
        } finally {
            this.pendingRequests.delete(key);
        }
    }

    /**
     * Esegue il fetch e aggiorna la cache
     */
    async executeFetch(key, fetcher, ttl) {
        try {
            const data = await fetcher();
            this.cache.set(key, {
                data,
                timestamp: Date.now(),
                ttl
            });
            return data;
        } catch (error) {
            console.error(`❌ Errore fetch per ${key}:`, error);
            throw error;
        }
    }

    /**
     * Invalida cache per una chiave specifica
     */
    invalidate(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
    }

    /**
     * Invalida cache per pattern
     */
    invalidatePattern(pattern) {
        const regex = new RegExp(pattern);
        let count = 0;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

    }

    /**
     * Pulisce cache scadute
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
        }
    }

    /**
     * Avvia pulizia automatica
     */
    startCleanup() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }

    /**
     * Ottiene statistiche cache
     */
    getStats() {
        return {
            size: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Istanza globale
window.CacheManager = new CacheManager();
