const express = require('express');
const router = express.Router();
const SSEController = require('../controllers/sseController');

// Endpoint per connessione SSE per notifiche slot
router.get('/events', (req, res) => {
    console.log('🔔 Nuova connessione SSE per notifiche slot');
    SSEController.initConnection(req, res);
});

// Endpoint per ottenere stato corrente degli slot
router.get('/status/:sedeId/:spazioId/:data', async (req, res) => {
    try {
        const { sedeId, spazioId, data } = req.params;

        console.log(`🔍 Richiesta stato slot per sede: ${sedeId}, spazio: ${spazioId}, data: ${data}`);

        const slotsStatus = await SSEController.getSlotsStatus(sedeId, spazioId, data);

        res.json({
            success: true,
            data: {
                sedeId: parseInt(sedeId),
                spazioId: parseInt(spazioId),
                data: data,
                slots: slotsStatus
            }
        });

    } catch (error) {
        console.error('❌ Errore nel recupero stato slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero stato slot',
            details: error.message
        });
    }
});

// Endpoint per forzare aggiornamento slot (per testing)
router.post('/refresh/:sedeId/:spazioId/:data', async (req, res) => {
    try {
        const { sedeId, spazioId, data } = req.params;

        console.log(`🔄 Forzando aggiornamento slot per sede: ${sedeId}, spazio: ${spazioId}, data: ${data}`);

        const slotsStatus = await SSEController.getSlotsStatus(sedeId, spazioId, data);

        // Invia notifica a tutti i client connessi
        SSEController.broadcastSlotsStatusUpdate(sedeId, spazioId, data, slotsStatus);

        res.json({
            success: true,
            message: 'Aggiornamento slot inviato a tutti i client',
            data: {
                sedeId: parseInt(sedeId),
                spazioId: parseInt(spazioId),
                data: data,
                slots: slotsStatus
            }
        });

    } catch (error) {
        console.error('❌ Errore nell\'aggiornamento slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nell\'aggiornamento slot',
            details: error.message
        });
    }
});

// Endpoint di debug per analizzare prenotazioni
router.get('/debug/:sedeId/:spazioId/:data', async (req, res) => {
    try {
        const { sedeId, spazioId, data } = req.params;
        const pool = require('../db');

        console.log(`🔍 Debug slot per sede: ${sedeId}, spazio: ${spazioId}, data: ${data}`);

        // Query per ottenere tutte le prenotazioni per questo spazio e data
        const prenotazioniQuery = `
            SELECT 
                p.id_prenotazione,
                p.data_inizio,
                p.data_fine,
                p.stato,
                EXTRACT(HOUR FROM p.data_inizio) as orario_inizio,
                EXTRACT(HOUR FROM p.data_fine) as orario_fine,
                u.nome,
                u.cognome
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

        // Ottieni stato slot calcolato
        const slotsStatus = await SSEController.getSlotsStatus(sedeId, spazioId, data);

        res.json({
            success: true,
            debug: {
                sedeId: parseInt(sedeId),
                spazioId: parseInt(spazioId),
                data: data,
                spazio: spazioResult.rows[0] || null,
                prenotazioni: prenotazioniResult.rows,
                slotsStatus: slotsStatus,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Errore nel debug slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel debug slot',
            details: error.message
        });
    }
});

module.exports = router;
