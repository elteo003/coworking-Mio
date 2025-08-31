/**
 * Controller per gestione slot con timer automatico
 */

const slotTimer = require('../middleware/slotTimer');
const { authenticateToken } = require('../middleware/auth');
const socketService = require('../services/socketService');

/**
 * Ottieni stato di tutti gli slot per uno spazio e data
 * GET /api/slots/:idSpazio/:date
 */
async function getSlotsStatus(req, res) {
    try {
        const { idSpazio, date } = req.params;

        // Valida parametri
        if (!idSpazio || !date) {
            return res.status(400).json({
                success: false,
                error: 'Parametri idSpazio e date richiesti'
            });
        }

        // Valida formato data
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Formato data non valido. Usa YYYY-MM-DD'
            });
        }

        const slots = await slotTimer.getSlotsStatus(parseInt(idSpazio), date);

        res.json({
            success: true,
            data: {
                slots: slots,
                count: slots.length,
                date: date,
                idSpazio: parseInt(idSpazio)
            }
        });

    } catch (error) {
        console.error('❌ Errore nel recuperare stato slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Occupa uno slot per 15 minuti
 * POST /api/slots/:id/hold
 */
async function holdSlot(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id_utente;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'ID slot richiesto'
            });
        }

        const success = await slotTimer.holdSlot(parseInt(id), userId);

        if (success) {
            // Ottieni dati aggiornati dello slot
            const slots = await slotTimer.getSlotsStatus(req.body.idSpazio || 1, req.body.date || new Date().toISOString().split('T')[0]);
            const updatedSlot = slots.find(slot => slot.id === parseInt(id));

            // Invia aggiornamento real-time via Socket.IO
            if (updatedSlot && req.body.idSpazio && req.body.sedeId) {
                socketService.broadcastSlotUpdate(req.body.idSpazio, req.body.sedeId, updatedSlot);
            }

            res.json({
                success: true,
                message: 'Slot occupato per 15 minuti',
                data: {
                    slotId: parseInt(id),
                    heldUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString()
                }
            });
        } else {
            res.status(409).json({
                success: false,
                error: 'Slot non disponibile o già occupato'
            });
        }

    } catch (error) {
        console.error('❌ Errore nell\'occupare slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Conferma prenotazione di uno slot
 * POST /api/slots/:id/book
 */
async function bookSlot(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id_utente;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'ID slot richiesto'
            });
        }

        const success = await slotTimer.bookSlot(parseInt(id), userId);

        if (success) {
            res.json({
                success: true,
                message: 'Slot prenotato con successo',
                data: {
                    slotId: parseInt(id),
                    status: 'booked'
                }
            });
        } else {
            res.status(409).json({
                success: false,
                error: 'Slot non disponibile per la prenotazione'
            });
        }

    } catch (error) {
        console.error('❌ Errore nella prenotazione slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Libera uno slot occupato
 * POST /api/slots/:id/release
 */
async function releaseSlot(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id_utente;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'ID slot richiesto'
            });
        }

        const success = await slotTimer.releaseSlot(parseInt(id), userId);

        if (success) {
            res.json({
                success: true,
                message: 'Slot liberato con successo',
                data: {
                    slotId: parseInt(id),
                    status: 'available'
                }
            });
        } else {
            res.status(409).json({
                success: false,
                error: 'Slot non può essere liberato'
            });
        }

    } catch (error) {
        console.error('❌ Errore nel liberare slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Crea slot per un giorno specifico
 * POST /api/slots/create-daily
 */
async function createDailySlots(req, res) {
    try {
        const { idSpazio, date, startHour = 9, endHour = 18 } = req.body;

        if (!idSpazio || !date) {
            return res.status(400).json({
                success: false,
                error: 'Parametri idSpazio e date richiesti'
            });
        }

        // Valida formato data
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Formato data non valido. Usa YYYY-MM-DD'
            });
        }

        const slotsCreated = await slotTimer.createDailySlots(
            parseInt(idSpazio),
            date,
            parseInt(startHour),
            parseInt(endHour)
        );

        res.json({
            success: true,
            message: `Creati ${slotsCreated} slot per il ${date}`,
            data: {
                slotsCreated: slotsCreated,
                date: date,
                idSpazio: parseInt(idSpazio),
                startHour: parseInt(startHour),
                endHour: parseInt(endHour)
            }
        });

    } catch (error) {
        console.error('❌ Errore nella creazione slot giornalieri:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Endpoint di test per il sistema slot
 * GET /api/slots/test
 */
async function testSlots(req, res) {
    try {
        const testDate = new Date().toISOString().split('T')[0];
        const testSpazio = 1; // ID spazio di test

        const slots = await slotTimer.getSlotsStatus(testSpazio, testDate);

        res.json({
            success: true,
            message: 'Sistema slot funzionante',
            data: {
                testDate: testDate,
                testSpazio: testSpazio,
                slotsCount: slots.length,
                slots: slots.slice(0, 3), // Mostra solo i primi 3 per brevità
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Errore nel test slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel test del sistema slot'
        });
    }
}

module.exports = {
    getSlotsStatus,
    holdSlot,
    bookSlot,
    releaseSlot,
    createDailySlots,
    testSlots
};
