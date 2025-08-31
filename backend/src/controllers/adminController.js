const pool = require('../db');

// Dashboard generale per amministratore
exports.getDashboardGenerale = async (req, res) => {
  try {
    // Query per statistiche generali
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM Utente WHERE ruolo = 'cliente') as totale_clienti,
        (SELECT COUNT(*) FROM Utente WHERE ruolo = 'gestore') as totale_gestori,
        (SELECT COUNT(*) FROM Utente WHERE ruolo = 'amministratore') as totale_amministratori,
        (SELECT COUNT(*) FROM Utente) as totale_utenti,
        (SELECT COUNT(*) FROM Sede) as totale_sedi,
        (SELECT COUNT(*) FROM Spazio) as totale_spazi,
        (SELECT COUNT(*) FROM Prenotazione) as totale_prenotazioni,
        (SELECT COUNT(*) FROM Pagamento) as totale_pagamenti
    `;

    const statsResult = await pool.query(statsQuery);
    const statistiche = statsResult.rows[0];

    res.json({
      success: true,
      statistiche: statistiche
    });
  } catch (error) {
    console.error('Errore caricamento dashboard amministratore:', error);
    res.status(500).json({ error: 'Errore caricamento dashboard' });
  }
};

// Gestione utenti
exports.getUtenti = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', ruolo = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (u.nome ILIKE $${paramCount} OR u.cognome ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (ruolo) {
      paramCount++;
      whereClause += ` AND u.ruolo = $${paramCount}`;
      params.push(ruolo);
    }

    const query = `
      SELECT 
        u.id_utente,
        u.nome,
        u.cognome,
        u.email,
        u.ruolo,
        u.telefono,
        u.created_at
      FROM Utente u
      WHERE 1=1 ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);
    const result = await pool.query(query, params);

    // Conta totale per paginazione
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Utente u
      WHERE 1=1 ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      utenti: result.rows,
      paginazione: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Errore caricamento utenti:', error);
    res.status(500).json({ error: 'Errore caricamento utenti' });
  }
};

// Gestione gestori
exports.getGestori = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id_utente,
        u.nome,
        u.cognome,
        u.email,
        u.telefono,
        STRING_AGG(s.nome, ', ') as sedi_assegnate
      FROM Utente u
      LEFT JOIN Sede s ON s.gestore_id = u.id_utente
      WHERE u.ruolo = 'gestore'
      GROUP BY u.id_utente, u.nome, u.cognome, u.email, u.telefono
      ORDER BY u.nome, u.cognome
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Errore caricamento gestori:', error);
    res.status(500).json({ error: 'Errore caricamento gestori' });
  }
};

exports.creaGestore = async (req, res) => {
  try {
    const { nome, cognome, email, password, telefono, sedi_ids } = req.body;

    // Verifica se email esiste già
    const existingUser = await pool.query('SELECT id_utente FROM Utente WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email già esistente' });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    // Crea utente
    const userQuery = `
      INSERT INTO Utente (nome, cognome, email, password, ruolo, telefono)
      VALUES ($1, $2, $3, $4, 'gestore', $5)
      RETURNING id_utente
    `;
    const userResult = await pool.query(userQuery, [nome, cognome, email, hash, telefono]);
    const userId = userResult.rows[0].id_utente;

    // Assegna sedi se specificate
    if (sedi_ids && sedi_ids.length > 0) {
      for (const sedeId of sedi_ids) {
        await pool.query('UPDATE Sede SET gestore_id = $1 WHERE id_sede = $2', [userId, sedeId]);
      }
    }

    res.json({ success: true, message: 'Gestore creato con successo', id_utente: userId });
  } catch (error) {
    console.error('Errore creazione gestore:', error);
    res.status(500).json({ error: 'Errore creazione gestore' });
  }
};

exports.sospendiGestore = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_sospensione } = req.body;

    // Implementa logica di sospensione
    await pool.query('UPDATE Utente SET sospeso = true, motivo_sospensione = $1 WHERE id_utente = $2', [motivo_sospensione, id]);

    res.json({ success: true, message: 'Gestore sospeso con successo' });
  } catch (error) {
    console.error('Errore sospensione gestore:', error);
    res.status(500).json({ error: 'Errore sospensione gestore' });
  }
};

