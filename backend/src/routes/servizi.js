const express = require('express');
const router = express.Router();
const serviziController = require('../controllers/serviziController');
const { authenticateToken } = require('../middleware/auth');

// ===== GESTIONE SERVIZI =====
// Ottieni tutti i servizi
router.get('/servizi', serviziController.getServizi);

// Crea un nuovo servizio (solo amministratori)
router.post('/servizi', authenticateToken, serviziController.creaServizio);

// Modifica un servizio esistente (solo amministratori)
router.put('/servizi/:id', authenticateToken, serviziController.modificaServizio);

// Elimina un servizio (solo amministratori)
router.delete('/servizi/:id', authenticateToken, serviziController.eliminaServizio);

// ===== GESTIONE SERVIZI PER SPAZI =====
// Ottieni servizi associati a uno spazio
router.get('/spazi/:id_spazio/servizi', serviziController.getServiziSpazio);

// Associa un servizio a uno spazio
router.post('/spazi/servizi', authenticateToken, serviziController.associaServizioSpazio);

// Rimuovi associazione servizio-spazio
router.delete('/spazi/:id_spazio/servizi/:id_servizio', authenticateToken, serviziController.rimuoviServizioSpazio);

module.exports = router;
