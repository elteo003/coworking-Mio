const { Pool } = require('pg');

console.log('🔧 Test connessione database...');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'coworking',
    password: 'postgres',
    port: 5432,
});

async function testConnection() {
    try {
        console.log('🔧 Tentativo connessione...');
        const client = await pool.connect();
        console.log('✅ Connesso al database!');

        const result = await client.query('SELECT NOW()');
        console.log('✅ Query test riuscita:', result.rows[0]);

        client.release();
        await pool.end();
        console.log('✅ Test completato con successo!');
    } catch (error) {
        console.error('❌ Errore connessione:', error.message);
        process.exit(1);
    }
}

testConnection();



