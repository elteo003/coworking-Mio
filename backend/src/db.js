const { Pool } = require('pg');

// Configurazione database dinamica per locale e produzione
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('supabase');

const poolConfig = {
  connectionString: process.env.DATABASE_URL
};

// SSL solo per Supabase (produzione)
if (isProduction) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
  console.log('🔐 Configurazione database: SSL abilitato per Supabase');
} else {
  console.log('🏠 Configurazione database: SSL disabilitato per sviluppo locale');
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('✅ Connesso a PostgreSQL!');
});

pool.on('error', (err) => {
  console.error('❌ Errore connessione database:', err.message);
});

module.exports = pool; 