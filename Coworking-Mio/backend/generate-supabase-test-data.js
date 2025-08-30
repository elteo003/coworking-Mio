const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configurazione Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Funzione per generare date casuali
function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Funzione per generare orari casuali
function getRandomTime() {
    const hour = Math.floor(Math.random() * 8) + 9; // 9-16
    const minute = Math.random() < 0.5 ? 0 : 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Funzione per generare email casuali
function generateRandomEmail() {
    const names = ['mario', 'giulia', 'luca', 'anna', 'marco', 'sofia', 'francesco', 'elena', 'andrea', 'federica'];
    const surnames = ['rossi', 'bianchi', 'verdi', 'neri', 'gialli', 'blu', 'rosa', 'arancione', 'viola', 'grigio'];
    const domains = ['gmail.com', 'yahoo.it', 'hotmail.com', 'outlook.com', 'libero.it'];

    const name = names[Math.floor(Math.random() * names.length)];
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const number = Math.floor(Math.random() * 100);

    return `${name}.${surname}${number}@${domain}`;
}

// Funzione per generare numeri di telefono casuali
function generateRandomPhone() {
    const prefixes = ['333', '334', '335', '336', '337', '338', '339', '320', '321', '322'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `${prefix}${number}`;
}

async function generateSupabaseTestData() {
    const client = await pool.connect();

    try {
        console.log('🚀 Generazione dati di test per Supabase...');

        // 1. Verifica connessione
        const testResult = await client.query('SELECT NOW() as current_time');
        console.log('✅ Connesso a Supabase:', testResult.rows[0].current_time);

        // 2. Controlla se esistono sedi e spazi
        const sediResult = await client.query('SELECT id_sede, nome FROM Sede LIMIT 5');
        const spaziResult = await client.query('SELECT id_spazio, nome, id_sede FROM Spazio LIMIT 10');

        console.log(`📊 Trovati: ${sediResult.rows.length} sedi, ${spaziResult.rows.length} spazi`);

        // 3. Crea sedi se non esistono
        if (sediResult.rows.length === 0) {
            console.log('🏢 Creo sedi di esempio...');
            await client.query(`
                INSERT INTO Sede (nome, indirizzo, citta, cap, telefono, email, id_gestore) VALUES
                ('CoWork Milano Centro', 'Via Montenapoleone 1', 'Milano', '20121', '02-1234567', 'milano@cowork.com', 1),
                ('CoWork Roma Termini', 'Via Marsala 2', 'Roma', '00185', '06-7654321', 'roma@cowork.com', 1),
                ('CoWork Firenze Centro', 'Piazza della Repubblica 3', 'Firenze', '50100', '055-9876543', 'firenze@cowork.com', 1)
            `);
            console.log('✅ Sedi create');
        }

        // 4. Crea spazi se non esistono
        if (spaziResult.rows.length === 0) {
            console.log('🏠 Creo spazi di esempio...');
            await client.query(`
                INSERT INTO Spazio (nome, descrizione, capienza, prezzo_orario, id_sede, stato) VALUES
                ('Sala Meeting 1', 'Sala riunioni per 8 persone', 8, 25.00, 1, 'attivo'),
                ('Sala Meeting 2', 'Sala riunioni per 12 persone', 12, 35.00, 1, 'attivo'),
                ('Open Space', 'Area coworking condivisa', 20, 15.00, 1, 'attivo'),
                ('Ufficio Privato 1', 'Ufficio privato per 2 persone', 2, 40.00, 1, 'attivo'),
                ('Ufficio Privato 2', 'Ufficio privato per 4 persone', 4, 60.00, 1, 'attivo'),
                ('Sala Conferenze', 'Sala per presentazioni', 30, 50.00, 2, 'attivo'),
                ('Postazione Singola', 'Postazione individuale', 1, 20.00, 2, 'attivo'),
                ('Sala Training', 'Sala per corsi e formazione', 15, 30.00, 3, 'attivo')
            `);
            console.log('✅ Spazi creati');
        }

        // 5. Ottieni dati aggiornati
        const sedi = await client.query('SELECT id_sede, nome FROM Sede LIMIT 5');
        const spazi = await client.query('SELECT id_spazio, nome, id_sede FROM Spazio LIMIT 10');

        console.log(`📊 Dati finali: ${sedi.rows.length} sedi, ${spazi.rows.length} spazi`);

        // 6. Crea utenti di test con ruoli diversi
        console.log('👥 Creo utenti di test...');

        const testUsers = [
            // Gestori
            { nome: 'Mario', cognome: 'Rossi', email: 'mario.rossi@cowork.com', telefono: '3331112222', ruolo: 'gestore' },
            { nome: 'Giulia', cognome: 'Bianchi', email: 'giulia.bianchi@cowork.com', telefono: '3332223333', ruolo: 'gestore' },

            // Utenti normali - usando 'cliente' come ruolo (corretto per il constraint)
            { nome: 'Luca', cognome: 'Verdi', email: 'luca.verdi@email.com', telefono: '3333334444', ruolo: 'cliente' },
            { nome: 'Anna', cognome: 'Neri', email: 'anna.neri@email.com', telefono: '3334445555', ruolo: 'cliente' },
            { nome: 'Marco', cognome: 'Gialli', email: 'marco.gialli@email.com', telefono: '3335556666', ruolo: 'cliente' },
            { nome: 'Sofia', cognome: 'Blu', email: 'sofia.blu@email.com', telefono: '3336667777', ruolo: 'cliente' },
            { nome: 'Francesco', cognome: 'Rosa', email: 'francesco.rosa@email.com', telefono: '3337778888', ruolo: 'cliente' },
            { nome: 'Elena', cognome: 'Arancione', email: 'elena.arancione@email.com', telefono: '3338889999', ruolo: 'cliente' }
        ];

        // Aggiungi utenti casuali
        for (let i = 0; i < 15; i++) {
            testUsers.push({
                nome: ['Andrea', 'Federica', 'Giuseppe', 'Maria', 'Antonio', 'Laura', 'Roberto', 'Chiara'][Math.floor(Math.random() * 8)],
                cognome: ['Ferrari', 'Russo', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno'][Math.floor(Math.random() * 8)],
                email: generateRandomEmail(),
                telefono: generateRandomPhone(),
                ruolo: 'cliente'
            });
        }

        const hashedPassword = await bcrypt.hash('test123', 10);
        let usersCreated = 0;

        for (const user of testUsers) {
            try {
                await client.query(`
                    INSERT INTO Utente (nome, cognome, email, telefono, ruolo, password) 
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (email) DO NOTHING
                `, [
                    user.nome,
                    user.cognome,
                    user.email,
                    user.telefono,
                    user.ruolo,
                    hashedPassword
                ]);
                usersCreated++;
            } catch (error) {
                console.log(`⚠️ Errore creazione utente ${user.nome}:`, error.message);
            }
        }

        console.log(`✅ Creati ${usersCreated} utenti`);

        // 7. Ottieni utenti creati
        const utenti = await client.query('SELECT id_utente, nome, cognome, ruolo FROM Utente WHERE ruolo = \'cliente\' LIMIT 20');
        console.log(`👥 Utenti disponibili per prenotazioni: ${utenti.rows.length}`);

        // 8. Genera prenotazioni con tutti gli stati possibili
        console.log('📅 Genero prenotazioni con tutti gli stati...');

        // Stati possibili con distribuzione realistica (usando stati corretti dal constraint)
        const statiDistribuzione = [
            { stato: 'confermata', peso: 60 },    // 60% confermate
            { stato: 'in attesa', peso: 20 },     // 20% in attesa
            { stato: 'cancellata', peso: 10 },    // 10% cancellate
            { stato: 'pendente', peso: 5 },       // 5% pendenti
            { stato: 'annullata', peso: 5 }       // 5% annullate
        ];

        // Genera prenotazioni per gli ultimi 60 giorni
        const oggi = new Date();
        const sessantaGiorniFa = new Date(oggi.getTime() - (60 * 24 * 60 * 60 * 1000));

        let prenotazioniCreate = 0;
        let pagamentiCreate = 0;

        for (let i = 0; i < 80; i++) {
            const dataInizio = getRandomDate(sessantaGiorniFa, oggi);
            const durataOre = Math.floor(Math.random() * 6) + 1; // 1-6 ore
            const dataFine = new Date(dataInizio.getTime() + (durataOre * 60 * 60 * 1000));

            const spazio = spazi.rows[Math.floor(Math.random() * spazi.rows.length)];
            const utente = utenti.rows[Math.floor(Math.random() * utenti.rows.length)];

            // Seleziona stato basato sulla distribuzione
            const random = Math.random() * 100;
            let cumulativeWeight = 0;
            let statoSelezionato = 'confermata';

            for (const statoInfo of statiDistribuzione) {
                cumulativeWeight += statoInfo.peso;
                if (random <= cumulativeWeight) {
                    statoSelezionato = statoInfo.stato;
                    break;
                }
            }

            try {
                const prenotazioneResult = await client.query(`
                    INSERT INTO Prenotazione (
                        id_utente, id_spazio, data_inizio, data_fine, 
                        stato, note, created_at, durata_ore
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id_prenotazione
                `, [
                    utente.id_utente,
                    spazio.id_spazio,
                    dataInizio,
                    dataFine,
                    statoSelezionato,
                    `Prenotazione di test ${i + 1} - ${statoSelezionato}`,
                    new Date(),
                    durataOre
                ]);

                // Crea pagamenti solo per prenotazioni confermate (con vari stati di pagamento)
                if (statoSelezionato === 'confermata') {
                    const prezzoOrario = 20 + Math.floor(Math.random() * 40); // 20-60€
                    const importo = prezzoOrario * durataOre;

                    // Stati di pagamento realistici
                    const statiPagamento = ['pagato', 'pagato', 'pagato', 'pagato', 'pagato', 'in_attesa', 'fallito'];
                    const statoPagamento = statiPagamento[Math.floor(Math.random() * statiPagamento.length)];

                    await client.query(`
                        INSERT INTO Pagamento (
                            id_prenotazione, importo, metodo_pagamento, stato, data_pagamento
                        ) VALUES ($1, $2, $3, $4, $5)
                    `, [
                        prenotazioneResult.rows[0].id_prenotazione,
                        importo,
                        'stripe',
                        statoPagamento,
                        statoPagamento === 'pagato' ? dataInizio : null
                    ]);
                    pagamentiCreate++;
                }

                prenotazioniCreate++;

                if (prenotazioniCreate % 20 === 0) {
                    console.log(`✅ Create ${prenotazioniCreate} prenotazioni...`);
                }

            } catch (error) {
                console.log(`⚠️ Errore prenotazione ${i + 1}:`, error.message);
            }
        }

        // 9. Genera prenotazioni per oggi (per statistiche in tempo reale)
        console.log('📅 Genero prenotazioni per oggi...');

        for (let i = 0; i < 12; i++) {
            const oggi = new Date();
            const oraInizio = 8 + Math.floor(Math.random() * 10); // 8-17
            const durataOre = Math.floor(Math.random() * 4) + 1; // 1-4 ore
            const oraFine = oraInizio + durataOre;

            const dataInizio = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), oraInizio, 0, 0);
            const dataFine = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), oraFine, 0, 0);

            const spazio = spazi.rows[Math.floor(Math.random() * spazi.rows.length)];
            const utente = utenti.rows[Math.floor(Math.random() * utenti.rows.length)];

            // Per oggi, usa principalmente stati attivi
            const statiOggi = ['confermata', 'confermata', 'confermata', 'confermata', 'in attesa', 'pendente'];
            const statoOggi = statiOggi[Math.floor(Math.random() * statiOggi.length)];

            try {
                const prenotazioneResult = await client.query(`
                    INSERT INTO Prenotazione (
                        id_utente, id_spazio, data_inizio, data_fine, 
                        stato, note, created_at, durata_ore
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id_prenotazione
                `, [
                    utente.id_utente,
                    spazio.id_spazio,
                    dataInizio,
                    dataFine,
                    statoOggi,
                    `Prenotazione oggi ${i + 1} - ${statoOggi}`,
                    new Date(),
                    durataOre
                ]);

                // Crea pagamento per prenotazioni confermate di oggi
                if (statoOggi === 'confermata') {
                    const prezzoOrario = 20 + Math.floor(Math.random() * 40);
                    const importo = prezzoOrario * durataOre;

                    await client.query(`
                        INSERT INTO Pagamento (
                            id_prenotazione, importo, metodo_pagamento, stato, data_pagamento
                        ) VALUES ($1, $2, $3, $4, $5)
                    `, [
                        prenotazioneResult.rows[0].id_prenotazione,
                        importo,
                        'stripe',
                        'pagato',
                        dataInizio
                    ]);
                    pagamentiCreate++;
                }

                prenotazioniCreate++;

            } catch (error) {
                console.log(`⚠️ Errore prenotazione oggi ${i + 1}:`, error.message);
            }
        }

        console.log(`🎉 Generazione completata!`);
        console.log(`📊 Statistiche finali:`);
        console.log(`   - Prenotazioni create: ${prenotazioniCreate}`);
        console.log(`   - Pagamenti creati: ${pagamentiCreate}`);

        // 10. Mostra statistiche dettagliate
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total_prenotazioni,
                COUNT(CASE WHEN stato = 'confermata' THEN 1 END) as prenotazioni_confermate,
                COUNT(CASE WHEN stato = 'in attesa' THEN 1 END) as prenotazioni_in_attesa,
                COUNT(CASE WHEN stato = 'cancellata' THEN 1 END) as prenotazioni_cancellate,
                COUNT(CASE WHEN stato = 'pendente' THEN 1 END) as prenotazioni_pendenti,
                COUNT(CASE WHEN stato = 'annullata' THEN 1 END) as prenotazioni_annullate,
                COUNT(CASE WHEN DATE(data_inizio) = CURRENT_DATE THEN 1 END) as prenotazioni_oggi
            FROM Prenotazione
        `);

        const fatturato = await client.query(`
            SELECT 
                COALESCE(SUM(importo), 0) as fatturato_totale,
                COUNT(*) as pagamenti_totali,
                COUNT(CASE WHEN stato = 'pagato' THEN 1 END) as pagamenti_pagati,
                COUNT(CASE WHEN stato = 'in_attesa' THEN 1 END) as pagamenti_in_attesa,
                COUNT(CASE WHEN stato = 'fallito' THEN 1 END) as pagamenti_falliti
            FROM Pagamento
        `);

        console.log('\n📈 Statistiche prenotazioni:');
        console.log(`   - Totale: ${stats.rows[0].total_prenotazioni}`);
        console.log(`   - Confermate: ${stats.rows[0].prenotazioni_confermate}`);
        console.log(`   - In attesa: ${stats.rows[0].prenotazioni_in_attesa}`);
        console.log(`   - Cancellate: ${stats.rows[0].prenotazioni_cancellate}`);
        console.log(`   - Pendenti: ${stats.rows[0].prenotazioni_pendenti}`);
        console.log(`   - Annullate: ${stats.rows[0].prenotazioni_annullate}`);
        console.log(`   - Oggi: ${stats.rows[0].prenotazioni_oggi}`);

        console.log('\n💰 Statistiche pagamenti:');
        console.log(`   - Fatturato totale: €${parseFloat(fatturato.rows[0].fatturato_totale).toFixed(2)}`);
        console.log(`   - Pagamenti totali: ${fatturato.rows[0].pagamenti_totali}`);
        console.log(`   - Pagati: ${fatturato.rows[0].pagamenti_pagati}`);
        console.log(`   - In attesa: ${fatturato.rows[0].pagamenti_in_attesa}`);
        console.log(`   - Falliti: ${fatturato.rows[0].pagamenti_falliti}`);

        console.log('\n🔑 Credenziali di test:');
        console.log('   Email: mario.rossi@cowork.com (gestore)');
        console.log('   Email: luca.verdi@email.com (utente)');
        console.log('   Password: test123');

        console.log('\n🎯 Ora puoi testare:');
        console.log('   1. Dashboard gestore con analitiche complete');
        console.log('   2. Flusso di prenotazione e registrazione');
        console.log('   3. Gestione stati prenotazioni');
        console.log('   4. Sistema di pagamenti');

    } catch (error) {
        console.error('❌ Errore durante la generazione:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Esegui lo script
generateSupabaseTestData();
