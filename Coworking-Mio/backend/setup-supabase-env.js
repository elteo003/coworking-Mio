#!/usr/bin/env node

/**
 * Script per configurare la variabile d'ambiente DATABASE_URL per Supabase
 * 
 * IMPORTANTE: Sostituisci [PASSWORD] con la password del tuo database Supabase
 * La password si trova nel dashboard Supabase > Settings > Database
 */

// Configurazione Supabase
const SUPABASE_CONFIG = {
    // Sostituisci [PASSWORD] con la tua password Supabase
    DATABASE_URL: 'postgresql://postgres:[PASSWORD]@db.czkiuvmhijhxuqzdtnmz.supabase.co:5432/postgres',

    // Altre configurazioni
    SUPABASE_URL: 'https://czkiuvmhijhxuqzdtnmz.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6a2l1dm1oaWpoeHVxemR0bm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjA5OTEsImV4cCI6MjA3MDQ5Njk5MX0.k2HuloheKebEfOXRYnvHq5smVzNZlnQAWNHZzetKxeY'
};

console.log('🔧 Configurazione Supabase');
console.log('========================');
console.log('');
console.log('📋 Per configurare Supabase, segui questi passaggi:');
console.log('');
console.log('1. Vai al dashboard Supabase: https://supabase.com/dashboard');
console.log('2. Seleziona il tuo progetto: czkiuvmhijhxuqzdtnmz');
console.log('3. Vai su Settings > Database');
console.log('4. Copia la password del database');
console.log('5. Sostituisci [PASSWORD] nella stringa qui sotto:');
console.log('');
console.log('DATABASE_URL="postgresql://postgres:[PASSWORD]@db.czkiuvmhijhxuqzdtnmz.supabase.co:5432/postgres"');
console.log('');
console.log('6. Imposta la variabile d\'ambiente:');
console.log('');
console.log('   Windows PowerShell:');
console.log('   $env:DATABASE_URL="postgresql://postgres:TUAPASSWORD@db.czkiuvmhijhxuqzdtnmz.supabase.co:5432/postgres"');
console.log('');
console.log('   Windows CMD:');
console.log('   set DATABASE_URL=postgresql://postgres:TUAPASSWORD@db.czkiuvmhijhxuqzdtnmz.supabase.co:5432/postgres');
console.log('');
console.log('   Linux/Mac:');
console.log('   export DATABASE_URL="postgresql://postgres:TUAPASSWORD@db.czkiuvmhijhxuqzdtnmz.supabase.co:5432/postgres"');
console.log('');
console.log('7. Testa la connessione:');
console.log('   node test-supabase-connection.js');
console.log('');
console.log('8. Genera dati di test:');
console.log('   node generate-supabase-test-data.js');
console.log('');
console.log('🔑 Informazioni progetto Supabase:');
console.log(`   URL: ${SUPABASE_CONFIG.SUPABASE_URL}`);
console.log(`   Anon Key: ${SUPABASE_CONFIG.SUPABASE_ANON_KEY}`);
console.log('');
console.log('⚠️  IMPORTANTE: Non condividere mai la password del database!');
console.log('   La password è visibile solo nel dashboard Supabase.');



