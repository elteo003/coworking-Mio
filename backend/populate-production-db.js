/**
 * Script per popolare il database di produzione su Render
 * Esegue il seed.sql per aggiungere dati di esempio
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurazione per produzione (usa variabili d'ambiente)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function populateDatabase() {
    try {
        console.log('🔄 Inizio popolamento database di produzione...');

        // Leggi il file seed.sql
        const seedPath = path.join(__dirname, '../database/seed.sql');
        const seedSQL = fs.readFileSync(seedPath, 'utf8');

        console.log('📄 File seed.sql letto:', seedPath);

        // Esegui le query di seed
        await pool.query(seedSQL);

        console.log('✅ Database popolato con successo!');

        // Verifica che i dati siano stati inseriti
        const sediResult = await pool.query('SELECT COUNT(*) as count FROM Sede');
        const spaziResult = await pool.query('SELECT COUNT(*) as count FROM Spazio');
        const serviziResult = await pool.query('SELECT COUNT(*) as count FROM Servizio');

        console.log('📊 Dati inseriti:');
        console.log(`   - Sedi: ${sediResult.rows[0].count}`);
        console.log(`   - Spazi: ${spaziResult.rows[0].count}`);
        console.log(`   - Servizi: ${serviziResult.rows[0].count}`);

        // Mostra le sedi inserite
        const sedi = await pool.query('SELECT * FROM Sede');
        console.log('🏢 Sedi disponibili:');
        sedi.rows.forEach(sede => {
            console.log(`   - ${sede.nome} (${sede.citta})`);
        });

    } catch (error) {
        console.error('❌ Errore durante il popolamento:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
    populateDatabase()
        .then(() => {
            console.log('🎉 Popolamento completato!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Popolamento fallito:', error);
            process.exit(1);
        });
}

module.exports = { populateDatabase };
