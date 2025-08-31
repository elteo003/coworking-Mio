/**
 * Middleware per gestione timer slot automatica
 * Libera automaticamente slot occupati scaduti ad ogni richiesta
 */

const pool = require('../db');
const socketService = require('../services/socketService');

/**
 * Middleware che aggiorna automaticamente gli slot scaduti
 * Viene eseguito ad ogni richiesta per mantenere lo stato aggiornato
 */
async function updateExpiredSlots(req, res, next) {
    try {
        // Esegui le funzioni di pulizia slot in parallelo
        const [freedCount, pastCount] = await Promise.all([
            freeExpiredSlots(),
            updatePastSlots()
        ]);

        // Log solo se ci sono stati cambiamenti significativi
        if (freedCount > 0 || pastCount > 0) {
            console.log(`🔄 Slot Timer: Liberati ${freedCount} slot scaduti, aggiornati ${pastCount} slot passati`);

            // Invia aggiornamenti real-time via Socket.IO se ci sono stati cambiamenti
            if (freedCount > 0) {
                // Notifica tutti gli utenti connessi che alcuni slot sono stati liberati
                socketService.broadcastToAll('slots_freed', {
                    type: 'slots_freed',
                    count: freedCount,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Aggiungi informazioni al request per debug (opzionale)
        req.slotTimerInfo = {
            freedSlots: freedCount,
            pastSlots: pastCount,
            timestamp: new Date().toISOString()
        };

        next();
    } catch (error) {
        console.error('❌ Errore nel middleware slot timer:', error);
        // Non bloccare la richiesta in caso di errore nel timer
        next();
    }
}

/**
 * Libera slot occupati scaduti
 * @returns {Promise<number>} Numero di slot liberati
 */
async function freeExpiredSlots() {
    try {
        const result = await pool.query(`
            UPDATE slots 
            SET status = 'available', 
                expires_at = NULL, 
                id_utente = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE status = 'occupied' 
            AND expires_at IS NOT NULL 
            AND expires_at < CURRENT_TIMESTAMP
            RETURNING id, id_spazio
        `);

        const freedSlots = result.rows;

        // Invia aggiornamenti real-time per ogni slot liberato
        freedSlots.forEach(slot => {
            socketService.broadcastSlotUpdate(slot.id, 'available', {
                id: slot.id,
                id_spazio: slot.id_spazio,
                status: 'available'
            });
        });

        return result.rowCount;
    } catch (error) {
        console.error('❌ Errore nel liberare slot scaduti:', error);
        return 0;
    }
}

/**
 * Aggiorna slot passati
 * @returns {Promise<number>} Numero di slot aggiornati
 */
async function updatePastSlots() {
    try {
        const result = await pool.query(`
            UPDATE slots 
            SET status = 'past',
                updated_at = CURRENT_TIMESTAMP
            WHERE status IN ('available', 'occupied') 
            AND end_time < CURRENT_TIMESTAMP
            RETURNING id
        `);

        return result.rowCount;
    } catch (error) {
        console.error('❌ Errore nell\'aggiornare slot passati:', error);
        return 0;
    }
}

/**
 * Crea slot per un giorno specifico
 * @param {number} idSpazio - ID dello spazio
 * @param {string} date - Data in formato YYYY-MM-DD
 * @param {number} startHour - Ora di inizio (default: 9)
 * @param {number} endHour - Ora di fine (default: 18)
 * @returns {Promise<number>} Numero di slot creati
 */
async function createDailySlots(idSpazio, date, startHour = 9, endHour = 18) {
    try {
        // Pulisci slot esistenti per questa data e spazio
        await pool.query(`
            DELETE FROM slots 
            WHERE id_spazio = $1 
            AND DATE(start_time) = $2
        `, [idSpazio, date]);

        let slotsCreated = 0;

        // Crea slot per ogni ora
        for (let hour = startHour; hour < endHour; hour++) {
            const startTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`);
            const endTime = new Date(`${date}T${(hour + 1).toString().padStart(2, '0')}:00:00`);

            const status = startTime < new Date() ? 'past' : 'available';

            await pool.query(`
                INSERT INTO slots (id_spazio, start_time, end_time, status)
                VALUES ($1, $2, $3, $4)
            `, [idSpazio, startTime, endTime, status]);

            slotsCreated++;
        }

        return slotsCreated;
    } catch (error) {
        console.error('❌ Errore nella creazione slot giornalieri:', error);
        throw error;
    }
}

/**
 * Occupa uno slot per un periodo limitato (15 minuti)
 * @param {number} slotId - ID dello slot
 * @param {number} userId - ID dell'utente
 * @returns {Promise<boolean>} Successo dell'operazione
 */
async function holdSlot(slotId, userId) {
    try {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minuti da ora

        const result = await pool.query(`
            UPDATE slots 
            SET status = 'occupied',
                expires_at = $1,
                id_utente = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 
            AND status = 'available'
            AND start_time > CURRENT_TIMESTAMP
            RETURNING id, id_spazio
        `, [expiresAt, userId, slotId]);

        if (result.rowCount > 0) {
            const slot = result.rows[0];
            // Invia aggiornamento real-time
            socketService.broadcastSlotUpdate(slotId, 'occupied', {
                id: slot.id,
                id_spazio: slot.id_spazio,
                status: 'occupied',
                expires_at: expiresAt,
                id_utente: userId
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Errore nell\'occupare slot:', error);
        return false;
    }
}

/**
 * Conferma prenotazione di uno slot (da occupied a booked)
 * @param {number} slotId - ID dello slot
 * @param {number} userId - ID dell'utente
 * @returns {Promise<boolean>} Successo dell'operazione
 */
async function bookSlot(slotId, userId) {
    try {
        const result = await pool.query(`
            UPDATE slots 
            SET status = 'booked',
                held_until = NULL,
                id_utente = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 
            AND status = 'occupied'
            AND id_utente = $1
            RETURNING id
        `, [userId, slotId]);

        return result.rowCount > 0;
    } catch (error) {
        console.error('❌ Errore nella conferma prenotazione slot:', error);
        return false;
    }
}

/**
 * Libera uno slot (da occupied a available)
 * @param {number} slotId - ID dello slot
 * @param {number} userId - ID dell'utente
 * @returns {Promise<boolean>} Successo dell'operazione
 */
async function releaseSlot(slotId, userId) {
    try {
        const result = await pool.query(`
            UPDATE slots 
            SET status = 'available',
                held_until = NULL,
                id_utente = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 
            AND status = 'occupied'
            AND id_utente = $2
            RETURNING id
        `, [slotId, userId]);

        return result.rowCount > 0;
    } catch (error) {
        console.error('❌ Errore nel liberare slot:', error);
        return false;
    }
}

/**
 * Ottieni stato di tutti gli slot per uno spazio e data
 * @param {number} idSpazio - ID dello spazio
 * @param {string} date - Data in formato YYYY-MM-DD
 * @returns {Promise<Array>} Array di slot con stato
 */
async function getSlotsStatus(idSpazio, date) {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                id_spazio,
                start_time,
                end_time,
                status,
                held_until,
                id_utente,
                EXTRACT(HOUR FROM start_time) as hour,
                CASE 
                    WHEN held_until IS NOT NULL AND held_until > CURRENT_TIMESTAMP 
                    THEN EXTRACT(EPOCH FROM (held_until - CURRENT_TIMESTAMP))::INTEGER
                    ELSE NULL 
                END as seconds_until_expiry
            FROM slots 
            WHERE id_spazio = $1 
            AND DATE(start_time) = $2
            ORDER BY start_time
        `, [idSpazio, date]);

        return result.rows;
    } catch (error) {
        console.error('❌ Errore nel recuperare stato slot:', error);
        throw error;
    }
}

/**
 * Avvia il timer automatico per la pulizia slot
 * Esegue la pulizia ogni 30 secondi
 */
function startSlotTimer() {
    console.log('🕐 Avvio timer automatico slot...');

    setInterval(async () => {
        try {
            const [freedCount, pastCount] = await Promise.all([
                freeExpiredSlots(),
                updatePastSlots()
            ]);

            if (freedCount > 0 || pastCount > 0) {
                console.log(`⏰ Timer Slot: Liberati ${freedCount} slot scaduti, aggiornati ${pastCount} slot passati`);
            }
        } catch (error) {
            console.error('❌ Errore nel timer automatico slot:', error);
        }
    }, 30000); // 30 secondi
}

module.exports = {
    updateExpiredSlots,
    freeExpiredSlots,
    updatePastSlots,
    createDailySlots,
    holdSlot,
    bookSlot,
    releaseSlot,
    getSlotsStatus,
    startSlotTimer
};
