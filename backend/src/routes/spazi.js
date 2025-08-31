const express = require('express');
const router = express.Router();
const spaziController = require('../controllers/spaziController');

// Middleware di logging per tutte le richieste
router.use((req, res, next) => {
    next();
});

// Endpoint di test
router.get('/test', spaziController.testEndpoint);

// Endpoint di test per simulare prenotazioni
router.get('/test-simulate-bookings', spaziController.testSimulateBookings);



// Endpoint pubblico per ottenere disponibilità slot (senza autenticazione)
router.get('/:id_spazio/disponibilita-slot/:data', spaziController.getDisponibilitaSlot);

module.exports = router;
