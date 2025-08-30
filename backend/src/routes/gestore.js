const express = require('express');
const router = express.Router();
const gestoreController = require('../controllers/gestoreController');
const { authenticateToken } = require('../middleware/auth');

// Elenco sedi gestite
router.get('/gestore/sedi', authenticateToken, gestoreController.getSediGestore);

// Prenotazioni di tutte le sedi/spazi gestiti
router.get('/gestore/prenotazioni', authenticateToken, gestoreController.getPrenotazioniGestore);

// Reportistica
router.get('/gestore/report', authenticateToken, gestoreController.getReportGestore);

// Blocca manualmente uno spazio
router.post('/gestore/spazi/:id/blocca', authenticateToken, gestoreController.bloccaSpazio);

// ===== GESTIONE SEDI =====
// Crea una nuova sede
router.post('/gestore/sedi', authenticateToken, gestoreController.creaSede);

// Modifica una sede esistente
router.put('/gestore/sedi/:id', authenticateToken, gestoreController.modificaSede);

// Elimina una sede
router.delete('/gestore/sedi/:id', authenticateToken, gestoreController.eliminaSede);

// ===== GESTIONE SPAZI =====
// Crea un nuovo spazio
router.post('/gestore/spazi', authenticateToken, gestoreController.creaSpazio);

// Modifica un spazio esistente
router.put('/gestore/spazi/:id', authenticateToken, gestoreController.modificaSpazio);

// Elimina un spazio
router.delete('/gestore/spazi/:id', authenticateToken, gestoreController.eliminaSpazio);

module.exports = router; 