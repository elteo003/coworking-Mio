// Configurazione per sviluppo locale
// Questo file sostituisce le variabili d'ambiente per lo sviluppo locale

module.exports = {
    // Database PostgreSQL 17 Locale
    database: {
        user: 'postgres',
        host: 'localhost',
        database: 'coworkspace',
        password: 'postgres',
        port: 5432,
    },

    // Server
    server: {
        port: 3000,
        nodeEnv: 'development'
    },

    // JWT
    jwt: {
        secret: 'coworking-mio-secret-key-2024-local',
        expiresIn: '24h'
    },

    // CORS per sviluppo locale
    cors: {
        origin: [
            'http://localhost:8000',
            'http://127.0.0.1:5500',
            'http://localhost:3000'
        ],
        credentials: true
    },

    // Stripe (opzionale)
    stripe: {
        secretKey: 'sk_test_your_stripe_secret_key_here',
        publishableKey: 'pk_test_your_stripe_publishable_key_here',
        webhookSecret: 'whsec_your_webhook_secret_here'
    }
};
