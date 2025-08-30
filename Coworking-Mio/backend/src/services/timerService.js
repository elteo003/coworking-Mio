const pool = require('../db');
const SSEController = require('../controllers/sseController');

/**
 * Servizio per gestire timer automatici delle prenotazioni
 * Quando una prenotazione viene creata in stato 'in attesa',
 * viene avviato un timer di 15 minuti che scade automaticamente
 * e libera lo slot, notificando tutti i client via SSE
 */
class TimerService {
    // Timer attivi per prenotazione
    static activeTimers = new Map();

    /**
     * Avvia un timer per una prenotazione in attesa
     * @param {number} prenotazioneId - ID della prenotazione
     * @param {number} spazioId - ID dello spazio
     * @param {string} dataInizio - Data di inizio prenotazione
     * @param {string} dataFine - Data di fine prenotazione
     */
    static startTimer(prenotazioneId, spazioId, dataInizio, dataFine) {
        console.log(`⏰ Avvio timer per prenotazione ${prenotazioneId} (15 minuti)`);

        // Cancella timer esistente se presente
        this.cancelTimer(prenotazioneId);

        // Avvia nuovo timer di 15 minuti (900000 ms)
        const timer = setTimeout(async () => {
            try {
                console.log(`⏰ Timer scaduto per prenotazione ${prenotazioneId} - libero lo slot`);

                // Verifica che la prenotazione sia ancora in attesa
                const prenotazioneResult = await pool.query(
                    'SELECT stato FROM Prenotazione WHERE id_prenotazione = $1',
                    [prenotazioneId]
                );

                if (prenotazioneResult.rows.length === 0) {
                    console.log(`⚠️ Prenotazione ${prenotazioneId} non trovata, timer annullato`);
                    return;
                }

                const statoAttuale = prenotazioneResult.rows[0].stato;

                // Se la prenotazione è già stata pagata o cancellata, non fare nulla
                if (statoAttuale === 'confermata' || statoAttuale === 'cancellata') {
                    console.log(`✅ Prenotazione ${prenotazioneId} già ${statoAttuale}, timer annullato`);
                    return;
                }

                // Aggiorna stato a 'scaduta'
                await pool.query(
                    'UPDATE Prenotazione SET stato = $1 WHERE id_prenotazione = $2',
                    ['scaduta', prenotazioneId]
                );

                console.log(`🔓 Slot liberato per prenotazione scaduta ${prenotazioneId}`);

                // Ottieni informazioni sulla sede per le notifiche
                const sedeInfo = await pool.query(
                    `SELECT s.id_sede, s.id_spazio 
                     FROM Spazio s 
                     WHERE s.id_spazio = $1`,
                    [spazioId]
                );

                if (sedeInfo.rows.length > 0) {
                    const { id_sede, id_spazio } = sedeInfo.rows[0];

                    // Notifica che lo slot è tornato disponibile
                    SSEController.broadcastSlotUpdate(
                        prenotazioneId,
                        'available',
                        {
                            prenotazioneId: prenotazioneId,
                            reason: 'timer_expired',
                            message: 'Slot liberato automaticamente dopo 15 minuti'
                        }
                    );

                    // Aggiorna stato completo per tutti gli slot della data
                    const data = dataInizio.split('T')[0]; // YYYY-MM-DD
                    const slotsStatus = await SSEController.getSlotsStatus(id_sede, id_spazio, data);
                    SSEController.broadcastSlotsStatusUpdate(id_sede, id_spazio, data, slotsStatus);

                    console.log(`📡 Notifica SSE inviata per slot liberato (prenotazione ${prenotazioneId})`);
                }

            } catch (error) {
                console.error(`❌ Errore durante scadenza timer prenotazione ${prenotazioneId}:`, error);
            } finally {
                // Rimuovi timer dalla mappa
                this.activeTimers.delete(prenotazioneId);
            }
        }, 15 * 60 * 1000); // 15 minuti

        // Salva timer nella mappa
        this.activeTimers.set(prenotazioneId, {
            timer: timer,
            spazioId: spazioId,
            dataInizio: dataInizio,
            dataFine: dataFine,
            startTime: new Date()
        });

        console.log(`✅ Timer avviato per prenotazione ${prenotazioneId} - scadenza: ${new Date(Date.now() + 15 * 60 * 1000).toLocaleString()}`);
    }

    /**
     * Cancella un timer per una prenotazione
     * @param {number} prenotazioneId - ID della prenotazione
     */
    static cancelTimer(prenotazioneId) {
        const timerData = this.activeTimers.get(prenotazioneId);
        if (timerData) {
            clearTimeout(timerData.timer);
            this.activeTimers.delete(prenotazioneId);
            console.log(`🛑 Timer cancellato per prenotazione ${prenotazioneId}`);
        }
    }

    /**
     * Ottieni informazioni sui timer attivi
     */
    static getActiveTimers() {
        const timers = [];
        this.activeTimers.forEach((timerData, prenotazioneId) => {
            const timeRemaining = Math.max(0, 15 * 60 * 1000 - (Date.now() - timerData.startTime.getTime()));
            timers.push({
                prenotazioneId: prenotazioneId,
                spazioId: timerData.spazioId,
                dataInizio: timerData.dataInizio,
                dataFine: timerData.dataFine,
                timeRemaining: Math.round(timeRemaining / 1000), // secondi rimanenti
                startTime: timerData.startTime
            });
        });
        return timers;
    }

    /**
     * Pulisce tutti i timer (utile per shutdown graceful)
     */
    static cleanup() {
        console.log(`🧹 Pulizia ${this.activeTimers.size} timer attivi`);
        this.activeTimers.forEach((timerData, prenotazioneId) => {
            clearTimeout(timerData.timer);
        });
        this.activeTimers.clear();
    }
}

module.exports = TimerService;
