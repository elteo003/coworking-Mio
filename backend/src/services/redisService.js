/**
 * Redis Service - Gestione cache per performance
 * Supporta setup semplice (senza Redis) per sviluppo locale
 */

const redis = require('redis');

class RedisService {
    constructor() {
        this.client = null;
        this.isEnabled = process.env.REDIS_ENABLED === 'true';
        this.isConnected = false;
    }

    /**
     * Inizializza connessione Redis
     */
    async initialize() {
        if (!this.isEnabled) {
            console.log('📦 Redis disabilitato - modalità sviluppo locale');
            return;
        }

        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

            this.client = redis.createClient({
                url: redisUrl,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.warn('⚠️ Redis non disponibile, continuo senza cache');
                        return new Error('Redis connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (err) => {
                console.warn('⚠️ Redis error:', err.message);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('✅ Redis connesso');
                this.isConnected = true;
            });

            this.client.on('disconnect', () => {
                console.log('🔌 Redis disconnesso');
                this.isConnected = false;
            });

            await this.client.connect();

        } catch (error) {
            console.warn('⚠️ Redis non disponibile, continuo senza cache:', error.message);
            this.isEnabled = false;
            this.isConnected = false;
        }
    }

    /**
     * Ottieni valore dalla cache
     * @param {string} key - Chiave cache
     * @returns {Promise<any>} Valore cached o null
     */
    async get(key) {
        if (!this.isEnabled || !this.isConnected) {
            return null;
        }

        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.warn('⚠️ Errore lettura cache:', error.message);
            return null;
        }
    }

    /**
     * Salva valore in cache
     * @param {string} key - Chiave cache
     * @param {any} value - Valore da salvare
     * @param {number} ttl - Time to live in secondi (default: 300 = 5 min)
     */
    async set(key, value, ttl = 300) {
        if (!this.isEnabled || !this.isConnected) {
            return false;
        }

        try {
            await this.client.setEx(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('⚠️ Errore scrittura cache:', error.message);
            return false;
        }
    }

    /**
     * Elimina chiave dalla cache
     * @param {string} key - Chiave da eliminare
     */
    async del(key) {
        if (!this.isEnabled || !this.isConnected) {
            return false;
        }

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.warn('⚠️ Errore eliminazione cache:', error.message);
            return false;
        }
    }

    /**
     * Elimina tutte le chiavi che corrispondono al pattern
     * @param {string} pattern - Pattern da eliminare (es: "slots:*")
     */
    async delPattern(pattern) {
        if (!this.isEnabled || !this.isConnected) {
            return false;
        }

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        } catch (error) {
            console.warn('⚠️ Errore eliminazione pattern cache:', error.message);
            return false;
        }
    }

    /**
     * Cache con fallback - controlla cache, se manca esegue funzione e salva risultato
     * @param {string} key - Chiave cache
     * @param {Function} fetchFunction - Funzione da eseguire se cache miss
     * @param {number} ttl - Time to live in secondi
     * @returns {Promise<any>} Valore da cache o da funzione
     */
    async getOrSet(key, fetchFunction, ttl = 300) {
        // Prova a leggere dalla cache
        const cached = await this.get(key);
        if (cached !== null) {
            console.log(`📦 Cache HIT per: ${key}`);
            return cached;
        }

        console.log(`📦 Cache MISS per: ${key}`);

        // Esegui funzione e salva in cache
        try {
            const result = await fetchFunction();
            await this.set(key, result, ttl);
            return result;
        } catch (error) {
            console.error('❌ Errore esecuzione funzione cache:', error);
            throw error;
        }
    }

    /**
     * Invalida cache per slot specifici
     * @param {number} sedeId - ID sede
     * @param {number} spazioId - ID spazio
     * @param {string} date - Data (YYYY-MM-DD)
     */
    async invalidateSlotsCache(sedeId, spazioId, date) {
        const patterns = [
            `slots:${sedeId}:${spazioId}:${date}`,
            `slots:${sedeId}:${spazioId}:*`,
            `slots:${sedeId}:*`,
            `slots:*`
        ];

        for (const pattern of patterns) {
            await this.delPattern(pattern);
        }

        console.log(`🗑️ Cache invalidata per slot: sede=${sedeId}, spazio=${spazioId}, data=${date}`);
    }

    /**
     * Ottieni statistiche cache
     */
    async getStats() {
        if (!this.isEnabled || !this.isConnected) {
            return { enabled: false, connected: false };
        }

        try {
            const info = await this.client.info('memory');
            const keyspace = await this.client.info('keyspace');

            return {
                enabled: true,
                connected: true,
                memory: info,
                keyspace: keyspace
            };
        } catch (error) {
            return {
                enabled: true,
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Chiudi connessione Redis
     */
    async close() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
            console.log('🔌 Redis disconnesso');
        }
    }
}

// Istanza singleton
const redisService = new RedisService();

module.exports = redisService;
