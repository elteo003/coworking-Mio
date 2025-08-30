// Carica variabili d'ambiente
require('dotenv').config();

const { Pool } = require('pg');

console.log('🔧 Inizializzazione connessione database...');

// Configurazione per Supabase
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

console.log('🔧 Configurazione database Supabase:', {
  connectionString: process.env.DATABASE_URL ? 'Configurata' : 'Non configurata',
  ssl: 'Abilitato'
});

const pool = new Pool(dbConfig);

pool.on('connect', () => {
  console.log('✅ Connesso a Supabase PostgreSQL!');
});

pool.on('error', (err) => {
  console.error('❌ Errore connessione Supabase PostgreSQL:', err);
});

module.exports = pool; 