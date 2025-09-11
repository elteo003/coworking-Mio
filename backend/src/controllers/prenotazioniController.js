const pool = require('../db');
// Socket.IO e timer rimossi - sistema semplificato

// Verifica se uno spazio è disponibile in un intervallo
exports.checkDisponibilita = async (req, res) => {
  const { id } = req.params;
  const { data_inizio, data_fine } = req.query;


  if (!data_inizio || !data_fine) {
    return res.status(400).json({
      error: 'Fornire data_inizio e data_fine',
      received: { data_inizio, data_fine }
    });
  }

  try {
    // Verifica che le date siano valide
    const dataInizio = new Date(data_inizio);
    const dataFine = new Date(data_fine);

    if (isNaN(dataInizio.getTime()) || isNaN(dataFine.getTime())) {
      return res.status(400).json({
        error: 'Formato date non valido. Usare formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)',
        received: { data_inizio, data_fine }
      });
    }


    // 1. Controlla lo stato dello spazio
    const spazioResult = await pool.query(
      `SELECT stato, ultima_prenotazione FROM Spazio WHERE id_spazio = $1`,
      [id]
    );

    if (spazioResult.rowCount === 0) {
      return res.status(404).json({ disponibile: false, motivo: 'Spazio non trovato' });
    }

    const spazio = spazioResult.rows[0];

    // NOTA: Non controlliamo più lo stato generale dello spazio
    // perché uno spazio può essere "occupato" per alcuni orari ma disponibile per altri
    // Lo stato viene determinato dalle prenotazioni specifiche per l'intervallo richiesto

    // 2. Controlla prenotazioni confermate sovrapposte
    const prenotazioniConfermate = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione
       WHERE id_spazio = $1
         AND stato = 'confermata'
         AND (data_inizio, data_fine) OVERLAPS ($2::timestamp, $3::timestamp)`,
      [id, dataInizio, dataFine]
    );

    if (prenotazioniConfermate.rows[0].count !== '0') {
      return res.json({ disponibile: false, motivo: 'Prenotazioni confermate sovrapposte' });
    }

    // 3. Controlla prenotazioni in attesa sovrapposte (che potrebbero scadere)
    const prenotazioniInAttesa = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione
       WHERE id_spazio = $1
         AND stato = 'in attesa'
         AND scadenza_slot > NOW()
         AND (data_inizio, data_fine) OVERLAPS ($2::timestamp, $3::timestamp)`,
      [id, dataInizio, dataFine]
    );

    if (prenotazioniInAttesa.rows[0].count !== '0') {
      return res.json({ disponibile: false, motivo: 'Prenotazioni in attesa sovrapposte' });
    }

    res.json({ disponibile: true, motivo: 'Spazio disponibile' });

  } catch (err) {
    console.error('❌ Errore checkDisponibilita:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Crea una nuova prenotazione
exports.creaPrenotazione = async (req, res) => {
  const { id_spazio, data_inizio, data_fine } = req.body;
  // Prende l'ID utente dal middleware di autenticazione aggiornato
  const id_utente = req.user.id_utente;

  if (!id_utente || !id_spazio || !data_inizio || !data_fine) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
  }

  try {
    // Verifica che lo spazio esista
    const checkSlot = await pool.query(
      `SELECT id_spazio FROM Spazio WHERE id_spazio = $1`,
      [id_spazio]
    );

    if (checkSlot.rowCount === 0) {
      return res.status(404).json({ error: 'Spazio non trovato' });
    }

    // NOTA: Non controlliamo più lo stato generale dello spazio
    // perché uno spazio può essere "occupato" per alcuni orari ma disponibile per altri
    // Lo stato viene determinato dalle prenotazioni specifiche per l'intervallo richiesto

    // Controllo disponibilità per prenotazioni confermate e in attesa

    const checkConfermate = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione
       WHERE id_spazio = $1
         AND stato = 'confermata'
         AND (data_inizio, data_fine) OVERLAPS ($2::timestamp, $3::timestamp)`,
      [id_spazio, data_inizio, data_fine]
    );

    const checkInAttesa = await pool.query(
      `SELECT COUNT(*) FROM Prenotazione
       WHERE id_spazio = $1
         AND stato = 'in attesa'
         AND scadenza_slot > NOW()
         AND (data_inizio, data_fine) OVERLAPS ($2::timestamp, $3::timestamp)`,
      [id_spazio, data_inizio, data_fine]
    );

    // Debug: mostra tutte le prenotazioni per questo spazio e data
    const debugPrenotazioni = await pool.query(
      `SELECT 
         id_prenotazione, 
         data_inizio, 
         data_fine, 
         stato, 
         scadenza_slot,
         EXTRACT(HOUR FROM data_inizio) as orario_inizio,
         EXTRACT(HOUR FROM data_fine) as orario_fine
       FROM Prenotazione 
       WHERE id_spazio = $1 
         AND DATE(data_inizio) = DATE($2::timestamp)
       ORDER BY data_inizio`,
      [id_spazio, data_inizio]
    );


    if (checkConfermate.rows[0].count !== '0') {
      return res.status(409).json({
        error: 'Spazio non disponibile',
        reason: 'Prenotazioni confermate sovrapposte',
        details: 'Gli slot selezionati sono già prenotati e confermati'
      });
    }

    if (checkInAttesa.rows[0].count !== '0') {
      return res.status(409).json({
        error: 'Spazio non disponibile',
        reason: 'Prenotazioni in attesa sovrapposte',
        details: 'Gli slot selezionati sono temporaneamente occupati da altre prenotazioni in attesa di pagamento'
      });
    }

    // NOTA: Non aggiorniamo più lo stato generale dello spazio
    // perché uno spazio può avere prenotazioni per alcuni orari ma essere disponibile per altri
    // Lo stato viene gestito dalle singole prenotazioni

    // Calcola la durata in ore
    const dataInizio = new Date(data_inizio);
    const dataFine = new Date(data_fine);
    const durataMs = dataFine.getTime() - dataInizio.getTime();
    const durataOre = Math.round(durataMs / (1000 * 60 * 60));


    // Inserimento prenotazione con scadenza slot e durata
    const scadenzaSlot = new Date(Date.now() + 15 * 60 * 1000); // 15 minuti da ora

    const result = await pool.query(
      `INSERT INTO Prenotazione (id_utente, id_spazio, data_inizio, data_fine, stato, scadenza_slot, durata_ore)
       VALUES ($1, $2, $3, $4, 'in attesa', $5, $6) RETURNING id_prenotazione`,
      [id_utente, id_spazio, data_inizio, data_fine, scadenzaSlot, durataOre]
    );

    // Ottieni informazioni sulla sede per le notifiche SSE
    const sedeInfo = await pool.query(
      `SELECT s.id_sede, s.id_spazio FROM Spazio s WHERE s.id_spazio = $1`,
      [id_spazio]
    );

    if (sedeInfo.rowCount > 0) {
      const { id_sede, id_spazio: spazioId } = sedeInfo.rows[0];
      const data = new Date(data_inizio).toISOString().split('T')[0]; // Solo la data

      // Sistema semplificato - nessuna notifica real-time
    }

    // Nota: La liberazione automatica dello slot è gestita dal cron job scadenzeCron
    // che controlla ogni 5 minuti le prenotazioni scadute

    res.status(201).json({
      message: 'Prenotazione creata',
      id_prenotazione: result.rows[0].id_prenotazione,
      scadenza_slot: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

  } catch (err) {
    console.error('Errore creazione prenotazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Visualizza prenotazioni per utente o gestore
exports.getPrenotazioni = async (req, res) => {
  const { utente, gestore } = req.query;
  try {
    let result;
    if (utente) {
      result = await pool.query(
        `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede, se.indirizzo AS indirizzo_sede
         FROM Prenotazione p
         JOIN Spazio s ON p.id_spazio = s.id_spazio
         JOIN Sede se ON s.id_sede = se.id_sede
         WHERE p.id_utente = $1
         ORDER BY p.data_inizio DESC`,
        [utente]
      );
    } else if (gestore) {
      // Trova tutte le prenotazioni degli spazi delle sedi gestite dal gestore
      result = await pool.query(
        `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede, se.indirizzo AS indirizzo_sede
         FROM Prenotazione p
         JOIN Spazio s ON p.id_spazio = s.id_spazio
         JOIN Sede se ON s.id_sede = se.id_sede
         WHERE se.id_sede IN (
           SELECT id_sede FROM Sede WHERE id_gestore = $1
         )
         ORDER BY p.data_inizio DESC`,
        [gestore]
      );
    } else {
      return res.status(400).json({ error: 'Fornire utente o gestore' });
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Ottiene i dettagli di una singola prenotazione
exports.getPrenotazioneById = async (req, res) => {
  const { id } = req.params;


  try {
    const result = await pool.query(
      `SELECT p.*, s.nome AS nome_spazio, se.nome AS nome_sede, 
              u.nome AS nome_utente, u.cognome AS cognome_utente, u.email AS email_utente,
              COALESCE(p.durata_ore, 
                EXTRACT(EPOCH FROM (p.data_fine - p.data_inizio)) / 3600
              ) AS durata_ore
       FROM Prenotazione p
       JOIN Spazio s ON p.id_spazio = s.id_spazio
       JOIN Sede se ON s.id_sede = se.id_sede
       JOIN Utente u ON p.id_utente = u.id_utente
       WHERE p.id_prenotazione = $1`,
      [id]
    );


    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Errore getPrenotazioneById:', err);
    res.status(500).json({ error: 'Errore server' });
  }
};

// Mette in sospeso una prenotazione (quando l'utente interrompe il pagamento)
exports.suspendPrenotazione = async (req, res) => {
  const { id_prenotazione } = req.params;
  const id_utente = req.user.id_utente;

  if (!id_prenotazione) {
    return res.status(400).json({ error: 'ID prenotazione obbligatorio' });
  }

  try {
    // Verifica che la prenotazione appartenga all'utente
    const pre = await pool.query(
      `SELECT stato FROM Prenotazione WHERE id_prenotazione = $1 AND id_utente = $2`,
      [id_prenotazione, id_utente]
    );

    if (pre.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    // Aggiorna lo stato della prenotazione a "in sospeso"
    await pool.query(
      `UPDATE Prenotazione SET stato = 'in sospeso' WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    // Aggiorna anche il pagamento se esiste
    await pool.query(
      `UPDATE Pagamento SET stato = 'in sospeso' WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    res.json({
      message: 'Prenotazione messa in sospeso',
      stato: 'in sospeso'
    });

  } catch (err) {
    console.error('Errore sospensione prenotazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Conferma una prenotazione (dopo il pagamento)
exports.confirmPrenotazione = async (req, res) => {
  const { id_prenotazione } = req.params;
  const { method, payment_id } = req.body;
  const id_utente = req.user.id_utente;

  if (!id_prenotazione) {
    return res.status(400).json({ error: 'ID prenotazione obbligatorio' });
  }

  try {
    // Verifica che la prenotazione appartenga all'utente
    const pre = await pool.query(
      `SELECT stato, id_spazio FROM Prenotazione WHERE id_prenotazione = $1 AND id_utente = $2`,
      [id_prenotazione, id_utente]
    );

    if (pre.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    // Aggiorna lo stato della prenotazione a "confermata" e rimuove la scadenza slot
    await pool.query(
      `UPDATE Prenotazione SET stato = 'confermata', data_pagamento = NOW(), scadenza_slot = NULL WHERE id_prenotazione = $1`,
      [id_prenotazione]
    );

    // Sistema semplificato - nessun timer da cancellare

    // NOTA: Non aggiorniamo più lo stato generale dello spazio
    // perché uno spazio può avere prenotazioni per alcuni orari ma essere disponibile per altri

    // Aggiorna o crea il record di pagamento - logica sicura senza ON CONFLICT
    try {
      // Prima prova ad inserire il nuovo record
      await pool.query(
        `INSERT INTO Pagamento (id_prenotazione, importo, data_pagamento, stato, metodo, provider, provider_payment_id, currency)
         VALUES ($1, $2, NOW(), 'pagato', $3, $3, $4, 'EUR')`,
        [id_prenotazione, 30, method, payment_id] // 30€ come importo di default
      );
    } catch (insertError) {
      // Se fallisce per duplicato, aggiorna il record esistente
      if (insertError.code === '23505') { // unique_violation
        await pool.query(
          `UPDATE Pagamento SET 
           stato = 'pagato', data_pagamento = NOW(), metodo = $2, provider_payment_id = $3
           WHERE id_prenotazione = $1`,
          [id_prenotazione, method, payment_id]
        );
      } else {
        // Se è un altro errore, rilancialo
        throw insertError;
      }
    }

    res.json({
      message: 'Prenotazione confermata',
      stato: 'confermata'
    });

  } catch (err) {
    console.error('Errore conferma prenotazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Cancella una prenotazione (solo se in attesa e appartiene all'utente)
exports.cancellaPrenotazione = async (req, res) => {
  const { id } = req.params;
  const id_utente = req.user.id_utente;

  if (!id) {
    return res.status(400).json({ error: 'ID prenotazione obbligatorio' });
  }

  try {
    // Verifica che la prenotazione appartenga all'utente e sia cancellabile
    const pre = await pool.query(
      `SELECT stato, id_spazio FROM Prenotazione 
             WHERE id_prenotazione = $1 AND id_utente = $2`,
      [id, id_utente]
    );

    if (pre.rowCount === 0) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    const prenotazione = pre.rows[0];

    // Solo le prenotazioni "in attesa" possono essere cancellate
    if (prenotazione.stato !== 'in attesa') {
      return res.status(400).json({
        error: 'Solo le prenotazioni in attesa possono essere cancellate'
      });
    }

    // Aggiorna la prenotazione a "cancellata"
    await pool.query(
      `UPDATE Prenotazione SET stato = 'cancellata' WHERE id_prenotazione = $1`,
      [id]
    );

    // NOTA: Non aggiorniamo più lo stato generale dello spazio
    // perché uno spazio può avere prenotazioni per alcuni orari ma essere disponibile per altri


    res.json({
      message: 'Prenotazione cancellata con successo',
      stato: 'cancellata'
    });

  } catch (err) {
    console.error('Errore cancellazione prenotazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Elimina prenotazioni duplicate nella stessa data/stanza
exports.eliminateDuplicatePrenotazioni = async (req, res) => {
  const { id_spazio, data_inizio, data_fine, exclude_id } = req.body;
  const id_utente = req.user.id_utente;

  if (!id_spazio || !data_inizio || !data_fine) {
    return res.status(400).json({ error: 'Parametri mancanti' });
  }

  try {
    // Trova e elimina prenotazioni duplicate (stesso spazio, stesse date, stesso utente)
    const result = await pool.query(
      `DELETE FROM Prenotazione 
       WHERE id_spazio = $1 
         AND data_inizio = $2 
         AND data_fine = $3 
         AND id_utente = $4 
         AND id_prenotazione != $5 
         AND stato IN ('in attesa', 'in sospeso')`,
      [id_spazio, data_inizio, data_fine, id_utente, exclude_id]
    );

    res.json({
      message: 'Prenotazioni duplicate eliminate',
      eliminated: result.rowCount
    });

  } catch (err) {
    console.error('Errore eliminazione duplicate:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Sincronizza lo stato delle prenotazioni con i pagamenti
exports.syncPrenotazioniWithPagamenti = async (req, res) => {
  const id_utente = req.user.id_utente;

  try {
    // Trova prenotazioni che hanno pagamenti ma non sono aggiornate
    const prenotazioniToUpdate = await pool.query(
      `SELECT p.id_prenotazione, p.stato, pg.stato as pagamento_stato
       FROM Prenotazione p
       JOIN Pagamento pg ON p.id_prenotazione = pg.id_prenotazione
       WHERE p.id_utente = $1 
         AND pg.stato = 'pagato' 
         AND p.stato != 'confermata'`,
      [id_utente]
    );

    let updated = 0;
    let cancelled = 0;

    for (const prenotazione of prenotazioniToUpdate.rows) {
      // Aggiorna la prenotazione a confermata
      await pool.query(
        `UPDATE Prenotazione SET stato = 'confermata', data_pagamento = NOW() WHERE id_prenotazione = $1`,
        [prenotazione.id_prenotazione]
      );
      updated++;

      // Trova e cancella altre prenotazioni della stessa sala nella stessa data
      const duplicateResult = await pool.query(
        `SELECT p2.id_prenotazione, p2.data_inizio, p2.data_fine, p2.id_spazio
         FROM Prenotazione p1
         JOIN Prenotazione p2 ON p1.id_spazio = p2.id_spazio
         WHERE p1.id_prenotazione = $1 
           AND p2.id_prenotazione != $1
           AND p2.stato IN ('in attesa', 'in sospeso')
           AND p2.id_utente = $2
           AND p2.data_inizio = p1.data_inizio
           AND p2.data_fine = p1.data_fine`,
        [prenotazione.id_prenotazione, id_utente]
      );

      if (duplicateResult.rowCount > 0) {
        // Cancella le prenotazioni duplicate
        await pool.query(
          `DELETE FROM Prenotazione WHERE id_prenotazione = ANY($1)`,
          [duplicateResult.rows.map(p => p.id_prenotazione)]
        );
        cancelled += duplicateResult.rowCount;
      }
    }

    res.json({
      message: 'Sincronizzazione completata',
      prenotazioni_aggiornate: updated,
      prenotazioni_duplicate_cancellate: cancelled
    });

  } catch (err) {
    console.error('Errore sincronizzazione:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Gestisce prenotazioni multiple stessa sala (una confermata, le altre cancellate)
exports.handleMultiplePrenotazioniSala = async (req, res) => {
  const { id_spazio, data_inizio, data_fine, id_prenotazione_confermata } = req.body;
  const id_utente = req.user.id_utente;

  if (!id_spazio || !data_inizio || !data_fine || !id_prenotazione_confermata) {
    return res.status(400).json({ error: 'Parametri mancanti' });
  }

  try {
    // Trova tutte le prenotazioni della stessa sala nella stessa data
    const prenotazioniSala = await pool.query(
      `SELECT id_prenotazione, stato
       FROM Prenotazione 
       WHERE id_spazio = $1 
         AND data_inizio = $2 
         AND data_fine = $3 
         AND id_utente = $4`,
      [id_spazio, data_inizio, data_fine, id_utente]
    );

    let cancelled = 0;

    for (const prenotazione of prenotazioniSala.rows) {
      if (prenotazione.id_prenotazione !== parseInt(id_prenotazione_confermata) &&
        prenotazione.stato === 'in attesa') {
        // Cancella le altre prenotazioni in attesa
        await pool.query(
          `DELETE FROM Prenotazione WHERE id_prenotazione = $1`,
          [prenotazione.id_prenotazione]
        );
        cancelled++;
      }
    }

    res.json({
      message: 'Gestione prenotazioni multiple completata',
      prenotazioni_cancellate: cancelled
    });

  } catch (err) {
    console.error('Errore gestione prenotazioni multiple:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Recupera tutte le prenotazioni per uno spazio specifico
exports.getPrenotazioniSpazio = async (req, res) => {
  const { id } = req.params;

  try {
    // Recupera tutte le prenotazioni per lo spazio specificato
    const result = await pool.query(
      `SELECT p.id_prenotazione, p.id_utente, p.data_inizio, p.data_fine, p.stato, p.scadenza_slot,
              u.nome, u.cognome
       FROM Prenotazione p
       JOIN Utente u ON p.id_utente = u.id_utente
       WHERE p.id_spazio = $1
       ORDER BY p.data_inizio ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Errore recupero prenotazioni spazio:', err);
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
};

// Debug endpoint per analizzare prenotazioni
exports.debugPrenotazioni = async (req, res) => {
  const { spazioId, data } = req.params;

  try {

    // Query per ottenere tutte le prenotazioni per questo spazio e data
    const prenotazioniQuery = `
      SELECT 
        p.id_prenotazione,
        p.data_inizio,
        p.data_fine,
        p.stato,
        p.scadenza_slot,
        EXTRACT(HOUR FROM p.data_inizio) as orario_inizio,
        EXTRACT(HOUR FROM p.data_fine) as orario_fine,
        u.nome,
        u.cognome,
        NOW() as ora_corrente
      FROM Prenotazione p
      JOIN Utente u ON p.id_utente = u.id_utente
      WHERE p.id_spazio = $1 
        AND DATE(p.data_inizio) = $2
      ORDER BY p.data_inizio
    `;

    const prenotazioniResult = await pool.query(prenotazioniQuery, [spazioId, data]);

    // Query per verificare lo spazio
    const spazioQuery = `
      SELECT s.id_spazio, s.nome, s.id_sede, se.nome as nome_sede
      FROM Spazio s
      JOIN Sede se ON s.id_sede = se.id_sede
      WHERE s.id_spazio = $1
    `;

    const spazioResult = await pool.query(spazioQuery, [spazioId]);

    res.json({
      success: true,
      debug: {
        spazioId: parseInt(spazioId),
        data: data,
        spazio: spazioResult.rows[0] || null,
        prenotazioni: prenotazioniResult.rows,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Errore nel debug prenotazioni:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel debug prenotazioni',
      details: error.message
    });
  }
}; 
