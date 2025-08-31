const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware per autenticazione e autorizzazione amministratore
router.use(authenticateToken);
router.use(requireRole('amministratore'));

// Dashboard generale
router.get('/dashboard', adminController.getDashboardGenerale);

// Gestione utenti
router.get('/utenti', adminController.getUtenti);
router.put('/utenti/:id/ruolo', adminController.updateUserRole);
router.post('/utenti/:id/sospendi', adminController.suspendUser);
router.delete('/utenti/:id', adminController.deleteUser);

// Gestione gestori
router.get('/gestori', adminController.getGestori);
router.post('/gestori', adminController.creaGestore);
router.post('/gestori/:id/sospendi', adminController.sospendiGestore);
router.delete('/gestori/:id', adminController.eliminaGestore);

// Gestione sedi
router.get('/sedi', adminController.getSedi);
router.post('/sedi', adminController.creaSede);
router.put('/sedi/:id', adminController.updateSede);
router.delete('/sedi/:id', adminController.eliminaSede);

// Gestione spazi
router.get('/spazi', adminController.getSpazi);
router.post('/spazi', adminController.creaSpazio);
router.put('/spazi/:id', adminController.updateSpazio);
router.delete('/spazi/:id', adminController.eliminaSpazio);

// Monitoraggio prenotazioni
router.get('/prenotazioni', adminController.getPrenotazioni);
router.get('/prenotazioni/:id', adminController.getPrenotazione);
router.put('/prenotazioni/:id', adminController.updatePrenotazione);
router.delete('/prenotazioni/:id', adminController.deletePrenotazione);

// Monitoraggio pagamenti
router.get('/pagamenti', adminController.getPagamenti);
router.get('/pagamenti/:id', adminController.getPagamento);
router.put('/pagamenti/:id', adminController.updatePagamento);

// Log sistema
router.get('/log', adminController.getLog);

// Gestione codici invito
router.get('/codici-invito', adminController.getCodiciInvito);
router.post('/codici-invito', adminController.creaCodiceInvito);
router.delete('/codici-invito/:id', adminController.eliminaCodiceInvito);

// Controllo sistema
router.get('/sistema/metriche', adminController.getSystemMetrics);
router.post('/sistema/backup', adminController.backupDatabase);
router.post('/sistema/clear-logs', adminController.clearLogs);
router.get('/sistema/status', adminController.systemStatus);
router.post('/sistema/emergency', adminController.emergencyMode);
router.put('/sistema/settings', adminController.saveSettings);

module.exports = router;
