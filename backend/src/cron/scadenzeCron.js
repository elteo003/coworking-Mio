const ScadenzeController = require('../controllers/scadenzeController');

class ScadenzeCron {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
    }

    // Avvia il cron job per i controlli di scadenza
    start() {
        if (this.isRunning) {
            return;
        }


        this.isRunning = true;

        // Esegui il primo controllo immediatamente
        this.eseguiControllo();

        // Poi esegui ogni 5 minuti
        this.intervalId = setInterval(() => {
            this.eseguiControllo();
        }, 5 * 60 * 1000); // 5 minuti
    }

    // Ferma il cron job
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
        }
    }

    // Esegue un singolo controllo di scadenza
    async eseguiControllo() {
        try {

            const result = await ScadenzeController.eseguiControlliScadenza();

        } catch (error) {
            console.error('❌ Errore durante controllo scadenze programmato:', error);
        }
    }

    // Esegue un controllo manuale
    async eseguiControlloManuale() {
        try {

            const result = await ScadenzeController.eseguiControlliScadenza();

            return result;

        } catch (error) {
            console.error('❌ Errore durante controllo manuale:', error);
            throw error;
        }
    }

    // Restituisce lo stato del cron job
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheck: this.lastCheck,
            nextCheck: this.intervalId ? new Date(Date.now() + 5 * 60 * 1000) : null
        };
    }
}

// Crea un'istanza singleton
const scadenzeCron = new ScadenzeCron();

module.exports = scadenzeCron;

