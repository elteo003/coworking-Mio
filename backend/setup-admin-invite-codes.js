const pool = require('./src/db');
const crypto = require('crypto');

async function setupInviteCodes() {
  try {
    console.log('🔧 Setup codici di invito amministratori...');

    // Verifica se la tabella esiste
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'codiciinvitoadmin'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📋 Creazione tabella CodiciInvitoAdmin...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS CodiciInvitoAdmin (
          id_codice SERIAL PRIMARY KEY,
          codice TEXT NOT NULL UNIQUE,
          ruolo TEXT NOT NULL CHECK (ruolo IN ('gestore', 'amministratore')),
          creato_da INTEGER NOT NULL REFERENCES Utente(id_utente),
          creato_il TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          utilizzato BOOLEAN DEFAULT FALSE,
          utilizzato_il TIMESTAMP,
          utilizzato_da INTEGER REFERENCES Utente(id_utente),
          scadenza TIMESTAMP,
          note TEXT
        );
      `);

      // Crea indici
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_codici_invito_codice ON CodiciInvitoAdmin(codice);
        CREATE INDEX IF NOT EXISTS idx_codici_invito_non_utilizzati ON CodiciInvitoAdmin(utilizzato, scadenza);
        CREATE INDEX IF NOT EXISTS idx_codici_invito_ruolo ON CodiciInvitoAdmin(ruolo);
      `);

      console.log('✅ Tabella CodiciInvitoAdmin creata');
    }

    // Verifica se ci sono amministratori esistenti
    const adminCheck = await pool.query(`
      SELECT id_utente, nome, cognome 
      FROM Utente 
      WHERE ruolo = 'amministratore' 
      LIMIT 1
    `);

    if (adminCheck.rows.length === 0) {
      console.log('⚠️  Nessun amministratore trovato. Creazione amministratore di default...');
      
      // Crea un amministratore di default
      const bcrypt = require('bcryptjs');
      const defaultPassword = 'admin123';
      const hash = await bcrypt.hash(defaultPassword, 10);
      
      const adminResult = await pool.query(`
        INSERT INTO Utente (nome, cognome, email, password, ruolo, telefono)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id_utente
      `, ['Admin', 'Sistema', 'admin@coworkspace.com', hash, 'amministratore', '+39 000 000 0000']);

      const adminId = adminResult.rows[0].id_utente;
      console.log(`✅ Amministratore di default creato (ID: ${adminId})`);
      console.log(`📧 Email: admin@coworkspace.com`);
      console.log(`🔑 Password: ${defaultPassword}`);
    }

    // Genera codici di invito di esempio
    const adminId = adminCheck.rows.length > 0 ? adminCheck.rows[0].id_utente : (await pool.query('SELECT id_utente FROM Utente WHERE ruolo = \'amministratore\' LIMIT 1')).rows[0].id_utente;

    const codes = [
      {
        ruolo: 'amministratore',
        note: 'Codice di invito per nuovo amministratore'
      },
      {
        ruolo: 'gestore',
        note: 'Codice di invito per nuovo gestore'
      }
    ];

    for (const codeData of codes) {
      const codice = crypto.randomBytes(16).toString('hex').toUpperCase();
      
      await pool.query(`
        INSERT INTO CodiciInvitoAdmin (codice, ruolo, creato_da, note)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (codice) DO NOTHING
      `, [codice, codeData.ruolo, adminId, codeData.note]);

      console.log(`✅ Codice ${codeData.ruolo} generato: ${codice}`);
    }

    console.log('🎉 Setup codici di invito completato!');
    console.log('📝 Usa questi codici per registrare nuovi amministratori/gestori');

  } catch (error) {
    console.error('❌ Errore setup codici invito:', error);
  } finally {
    await pool.end();
  }
}

// Esegui setup se chiamato direttamente
if (require.main === module) {
  setupInviteCodes();
}

module.exports = setupInviteCodes;
