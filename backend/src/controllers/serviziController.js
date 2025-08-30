const pool = require('../db');

// ===== GESTIONE SERVIZI =====

// Ottieni tutti i servizi disponibili
exports.getServizi = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Servizio ORDER BY nome');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore server' });
    }
};

// Crea un nuovo servizio
exports.creaServizio = async (req, res) => {
    const { nome, descrizione } = req.body;

    if (!nome) {
        return res.status(400).json({ error: 'Nome del servizio è obbligatorio' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO Servizio (nome, descrizione)
       VALUES ($1, $2) RETURNING *`,
            [nome, descrizione || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Errore server' });
    }
};

// Modifica un servizio esistente
exports.modificaServizio = async (req, res) => {
    const { id } = req.params;
    const { nome, descrizione } = req.body;

    if (!nome) {
        return res.status(400).json({ error: 'Nome del servizio è obbligatorio' });
    }

    try {
        const result = await pool.query(
            `UPDATE Servizio SET nome = $1, descrizione = $2
       WHERE id_servizio = $3 RETURNING *`,
            [nome, descrizione || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Servizio non trovato' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Errore server' });
    }
};

// Elimina un servizio
exports.eliminaServizio = async (req, res) => {
    const { id } = req.params;

    try {
        // Verifica che il servizio non sia associato a nessuno spazio
        const check = await pool.query(
            'SELECT COUNT(*) FROM Spazio_Servizio WHERE id_servizio = $1',
            [id]
        );

        if (check.rows[0].count !== '0') {
            return res.status(400).json({
                error: 'Impossibile eliminare: il servizio è associato a degli spazi'
            });
        }

        const result = await pool.query('DELETE FROM Servizio WHERE id_servizio = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Servizio non trovato' });
        }

        res.json({ message: 'Servizio eliminato con successo' });
    } catch (err) {
        res.status(500).json({ error: 'Errore server' });
    }
};

// ===== GESTIONE SERVIZI PER SPAZI =====

// Ottieni servizi associati a uno spazio
exports.getServiziSpazio = async (req, res) => {
    const { id_spazio } = req.params;

    try {
        const result = await pool.query(
            `SELECT s.* FROM Servizio s
       JOIN Spazio_Servizio ss ON s.id_servizio = ss.id_servizio
       WHERE ss.id_spazio = $1
       ORDER BY s.nome`,
            [id_spazio]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore server' });
    }
};

// Associa un servizio a uno spazio
exports.associaServizioSpazio = async (req, res) => {
    const { id_spazio, id_servizio } = req.body;

    if (!id_spazio || !id_servizio) {
        return res.status(400).json({ error: 'ID spazio e ID servizio sono obbligatori' });
    }

    try {
        // Verifica che lo spazio esista
        const spazioCheck = await pool.query('SELECT id_spazio FROM Spazio WHERE id_spazio = $1', [id_spazio]);
        if (spazioCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Spazio non trovato' });
        }

        // Verifica che il servizio esista
        const servizioCheck = await pool.query('SELECT id_servizio FROM Servizio WHERE id_servizio = $1', [id_servizio]);
        if (servizioCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Servizio non trovato' });
        }

        // Inserisci l'associazione
        await pool.query(
            'INSERT INTO Spazio_Servizio (id_spazio, id_servizio) VALUES ($1, $2)',
            [id_spazio, id_servizio]
        );

        res.status(201).json({ message: 'Servizio associato allo spazio con successo' });
    } catch (err) {
        if (err.code === '23505') { // Violazione constraint unique
            return res.status(400).json({ error: 'Il servizio è già associato a questo spazio' });
        }
        res.status(500).json({ error: 'Errore server' });
    }
};

// Rimuovi associazione servizio-spazio
exports.rimuoviServizioSpazio = async (req, res) => {
    const { id_spazio, id_servizio } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM Spazio_Servizio WHERE id_spazio = $1 AND id_servizio = $2',
            [id_spazio, id_servizio]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Associazione non trovata' });
        }

        res.json({ message: 'Associazione rimossa con successo' });
    } catch (err) {
        res.status(500).json({ error: 'Errore server' });
    }
};
