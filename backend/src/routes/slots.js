/**
 * Route per gestione slot con timer automatico
 */

const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { authenticateToken } = require('../middleware/auth');

// Endpoint pubblici (non richiedono autenticazione)
router.get('/test', slotController.testSlots);
router.get('/:idSpazio/:date', slotController.getSlotsStatus);

// Endpoint protetti (richiedono autenticazione)
router.post('/:id/hold', authenticateToken, slotController.holdSlot);
router.post('/:id/book', authenticateToken, slotController.bookSlot);
router.post('/:id/release', authenticateToken, slotController.releaseSlot);
router.post('/create-daily', authenticateToken, slotController.createDailySlots);

module.exports = router;
