const { Pool } = require('pg');
require('dotenv').config();

// Configurazione Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testSupabaseConnection() {
    console.log('🚀 Test connessione Supabase...');
    console.log('🔗 DATABASE_URL configurata:', process.env.DATABASE_URL ? 'Sì' : 'No');
    
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL non configurata!');
        console.error('🔧 Configura la variabile d\'ambiente DATABASE_URL con la stringa di connessione Supabase');
        process.exit(1);
    }
    
    try {
        // Test connessione
        const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
        console.log('✅ Connessione Supabase riuscita!');
        console.log('🕐 Ora server:', result.rows[0].current_time);
        console.log('📊 Versione DB:', result.rows[0].db_version);
        
        // Test query sulle tabelle
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 Tabelle disponibili:');
        if (tablesResult.rows.length > 0) {
            tablesResult.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
        } else {
            console.log('   - Nessuna tabella trovata');
        }
        
        console.log('🎉 Test connessione Supabase completato con successo!');
        
    } catch (error) {
        console.error('❌ Errore durante il test connessione Supabase:', error.message);
        console.error('🔧 Verifica:');
        console.error('   1. DATABASE_URL è corretta');
        console.error('   2. Il database Supabase è accessibile');
        console.error('   3. Le credenziali sono valide');
        console.error('   4. La connessione SSL è configurata correttamente');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Esegui test
testSupabaseConnection();



