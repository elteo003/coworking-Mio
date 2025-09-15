const pool = require('../db');

// Elenco sedi gestite dal gestore
exports.getSediGestore = async (req, res) => {
  // Prende l'ID gestore dal middleware di autenticazione aggiornato
  const id_gestore = req.user.id_utente;

  if (!id_gestore) return res.status(400).json({ error: 'Utente non autenticato' });
  try {
    const result = await pool.query('SELECT * FROM Sede WHERE id_gestore = $1', [id_gestore]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Prenotazioni di tutte le sedi/spazi gestiti
exports.getPrenotazioniGestore = async (req, res) => {
  // Prende l'ID gestore dal middleware di autenticazione aggiornato
  const id_gestore = req.user.id_utente;

  if (!id_gestore) return res.status(400).json({ error: 'Utente non autenticato' });
  try {
    const result = await pool.query(
      `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede
       FROM Prenotazione p
       JOIN Spazio s ON p.id_spazio = s.id_spazio
       JOIN Sede se ON s.id_sede = s.id_sede
       WHERE se.id_gestore = $1
       ORDER BY p.data_inizio DESC`,
      [id_gestore]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Reportistica: numero prenotazioni, incasso totale per sede/spazio, periodo selezionabile
exports.getReportGestore = async (req, res) => {
  const { dal, al } = req.query;
  // Prende l'ID gestore dal middleware di autenticazione aggiornato
  const id_gestore = req.user.id_utente;

  if (!id_gestore) return res.status(400).json({ error: 'Utente non autenticato' });
  try {
    const result = await pool.query(
      `SELECT se.id_sede, se.nome AS nome_sede, s.id_spazio, s.nome AS nome_spazio,
              COUNT(p.id_prenotazione) AS num_prenotazioni,
              COALESCE(SUM(pg.importo),0) AS incasso_totale
       FROM Sede se
       JOIN Spazio s ON se.id_sede = s.id_sede
       LEFT JOIN Prenotazione p ON s.id_spazio = p.id_spazio
         AND (p.data_inizio >= $2 OR $2 IS NULL)
         AND (p.data_fine <= $3 OR $3 IS NULL)
       LEFT JOIN Pagamento pg ON p.id_prenotazione = pg.id_prenotazione AND pg.stato = 'pagato'
       WHERE se.id_gestore = $1
       GROUP BY se.id_sede, s.id_spazio
       ORDER BY se.id_sede, s.id_spazio`,
      [id_gestore, dal || null, al || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Blocca manualmente uno spazio per un intervallo (crea una prenotazione "blocco")
exports.bloccaSpazio = async (req, res) => {
  const { id } = req.params; // id_spazio
  const { data_inizio, data_fine, motivo } = req.body;
  // Prende l'ID gestore dal middleware di autenticazione aggiornato
  const id_gestore = req.user.id_utente;

  if (!id_gestore || !data_inizio || !data_fine) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  }
  try {
    // Verifica che lo spazio appartenga a una sede del gestore
    const check = await pool.query(
      `SELECT s.id_spazio FROM Spazio s
       JOIN Sede se ON s.id_sede = se.id_sede
       WHERE s.id_spazio = $1 AND se.id_gestore = $2`,
      [id, id_gestore]
    );
    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Non autorizzato a bloccare questo spazio' });
    }
    // Inserisce una prenotazione "blocco" con id_utente = id_gestore per rispettare NOT NULL
    await pool.query(
      `INSERT INTO Prenotazione (id_utente, id_spazio, data_inizio, data_fine, stato)
       VALUES ($1, $2, $3, $4, 'confermata')`,
      [id_gestore, id, data_inizio, data_fine]
    );
    res.status(201).json({ message: 'Spazio bloccato con successo' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// ===== GESTIONE SEDI =====

// Crea una nuova sede
exports.creaSede = async (req, res) => {
  const { nome, citta, indirizzo, descrizione } = req.body;
  const id_gestore = req.user.id_utente;

  if (!nome || !citta || !indirizzo) {
    return res.status(400).json({ error: 'Nome, città e indirizzo sono obbligatori' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO Sede (nome, citta, indirizzo, descrizione, id_gestore)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nome, citta, indirizzo, descrizione || null, id_gestore]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Modifica una sede esistente
exports.modificaSede = async (req, res) => {
  const { id } = req.params;
  const { nome, citta, indirizzo, descrizione } = req.body;
  const id_gestore = req.user.id_utente;

  if (!nome || !citta || !indirizzo) {
    return res.status(400).json({ error: 'Nome, città e indirizzo sono obbligatori' });
  }

  try {
    // Verifica che la sede appartenga al gestore
    const check = await pool.query(
      'SELECT id_sede FROM Sede WHERE id_sede = $1 AND id_gestore = $2',
      [id, id_gestore]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questa sede' });
    }

    const result = await pool.query(
      `UPDATE Sede SET nome = $1, citta = $2, indirizzo = $3, descrizione = $4
       WHERE id_sede = $5 RETURNING *`,
      [nome, citta, indirizzo, descrizione || null, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Elimina una sede
exports.eliminaSede = async (req, res) => {
  const { id } = req.params;
  const id_gestore = req.user.id_utente;

  try {
    // Verifica che la sede appartenga al gestore
    const check = await pool.query(
      'SELECT id_sede FROM Sede WHERE id_sede = $1 AND id_gestore = $2',
      [id, id_gestore]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Non autorizzato a eliminare questa sede' });
    }

    // Verifica che non ci siano prenotazioni attive
    const prenotazioni = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione p
       JOIN Spazio s ON p.id_spazio = s.id_spazio
       WHERE s.id_sede = $1 AND p.stato IN ('confermata', 'in attesa')`,
      [id]
    );

    if (prenotazioni.rows[0].count !== '0') {
      return res.status(400).json({
        error: 'Impossibile eliminare: ci sono prenotazioni attive per questa sede'
      });
    }

    await pool.query('DELETE FROM Sede WHERE id_sede = $1', [id]);
    res.json({ message: 'Sede eliminata con successo' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// ===== GESTIONE IMMAGINI =====

// Ottieni credenziali S3 per l'upload
exports.getStorageCredentials = async (req, res) => {
  try {
    // Restituisci le credenziali S3 dal .env
    res.json({
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
      endpoint: process.env.STORAGE_ENDPOINT || 'https://czkiuvmhijhxuqzdtnmz.storage.supabase.co/storage/v1/s3',
      bucketName: process.env.STORAGE_BUCKET_NAME || 'Immagini'
    });
  } catch (err) {
    console.error('Errore caricamento credenziali storage:', err);
    res.status(500).json({ error: 'Errore caricamento credenziali storage' });
  }
};

// Salva metadati immagine
exports.saveImageMetadata = async (req, res) => {
  const { type, parentId, url, altText, fileName } = req.body;
  const id_gestore = req.user.id_utente;

  if (!id_gestore) return res.status(400).json({ error: 'Utente non autenticato' });

  try {
    const tableName = type === 'sede' ? 'sede_immagini' : 'spazio_immagini';
    const parentField = type === 'sede' ? 'id_sede' : 'id_spazio';

    // Verifica che il gestore abbia accesso alla sede/spazio
    let checkQuery;
    if (type === 'sede') {
      checkQuery = 'SELECT id_sede FROM Sede WHERE id_sede = $1 AND id_gestore = $2';
    } else {
      checkQuery = `
        SELECT s.id_spazio FROM Spazio s 
        JOIN Sede se ON s.id_sede = se.id_sede 
        WHERE s.id_spazio = $1 AND se.id_gestore = $2
      `;
    }

    const checkResult = await pool.query(checkQuery, [parentId, id_gestore]);
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const result = await pool.query(
      `INSERT INTO ${tableName} (${parentField}, url, alt_text, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [parentId, url, altText || '', 0]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Errore salvataggio metadati immagine:', err);
    res.status(500).json({ error: 'Errore salvataggio metadati immagine' });
  }
};

// Elimina metadati immagine
exports.deleteImageMetadata = async (req, res) => {
  const { id } = req.params;
  const id_gestore = req.user.id_utente;

  if (!id_gestore) return res.status(400).json({ error: 'Utente non autenticato' });

  try {
    // Verifica che il gestore abbia accesso all'immagine
    const checkQuery = `
      SELECT si.id FROM sede_immagini si
      JOIN Sede s ON si.id_sede = s.id_sede
      WHERE si.id = $1 AND s.id_gestore = $2
      UNION
      SELECT spi.id FROM spazio_immagini spi
      JOIN Spazio sp ON spi.id_spazio = sp.id_spazio
      JOIN Sede se ON sp.id_sede = se.id_sede
      WHERE spi.id = $1 AND se.id_gestore = $2
    `;

    const checkResult = await pool.query(checkQuery, [id, id_gestore]);
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    // Elimina l'immagine
    const deleteQuery = `
      DELETE FROM sede_immagini WHERE id = $1
      UNION
      DELETE FROM spazio_immagini WHERE id = $1
    `;

    await pool.query(deleteQuery, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Errore eliminazione metadati immagine:', err);
    res.status(500).json({ error: 'Errore eliminazione metadati immagine' });
  }
};

// Ottieni immagini per sede/spazio
exports.getImages = async (req, res) => {
  const { type, parentId } = req.query;
  const id_gestore = req.user.id_utente;

  if (!id_gestore) return res.status(400).json({ error: 'Utente non autenticato' });

  try {
    let query;
    if (type === 'sede') {
      query = `
        SELECT si.* FROM sede_immagini si
        JOIN Sede s ON si.id_sede = s.id_sede
        WHERE si.id_sede = $1 AND s.id_gestore = $2
        ORDER BY si.sort_order, si.created_at
      `;
    } else {
      query = `
        SELECT spi.* FROM spazio_immagini spi
        JOIN Spazio sp ON spi.id_spazio = sp.id_spazio
        JOIN Sede se ON sp.id_sede = se.id_sede
        WHERE spi.id_spazio = $1 AND se.id_gestore = $2
        ORDER BY spi.sort_order, spi.created_at
      `;
    }

    const result = await pool.query(query, [parentId, id_gestore]);
    res.json(result.rows);
  } catch (err) {
    console.error('Errore caricamento immagini:', err);
    res.status(500).json({ error: 'Errore caricamento immagini' });
  }
};

// ===== GESTIONE SPAZI =====

// Ottieni tutti gli spazi del gestore
exports.getSpaziGestore = async (req, res) => {
  const id_gestore = req.user.id_utente;

  if (!id_gestore) return res.status(400).json({ error: 'Utente non autenticato' });

  try {
    const result = await pool.query(
      `SELECT 
        s.id_spazio,
        s.nome,
        s.tipologia,
        s.descrizione,
        s.capienza,
        s.stato,
        s.id_sede,
        se.nome as nome_sede,
        se.citta as citta_sede
       FROM Spazio s
       JOIN Sede se ON s.id_sede = se.id_sede
       WHERE se.id_gestore = $1
       ORDER BY se.citta, se.nome, s.nome`,
      [id_gestore]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Errore caricamento spazi gestore:', err);
    res.status(500).json({ error: 'Errore server' });
  }
};

// Crea un nuovo spazio
exports.creaSpazio = async (req, res) => {
  const { id_sede, nome, tipologia, descrizione, capienza, stato } = req.body;
  const id_gestore = req.user.id_utente;

  if (!id_sede || !nome || !tipologia) {
    return res.status(400).json({ error: 'Sede, nome e tipologia sono obbligatori' });
  }

  try {
    // Verifica che la sede appartenga al gestore
    const check = await pool.query(
      'SELECT id_sede FROM Sede WHERE id_sede = $1 AND id_gestore = $2',
      [id_sede, id_gestore]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Non autorizzato a creare spazi per questa sede' });
    }

    const result = await pool.query(
      `INSERT INTO Spazio (id_sede, nome, tipologia, descrizione, capienza, stato)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id_sede, nome, tipologia, descrizione || null, capienza || null, stato || 'disponibile']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Modifica un spazio esistente
exports.modificaSpazio = async (req, res) => {
  const { id } = req.params;
  const { nome, tipologia, descrizione, capienza, stato } = req.body;
  const id_gestore = req.user.id_utente;

  if (!nome || !tipologia) {
    return res.status(400).json({ error: 'Nome e tipologia sono obbligatori' });
  }

  try {
    // Verifica che lo spazio appartenga a una sede del gestore
    const check = await pool.query(
      `SELECT s.id_spazio FROM Spazio s
       JOIN Sede se ON s.id_sede = se.id_sede
       WHERE s.id_spazio = $1 AND se.id_gestore = $2`,
      [id, id_gestore]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questo spazio' });
    }

    const result = await pool.query(
      `UPDATE Spazio SET nome = $1, tipologia = $2, descrizione = $3, capienza = $4, stato = $5
       WHERE id_spazio = $6 RETURNING *`,
      [nome, tipologia, descrizione || null, capienza || null, stato || 'disponibile', id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Elimina un spazio
exports.eliminaSpazio = async (req, res) => {
  const { id } = req.params;
  const id_gestore = req.user.id_utente;

  try {
    // Verifica che lo spazio appartenga a una sede del gestore
    const check = await pool.query(
      `SELECT s.id_spazio FROM Spazio s
       JOIN Sede se ON s.id_sede = se.id_sede
       WHERE s.id_spazio = $1 AND se.id_gestore = $2`,
      [id, id_gestore]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Non autorizzato a eliminare questo spazio' });
    }

    // Verifica che non ci siano prenotazioni attive
    const prenotazioni = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione 
       WHERE id_spazio = $1 AND stato IN ('confermata', 'in attesa')`,
      [id]
    );

    if (prenotazioni.rows[0].count !== '0') {
      return res.status(400).json({
        error: 'Impossibile eliminare: ci sono prenotazioni attive per questo spazio'
      });
    }

    await pool.query('DELETE FROM Spazio WHERE id_spazio = $1', [id]);
    res.json({ message: 'Spazio eliminato con successo' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
}; 
