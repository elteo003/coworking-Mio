#!/usr/bin/env node

/**
 * Script completo per setup ambiente di sviluppo locale
 * Esegui: node setup-local-complete.js
 * 
 * Questo script:
 * 1. Crea il database se non esiste
 * 2. Esegue lo schema SQL
 * 3. Crea gli utenti richiesti
 * 4. Popola con dati di test
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Configurazione database PostgreSQL 17 locale
const config = {
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connessione al database di default
    password: 'postgres',
    port: 5432,
};

async function setupLocalEnvironment() {
    console.log('🚀 Setup completo ambiente di sviluppo locale...');
    console.log('📋 Configurazione:', {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database
    });

    const pool = new Pool(config);

    try {
        // Test connessione
        await pool.query('SELECT NOW()');
        console.log('✅ Connessione PostgreSQL riuscita');

        // Crea database se non esiste
        console.log('📊 Creazione database coworkspace...');
        try {
            await pool.query('CREATE DATABASE coworkspace');
            console.log('✅ Database coworkspace creato');
        } catch (error) {
            if (error.code === '42P04') {
                console.log('ℹ️ Database coworkspace già esistente');
            } else {
                throw error;
            }
        }

        // Chiudi connessione al database postgres
        await pool.end();

        // Connessione al database coworkspace
        const coworkspaceConfig = {
            user: 'postgres',
            host: 'localhost',
            database: 'coworkspace',
            password: 'postgres',
            port: 5432,
        };

        const coworkspacePool = new Pool(coworkspaceConfig);

        // Test connessione al database coworkspace
        await coworkspacePool.query('SELECT NOW()');
        console.log('✅ Connessione al database coworkspace riuscita');

        // Esegui schema SQL
        console.log('📋 Esecuzione schema SQL...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');

        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await coworkspacePool.query(schema);
            console.log('✅ Schema SQL eseguito con successo');
        } else {
            throw new Error('File schema.sql non trovato');
        }

        // Verifica tabelle create
        const tablesResult = await coworkspacePool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

        console.log('📊 Tabelle create:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Crea utenti richiesti
        console.log('👤 Creazione utenti richiesti...');

        // Hash delle password
        const frabroPassword = await bcrypt.hash('frabro19', 10);
        const ilmiobroPassword = await bcrypt.hash('ilmiobro19', 10);

        // Utente normale
        await coworkspacePool.query(`
      INSERT INTO utente (nome, cognome, email, password, ruolo, telefono)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        nome = EXCLUDED.nome,
        cognome = EXCLUDED.cognome,
        password = EXCLUDED.password,
        ruolo = EXCLUDED.ruolo,
        telefono = EXCLUDED.telefono
    `, ['Francesco', 'Bro', 'frabro@email.com', frabroPassword, 'cliente', '+39 123 456 7890']);

        // Gestore
        await coworkspacePool.query(`
      INSERT INTO utente (nome, cognome, email, password, ruolo, telefono)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        nome = EXCLUDED.nome,
        cognome = EXCLUDED.cognome,
        password = EXCLUDED.password,
        ruolo = EXCLUDED.ruolo,
        telefono = EXCLUDED.telefono
    `, ['Ilmio', 'Bro', 'ilmiobro@email.com', ilmiobroPassword, 'gestore', '+39 987 654 3210']);

        console.log('✅ Utenti creati con successo');

        // Crea sedi di test
        console.log('🏢 Creazione sedi di test...');

        const sediData = [
            {
                nome: 'Sede Centrale Milano',
                citta: 'Milano',
                indirizzo: 'Via Montenapoleone 1, 20121 Milano',
                descrizione: 'Sede principale nel cuore di Milano, perfetta per meeting e lavoro individuale'
            },
            {
                nome: 'Sede Navigli',
                citta: 'Milano',
                indirizzo: 'Corso di Porta Ticinese 87, 20123 Milano',
                descrizione: 'Ambiente creativo nella zona Navigli, ideale per startup e freelancer'
            },
            {
                nome: 'Sede Brera',
                citta: 'Milano',
                indirizzo: 'Via Brera 28, 20121 Milano',
                descrizione: 'Spazio elegante nel quartiere artistico di Brera'
            }
        ];

        for (const sede of sediData) {
            await coworkspacePool.query(`
        INSERT INTO sede (nome, citta, indirizzo, descrizione, id_gestore)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [sede.nome, sede.citta, sede.indirizzo, sede.descrizione, 2]); // id_gestore = 2 (ilmiobro)
        }

        console.log('✅ Sedi create con successo');

        // Crea spazi di test
        console.log('🪑 Creazione spazi di test...');

        const spaziData = [
            // Sede 1 - Sede Centrale Milano
            { id_sede: 1, nome: 'Sala Meeting Executive', tipologia: 'sala riunioni', descrizione: 'Sala elegante per meeting importanti', capienza: 12 },
            { id_sede: 1, nome: 'Postazione Open Space A1', tipologia: 'postazione', descrizione: 'Postazione in open space con vista su Milano', capienza: 1 },
            { id_sede: 1, nome: 'Postazione Open Space A2', tipologia: 'postazione', descrizione: 'Postazione in open space con vista su Milano', capienza: 1 },
            { id_sede: 1, nome: 'Ufficio Privato 101', tipologia: 'stanza privata', descrizione: 'Ufficio privato con scrivania e armadio', capienza: 2 },

            // Sede 2 - Sede Navigli
            { id_sede: 2, nome: 'Sala Creativa', tipologia: 'sala riunioni', descrizione: 'Sala colorata e creativa per brainstorming', capienza: 8 },
            { id_sede: 2, nome: 'Postazione Startup B1', tipologia: 'postazione', descrizione: 'Postazione dedicata alle startup', capienza: 1 },
            { id_sede: 2, nome: 'Postazione Startup B2', tipologia: 'postazione', descrizione: 'Postazione dedicata alle startup', capienza: 1 },

            // Sede 3 - Sede Brera
            { id_sede: 3, nome: 'Sala Arte', tipologia: 'sala riunioni', descrizione: 'Sala ispirata all\'arte con opere locali', capienza: 6 },
            { id_sede: 3, nome: 'Postazione Artista C1', tipologia: 'postazione', descrizione: 'Postazione per artisti e creativi', capienza: 1 },
            { id_sede: 3, nome: 'Atelier Privato', tipologia: 'stanza privata', descrizione: 'Spazio privato per lavoro creativo', capienza: 1 }
        ];

        for (const spazio of spaziData) {
            await coworkspacePool.query(`
        INSERT INTO spazio (id_sede, nome, tipologia, descrizione, capienza)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [spazio.id_sede, spazio.nome, spazio.tipologia, spazio.descrizione, spazio.capienza]);
        }

        console.log('✅ Spazi creati con successo');

        // Verifica setup finale
        const userCount = await coworkspacePool.query('SELECT COUNT(*) as count FROM utente');
        const sedeCount = await coworkspacePool.query('SELECT COUNT(*) as count FROM sede');
        const spazioCount = await coworkspacePool.query('SELECT COUNT(*) as count FROM spazio');

        console.log('\n📊 Setup completato:');
        console.log(`   - Utenti: ${userCount.rows[0].count}`);
        console.log(`   - Sedi: ${sedeCount.rows[0].count}`);
        console.log(`   - Spazi: ${spazioCount.rows[0].count}`);

        console.log('\n🔑 Credenziali utenti:');
        console.log('   👤 Utente normale:');
        console.log('      Email: frabro@email.com');
        console.log('      Password: frabro19');
        console.log('   👨‍💼 Gestore:');
        console.log('      Email: ilmiobro@email.com');
        console.log('      Password: ilmiobro19');

        console.log('\n🎉 Setup ambiente di sviluppo locale completato con successo!');
        console.log('\n📋 Prossimi passi:');
        console.log('   1. Avvia il backend: npm run dev');
        console.log('   2. Avvia il frontend: apri index.html nel browser');
        console.log('   3. Testa il login con le credenziali sopra');

    } catch (error) {
        console.error('❌ Errore durante setup:', error.message);
        console.error('🔧 Verifica:');
        console.error('   1. PostgreSQL è installato e in esecuzione');
        console.error('   2. Le credenziali postgres sono corrette');
        console.error('   3. Il database postgres è accessibile');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Esegui setup
setupLocalEnvironment();