exports.eliminaGestore = async (req, res) => {
  try {
    const { id } = req.params;

    // Rimuovi assegnazioni sedi
    await pool.query('UPDATE Sede SET gestore_id = NULL WHERE gestore_id = $1', [id]);

    // Elimina utente
    await pool.query('DELETE FROM Utente WHERE id_utente = $1', [id]);

    res.json({ success: true, message: 'Gestore eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione gestore:', error);
    res.status(500).json({ error: 'Errore eliminazione gestore' });
  }
};

// Gestione sedi
exports.getSedi = async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id_sede,
        s.nome,
        s.citta,
        s.indirizzo,
        s.telefono,
        s.capacita_massima,
        s.descrizione,
        u.nome as gestore_nome,
        u.cognome as gestore_cognome,
        COUNT(sp.id_spazio) as numero_spazi
      FROM Sede s
      LEFT JOIN Utente u ON s.gestore_id = u.id_utente
      LEFT JOIN Spazio sp ON sp.sede_id = s.id_sede
      GROUP BY s.id_sede, s.nome, s.citta, s.indirizzo, s.telefono, s.capacita_massima, s.descrizione, u.nome, u.cognome
      ORDER BY s.citta, s.nome
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Errore caricamento sedi:', error);
    res.status(500).json({ error: 'Errore caricamento sedi' });
  }
};

exports.creaSede = async (req, res) => {
  try {
    const { nome, citta, indirizzo, telefono, gestore_id, capacita_massima, descrizione } = req.body;

    const query = `
      INSERT INTO Sede (nome, citta, indirizzo, telefono, gestore_id, capacita_massima, descrizione)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_sede
    `;

    const result = await pool.query(query, [nome, citta, indirizzo, telefono, gestore_id, capacita_massima, descrizione]);

    res.json({ success: true, message: 'Sede creata con successo', id_sede: result.rows[0].id_sede });
  } catch (error) {
    console.error('Errore creazione sede:', error);
    res.status(500).json({ error: 'Errore creazione sede' });
  }
};

exports.eliminaSede = async (req, res) => {
  try {
    const { id } = req.params;

    // Elimina spazi associati
    await pool.query('DELETE FROM Spazio WHERE sede_id = $1', [id]);

    // Elimina sede
    await pool.query('DELETE FROM Sede WHERE id_sede = $1', [id]);

    res.json({ success: true, message: 'Sede eliminata con successo' });
  } catch (error) {
    console.error('Errore eliminazione sede:', error);
    res.status(500).json({ error: 'Errore eliminazione sede' });
  }
};

