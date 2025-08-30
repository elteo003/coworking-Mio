const { Pool } = require('pg');

// Configurazione database usando le variabili d'ambiente
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ ERRORE: DATABASE_URL non configurata!');
    console.error('🔧 Configura la variabile d\'ambiente DATABASE_URL');
    process.exit(1);
}

console.log('🔗 Tentativo connessione a:', DATABASE_URL.replace(/\/\/.*@/, '//***:***@'));

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Dati di test per la prima settimana di settembre 2025
const testPrenotazioni = [
    // Lunedì 1 settembre
    { data: '2025-09-01', orario_inizio: '09:00', orario_fine: '10:00', id_spazio: 1, id_utente: 1 },
    { data: '2025-09-01', orario_inizio: '11:00', orario_fine: '12:00', id_spazio: 1, id_utente: 2 },
    { data: '2025-09-01', orario_inizio: '14:00', orario_fine: '15:00', id_spazio: 1, id_utente: 1 },
    { data: '2025-09-01', orario_inizio: '16:00', orario_fine: '17:00', id_spazio: 1, id_utente: 3 },
    
    // Martedì 2 settembre
    { data: '2025-09-02', orario_inizio: '08:00', orario_fine: '09:00', id_spazio: 1, id_utente: 2 },
    { data: '2025-09-02', orario_inizio: '10:00', orario_fine: '11:00', id_spazio: 1, id_utente: 1 },
    { data: '2025-09-02', orario_inizio: '13:00', orario_fine: '14:00', id_spazio: 1, id_utente: 3 },
    { data: '2025-09-02', orario_inizio: '15:00', orario_fine: '16:00', id_spazio: 1, id_utente: 2 },
    { data: '2025-09-02', orario_inizio: '17:00', orario_fine: '18:00', id_spazio: 1, id_utente: 1 },
    
    // Mercoledì 3 settembre
    { data: '2025-09-03', orario_inizio: '09:00', orario_fine: '10:00', id_spazio: 1, id_utente: 3 },
    { data: '2025-09-03', orario_inizio: '11:00', orario_fine: '12:00', id_spazio: 1, id_utente: 1 },
    { data: '2025-09-03', orario_inizio: '14:00', orario_fine: '15:00', id_spazio: 1, id_utente: 2 },
    { data: '2025-09-03', orario_inizio: '16:00', orario_fine: '17:00', id_spazio: 1, id_utente: 3 },
    
    // Giovedì 4 settembre
    { data: '2025-09-04', orario_inizio: '08:00', orario_fine: '09:00', id_spazio: 1, id_utente: 1 },
    { data: '2025-09-04', orario_inizio: '10:00', orario_fine: '11:00', id_spazio: 1, id_utente: 2 },
    { data: '2025-09-04', orario_inizio: '12:00', orario_fine: '13:00', id_spazio: 1, id_utente: 3 },
    { data: '2025-09-04', orario_inizio: '14:00', orario_fine: '15:00', id_spazio: 1, id_utente: 1 },
    { data: '2025-09-04', orario_inizio: '16:00', orario_fine: '17:00', id_spazio: 1, id_utente: 2 },
    { data: '2025-09-04', orario_inizio: '18:00', orario_fine: '19:00', id_spazio: 1, id_utente: 3 },
    
    // Venerdì 5 settembre
    { data: '2025-09-05', orario_inizio: '09:00', orario_fine: '10:00', id_spazio: 1, id_utente: 2 },
    { data: '2025-09-05', orario_inizio: '11:00', orario_fine: '12:00', id_spazio: 1, id_utente: 3 },
    { data: '2025-09-05', orario_inizio: '13:00', orario_fine: '14:00', id_spazio: 1, id_utente: 1 },
    { data: '2025-09-05', orario_inizio: '15:00', orario_fine: '16:00', id_spazio: 1, id_utente: 2 },
    
    // Sabato 6 settembre
    { data: '2025-09-06', orario_inizio: '10:00', orario_fine: '11:00', id_spazio: 1, id_utente: 1 },
    { data: '2025-09-06', orario_inizio: '12:00', orario_fine: '13:00', id_spazio: 1, id_utente: 3 },
    { data: '2025-09-06', orario_inizio: '14:00', orario_fine: '15:00', id_spazio: 1, id_utente: 2 },
    
    // Domenica 7 settembre
    { data: '2025-09-07', orario_inizio: '11:00', orario_fine: '12:00', id_spazio: 1, id_utente: 1 },
    { data: '2025-09-07', orario_inizio: '15:00', orario_fine: '16:00', id_spazio: 1, id_utente: 3 },
    
    // Prenotazioni per spazio 2 (se esiste)
    { data: '2025-09-01', orario_inizio: '10:00', orario_fine: '11:00', id_spazio: 2, id_utente: 2 },
    { data: '2025-09-02', orario_inizio: '14:00', orario_fine: '15:00', id_spazio: 2, id_utente: 1 },
    { data: '2025-09-03', orario_inizio: '16:00', orario_fine: '17:00', id_spazio: 2, id_utente: 3 },
    { data: '2025-09-04', orario_inizio: '12:00', orario_fine: '13:00', id_spazio: 2, id_utente: 2 },
    { data: '2025-09-05', orario_inizio: '18:00', orario_fine: '19:00', id_spazio: 2, id_utente: 1 },
];

