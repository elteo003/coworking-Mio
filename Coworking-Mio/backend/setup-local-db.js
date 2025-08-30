#!/usr/bin/env node

/**
 * Script per configurare il database locale
 * Esegui: node setup-local-db.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Leggi lo schema SQL
const schemaPath = path.join(__dirname, '../database/schema.sql');
const seedPath = path.join(__dirname, '../database/seed.sql');

async function setupDatabase() {
    console.log('🚀 Setup database locale...');

    // Configurazione database
    const pool = new Pool({
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'coworkspace',
        password: process.env.PGPASSWORD || 'password',
        port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    });

    try {
        // Test connessione
        await pool.query('SELECT NOW()');
        console.log('✅ Connessione al database riuscita');

        // Leggi e esegui schema
        if (fs.existsSync(schemaPath)) {
            console.log('📋 Esecuzione schema SQL...');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schema);
            console.log('✅ Schema creato con successo');
        } else {
            console.log('⚠️ File schema.sql non trovato');
        }

        // Leggi e esegui seed (se esiste)
        if (fs.existsSync(seedPath)) {
            console.log('🌱 Esecuzione seed SQL...');
            const seed = fs.readFileSync(seedPath, 'utf8');
            await pool.query(seed);
            console.log('✅ Dati di test inseriti');
        } else {
            console.log('ℹ️ File seed.sql non trovato, nessun dato di test inserito');
        }

        // Verifica setup
        const userCount = await pool.query('SELECT COUNT(*) as count FROM utente');
        const sedeCount = await pool.query('SELECT COUNT(*) as count FROM sede');

        console.log('📊 Database configurato:');
        console.log(`   - Utenti: ${userCount.rows[0].count}`);
        console.log(`   - Sedi: ${sedeCount.rows[0].count}`);

        console.log('🎉 Setup completato con successo!');

    } catch (error) {
        console.error('❌ Errore durante setup:', error.message);
        console.error('🔧 Verifica:');
        console.error('   1. PostgreSQL è in esecuzione');
        console.error('   2. Le credenziali sono corrette');
        console.error('   3. Il database "coworkspace" esiste');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Esegui setup
setupDatabase();

