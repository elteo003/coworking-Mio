#!/usr/bin/env node

/**
 * Script per configurare il database Supabase
 * Esegui: node setup-supabase.js
 * 
 * IMPORTANTE: Imposta la variabile DATABASE_URL prima di eseguire
 * export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Verifica che DATABASE_URL sia configurata
if (!process.env.DATABASE_URL) {
    console.error('❌ ERRORE: DATABASE_URL non configurata!');
    console.error('🔧 Configura la variabile d\'ambiente:');
    console.error('   export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"');
    process.exit(1);
}

// Configurazione database Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupSupabase() {
    console.log('🚀 Setup database Supabase...');
    console.log('🔗 Connessione a:', process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@'));

    try {
        // Test connessione
        const testResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
        console.log('✅ Connessione Supabase riuscita!');
        console.log('🕐 Ora server:', testResult.rows[0].current_time);
        console.log('📊 Versione DB:', testResult.rows[0].db_version);

        // Leggi schema SQL
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error('File schema.sql non trovato');
        }

        console.log('📋 Esecuzione schema SQL...');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Esegui schema
        await pool.query(schema);
        console.log('✅ Schema creato con successo');

        // Verifica tabelle create
        const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

        console.log('📊 Tabelle create:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Test inserimento utente di test
        console.log('👤 Creazione utente di test...');
        const bcrypt = require('bcryptjs');
        const testPassword = await bcrypt.hash('test123', 10);

        await pool.query(`
      INSERT INTO utente (nome, cognome, email, password, ruolo, telefono)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['Test', 'User', 'test@test.com', testPassword, 'cliente', '+39 123 456 7890']);

        // Verifica utenti
        const userCount = await pool.query('SELECT COUNT(*) as count FROM utente');
        console.log(`👥 Utenti nel database: ${userCount.rows[0].count}`);

        console.log('🎉 Setup Supabase completato con successo!');
        console.log('🔑 Credenziali di test:');
        console.log('   Email: test@test.com');
        console.log('   Password: test123');

    } catch (error) {
        console.error('❌ Errore durante setup Supabase:', error.message);
        console.error('🔧 Verifica:');
        console.error('   1. DATABASE_URL è corretta');
        console.error('   2. Il database Supabase è accessibile');
        console.error('   3. Le credenziali sono valide');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Esegui setup
setupSupabase();

