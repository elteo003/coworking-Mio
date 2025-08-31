const ScadenzeController = require('../controllers/scadenzeController');

class ScadenzeService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // 5 minuti
  }
  
  // Avvia il servizio automatico
  start() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Esegui il primo controllo immediatamente
    this.eseguiControllo();
    
    // Poi esegui controlli ogni 5 minuti
    this.intervalId = setInterval(() => {
      this.eseguiControllo();
    }, this.checkInterval);
    
  }
  
  // Ferma il servizio automatico
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
  }
  
  // Esegue un controllo di scadenza
  async eseguiControllo() {
    try {
      
      const risultati = await ScadenzeController.eseguiControlliScadenza();
      
      // Log dei risultati
      if (risultati.prenotazioniScadute > 0 || risultati.pagamentiScaduti > 0) {
      } else {
      }
      
    } catch (error) {
      console.error('❌ Errore durante controllo automatico scadenze:', error);
    }
  }
  
  // Esegue un controllo manuale
  async eseguiControlloManuale() {
    try {
      const risultati = await ScadenzeController.eseguiControlliScadenza();
      return risultati;
    } catch (error) {
      console.error('❌ Errore durante controllo manuale scadenze:', error);
      throw error;
    }
  }
  
  // Ottiene lo stato del servizio
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      lastCheck: this.lastCheck,
      nextCheck: this.isRunning ? new Date(Date.now() + this.checkInterval) : null
    };
  }
  
  // Modifica l'intervallo di controllo
  setCheckInterval(minutes) {
    const newInterval = minutes * 60 * 1000;
    
    if (this.isRunning) {
      // Riavvia il servizio con il nuovo intervallo
      this.stop();
      this.checkInterval = newInterval;
      this.start();
    } else {
      this.checkInterval = newInterval;
    }
    
  }
}

// Esporta un'istanza singleton
const scadenzeService = new ScadenzeService();

module.exports = scadenzeService;
