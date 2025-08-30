const express = require('express');
const router = express.Router();

// GET /api/ab-testing/assignment - Assegnazione variante per utente
router.post('/assignment', async (req, res) => {
    try {
        const { test_name, user_id } = req.body;

        // Logica semplice per assegnazione variante
        const variants = ['Controllo', 'Variante A', 'Variante B'];
        const randomVariant = variants[Math.floor(Math.random() * variants.length)];

        res.json({
            test_name,
            user_id,
            variant: randomVariant,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Errore nell\'assegnazione variante:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// GET /api/ab-testing/results - Risultati dei test
router.get('/results', async (req, res) => {
    try {
        const { test_name } = req.query;

        // Dati di esempio per i risultati
        const results = {
            test_name: test_name || 'Test Pulsante CTA',
            variants: {
                'Controllo': { impressions: 150, conversions: 15, rate: 10.0 },
                'Variante A': { impressions: 145, conversions: 18, rate: 12.4 },
                'Variante B': { impressions: 148, conversions: 16, rate: 10.8 }
            },
            total_impressions: 443,
            total_conversions: 49,
            overall_rate: 11.1,
            timestamp: new Date().toISOString()
        };

        res.json(results);
    } catch (error) {
        console.error('Errore nel recupero risultati:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// POST /api/ab-testing/goal - Registra il raggiungimento di un obiettivo
router.post('/goal', async (req, res) => {
    try {
        const { test_name, goal_type, user_id, variant } = req.body;

        console.log('🎯 A/B Test Goal raggiunto:', test_name, '-', goal_type, req.body);

        // Qui potresti salvare i dati in un database per analisi
        // Per ora restituiamo solo una conferma

        res.json({
            success: true,
            test_name,
            goal_type,
            user_id,
            variant,
            timestamp: new Date().toISOString(),
            message: 'Goal registrato con successo'
        });
    } catch (error) {
        console.error('Errore nel registrare goal:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

module.exports = router;


