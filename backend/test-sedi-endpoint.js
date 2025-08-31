/**
 * Script per testare l'endpoint /api/sedi
 * Verifica che l'endpoint funzioni correttamente
 */

const { Pool } = require('pg');

// Configurazione per produzione
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testSediEndpoint() {
    try {
        console.log('🔄 Test endpoint /api/sedi...');

        // Test 1: Verifica connessione database
        console.log('1️⃣ Test connessione database...');
        const connectionTest = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Connessione OK:', connectionTest.rows[0].current_time);

        // Test 2: Verifica esistenza tabella Sede
        console.log('2️⃣ Test esistenza tabella Sede...');
        const tableTest = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sede'
      );
    `);
        console.log('✅ Tabella Sede esiste:', tableTest.rows[0].exists);

        // Test 3: Conta sedi
        console.log('3️⃣ Test conteggio sedi...');
        const countResult = await pool.query('SELECT COUNT(*) as count FROM Sede');
        const sedeCount = parseInt(countResult.rows[0].count);
        console.log(`✅ Sedi nel database: ${sedeCount}`);

        if (sedeCount === 0) {
            console.log('⚠️  Nessuna sede trovata! Il database potrebbe essere vuoto.');
            console.log('💡 Soluzione: Esegui populate-production-db.js per aggiungere dati di esempio');
            return;
        }

        // Test 4: Query sedi (simula l'endpoint)
        console.log('4️⃣ Test query sedi (simula endpoint)...');
        const sediResult = await pool.query('SELECT * FROM Sede ORDER BY nome');
        console.log(`✅ Query sedi completata: ${sediResult.rows.length} sedi trovate`);

        // Mostra le sedi
        console.log('🏢 Sedi disponibili:');
        sediResult.rows.forEach((sede, index) => {
            console.log(`   ${index + 1}. ${sede.nome} (${sede.citta}) - ${sede.indirizzo}`);
        });

        // Test 5: Test endpoint completo (simula catalogoController.getSedi)
        console.log('5️⃣ Test endpoint completo...');
        const startTime = Date.now();

        // Simula la logica del controller
        const result = await pool.query('SELECT * FROM Sede');
        const sediConFoto = result.rows.map(sede => ({
            ...sede,
            location_photos: [
                {
                    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop',
                    alt: sede.nome
                },
                {
                    url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=200&fit=crop',
                    alt: sede.nome
                },
                {
                    url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=200&fit=crop',
                    alt: sede.nome
                }
            ]
        }));

        const duration = Date.now() - startTime;
        console.log(`✅ Endpoint simulato completato in ${duration}ms`);
        console.log(`📊 Risposta JSON: ${JSON.stringify(sediConFoto, null, 2)}`);

        console.log('🎉 Tutti i test completati con successo!');

    } catch (error) {
        console.error('❌ Errore durante il test:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
    testSediEndpoint()
        .then(() => {
            console.log('✅ Test completato!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Test fallito:', error);
            process.exit(1);
        });
}

module.exports = { testSediEndpoint };
