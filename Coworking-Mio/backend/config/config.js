// Carica variabili d'ambiente
require('dotenv').config();

// Importa configurazione personalizzata
const envConfig = require('./env');

module.exports = {
    // Configurazione database Supabase
    database: {
        url: envConfig.DATABASE_URL
    },

    // Configurazione server
    server: {
        port: envConfig.PORT,
        nodeEnv: envConfig.NODE_ENV
    },

    // Configurazione Stripe
    stripe: {
        secretKey: envConfig.STRIPE_SECRET_KEY,
        publishableKey: envConfig.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: envConfig.STRIPE_WEBHOOK_SECRET
    },

    // Configurazione JWT
    jwt: {
        secret: envConfig.JWT_SECRET,
        expiresIn: envConfig.JWT_EXPIRES_IN
    },

    // Configurazione CORS
    cors: {
        origin: envConfig.CORS_ORIGIN ? envConfig.CORS_ORIGIN.split(',') : [
            'http://localhost:3000',
            'http://localhost:8000',
            'http://127.0.0.1:5500',
            'https://coworking-mio-1.onrender.com',  // Frontend su Render
            'https://coworking-mio-1-backend.onrender.com'  // Backend su Render
        ],
        credentials: true
    }
};
