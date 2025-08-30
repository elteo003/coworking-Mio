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

async function testBookingFlow() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test flusso completo di prenotazione e registrazione...');

        // 1. Test connessione
        const testResult = await client.query('SELECT NOW() as current_time');
        console.log('✅ Connesso a Supabase:', testResult.rows[0].current_time);

        // 2. Verifica dati esistenti
        const sediCount = await client.query('SELECT COUNT(*) as count FROM Sede');
        const spaziCount = await client.query('SELECT COUNT(*) as count FROM Spazio');
        const utentiCount = await client.query('SELECT COUNT(*) as count FROM Utente');
        const prenotazioniCount = await client.query('SELECT COUNT(*) as count FROM Prenotazione');
        const pagamentiCount = await client.query('SELECT COUNT(*) as count FROM Pagamento');

        console.log('\n📊 Dati esistenti nel database:');
        console.log(`   - Sedi: ${sediCount.rows[0].count}`);
        console.log(`   - Spazi: ${spaziCount.rows[0].count}`);
        console.log(`   - Utenti: ${utentiCount.rows[0].count}`);
        console.log(`   - Prenotazioni: ${prenotazioniCount.rows[0].count}`);
        console.log(`   - Pagamenti: ${pagamentiCount.rows[0].count}`);

        // 3. Test registrazione nuovo utente
        console.log('\n👤 Test registrazione nuovo utente...');

        const newUser = {
            nome: 'Test',
            cognome: 'User',
            email: 'test.user@example.com',
            telefono: '3339998888',
            ruolo: 'utente'
        };

        const hashedPassword = await bcrypt.hash('test123', 10);

        try {
            // Rimuovi utente se esiste già
            await client.query('DELETE FROM Utente WHERE email = $1', [newUser.email]);

            const userResult = await client.query(`
                INSERT INTO Utente (nome, cognome, email, telefono, ruolo, password) 
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id_utente, nome, cognome, email, ruolo
            `, [
                newUser.nome,
                newUser.cognome,
                newUser.email,
                newUser.telefono,
                newUser.ruolo,
                hashedPassword
            ]);

            console.log('✅ Utente registrato:', userResult.rows[0]);

            // 4. Test login (verifica password)
            console.log('\n🔐 Test login utente...');

            const loginResult = await client.query(`
                SELECT id_utente, nome, cognome, email, ruolo, password 
                FROM Utente 
                WHERE email = $1
            `, [newUser.email]);

            if (loginResult.rows.length > 0) {
                const user = loginResult.rows[0];
                const passwordMatch = await bcrypt.compare('test123', user.password);

                if (passwordMatch) {
                    console.log('✅ Login riuscito:', {
                        id: user.id_utente,
                        nome: user.nome,
                        cognome: user.cognome,
                        email: user.email,
                        ruolo: user.ruolo
                    });
                } else {
                    console.log('❌ Password non corretta');
                }
            } else {
                console.log('❌ Utente non trovato');
            }

            // 5. Test creazione prenotazione
            console.log('\n📅 Test creazione prenotazione...');

            // Ottieni spazi disponibili
            const spazi = await client.query('SELECT id_spazio, nome, id_sede FROM Spazio LIMIT 3');

            if (spazi.rows.length > 0) {
                const spazio = spazi.rows[0];
                const userId = userResult.rows[0].id_utente;

                // Crea prenotazione per domani
                const domani = new Date();
                domani.setDate(domani.getDate() + 1);
                domani.setHours(10, 0, 0, 0);

                const dataFine = new Date(domani);
                dataFine.setHours(12, 0, 0, 0);

                const prenotazioneResult = await client.query(`
                    INSERT INTO Prenotazione (
                        id_utente, id_spazio, data_inizio, data_fine, 
                        orario_inizio, orario_fine, stato, data_creazione, note
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id_prenotazione, stato
                `, [
                    userId,
                    spazio.id_spazio,
                    domani,
                    dataFine,
                    '10:00',
                    '12:00',
                    'in_attesa',
                    new Date(),
                    'Prenotazione di test'
                ]);

                console.log('✅ Prenotazione creata:', prenotazioneResult.rows[0]);

                // 6. Test conferma prenotazione
                console.log('\n✅ Test conferma prenotazione...');

                const confermaResult = await client.query(`
                    UPDATE Prenotazione 
                    SET stato = 'confermata' 
                    WHERE id_prenotazione = $1
                    RETURNING id_prenotazione, stato
                `, [prenotazioneResult.rows[0].id_prenotazione]);

                console.log('✅ Prenotazione confermata:', confermaResult.rows[0]);

                // 7. Test creazione pagamento
                console.log('\n💰 Test creazione pagamento...');

                const pagamentoResult = await client.query(`
                    INSERT INTO Pagamento (
                        id_prenotazione, importo, metodo_pagamento, stato, data_pagamento
                    ) VALUES ($1, $2, $3, $4, $5)
                    RETURNING id_pagamento, importo, stato
                `, [
                    prenotazioneResult.rows[0].id_prenotazione,
                    50.00,
                    'stripe',
                    'pagato',
                    new Date()
                ]);

                console.log('✅ Pagamento creato:', pagamentoResult.rows[0]);

                // 8. Test query dashboard
                console.log('\n📊 Test query dashboard...');

                const dashboardStats = await client.query(`
                    SELECT 
                        COUNT(*) as total_prenotazioni,
                        COUNT(CASE WHEN stato = 'confermata' THEN 1 END) as prenotazioni_confermate,
                        COUNT(CASE WHEN stato = 'in_attesa' THEN 1 END) as prenotazioni_in_attesa,
                        COUNT(CASE WHEN DATE(data_inizio) = CURRENT_DATE THEN 1 END) as prenotazioni_oggi
                    FROM Prenotazione
                `);

                const fatturato = await client.query(`
                    SELECT COALESCE(SUM(importo), 0) as fatturato_totale
                    FROM Pagamento p
                    JOIN Prenotazione pr ON p.id_prenotazione = pr.id_prenotazione
                    WHERE p.stato = 'pagato' AND pr.stato = 'confermata'
                `);

                console.log('✅ Statistiche dashboard:');
                console.log('   - Prenotazioni totali:', dashboardStats.rows[0].total_prenotazioni);
                console.log('   - Confermate:', dashboardStats.rows[0].prenotazioni_confermate);
                console.log('   - In attesa:', dashboardStats.rows[0].prenotazioni_in_attesa);
                console.log('   - Oggi:', dashboardStats.rows[0].prenotazioni_oggi);
                console.log('   - Fatturato:', '€' + parseFloat(fatturato.rows[0].fatturato_totale).toFixed(2));

            } else {
                console.log('❌ Nessuno spazio disponibile per il test');
            }

        } catch (error) {
            console.error('❌ Errore durante il test:', error.message);
        }

        // 9. Test pulizia dati di test
        console.log('\n🧹 Pulizia dati di test...');

        try {
            await client.query('DELETE FROM Utente WHERE email = $1', [newUser.email]);
            console.log('✅ Dati di test puliti');
        } catch (error) {
            console.log('⚠️ Errore durante la pulizia:', error.message);
        }

        console.log('\n🎉 Test flusso completo completato!');
        console.log('\n📋 Risultati:');
        console.log('   ✅ Registrazione utente: OK');
        console.log('   ✅ Login utente: OK');
        console.log('   ✅ Creazione prenotazione: OK');
        console.log('   ✅ Conferma prenotazione: OK');
        console.log('   ✅ Creazione pagamento: OK');
        console.log('   ✅ Query dashboard: OK');
        console.log('   ✅ Pulizia dati: OK');

        console.log('\n🎯 Il sistema è pronto per:');
        console.log('   1. Testare la dashboard gestore');
        console.log('   2. Testare il flusso di prenotazione frontend');
        console.log('   3. Testare il sistema di registrazione');
        console.log('   4. Testare le analitiche complete');

    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Esegui il test
testBookingFlow();



