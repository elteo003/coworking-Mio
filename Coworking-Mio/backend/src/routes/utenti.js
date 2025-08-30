const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/utenti - Lista utenti per sede (per gestori)
router.get('/', async (req, res) => {
    try {
        const { sede, tipo } = req.query;

        console.log('👥 Utenti - Richiesta:', { sede, tipo });

        let utentiQuery = 'SELECT u.* FROM Utente u';
        let params = [];

        if (sede && tipo === 'responsabile') {
            // Per gestori: mostra utenti che hanno prenotazioni nella sede
            utentiQuery = `
                SELECT DISTINCT u.* 
                FROM Utente u
                JOIN Prenotazione p ON u.id_utente = p.id_utente
                JOIN Spazio s ON p.id_spazio = s.id_spazio
                WHERE s.id_sede = $1
                ORDER BY u.cognome, u.nome
            `;
            params = [sede];
        } else {
            // Per admin: mostra tutti gli utenti
            utentiQuery = 'SELECT * FROM Utente ORDER BY cognome, nome';
        }

        // Query per le statistiche utenti
        let statsQuery = '';
        let statsParams = [];

        if (sede && tipo === 'responsabile') {
            // Statistiche per sede specifica
            statsQuery = `
                SELECT 
                    COUNT(DISTINCT u.id_utente) as totali,
                    COUNT(DISTINCT CASE 
                        WHEN p.data_inizio >= DATE_TRUNC('month', CURRENT_DATE) 
                        THEN u.id_utente 
                    END) as attivi_mese,
                    COUNT(DISTINCT CASE 
                        WHEN u.id_utente <= 10 
                        THEN u.id_utente 
                    END) as nuovi_mese,
                    COUNT(DISTINCT CASE 
                        WHEN u.ruolo = 'premium' 
                        THEN u.id_utente 
                    END) as premium
                FROM Utente u
                LEFT JOIN Prenotazione p ON u.id_utente = p.id_utente
                LEFT JOIN Spazio s ON p.id_spazio = s.id_spazio
                WHERE s.id_sede = $1 OR s.id_sede IS NULL
            `;
            statsParams = [sede];
        } else {
            // Statistiche globali
            statsQuery = `
                SELECT 
                    COUNT(*) as totali,
                    COUNT(CASE 
                        WHEN EXISTS(
                            SELECT 1 FROM Prenotazione p 
                            WHERE p.id_utente = u.id_utente 
                            AND p.data_inizio >= DATE_TRUNC('month', CURRENT_DATE)
                        ) 
                        THEN 1 
                    END) as attivi_mese,
                    COUNT(CASE 
                        WHEN u.id_utente <= 10 
                        THEN 1 
                    END) as nuovi_mese,
                    COUNT(CASE 
                        WHEN u.ruolo = 'premium' 
                        THEN 1 
                    END) as premium
                FROM Utente u
            `;
        }

        const [utentiResult, statsResult] = await Promise.all([
            pool.query(utentiQuery, params),
            pool.query(statsQuery, statsParams)
        ]);

        const response = {
            utenti: utentiResult.rows,
            stats: {
                totali: parseInt(statsResult.rows[0]?.totali || 0),
                attivi_mese: parseInt(statsResult.rows[0]?.attivi_mese || 0),
                nuovi_mese: parseInt(statsResult.rows[0]?.nuovi_mese || 0),
                premium: parseInt(statsResult.rows[0]?.premium || 0)
            }
        };

        console.log('✅ Utenti - Dati preparati:', {
            utenti: utentiResult.rows.length,
            stats: response.stats
        });

        res.json(response);
    } catch (error) {
        console.error('❌ Errore nel recupero degli utenti:', error);
        res.status(500).json({ error: 'Errore interno del server: ' + error.message });
    }
});

// GET /api/utenti/:id - Dettagli di un utente specifico
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM utente WHERE id_utente = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Errore nel recupero dell\'utente:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

module.exports = router;