// Gestione spazi
exports.getSpazi = async (req, res) => {
  try {
    const query = `
      SELECT 
        sp.id_spazio,
        sp.nome,
        sp.tipologia,
        sp.capacita,
        sp.prezzo_ora,
        sp.descrizione,
        sp.disponibile,
        s.nome as nome_sede,
        s.citta as citta_sede
      FROM Spazio sp
      JOIN Sede s ON sp.sede_id = s.id_sede
      ORDER BY s.citta, s.nome, sp.nome
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Errore caricamento spazi:', error);
    res.status(500).json({ error: 'Errore caricamento spazi' });
  }
};

exports.creaSpazio = async (req, res) => {
  try {
    const { nome, sede_id, tipologia, capacita, prezzo_ora, descrizione } = req.body;

    const query = `
      INSERT INTO Spazio (nome, sede_id, tipologia, capacita, prezzo_ora, descrizione)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_spazio
    `;

    const result = await pool.query(query, [nome, sede_id, tipologia, capacita, prezzo_ora, descrizione]);

    res.json({ success: true, message: 'Spazio creato con successo', id_spazio: result.rows[0].id_spazio });
  } catch (error) {
    console.error('Errore creazione spazio:', error);
    res.status(500).json({ error: 'Errore creazione spazio' });
  }
};

exports.eliminaSpazio = async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se ci sono prenotazioni future
    const prenotazioniQuery = `
      SELECT COUNT(*) as count
      FROM Prenotazione
      WHERE spazio_id = $1 AND data_inizio > CURRENT_TIMESTAMP
    `;
    const prenotazioniResult = await pool.query(prenotazioniQuery, [id]);

    if (parseInt(prenotazioniResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Non è possibile eliminare uno spazio con prenotazioni future' });
    }

    // Elimina prenotazioni passate
    await pool.query('DELETE FROM Prenotazione WHERE spazio_id = $1', [id]);

    // Elimina spazio
    await pool.query('DELETE FROM Spazio WHERE id_spazio = $1', [id]);

    res.json({ success: true, message: 'Spazio eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione spazio:', error);
    res.status(500).json({ error: 'Errore eliminazione spazio' });
  }
};

// Monitoraggio prenotazioni
exports.getPrenotazioni = async (req, res) => {
  try {
    const { page = 1, limit = 20, stato = '', sede = '', data_da = '', data_a = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (stato) {
      paramCount++;
      whereClause += ` AND p.stato = $${paramCount}`;
      params.push(stato);
    }

    if (sede) {
      paramCount++;
      whereClause += ` AND s.id_sede = $${paramCount}`;
      params.push(sede);
    }

    if (data_da) {
      paramCount++;
      whereClause += ` AND p.data_inizio >= $${paramCount}`;
      params.push(data_da);
    }

    if (data_a) {
      paramCount++;
      whereClause += ` AND p.data_fine <= $${paramCount}`;
      params.push(data_a);
    }

    const query = `
      SELECT 
        p.id_prenotazione,
        p.data_inizio,
        p.data_fine,
        p.stato,
        p.importo,
        u.nome as nome_utente,
        u.cognome as cognome_utente,
        sp.nome as nome_spazio,
        s.nome as nome_sede
      FROM Prenotazione p
      JOIN Utente u ON p.utente_id = u.id_utente
      JOIN Spazio sp ON p.spazio_id = sp.id_spazio
      JOIN Sede s ON sp.sede_id = s.id_sede
      WHERE 1=1 ${whereClause}
      ORDER BY p.data_inizio DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);
    const result = await pool.query(query, params);

    // Conta totale per paginazione
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Prenotazione p
      JOIN Utente u ON p.utente_id = u.id_utente
      JOIN Spazio sp ON p.spazio_id = sp.id_spazio
      JOIN Sede s ON sp.sede_id = s.id_sede
      WHERE 1=1 ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      prenotazioni: result.rows,
      paginazione: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Errore caricamento prenotazioni:', error);
    res.status(500).json({ error: 'Errore caricamento prenotazioni' });
  }
};

