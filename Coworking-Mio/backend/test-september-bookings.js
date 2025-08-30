// Carica variabili d'ambiente
require('dotenv').config();

const { Pool } = require('pg');

// Configurazione database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Utenti di test per settembre
const testUsers = [
    { nome: 'Mario Rossi', email: 'mario.rossi@test.com', ruolo: 'cliente' },
    { nome: 'Giulia Bianchi', email: 'giulia.bianchi@test.com', ruolo: 'cliente' },
    { nome: 'Luca Verdi', email: 'luca.verdi@test.com', ruolo: 'cliente' },
    { nome: 'Anna Neri', email: 'anna.neri@test.com', ruolo: 'cliente' },
    { nome: 'Paolo Blu', email: 'paolo.blu@test.com', ruolo: 'cliente' },
    { nome: 'Sara Rosa', email: 'sara.rosa@test.com', ruolo: 'cliente' },
    { nome: 'Marco Giallo', email: 'marco.giallo@test.com', ruolo: 'cliente' },
    { nome: 'Elena Viola', email: 'elena.viola@test.com', ruolo: 'cliente' }
];

// Spazi disponibili (assumendo che esistano)
const spazi = [
    { id: 1, nome: 'Postazione 1', tipologia: 'postazione' },
    { id: 2, nome: 'Postazione 2', tipologia: 'postazione' },
    { id: 3, nome: 'Sala Riunioni A', tipologia: 'sala riunioni' },
    { id: 4, nome: 'Stanza Privata 1', tipologia: 'stanza privata' }
];

// Genera prenotazioni per la prima settimana di settembre 2024
async function generateSeptemberBookings() {
    try {
        console.log('🚀 Inizio generazione prenotazioni per settembre...');

        // Verifica connessione database
        await pool.query('SELECT NOW()');
        console.log('✅ Connessione database OK');

        // Crea utenti di test
        const userIds = [];
        for (const user of testUsers) {
            try {
                // Controlla se l'utente esiste già
                const existingUser = await pool.query(
                    'SELECT id_utente FROM Utente WHERE email = $1',
                    [user.email]
                );

                if (existingUser.rows.length > 0) {
                    userIds.push(existingUser.rows[0].id_utente);
                    console.log(`👤 Utente esistente: ${user.nome} (ID: ${existingUser.rows[0].id_utente})`);
                } else {
                    // Crea nuovo utente
                    const newUser = await pool.query(
                        `INSERT INTO Utente (nome, cognome, email, password, ruolo)
                         VALUES ($1, $2, $3, $4, $5) RETURNING id_utente`,
                        [user.nome.split(' ')[0], user.nome.split(' ')[1] || '', user.email, '$2b$10$dummyhash', user.ruolo]
                    );
                    userIds.push(newUser.rows[0].id_utente);
                    console.log(`👤 Nuovo utente creato: ${user.nome} (ID: ${newUser.rows[0].id_utente})`);
                }
            } catch (error) {
                console.error(`❌ Errore creazione utente ${user.nome}:`, error.message);
            }
        }

        // Genera prenotazioni per la prima settimana di settembre (2-8 settembre 2025)
        const prenotazioni = [];
        const startDate = new Date('2025-09-02'); // Lunedì
        const endDate = new Date('2025-09-08');   // Domenica

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const date = new Date(d);
            const dayOfWeek = date.getDay();

            // Salta weekend (sabato=6, domenica=0)
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            console.log(`📅 Generando prenotazioni per ${date.toDateString()}`);

            // Genera 2-4 prenotazioni per giorno
            const numBookings = Math.floor(Math.random() * 3) + 2;

            for (let i = 0; i < numBookings; i++) {
                const userId = userIds[Math.floor(Math.random() * userIds.length)];
                const spazio = spazi[Math.floor(Math.random() * spazi.length)];

                // Orari di lavoro: 9:00 - 18:00
                const startHour = Math.floor(Math.random() * 6) + 9; // 9-14
                const duration = Math.floor(Math.random() * 4) + 1;  // 1-4 ore
                const endHour = Math.min(startHour + duration, 18);

                const dataInizio = new Date(date);
                dataInizio.setHours(startHour, 0, 0, 0);

                const dataFine = new Date(date);
                dataFine.setHours(endHour, 0, 0, 0);

                // Stato casuale: 70% confermata, 20% in attesa, 10% annullata
                const rand = Math.random();
                let stato;
                if (rand < 0.7) stato = 'confermata';
                else if (rand < 0.9) stato = 'in attesa';
                else stato = 'annullata';

                prenotazioni.push({
                    id_utente: userId,
                    id_spazio: spazio.id,
                    data_inizio: dataInizio,
                    data_fine: dataFine,
                    stato: stato,
                    data_creazione: new Date()
                });
            }
        }

        console.log(`📋 Trovate ${prenotazioni.length} prenotazioni da creare`);

        // Inserisci prenotazioni nel database
        let successCount = 0;
        let errorCount = 0;

        for (const prenotazione of prenotazioni) {
            try {
                await pool.query(
                    `INSERT INTO Prenotazione (id_utente, id_spazio, data_inizio, data_fine, stato)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        prenotazione.id_utente,
                        prenotazione.id_spazio,
                        prenotazione.data_inizio,
                        prenotazione.data_fine,
                        prenotazione.stato
                    ]
                );
                successCount++;
            } catch (error) {
                console.error(`❌ Errore inserimento prenotazione:`, error.message);
                errorCount++;
            }
        }

        console.log(`✅ Prenotazioni create: ${successCount}`);
        console.log(`❌ Errori: ${errorCount}`);

        // Mostra statistiche
        const stats = await pool.query(`
            SELECT 
                stato,
                COUNT(*) as count,
                DATE(data_inizio) as data
            FROM Prenotazione 
            WHERE DATE(data_inizio) BETWEEN '2024-09-02' AND '2024-09-08'
            GROUP BY stato, DATE(data_inizio)
            ORDER BY data, stato
        `);

        console.log('\n📊 Statistiche prenotazioni settembre:');
        console.table(stats.rows);

        // Mostra conflitti di orario
        const conflicts = await pool.query(`
            SELECT 
                p1.id_prenotazione as prenotazione1,
                p2.id_prenotazione as prenotazione2,
                p1.id_spazio,
                p1.data_inizio,
                p1.data_fine,
                p1.stato as stato1,
                p2.stato as stato2
            FROM Prenotazione p1
            JOIN Prenotazione p2 ON p1.id_spazio = p2.id_spazio 
                AND p1.id_prenotazione < p2.id_prenotazione
                AND (p1.data_inizio, p1.data_fine) OVERLAPS (p2.data_inizio, p2.data_fine)
            WHERE DATE(p1.data_inizio) BETWEEN '2024-09-02' AND '2024-09-08'
        `);

        if (conflicts.rows.length > 0) {
            console.log('\n⚠️ Conflitti di orario rilevati:');
            console.table(conflicts.rows);
        } else {
            console.log('\n✅ Nessun conflitto di orario rilevato');
        }

    } catch (error) {
        console.error('❌ Errore generazione prenotazioni:', error);
    } finally {
        await pool.end();
    }
}

// Esegui se chiamato direttamente
if (require.main === module) {
    generateSeptemberBookings();
}

module.exports = { generateSeptemberBookings };
