#!/usr/bin/env node

/**
 * Script per avviare il backend in modalità sviluppo locale
 * Esegui: node start-local.js
 */

// Carica variabili d'ambiente
require('dotenv').config();

// Imposta variabili d'ambiente per sviluppo locale
process.env.NODE_ENV = 'development';
process.env.PORT = '3002';
process.env.PGUSER = 'postgres';
process.env.PGHOST = 'localhost';
process.env.PGDATABASE = 'coworkspace';
process.env.PGPASSWORD = 'postgres';
process.env.PGPORT = '5432';
process.env.JWT_SECRET = 'coworking-mio-secret-key-2024-local';
process.env.JWT_EXPIRES_IN = '24h';
process.env.CORS_ORIGIN = 'http://localhost:8000,http://127.0.0.1:5500,http://localhost:3000';

console.log('🚀 Avvio backend in modalità sviluppo locale...');
console.log('📋 Configurazione:');
console.log(`   - Porta: ${process.env.PORT}`);
console.log(`   - Database: ${process.env.PGDATABASE}@${process.env.PGHOST}:${process.env.PGPORT}`);
console.log(`   - Ambiente: ${process.env.NODE_ENV}`);

// Modifica temporanea del file db.js per usare la configurazione locale
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'src/db.js');
const dbLocalPath = path.join(__dirname, 'src/db-local.js');

// Backup del file originale
const originalDb = fs.readFileSync(dbPath, 'utf8');
fs.writeFileSync(path.join(__dirname, 'src/db-original.js'), originalDb);

// Sostituisci con la configurazione locale
const localDb = fs.readFileSync(dbLocalPath, 'utf8');
fs.writeFileSync(dbPath, localDb);

console.log('✅ Configurazione database locale applicata');

// Avvia il server
const app = require('./src/app');

// Gestione chiusura graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Chiusura server...');

    // Ripristina il file originale
    fs.writeFileSync(dbPath, originalDb);
    console.log('✅ Configurazione database ripristinata');

    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Chiusura server...');

    // Ripristina il file originale
    fs.writeFileSync(dbPath, originalDb);
    console.log('✅ Configurazione database ripristinata');

    process.exit(0);
});


