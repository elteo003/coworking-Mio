const pool = require('../db');
const SSEController = require('../controllers/sseController');

class SlotTimerService {
    // Timer attivi per slot in attesa
    static activeTimers = new Map();

    // Avvia timer per uno slot in attesa
    static startTimer(prenotazioneId, idSpazio, dataInizio, dataFine, sedeId) {
        console.log(`⏰ Avvio timer per prenotazione ${prenotazioneId} (slot in attesa)`);

        // Calcola timeout (15 minuti)
        const timeoutMs = 15 * 60 * 1000; // 15 minuti

        // Crea timer
        const timer = setTimeout(async () => {
            try {
                await this.handleSlotExpiration(prenotazioneId, idSpazio, dataInizio, dataFine, sedeId);
            } catch (error) {
                console.error('❌ Errore nella gestione scadenza slot:', error);
            }
        }, timeoutMs);

        // Salva timer
        this.activeTimers.set(prenotazioneId, {
            timer: timer,
            idSpazio: idSpazio,
            dataInizio: dataInizio,
            dataFine: dataFine,
            sedeId: sedeId,
            startTime: new Date(),
            expiresAt: new Date(Date.now() + timeoutMs)
        });

        console.log(`✅ Timer avviato per prenotazione ${prenotazioneId}, scadenza: ${new Date(Date.now() + timeoutMs).toLocaleString()}`);

        // Invia notifica immediata che lo slot è in attesa
        this.notifySlotOccupied(prenotazioneId, idSpazio, sedeId, 15);
    }

    // Gestisce la scadenza di uno slot
    static async handleSlotExpiration(prenotazioneId, idSpazio, dataInizio, dataFine, sedeId) {
        try {
            console.log(`⏰ Gestione scadenza slot per prenotazione ${prenotazioneId}`);

            // Verifica se la prenotazione è ancora in attesa
            const prenotazioneResult = await pool.query(
                'SELECT stato FROM Prenotazione WHERE id_prenotazione = $1',
                [prenotazioneId]
            );

            if (prenotazioneResult.rows.length === 0) {
                console.log(`⚠️ Prenotazione ${prenotazioneId} non trovata, rimuovo timer`);
                this.activeTimers.delete(prenotazioneId);
                return;
            }

            const stato = prenotazioneResult.rows[0].stato;

            if (stato === 'in attesa') {
                // Aggiorna stato a "scaduta"
                await pool.query(
                    'UPDATE Prenotazione SET stato = $1, data_modifica = CURRENT_TIMESTAMP WHERE id_prenotazione = $2',
                    ['scaduta', prenotazioneId]
                );

                console.log(`✅ Prenotazione ${prenotazioneId} marcata come scaduta`);

                // Notifica che lo slot è tornato disponibile
                await this.notifySlotAvailable(prenotazioneId, idSpazio, sedeId, dataInizio);

            } else {
                console.log(`ℹ️ Prenotazione ${prenotazioneId} non più in attesa (stato: ${stato}), rimuovo timer`);
            }

            // Rimuovi timer
            this.activeTimers.delete(prenotazioneId);

        } catch (error) {
            console.error('❌ Errore nella gestione scadenza slot:', error);
            this.activeTimers.delete(prenotazioneId);
        }
    }

    // Notifica che uno slot è occupato
    static notifySlotOccupied(prenotazioneId, idSpazio, sedeId, minutesRemaining) {
        const update = {
            type: 'slot_occupied',
            prenotazioneId: prenotazioneId,
            idSpazio: idSpazio,
            sedeId: sedeId,
            status: 'occupied',
            minutesRemaining: minutesRemaining,
            message: `Slot occupato - scadenza in ${minutesRemaining} minuti`,
            timestamp: new Date().toISOString()
        };

        SSEController.broadcastUpdate(update);
        console.log(`🔔 Notifica slot occupato inviata per prenotazione ${prenotazioneId}`);
    }

    // Notifica che uno slot è tornato disponibile
    static async notifySlotAvailable(prenotazioneId, idSpazio, sedeId, dataInizio) {
        try {
            // Ottieni data per il refresh degli slot
            const data = dataInizio.split('T')[0]; // Estrai solo la data

            // Ottieni stato aggiornato degli slot
            const slotsStatus = await SSEController.getSlotsStatus(sedeId, idSpazio, data);

            const update = {
                type: 'slot_available',
                prenotazioneId: prenotazioneId,
                idSpazio: idSpazio,
                sedeId: sedeId,
                status: 'available',
                message: 'Slot tornato disponibile',
                slotsStatus: slotsStatus,
                timestamp: new Date().toISOString()
            };

            SSEController.broadcastUpdate(update);
            console.log(`🔔 Notifica slot disponibile inviata per prenotazione ${prenotazioneId}`);

        } catch (error) {
            console.error('❌ Errore nella notifica slot disponibile:', error);
        }
    }

    // Cancella timer per una prenotazione (quando viene confermata)
    static cancelTimer(prenotazioneId) {
        const timerData = this.activeTimers.get(prenotazioneId);

        if (timerData) {
            clearTimeout(timerData.timer);
            this.activeTimers.delete(prenotazioneId);
            console.log(`✅ Timer cancellato per prenotazione ${prenotazioneId}`);

            // Notifica che lo slot è stato confermato
            const update = {
                type: 'slot_confirmed',
                prenotazioneId: prenotazioneId,
                idSpazio: timerData.idSpazio,
                sedeId: timerData.sedeId,
                status: 'booked',
                message: 'Slot confermato',
                timestamp: new Date().toISOString()
            };

            SSEController.broadcastUpdate(update);
            console.log(`🔔 Notifica slot confermato inviata per prenotazione ${prenotazioneId}`);
        }
    }

    // Ottieni stato di tutti i timer attivi
    static getActiveTimers() {
        const timers = [];

        this.activeTimers.forEach((timerData, prenotazioneId) => {
            const remainingMs = timerData.expiresAt.getTime() - Date.now();
            const remainingMinutes = Math.max(0, Math.ceil(remainingMs / (60 * 1000)));

            timers.push({
                prenotazioneId: prenotazioneId,
                idSpazio: timerData.idSpazio,
                sedeId: timerData.sedeId,
                startTime: timerData.startTime,
                expiresAt: timerData.expiresAt,
                remainingMinutes: remainingMinutes,
                isExpired: remainingMs <= 0
            });
        });

        return timers;
    }

    // Pulisci timer scaduti
    static cleanupExpiredTimers() {
        const now = Date.now();
        const expiredTimers = [];

        this.activeTimers.forEach((timerData, prenotazioneId) => {
            if (timerData.expiresAt.getTime() <= now) {
                expiredTimers.push(prenotazioneId);
            }
        });

        expiredTimers.forEach(prenotazioneId => {
            console.log(`🧹 Rimozione timer scaduto per prenotazione ${prenotazioneId}`);
            this.activeTimers.delete(prenotazioneId);
        });

        if (expiredTimers.length > 0) {
            console.log(`🧹 Rimossi ${expiredTimers.length} timer scaduti`);
        }
    }
}

// Pulisci timer scaduti ogni 5 minuti
setInterval(() => {
    SlotTimerService.cleanupExpiredTimers();
}, 5 * 60 * 1000);

module.exports = SlotTimerService;
