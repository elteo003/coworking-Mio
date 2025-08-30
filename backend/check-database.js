const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
    try {
        console.log('🔍 Controllo database per prenotazioni...');
        
        // Controlla tutte le prenotazioni
        const allBookings = await pool.query(`
            SELECT 
                id_prenotazione, 
                id_spazio, 
                data_inizio, 
                data_fine, 
                stato,
                EXTRACT(HOUR FROM data_inizio) as orario_inizio,
                EXTRACT(HOUR FROM data_fine) as orario_fine
            FROM Prenotazione 
            ORDER BY data_inizio DESC
            LIMIT 10
        `);
        
        console.log(`📋 Tutte le prenotazioni (ultime 10): ${allBookings.rows.length}`);
        allBookings.rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id_prenotazione}, Spazio: ${row.id_spazio}, ${row.data_inizio} - ${row.data_fine}, Stato: ${row.stato}, Ore: ${row.orario_inizio}-${row.orario_fine}`);
        });
        
        // Controlla specificamente per 2 settembre 2025
        const sep2Bookings = await pool.query(`
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
        
        console.log(`\n📅 Prenotazioni per 2 settembre 2025: ${sep2Bookings.rows.length}`);
        sep2Bookings.rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id_prenotazione}, Spazio: ${row.id_spazio}, ${row.data_inizio} - ${row.data_fine}, Stato: ${row.stato}, Ore: ${row.orario_inizio}-${row.orario_fine}`);
        });
        
        // Controlla per spazio 1 specificamente
        const spazio1Bookings = await pool.query(`
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
        
        console.log(`\n🏢 Prenotazioni per Spazio 1 il 2 settembre: ${spazio1Bookings.rows.length}`);
        spazio1Bookings.rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id_prenotazione}, ${row.data_inizio} - ${row.data_fine}, Stato: ${row.stato}, Ore: ${row.orario_inizio}-${row.orario_fine}`);
        });
        
        // Controlla se ci sono prenotazioni con stati diversi
        const statiBookings = await pool.query(`
            SELECT DISTINCT stato, COUNT(*) as count
            FROM Prenotazione 
            GROUP BY stato
        `);
        
        console.log(`\n📊 Stati prenotazioni nel database:`);
        statiBookings.rows.forEach(row => {
            console.log(`- ${row.stato}: ${row.count} prenotazioni`);
        });
        
        await pool.end();
    } catch (error) {
        console.error('❌ Errore:', error.message);
        await pool.end();
    }
}

checkDatabase();
