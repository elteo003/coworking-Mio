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

// ===== GESTIONE SPAZI =====

// Crea un nuovo spazio
exports.creaSpazio = async (req, res) => {
  const { id_sede, nome, tipologia, descrizione, capienza } = req.body;
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
      `INSERT INTO Spazio (id_sede, nome, tipologia, descrizione, capienza)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id_sede, nome, tipologia, descrizione || null, capienza || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Modifica un spazio esistente
exports.modificaSpazio = async (req, res) => {
  const { id } = req.params;
  const { nome, tipologia, descrizione, capienza } = req.body;
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
      `UPDATE Spazio SET nome = $1, tipologia = $2, descrizione = $3, capienza = $4
       WHERE id_spazio = $5 RETURNING *`,
      [nome, tipologia, descrizione || null, capienza || null, id]
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