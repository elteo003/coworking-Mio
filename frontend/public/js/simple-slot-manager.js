/**
 * Gestore slot semplificato senza Socket.IO
 * Per progetto universitario - gestione semplice e diretta
 */

class SimpleSlotManager {
    constructor() {
        this.slotsStatus = new Map();
        this.pollingInterval = null;
        this.isPolling = false;
    }

    // Inizializza il gestore slot
    init(sedeId, spazioId, date) {
        console.log('🎯 SimpleSlotManager inizializzato:', { sedeId, spazioId, date });
        
        this.sedeId = sedeId;
        this.spazioId = spazioId;
        this.date = date;
        
        // Carica lo stato iniziale degli slot
        this.loadSlotsStatus();
        
        // Avvia polling periodico (ogni 30 secondi)
        this.startPolling();
    }

    // Carica lo stato degli slot dal server
    async loadSlotsStatus() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/spazi/${this.spazioId}/disponibilita-slot/${this.date}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('❌ Errore caricamento slot:', response.status);
                return;
            }

            const data = await response.json();
            
            if (data.success && data.data?.slots) {
                // Aggiorna lo stato degli slot
                this.slotsStatus.clear();
                data.data.slots.forEach(slot => {
                    this.slotsStatus.set(slot.id_slot, {
                        id: slot.id_slot,
                        status: slot.status,
                        orario: slot.orario,
                        prenotazioneId: slot.prenotazione_id || null
                    });
                });
                
                console.log('✅ Slot caricati:', this.slotsStatus.size);
                this.updateUI();
            }
        } catch (error) {
            console.error('❌ Errore caricamento slot:', error);
        }
    }

    // Avvia polling periodico
    startPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        this.pollingInterval = setInterval(() => {
            this.loadSlotsStatus();
        }, 30000); // 30 secondi
        
        console.log('🔄 Polling avviato');
    }

    // Ferma il polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('⏹️ Polling fermato');
    }

    // Aggiorna l'UI degli slot
    updateUI() {
        this.slotsStatus.forEach((slot, slotId) => {
            const slotElement = document.querySelector(`[data-slot-id="${slotId}"]`);
            if (slotElement) {
                this.applySlotState(slotElement, slot.status, slot);
            }
        });
    }

    // Applica stato a uno slot
    applySlotState(slotElement, status, slotData = {}) {
        // Rimuovi tutte le classi di stato precedenti
        slotElement.classList.remove('slot-available', 'slot-booked', 'slot-occupied', 'slot-past', 'slot-selected', 'slot-start', 'slot-end');

        // Applica nuovo stato
        switch (status) {
            case 'available':
                slotElement.classList.add('slot-available');
                slotElement.disabled = false;
                slotElement.title = 'Disponibile';
                break;
            case 'booked':
                slotElement.classList.add('slot-booked');
                slotElement.disabled = true;
                slotElement.title = 'Prenotato';
                break;
            case 'occupied':
                slotElement.classList.add('slot-occupied');
                slotElement.disabled = true;
                slotElement.title = 'Occupato temporaneamente';
                break;
            case 'past':
                slotElement.classList.add('slot-past');
                slotElement.disabled = true;
                slotElement.title = 'Passato';
                break;
            default:
                slotElement.classList.add('slot-available');
                slotElement.disabled = false;
                slotElement.title = 'Disponibile';
        }
    }

    // Verifica disponibilità di un intervallo
    async checkAvailability(orarioInizio, orarioFine) {
        const orarioInizioHour = parseInt(orarioInizio.split(':')[0]);
        const orarioFineHour = parseInt(orarioFine.split(':')[0]);

        // Controlla se tutti gli slot nell'intervallo sono disponibili
        for (let hour = orarioInizioHour; hour < orarioFineHour; hour++) {
            const slotId = hour - 8; // Converti orario in slot ID (9:00 = slot 1, 10:00 = slot 2, etc.)
            const slot = this.slotsStatus.get(slotId);

            if (!slot || slot.status !== 'available') {
                return false;
            }
        }
        return true;
    }

    // Occupa temporaneamente uno slot (per prenotazione in corso)
    async holdSlot(slotId) {
        // In un sistema semplificato, non occupiamo fisicamente lo slot
        // ma verifichiamo solo che sia disponibile
        const slot = this.slotsStatus.get(slotId);
        return slot && slot.status === 'available';
    }

    // Rilascia uno slot
    async releaseSlot(slotId) {
        // In un sistema semplificato, non c'è nulla da rilasciare
        // Lo slot tornerà disponibile al prossimo polling
        return true;
    }

    // Seleziona uno slot (per UI)
    selectSlot(slotId) {
        const slotElement = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (slotElement) {
            slotElement.classList.add('slot-selected');
            slotElement.title = 'Selezionato';
        }
    }

    // Deseleziona uno slot (per UI)
    deselectSlot(slotId) {
        const slotElement = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (slotElement) {
            slotElement.classList.remove('slot-selected');
            slotElement.title = 'Disponibile';
        }
    }

    // Pulisce le risorse
    cleanup() {
        this.stopPolling();
        this.slotsStatus.clear();
        console.log('🧹 SimpleSlotManager pulito');
    }
}

// Esponi globalmente
window.SimpleSlotManager = SimpleSlotManager;
