// Carica variabili d'ambiente
require('dotenv').config();

const { Pool } = require('pg');

// Configurazione database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSeptemberBookings() {
    try {
        console.log('🔍 Controllo prenotazioni settembre...');

        // Verifica connessione database
        await pool.query('SELECT NOW()');
        console.log('✅ Connessione database OK');

        // Query dettagliata per vedere tutte le prenotazioni di settembre
        const query = `
            SELECT 
                p.id_prenotazione,
                u.nome || ' ' || u.cognome as utente,
                u.email,
                s.nome as spazio,
                s.tipologia,
                se.nome as sede,
                se.citta,
                p.data_inizio,
                p.data_fine,
                p.stato,
                EXTRACT(HOUR FROM p.data_inizio) as ora_inizio,
                EXTRACT(HOUR FROM p.data_fine) as ora_fine,
                (EXTRACT(EPOCH FROM (p.data_fine - p.data_inizio))/3600) as durata_ore
            FROM Prenotazione p
            JOIN Utente u ON p.id_utente = u.id_utente
            JOIN Spazio s ON p.id_spazio = s.id_spazio
            JOIN Sede se ON s.id_sede = se.id_sede
            WHERE DATE(p.data_inizio) BETWEEN '2025-09-02' AND '2025-09-08'
            ORDER BY p.data_inizio, s.nome, p.data_inizio
        `;

        const result = await pool.query(query);
        const prenotazioni = result.rows;

        console.log(`\n📊 TROVATE ${prenotazioni.length} PRENOTAZIONI PER SETTEMBRE:\n`);

        // Raggruppa per data
        const prenotazioniPerData = {};
        prenotazioni.forEach(p => {
            const data = p.data_inizio.toISOString().split('T')[0];
            if (!prenotazioniPerData[data]) {
                prenotazioniPerData[data] = [];
            }
            prenotazioniPerData[data].push(p);
        });

        // Mostra per ogni data
        Object.keys(prenotazioniPerData).sort().forEach(data => {
            const prenotazioniGiorno = prenotazioniPerData[data];
            const dataFormattata = new Date(data).toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            console.log(`📅 ${dataFormattata.toUpperCase()}`);
            console.log('='.repeat(60));

            prenotazioniGiorno.forEach(p => {
                const oraInizio = p.ora_inizio.toString().padStart(2, '0') + ':00';
                const oraFine = p.ora_fine.toString().padStart(2, '0') + ':00';

                let statoIcon = '';
                switch (p.stato) {
                    case 'confermata': statoIcon = '✅'; break;
                    case 'in attesa': statoIcon = '⏳'; break;
                    case 'annullata': statoIcon = '❌'; break;
                    default: statoIcon = '❓';
                }

                console.log(`${statoIcon} ${p.utente}`);
                console.log(`   📍 ${p.sede} - ${p.citta}`);
                console.log(`   🏢 ${p.spazio} (${p.tipologia})`);
                console.log(`   ⏰ ${oraInizio} - ${oraFine} (${p.durata_ore}h)`);
                console.log(`   📧 ${p.email}`);
                console.log('');
            });
            console.log('');
        });

        // Statistiche per sede
        console.log('🏢 STATISTICHE PER SEDE:');
        console.log('='.repeat(40));

        const statsSede = await pool.query(`
            SELECT 
                se.nome as sede,
                se.citta,
                COUNT(*) as totale_prenotazioni,
                COUNT(CASE WHEN p.stato = 'confermata' THEN 1 END) as confermate,
                COUNT(CASE WHEN p.stato = 'in attesa' THEN 1 END) as in_attesa,
                COUNT(CASE WHEN p.stato = 'annullata' THEN 1 END) as annullate
            FROM Prenotazione p
            JOIN Spazio s ON p.id_spazio = s.id_spazio
            JOIN Sede se ON s.id_sede = se.id_sede
            WHERE DATE(p.data_inizio) BETWEEN '2025-09-02' AND '2025-09-08'
            GROUP BY se.id_sede, se.nome, se.citta
            ORDER BY totale_prenotazioni DESC
        `);

        statsSede.rows.forEach(stat => {
            console.log(`📍 ${stat.sede} - ${stat.citta}`);
            console.log(`   📊 Totale: ${stat.totale_prenotazioni}`);
            console.log(`   ✅ Confermate: ${stat.confermate}`);
            console.log(`   ⏳ In attesa: ${stat.in_attesa}`);
            console.log(`   ❌ Annullate: ${stat.annullate}`);
            console.log('');
        });

        // Statistiche per spazio
        console.log('🏢 STATISTICHE PER SPAZIO:');
        console.log('='.repeat(40));

        const statsSpazio = await pool.query(`
            SELECT 
                s.nome as spazio,
                s.tipologia,
                se.nome as sede,
                COUNT(*) as totale_prenotazioni,
                COUNT(CASE WHEN p.stato = 'confermata' THEN 1 END) as confermate
            FROM Prenotazione p
            JOIN Spazio s ON p.id_spazio = s.id_spazio
            JOIN Sede se ON s.id_sede = se.id_sede
            WHERE DATE(p.data_inizio) BETWEEN '2025-09-02' AND '2025-09-08'
            GROUP BY s.id_spazio, s.nome, s.tipologia, se.nome
            ORDER BY totale_prenotazioni DESC
        `);

        statsSpazio.rows.forEach(stat => {
            console.log(`🏢 ${stat.spazio} (${stat.tipologia})`);
            console.log(`   📍 ${stat.sede}`);
            console.log(`   📊 Totale: ${stat.totale_prenotazioni} | ✅ Confermate: ${stat.confermate}`);
            console.log('');
        });

        // Conflitti di orario
        console.log('⚠️ CONFLITTI DI ORARIO:');
        console.log('='.repeat(40));

        const conflicts = await pool.query(`
            SELECT 
                p1.id_prenotazione as prenotazione1,
                p2.id_prenotazione as prenotazione2,
                s.nome as spazio,
                se.nome as sede,
                p1.data_inizio,
                p1.data_fine,
                p1.stato as stato1,
                p2.stato as stato2,
                u1.nome || ' ' || u1.cognome as utente1,
                u2.nome || ' ' || u2.cognome as utente2
            FROM Prenotazione p1
            JOIN Prenotazione p2 ON p1.id_spazio = p2.id_spazio 
                AND p1.id_prenotazione < p2.id_prenotazione
                AND (p1.data_inizio, p1.data_fine) OVERLAPS (p2.data_inizio, p2.data_fine)
            JOIN Spazio s ON p1.id_spazio = s.id_spazio
            JOIN Sede se ON s.id_sede = se.id_sede
            JOIN Utente u1 ON p1.id_utente = u1.id_utente
            JOIN Utente u2 ON p2.id_utente = u2.id_utente
            WHERE DATE(p1.data_inizio) BETWEEN '2024-09-02' AND '2024-09-08'
        `);

        if (conflicts.rows.length > 0) {
            conflicts.rows.forEach(conflict => {
                console.log(`⚠️ CONFLITTO RILEVATO:`);
                console.log(`   🏢 ${conflict.spazio} - ${conflict.sede}`);
                console.log(`   👤 ${conflict.utente1} (${conflict.stato1}) vs ${conflict.utente2} (${conflict.stato2})`);
                console.log(`   ⏰ ${conflict.data_inizio.toLocaleString('it-IT')} - ${conflict.data_fine.toLocaleString('it-IT')}`);
                console.log('');
            });
        } else {
            console.log('✅ Nessun conflitto di orario rilevato');
        }

    } catch (error) {
        console.error('❌ Errore controllo prenotazioni:', error);
    } finally {
        await pool.end();
    }
}

// Esegui se chiamato direttamente
if (require.main === module) {
    checkSeptemberBookings();
}

module.exports = { checkSeptemberBookings };
