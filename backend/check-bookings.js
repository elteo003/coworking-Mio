const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkBookings() {
    try {
        console.log('🔍 Controllo prenotazioni per 2 settembre 2025...');
        
        const result = await pool.query(`
            SELECT 
                id_prenotazione, 
                id_spazio, 
                data_inizio, 
                data_fine, 
                stato,
                EXTRACT(HOUR FROM data_inizio) as orario_inizio,
                EXTRACT(HOUR FROM data_fine) as orario_fine
            FROM Prenotazione 
            WHERE DATE(data_inizio) = '2025-09-02'
            ORDER BY data_inizio
        `);
        
        console.log(`📋 Prenotazioni trovate: ${result.rows.length}`);
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id_prenotazione}, Spazio: ${row.id_spazio}, ${row.data_inizio} - ${row.data_fine}, Stato: ${row.stato}, Ore: ${row.orario_inizio}-${row.orario_fine}`);
        });
        
        // Controllo anche per spazio 1 specificamente
        const spazio1Result = await pool.query(`
            SELECT 
                id_prenotazione, 
                data_inizio, 
                data_fine, 
                stato,
                EXTRACT(HOUR FROM data_inizio) as orario_inizio,
                EXTRACT(HOUR FROM data_fine) as orario_fine
            FROM Prenotazione 
            WHERE id_spazio = 1 
            AND DATE(data_inizio) = '2025-09-02'
            ORDER BY data_inizio
        `);
        
        console.log(`\n🏢 Prenotazioni per Spazio 1: ${spazio1Result.rows.length}`);
        spazio1Result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id_prenotazione}, ${row.data_inizio} - ${row.data_fine}, Stato: ${row.stato}, Ore: ${row.orario_inizio}-${row.orario_fine}`);
        });
        
        await pool.end();
    } catch (error) {
        console.error('❌ Errore:', error.message);
        await pool.end();
    }
}

checkBookings();
