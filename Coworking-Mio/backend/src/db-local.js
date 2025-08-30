const { Pool } = require('pg');

// Configurazione database PostgreSQL 17 per sviluppo locale
const localConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'coworkspace',
    password: 'postgres',
    port: 5432,
};

// Pool per sviluppo locale
const pool = new Pool(localConfig);

pool.on('connect', () => {
    console.log('🔗 Connesso a PostgreSQL locale!');
});

pool.on('error', (err) => {
    console.error('❌ Errore connessione PostgreSQL locale:', err);
});

module.exports = pool;
