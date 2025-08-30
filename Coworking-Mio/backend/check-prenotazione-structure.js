const { Pool } = require('pg');
require('dotenv').config();

// Configurazione Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkPrenotazioneStructure() {
    const client = await pool.connect();

    try {
        console.log('🔍 Controllo struttura tabella prenotazione...');

        // 1. Controlla colonne della tabella prenotazione
        console.log('\n📋 Colonne tabella prenotazione:');
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'prenotazione' 
            ORDER BY ordinal_position
        `);

        columns.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // 2. Controlla constraint della tabella prenotazione
        console.log('\n📋 Constraint tabella prenotazione:');
        const constraints = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'prenotazione'::regclass
        `);

        constraints.rows.forEach(row => {
            console.log(`   - ${row.conname}: ${row.definition}`);
        });

        // 3. Controlla alcuni record esistenti
        console.log('\n📋 Record esistenti nella tabella prenotazione:');
        const records = await client.query('SELECT * FROM prenotazione LIMIT 3');
        if (records.rows.length > 0) {
            console.log('   Colonne disponibili:', Object.keys(records.rows[0]));
            records.rows.forEach((record, index) => {
                console.log(`   Record ${index + 1}:`, record);
            });
        } else {
            console.log('   Nessun record trovato');
        }

    } catch (error) {
        console.error('❌ Errore durante il controllo:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Esegui il controllo
checkPrenotazioneStructure();