// Monitoraggio pagamenti
exports.getPagamenti = async (req, res) => {
  try {
    const { page = 1, limit = 20, stato = '', metodo = '', data_da = '', data_a = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (stato) {
      paramCount++;
      whereClause += ` AND p.stato = $${paramCount}`;
      params.push(stato);
    }

    if (metodo) {
      paramCount++;
      whereClause += ` AND p.metodo_pagamento = $${paramCount}`;
      params.push(metodo);
    }

    if (data_da) {
      paramCount++;
      whereClause += ` AND p.data_pagamento >= $${paramCount}`;
      params.push(data_da);
    }

    if (data_a) {
      paramCount++;
      whereClause += ` AND p.data_pagamento <= $${paramCount}`;
      params.push(data_a);
    }

    const query = `
      SELECT 
        p.id_pagamento,
        p.importo,
        p.data_pagamento,
        p.stato,
        p.metodo_pagamento,
        u.nome as nome_utente,
        u.cognome as cognome_utente,
        sp.nome as nome_spazio,
        s.nome as nome_sede
      FROM Pagamento p
      JOIN Utente u ON p.utente_id = u.id_utente
      JOIN Spazio sp ON p.spazio_id = sp.id_spazio
      JOIN Sede s ON sp.sede_id = s.id_sede
      WHERE 1=1 ${whereClause}
      ORDER BY p.data_pagamento DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);
    const result = await pool.query(query, params);

    // Conta totale per paginazione
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Pagamento p
      JOIN Utente u ON p.utente_id = u.id_utente
      JOIN Spazio sp ON p.spazio_id = sp.id_spazio
      JOIN Sede s ON sp.sede_id = s.id_sede
      WHERE 1=1 ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      pagamenti: result.rows,
      paginazione: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Errore caricamento pagamenti:', error);
    res.status(500).json({ error: 'Errore caricamento pagamenti' });
  }
};

// Log sistema
exports.getLog = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        timestamp,
        livello,
        messaggio,
        utente,
        dettagli
      FROM LogSistema
      ORDER BY timestamp DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    // Conta totale per paginazione
    const countResult = await pool.query('SELECT COUNT(*) as total FROM LogSistema');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      log: result.rows,
      paginazione: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Errore caricamento log:', error);
    res.status(500).json({ error: 'Errore caricamento log' });
  }
};

// Gestione codici invito
exports.getCodiciInvito = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id_codice,
        c.codice,
        c.ruolo,
        c.creato_il,
        c.scadenza,
        c.utilizzato,
        c.utilizzato_il,
        c.note,
        u1.nome as creatore_nome,
        u1.cognome as creatore_cognome,
        u2.nome as utilizzatore_nome,
        u2.cognome as utilizzatore_cognome
      FROM CodiciInvitoAdmin c
      JOIN Utente u1 ON c.creato_da = u1.id_utente
      LEFT JOIN Utente u2 ON c.utilizzato_da = u2.id_utente
      ORDER BY c.creato_il DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Errore caricamento codici invito:', error);
    res.status(500).json({ error: 'Errore caricamento codici invito' });
  }
};

exports.creaCodiceInvito = async (req, res) => {
  try {
    const { ruolo, note, scadenza } = req.body;
    const creato_da = req.user.id_utente;

    // Genera codice unico
    const crypto = require('crypto');
    const codice = crypto.randomBytes(16).toString('hex').toUpperCase();

    const query = `
      INSERT INTO CodiciInvitoAdmin (codice, ruolo, creato_da, note, scadenza)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_codice, codice
    `;

    const result = await pool.query(query, [codice, ruolo, creato_da, note, scadenza]);

    res.json({
      success: true,
      message: 'Codice di invito creato con successo',
      codice: result.rows[0].codice
    });
  } catch (error) {
    console.error('Errore creazione codice invito:', error);
    res.status(500).json({ error: 'Errore creazione codice invito' });
  }
};

exports.eliminaCodiceInvito = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM CodiciInvitoAdmin WHERE id_codice = $1', [id]);

    res.json({ success: true, message: 'Codice di invito eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione codice invito:', error);
    res.status(500).json({ error: 'Errore eliminazione codice invito' });
  }
};

// Controllo sistema
exports.getSystemMetrics = async (req, res) => {
  try {
    // Simula metriche di sistema (in produzione usare librerie specifiche)
    const metrics = {
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 100),
      disk: Math.floor(Math.random() * 100),
      network: Math.floor(Math.random() * 100)
    };

    res.json(metrics);
  } catch (error) {
    console.error('Errore caricamento metriche sistema:', error);
    res.status(500).json({ error: 'Errore caricamento metriche sistema' });
  }
};

exports.backupDatabase = async (req, res) => {
  try {
    // Implementa backup database
    res.json({ success: true, message: 'Backup avviato con successo' });
  } catch (error) {
    console.error('Errore backup database:', error);
    res.status(500).json({ error: 'Errore backup database' });
  }
};

exports.clearLogs = async (req, res) => {
  try {
    // Elimina log più vecchi di 30 giorni
    await pool.query('DELETE FROM LogSistema WHERE timestamp < NOW() - INTERVAL \'30 days\'');

    res.json({ success: true, message: 'Log vecchi eliminati con successo' });
  } catch (error) {
    console.error('Errore eliminazione log:', error);
    res.status(500).json({ error: 'Errore eliminazione log' });
  }
};

exports.systemStatus = async (req, res) => {
  try {
    const status = {
      database: {
        status: 'Connesso',
        version: 'PostgreSQL 14'
      },
      server: {
        uptime: process.uptime(),
        version: process.version
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Errore stato sistema:', error);
    res.status(500).json({ error: 'Errore stato sistema' });
  }
};

exports.emergencyMode = async (req, res) => {
  try {
    // Implementa modalità emergenza
    res.json({ success: true, message: 'Modalità emergenza attivata' });
  } catch (error) {
    console.error('Errore modalità emergenza:', error);
    res.status(500).json({ error: 'Errore modalità emergenza' });
  }
};

exports.saveSettings = async (req, res) => {
  try {
    const { max_users, session_timeout, maintenance_mode } = req.body;

    // Salva impostazioni (implementa logica di salvataggio)
    res.json({ success: true, message: 'Impostazioni salvate con successo' });
  } catch (error) {
    console.error('Errore salvataggio impostazioni:', error);
    res.status(500).json({ error: 'Errore salvataggio impostazioni' });
  }
};

// Funzioni mancanti per la gestione utenti
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { ruolo } = req.body;

    // Verifica che il ruolo sia valido
    const ruoliValidi = ['cliente', 'gestore', 'amministratore'];
    if (!ruoliValidi.includes(ruolo)) {
      return res.status(400).json({ error: 'Ruolo non valido' });
    }

    // Aggiorna il ruolo dell'utente
    await pool.query('UPDATE Utente SET ruolo = $1 WHERE id_utente = $2', [ruolo, id]);

    res.json({ success: true, message: 'Ruolo utente aggiornato con successo' });
  } catch (error) {
    console.error('Errore aggiornamento ruolo utente:', error);
    res.status(500).json({ error: 'Errore aggiornamento ruolo utente' });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_sospensione } = req.body;

    // Sospendi l'utente
    await pool.query('UPDATE Utente SET sospeso = true, motivo_sospensione = $1 WHERE id_utente = $2', [motivo_sospensione, id]);

    res.json({ success: true, message: 'Utente sospeso con successo' });
  } catch (error) {
    console.error('Errore sospensione utente:', error);
    res.status(500).json({ error: 'Errore sospensione utente' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se l'utente ha prenotazioni attive
    const prenotazioniQuery = `
      SELECT COUNT(*) as count
      FROM Prenotazione
      WHERE utente_id = $1 AND stato IN ('confermata', 'in_corso')
    `;
    const prenotazioniResult = await pool.query(prenotazioniQuery, [id]);

    if (parseInt(prenotazioniResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Non è possibile eliminare un utente con prenotazioni attive' });
    }

    // Elimina l'utente
    await pool.query('DELETE FROM Utente WHERE id_utente = $1', [id]);

    res.json({ success: true, message: 'Utente eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione utente:', error);
    res.status(500).json({ error: 'Errore eliminazione utente' });
  }
};

// Funzioni mancanti per la gestione sedi
exports.updateSede = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, citta, indirizzo, telefono, gestore_id, capacita_massima, descrizione } = req.body;

    const query = `
      UPDATE Sede 
      SET nome = $1, citta = $2, indirizzo = $3, telefono = $4, 
          gestore_id = $5, capacita_massima = $6, descrizione = $7
      WHERE id_sede = $8
    `;

    await pool.query(query, [nome, citta, indirizzo, telefono, gestore_id, capacita_massima, descrizione, id]);

    res.json({ success: true, message: 'Sede aggiornata con successo' });
  } catch (error) {
    console.error('Errore aggiornamento sede:', error);
    res.status(500).json({ error: 'Errore aggiornamento sede' });
  }
};

// Funzioni mancanti per la gestione spazi
exports.updateSpazio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tipologia, capacita, prezzo_ora, descrizione, disponibile } = req.body;

    const query = `
      UPDATE Spazio 
      SET nome = $1, tipologia = $2, capacita = $3, prezzo_ora = $4, 
          descrizione = $5, disponibile = $6
      WHERE id_spazio = $7
    `;

    await pool.query(query, [nome, tipologia, capacita, prezzo_ora, descrizione, disponibile, id]);

    res.json({ success: true, message: 'Spazio aggiornato con successo' });
  } catch (error) {
    console.error('Errore aggiornamento spazio:', error);
    res.status(500).json({ error: 'Errore aggiornamento spazio' });
  }
};

// Funzioni mancanti per la gestione prenotazioni
exports.getPrenotazione = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.id_prenotazione,
        p.data_inizio,
        p.data_fine,
        p.stato,
        p.importo,
        p.note,
        u.nome as nome_utente,
        u.cognome as cognome_utente,
        u.email as email_utente,
        sp.nome as nome_spazio,
        s.nome as nome_sede,
        s.citta as citta_sede
      FROM Prenotazione p
      JOIN Utente u ON p.utente_id = u.id_utente
      JOIN Spazio sp ON p.spazio_id = sp.id_spazio
      JOIN Sede s ON sp.sede_id = s.id_sede
      WHERE p.id_prenotazione = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    res.json({ success: true, prenotazione: result.rows[0] });
  } catch (error) {
    console.error('Errore caricamento prenotazione:', error);
    res.status(500).json({ error: 'Errore caricamento prenotazione' });
  }
};

exports.updatePrenotazione = async (req, res) => {
  try {
    const { id } = req.params;
    const { stato, note } = req.body;

    // Verifica che lo stato sia valido
    const statiValidi = ['in_attesa', 'confermata', 'in_corso', 'completata', 'cancellata'];
    if (stato && !statiValidi.includes(stato)) {
      return res.status(400).json({ error: 'Stato non valido' });
    }

    let query = 'UPDATE Prenotazione SET ';
    let params = [];
    let paramCount = 0;

    if (stato) {
      paramCount++;
      query += `stato = $${paramCount}`;
      params.push(stato);
    }

    if (note !== undefined) {
      if (paramCount > 0) query += ', ';
      paramCount++;
      query += `note = $${paramCount}`;
      params.push(note);
    }

    paramCount++;
    query += ` WHERE id_prenotazione = $${paramCount}`;
    params.push(id);

    await pool.query(query, params);

    res.json({ success: true, message: 'Prenotazione aggiornata con successo' });
  } catch (error) {
    console.error('Errore aggiornamento prenotazione:', error);
    res.status(500).json({ error: 'Errore aggiornamento prenotazione' });
  }
};

exports.deletePrenotazione = async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se la prenotazione può essere eliminata
    const prenotazioneQuery = `
      SELECT stato, data_inizio
      FROM Prenotazione
      WHERE id_prenotazione = $1
    `;
    const prenotazioneResult = await pool.query(prenotazioneQuery, [id]);

    if (prenotazioneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    const prenotazione = prenotazioneResult.rows[0];
    if (prenotazione.stato === 'completata') {
      return res.status(400).json({ error: 'Non è possibile eliminare una prenotazione completata' });
    }

    // Elimina la prenotazione
    await pool.query('DELETE FROM Prenotazione WHERE id_prenotazione = $1', [id]);

    res.json({ success: true, message: 'Prenotazione eliminata con successo' });
  } catch (error) {
    console.error('Errore eliminazione prenotazione:', error);
    res.status(500).json({ error: 'Errore eliminazione prenotazione' });
  }
};

// Funzioni mancanti per la gestione pagamenti
exports.getPagamento = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.id_pagamento,
        p.importo,
        p.data_pagamento,
        p.stato,
        p.metodo_pagamento,
        p.transaction_id,
        u.nome as nome_utente,
        u.cognome as cognome_utente,
        u.email as email_utente,
        sp.nome as nome_spazio,
        s.nome as nome_sede,
        s.citta as citta_sede
      FROM Pagamento p
      JOIN Utente u ON p.utente_id = u.id_utente
      JOIN Spazio sp ON p.spazio_id = sp.id_spazio
      JOIN Sede s ON sp.sede_id = s.id_sede
      WHERE p.id_pagamento = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento non trovato' });
    }

    res.json({ success: true, pagamento: result.rows[0] });
  } catch (error) {
    console.error('Errore caricamento pagamento:', error);
    res.status(500).json({ error: 'Errore caricamento pagamento' });
  }
};

exports.updatePagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { stato, note } = req.body;

    // Verifica che lo stato sia valido
    const statiValidi = ['in_attesa', 'completato', 'fallito', 'rimborsato'];
    if (stato && !statiValidi.includes(stato)) {
      return res.status(400).json({ error: 'Stato non valido' });
    }

    let query = 'UPDATE Pagamento SET ';
    let params = [];
    let paramCount = 0;

    if (stato) {
      paramCount++;
      query += `stato = $${paramCount}`;
      params.push(stato);
    }

    if (note !== undefined) {
      if (paramCount > 0) query += ', ';
      paramCount++;
      query += `note = $${paramCount}`;
      params.push(note);
    }

    paramCount++;
    query += ` WHERE id_pagamento = $${paramCount}`;
    params.push(id);

    await pool.query(query, params);

    res.json({ success: true, message: 'Pagamento aggiornato con successo' });
  } catch (error) {
    console.error('Errore aggiornamento pagamento:', error);
    res.status(500).json({ error: 'Errore aggiornamento pagamento' });
  }
};