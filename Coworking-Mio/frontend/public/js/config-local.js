// Configurazione per sviluppo locale
window.CONFIG = {
    // API Base per sviluppo locale
    API_BASE: 'http://localhost:3000/api',

    // Configurazioni ambiente
    ENVIRONMENT: 'LOCAL',
    DEBUG: true,

    // Configurazioni CORS
    CORS_ENABLED: true,

    // Configurazioni JWT
    JWT_STORAGE_KEY: 'token',
    USER_STORAGE_KEY: 'user',

    // Configurazioni timeout
    REQUEST_TIMEOUT: 30000,

    // Configurazioni logging
    LOG_LEVEL: 'debug'
};

console.log('🔧 Configurazione locale caricata:', window.CONFIG);



