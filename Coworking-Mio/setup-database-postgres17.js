#!/usr/bin/env node

/**
 * Script Node.js per controllare e creare il database PostgreSQL 17
 * Verifica se esiste il database 'coworking' e lo crea se necessario
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurazione di default
const config = {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'coworking'
};

// Colori per console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message) {
    log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
    log(`🔍 ${message}`, 'cyan');
}

function logStep(message) {
    log(`🔨 ${message}`, 'cyan');
}

// Funzione per testare la connessione a PostgreSQL
async function testPostgreSQLConnection() {
    try {
        logInfo('Test connessione PostgreSQL...');

        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: 'postgres' // Connessione al database di default
        });

        await client.connect();

        const result = await client.query('SELECT version()');
        const version = result.rows[0].version;

        await client.end();

        logSuccess('Connessione PostgreSQL riuscita!');
        log(`📋 Versione: ${version}`, 'white');
        return true;

    } catch (error) {
        logError(`Errore connessione PostgreSQL: ${error.message}`);
        log('Verifica:', 'white');
        log('   - PostgreSQL 17 è installato e in esecuzione', 'white');
        log('   - Credenziali corrette (username/password)', 'white');
        log(`   - Porta ${config.port} è aperta`, 'white');
        return false;
    }
}

// Funzione per controllare se il database esiste
async function checkDatabaseExists() {
    try {
        logInfo(`Controllo esistenza database '${config.database}'...`);

        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: 'postgres'
        });

        await client.connect();

        const result = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [config.database]
        );

        await client.end();

        if (result.rows.length > 0) {
            logSuccess(`Database '${config.database}' esiste già!`);
            return true;
        } else {
            logWarning(`Database '${config.database}' non esiste.`);
            return false;
        }

    } catch (error) {
        logError(`Errore durante controllo database: ${error.message}`);
        return false;
    }
}

// Funzione per creare il database
async function createDatabase() {
    try {
        logStep(`Creazione database '${config.database}'...`);

        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: 'postgres'
        });

        await client.connect();

        await client.query(`CREATE DATABASE "${config.database}"`);

        await client.end();

        logSuccess(`Database '${config.database}' creato con successo!`);
        return true;

    } catch (error) {
        logError(`Errore durante creazione database: ${error.message}`);
        return false;
    }
}

// Funzione per eseguire lo schema SQL
async function executeSchema() {
    try {
        logInfo('Esecuzione schema database...');

        const schemaFile = path.join(__dirname, 'database', 'schema.sql');

        if (!fs.existsSync(schemaFile)) {
            logWarning('File schema.sql non trovato in database/');
            log('📝 Database creato ma senza schema. Esegui manualmente lo schema.', 'white');
            return true;
        }

        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database
        });

        await client.connect();

        const schemaSQL = fs.readFileSync(schemaFile, 'utf8');
        await client.query(schemaSQL);

        await client.end();

        logSuccess('Schema database eseguito con successo!');
        return true;

    } catch (error) {
        logError(`Errore durante esecuzione schema: ${error.message}`);
        return false;
    }
}

// Funzione per eseguire i dati di seed
async function executeSeed() {
    try {
        logInfo('Esecuzione dati di seed...');

        const seedFile = path.join(__dirname, 'database', 'seed.sql');

        if (!fs.existsSync(seedFile)) {
            logWarning('File seed.sql non trovato in database/');
            log('📝 Database pronto ma senza dati di esempio.', 'white');
            return true;
        }

        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database
        });

        await client.connect();

        const seedSQL = fs.readFileSync(seedFile, 'utf8');
        await client.query(seedSQL);

        await client.end();

        logSuccess('Dati di seed eseguiti con successo!');
        return true;

    } catch (error) {
        logError(`Errore durante esecuzione seed: ${error.message}`);
        return false;
    }
}

// Funzione principale
async function main() {
    log('🚀 Setup Database PostgreSQL 17', 'green');
    log('=================================', 'green');
    log('');

    log('📋 Configurazione:', 'white');
    log(`   Host: ${config.host}`, 'white');
    log(`   Port: ${config.port}`, 'white');
    log(`   Username: ${config.user}`, 'white');
    log(`   Database: ${config.database}`, 'white');
    log('');

    // Step 1: Test connessione PostgreSQL
    if (!(await testPostgreSQLConnection())) {
        process.exit(1);
    }

    // Step 2: Controlla se il database esiste
    const databaseExists = await checkDatabaseExists();

    // Step 3: Crea il database se non esiste
    if (!databaseExists) {
        if (await createDatabase()) {
            log('');
            log(`🎯 Database '${config.database}' creato! Procedo con lo schema...`, 'green');

            // Step 4: Esegui lo schema
            if (await executeSchema()) {
                log('');
                log('🎯 Schema eseguito! Procedo con i dati di seed...', 'green');

                // Step 5: Esegui i dati di seed
                await executeSeed();
            }
        } else {
            logError('Impossibile creare il database.');
            process.exit(1);
        }
    } else {
        log('');
        log(`✅ Database '${config.database}' già esistente. Setup completato!`, 'green');
    }

    log('');
    log('🎉 Setup database completato!', 'green');
    log('📋 Prossimi passi:', 'white');
    log('   1. Configura le variabili d\'ambiente nel backend', 'white');
    log('   2. Avvia il server backend: npm start', 'white');
    log('   3. Testa la connessione con il frontend', 'white');
    log('');
}

// Gestione errori non catturati
process.on('unhandledRejection', (error) => {
    logError(`Errore non gestito: ${error.message}`);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logError(`Eccezione non catturata: ${error.message}`);
    process.exit(1);
});

// Esegui lo script
if (require.main === module) {
    main().catch((error) => {
        logError(`Errore durante esecuzione: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    testPostgreSQLConnection,
    checkDatabaseExists,
    createDatabase,
    executeSchema,
    executeSeed
};



