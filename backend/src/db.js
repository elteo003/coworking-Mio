const { Pool } = require('pg');

// Configurazione database per Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connesso a PostgreSQL!');
});

module.exports = pool; 