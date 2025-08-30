const { Pool } = require('pg');
require('dotenv').config();

// Configurazione Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkDatabaseConstraints() {
    const client = await pool.connect();

    try {
        console.log('🔍 Controllo constraint database Supabase...');

        // 1. Controlla constraint della tabella utente
        console.log('\n📋 Constraint tabella utente:');
        const constraints = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'utente'::regclass
        `);

        constraints.rows.forEach(row => {
            console.log(`   - ${row.conname}: ${row.definition}`);
        });

        // 2. Controlla valori esistenti nella tabella utente
        console.log('\n👥 Utenti esistenti:');
        const users = await client.query('SELECT id_utente, nome, cognome, email, ruolo FROM utente LIMIT 10');
        users.rows.forEach(user => {
            console.log(`   - ${user.nome} ${user.cognome} (${user.email}) - Ruolo: ${user.ruolo}`);
        });

        // 3. Controlla se ci sono utenti con ruolo 'utente'
        console.log('\n🔍 Controllo utenti con ruolo "utente":');
        const utentiCount = await client.query("SELECT COUNT(*) as count FROM utente WHERE ruolo = 'utente'");
        console.log(`   - Utenti con ruolo 'utente': ${utentiCount.rows[0].count}`);

        // 4. Controlla se ci sono utenti con ruolo 'gestore'
        console.log('\n🔍 Controllo utenti con ruolo "gestore":');
        const gestoriCount = await client.query("SELECT COUNT(*) as count FROM utente WHERE ruolo = 'gestore'");
        console.log(`   - Utenti con ruolo 'gestore': ${gestoriCount.rows[0].count}`);

        // 5. Prova a inserire un utente con ruolo 'utente'
        console.log('\n🧪 Test inserimento utente con ruolo "utente":');
        try {
            const testUser = await client.query(`
                INSERT INTO utente (nome, cognome, email, telefono, ruolo, password) 
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id_utente, ruolo
            `, [
                'Test',
                'User',
                'test.user@example.com',
                '3339998888',
                'utente',
                'hashed_password'
            ]);
            console.log('   ✅ Inserimento riuscito:', testUser.rows[0]);

            // Rimuovi l'utente di test
            await client.query('DELETE FROM utente WHERE id_utente = $1', [testUser.rows[0].id_utente]);
            console.log('   🧹 Utente di test rimosso');

        } catch (error) {
            console.log('   ❌ Errore inserimento:', error.message);
        }

        // 6. Prova a inserire un utente con ruolo 'gestore'
        console.log('\n🧪 Test inserimento utente con ruolo "gestore":');
        try {
            const testGestore = await client.query(`
                INSERT INTO utente (nome, cognome, email, telefono, ruolo, password) 
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id_utente, ruolo
            `, [
                'Test',
                'Gestore',
                'test.gestore@example.com',
                '3339998889',
                'gestore',
                'hashed_password'
            ]);
            console.log('   ✅ Inserimento riuscito:', testGestore.rows[0]);

            // Rimuovi l'utente di test
            await client.query('DELETE FROM utente WHERE id_utente = $1', [testGestore.rows[0].id_utente]);
            console.log('   🧹 Utente di test rimosso');

        } catch (error) {
            console.log('   ❌ Errore inserimento:', error.message);
        }

        // 7. Controlla se ci sono altri ruoli possibili
        console.log('\n🔍 Controllo ruoli unici nella tabella:');
        const uniqueRoles = await client.query('SELECT DISTINCT ruolo FROM utente');
        console.log('   - Ruoli esistenti:', uniqueRoles.rows.map(row => row.ruolo));

    } catch (error) {
        console.error('❌ Errore durante il controllo:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Esegui il controllo
checkDatabaseConstraints();



