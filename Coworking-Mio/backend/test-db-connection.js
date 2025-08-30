#!/usr/bin/env node

/**
 * Script per testare la connessione al database
 * Esegui: node test-db-connection.js
 */

// Carica variabili d'ambiente
require('dotenv').config();

const { Pool } = require('pg');

// Configurazione database con fallback
const pool = new Pool(
    process.env.DATABASE_URL && process.env.DATABASE_URL !== 'null' ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    } : {
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'coworkspace',
        password: process.env.PGPASSWORD || 'password',
        port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    }
);

async function testConnection() {
    console.log('🔍 Test connessione database...');
    console.log('📋 Configurazione:', {
        user: pool.options.user || 'da DATABASE_URL',
        host: pool.options.host || 'da DATABASE_URL',
        database: pool.options.database || 'da DATABASE_URL',
        port: pool.options.port || 'da DATABASE_URL',
        hasPassword: !!pool.options.password
    });

    try {
        // Test connessione base
        const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
        console.log('✅ Database connesso con successo!');
        console.log('🕐 Ora server:', result.rows[0].current_time);
        console.log('📊 Versione DB:', result.rows[0].db_version);

        // Test tabella Utente
        const userTableTest = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'utente' 
      ORDER BY ordinal_position
    `);

        if (userTableTest.rows.length > 0) {
            console.log('✅ Tabella Utente trovata con colonne:');
            userTableTest.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
        } else {
            console.log('⚠️ Tabella Utente non trovata. Esegui lo schema SQL.');
        }

        // Test utenti esistenti
        const userCount = await pool.query('SELECT COUNT(*) as count FROM utente');
        console.log(`👥 Utenti nel database: ${userCount.rows[0].count}`);

    } catch (error) {
        console.error('❌ Errore connessione database:', error.message);
        console.error('🔧 Soluzioni possibili:');
        console.error('   1. Verifica che PostgreSQL sia in esecuzione');
        console.error('   2. Controlla le credenziali nel file .env');
        console.error('   3. Assicurati che il database "coworkspace" esista');
        console.error('   4. Esegui lo schema SQL per creare le tabelle');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Esegui il test
testConnection();

