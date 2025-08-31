const pool = require('../db');

// Controller per le statistiche dashboard
const getDashboardStats = async (req, res) => {
    try {
        const { tipo, sede } = req.query;
        const userId = req.user?.id_utente;


        // Verifica che l'utente sia gestore o amministratore
        if (tipo !== 'responsabile') {
            return res.status(403).json({ error: 'Accesso negato. Solo responsabili possono accedere.' });
        }

        let sedeFilter = '';
        let params = [];

        // Migliorato controllo sede - accetta anche "0" e valori falsy
        if (sede !== undefined && sede !== null && sede !== '') {
            sedeFilter = `AND s.id_sede = $1`;
            params = [sede];
        }

        // Query per statistiche prenotazioni (usando nomi tabelle corretti)
        const prenotazioniQuery = `
            SELECT 
                COUNT(*) as prenotazioni_oggi,
                COUNT(DISTINCT p.id_utente) as utenti_attivi
            FROM prenotazione p
            JOIN spazio s ON p.id_spazio = s.id_spazio
            WHERE DATE(p.data_inizio) = CURRENT_DATE
            ${sedeFilter}
        `;

        // Query per fatturato giornaliero
        const fatturatoQuery = `
            SELECT COALESCE(SUM(pa.importo), 0) as fatturato_giorno
            FROM prenotazione p
            JOIN spazio s ON p.id_spazio = s.id_spazio
            JOIN pagamento pa ON p.id_prenotazione = pa.id_prenotazione
            WHERE DATE(p.data_inizio) = CURRENT_DATE
            AND p.stato = 'confermata'
            AND pa.stato = 'pagato'
            ${sedeFilter}
        `;

        // Query per occupazione media - Semplificata senza generate_series
        const occupazioneQuery = `
            SELECT 
                ROUND(
                    (COUNT(CASE WHEN p.id_prenotazione IS NOT NULL THEN 1 END) * 100.0 / 
                    GREATEST(COUNT(s.id_spazio), 1)), 2
                ) as occupazione_media
            FROM spazio s
            LEFT JOIN prenotazione p ON s.id_spazio = p.id_spazio 
                AND CURRENT_DATE BETWEEN DATE(p.data_inizio) AND DATE(p.data_fine)
                AND p.stato = 'confermata'
            ${sedeFilter}
        `;


        try {
            const [prenotazioniResult, fatturatoResult, occupazioneResult] = await Promise.all([
                pool.query(prenotazioniQuery, params),
                pool.query(fatturatoQuery, params),
                pool.query(occupazioneQuery, params)
            ]);

        } catch (queryError) {
            console.error('❌ Dashboard Stats - Errore esecuzione query:', queryError);
            throw queryError;
        }

        const stats = {
            prenotazioni_oggi: parseInt(prenotazioniResult.rows[0]?.prenotazioni_oggi || 0),
            utenti_attivi: parseInt(prenotazioniResult.rows[0]?.utenti_attivi || 0),
            fatturato_giorno: parseFloat(fatturatoResult.rows[0]?.fatturato_giorno || 0),
            occupazione_media: parseFloat(occupazioneResult.rows[0]?.occupazione_media || 0)
        };

        res.json(stats);

    } catch (error) {
        console.error('❌ Errore Dashboard Stats:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// Controller per i grafici dashboard
const getDashboardCharts = async (req, res) => {
    try {
        const { tipo, sede, periodo = 7 } = req.query;
        const userId = req.user?.id_utente;


        if (tipo !== 'responsabile') {
            return res.status(403).json({ error: 'Accesso negato' });
        }

        let sedeFilter = '';
        let params = [];

        // Migliorato controllo sede
        if (sede !== undefined && sede !== null && sede !== '') {
            sedeFilter = `AND s.id_sede = $1`;
            params = [sede];
        }

        // Query per prenotazioni ultimi N giorni
        const prenotazioniQuery = `
            SELECT 
                DATE(p.data_inizio) as data,
                COUNT(*) as count
            FROM prenotazione p
            JOIN spazio s ON p.id_spazio = s.id_spazio
            WHERE p.data_inizio >= CURRENT_DATE - INTERVAL '${periodo} days'
            AND p.stato = 'confermata'
            ${sedeFilter}
            GROUP BY DATE(p.data_inizio)
            ORDER BY data
        `;

        // Query per occupazione per spazio - Semplificata senza generate_series
        const occupazioneQuery = `
            SELECT 
                s.nome,
                ROUND(
                    (COUNT(CASE WHEN p.id_prenotazione IS NOT NULL THEN 1 END) * 100.0 / 
                    GREATEST(COUNT(s.id_spazio), 1)), 2
                ) as occupazione
            FROM spazio s
            LEFT JOIN prenotazione p ON s.id_spazio = p.id_spazio 
                AND CURRENT_DATE BETWEEN DATE(p.data_inizio) AND DATE(p.data_fine)
                AND p.stato = 'confermata'
            ${sedeFilter}
            GROUP BY s.id_spazio, s.nome
            ORDER BY occupazione DESC
        `;

        const [prenotazioniResult, occupazioneResult] = await Promise.all([
            pool.query(prenotazioniQuery, params),
            pool.query(occupazioneQuery, params)
        ]);

        // Prepara dati per i grafici
        const chartsData = {
            prenotazioni: {
                labels: prenotazioniResult.rows.map(row => {
                    const date = new Date(row.data);
                    return date.toLocaleDateString('it-IT', { weekday: 'short' });
                }),
                data: prenotazioniResult.rows.map(row => parseInt(row.count))
            },
            occupazione: {
                labels: occupazioneResult.rows.map(row => row.nome),
                data: occupazioneResult.rows.map(row => parseFloat(row.occupazione))
            }
        };

        res.json(chartsData);

    } catch (error) {
        console.error('❌ Errore Dashboard Charts:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

// Controller per le attività recenti dashboard
const getDashboardActivity = async (req, res) => {
    try {
        const { tipo, sede, limit = 10 } = req.query;
        const userId = req.user?.id_utente;


        if (tipo !== 'responsabile') {
            return res.status(403).json({ error: 'Accesso negato' });
        }

        let sedeFilter = '';
        let params = [];

        // Migliorato controllo sede
        if (sede !== undefined && sede !== null && sede !== '') {
            sedeFilter = `AND s.id_sede = $1`;
            params = [sede, parseInt(limit)];
        } else {
            params = [parseInt(limit)];
        }

        // Query per attività recenti - Semplificata
        const activityQuery = `
            SELECT 
                'prenotazione' as tipo,
                CONCAT('Nuova prenotazione per ', s.nome) as descrizione,
                p.data_creazione as timestamp
            FROM prenotazione p
            JOIN spazio s ON p.id_spazio = s.id_spazio
            WHERE p.stato = 'confermata'
            ${sedeFilter}
            
            UNION ALL
            
            SELECT 
                'pagamento' as tipo,
                CONCAT('Pagamento completato per prenotazione #', p.id_prenotazione) as descrizione,
                pa.data_pagamento as timestamp
            FROM prenotazione p
            JOIN spazio s ON p.id_spazio = s.id_spazio
            JOIN pagamento pa ON p.id_prenotazione = pa.id_prenotazione
            WHERE p.stato = 'confermata' AND pa.stato = 'pagato'
            ${sedeFilter}
            
            ORDER BY timestamp DESC
            LIMIT ${sede !== undefined && sede !== null && sede !== '' ? '$2' : '$1'}
        `;

        const result = await pool.query(activityQuery, params);

        const activities = result.rows.map(row => ({
            tipo: row.tipo,
            descrizione: row.descrizione,
            timestamp: row.timestamp
        }));

        res.json(activities);

    } catch (error) {
        console.error('❌ Errore Dashboard Activity:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

module.exports = {
    getDashboardStats,
    getDashboardCharts,
    getDashboardActivity
};