async function creaPrenotazioniTest() {
    console.log('🚀 Inizio creazione prenotazioni test per settembre 2025...');
    
    try {
        // Prima pulisci le prenotazioni esistenti per settembre 2025
        console.log('🧹 Pulizia prenotazioni esistenti per settembre 2025...');
        await pool.query(`
            DELETE FROM Prenotazione 
            WHERE data_inizio >= '2025-09-01' 
            AND data_inizio < '2025-09-08'
        `);
        console.log('✅ Pulizia completata');
        
        // Crea le prenotazioni di test
        console.log(`📝 Creazione di ${testPrenotazioni.length} prenotazioni...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const prenotazione of testPrenotazioni) {
            try {
                const dataInizio = new Date(`${prenotazione.data}T${prenotazione.orario_inizio}:00`);
                const dataFine = new Date(`${prenotazione.data}T${prenotazione.orario_fine}:00`);
                
                const query = `
                    INSERT INTO Prenotazione (
                        id_utente, id_spazio, data_inizio, data_fine, stato
                    ) VALUES (
                        $1, $2, $3, $4, 'confermata'
                    ) RETURNING id_prenotazione
                `;
                
                const result = await pool.query(query, [
                    prenotazione.id_utente,
                    prenotazione.id_spazio,
                    dataInizio,
                    dataFine
                ]);
                
                console.log(`✅ Prenotazione creata: ${prenotazione.data} ${prenotazione.orario_inizio}-${prenotazione.orario_fine} (ID: ${result.rows[0].id_prenotazione})`);
                successCount++;
                
            } catch (error) {
                console.error(`❌ Errore creazione prenotazione ${prenotazione.data} ${prenotazione.orario_inizio}-${prenotazione.orario_fine}:`, error.message);
                errorCount++;
            }
        }
        
        console.log('\n📊 Riepilogo:');
        console.log(`✅ Prenotazioni create con successo: ${successCount}`);
        console.log(`❌ Errori: ${errorCount}`);
        console.log(`📅 Periodo: 1-7 settembre 2025`);
        console.log(`🏢 Spazi coinvolti: 1, 2`);
        console.log(`👥 Utenti coinvolti: 1, 2, 3`);
        
        // Verifica finale
        console.log('\n🔍 Verifica finale...');
        const verifica = await pool.query(`
            SELECT 
                DATE(data_inizio) as data,
                COUNT(*) as prenotazioni,
                STRING_AGG(DISTINCT id_spazio::text, ', ') as spazi
            FROM Prenotazione 
            WHERE data_inizio >= '2025-09-01' 
            AND data_inizio < '2025-09-08'
            GROUP BY DATE(data_inizio)
            ORDER BY data
        `);
        
        console.log('📋 Prenotazioni per giorno:');
        verifica.rows.forEach(row => {
            console.log(`   ${row.data}: ${row.prenotazioni} prenotazioni (spazi: ${row.spazi})`);
        });
        
        console.log('\n🎉 Test completato con successo!');
        console.log('💡 Ora puoi testare la pagina selezione-slot.html con dati reali');
        
    } catch (error) {
        console.error('❌ Errore durante la creazione delle prenotazioni:', error);
    } finally {
        await pool.end();
    }
}

// Esegui il test
creaPrenotazioniTest();
