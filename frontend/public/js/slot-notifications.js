/**
 * Sistema di Notifiche Real-Time per Slot
 * Gestisce le notifiche SSE per aggiornamenti slot in tempo reale
 */

class SlotNotificationManager {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // 1 secondo
        this.listeners = new Map();
        
        console.log('🔔 SlotNotificationManager inizializzato');
    }

    // Connessione SSE per notifiche slot
    connect() {
        if (this.isConnected) {
            console.log('🔔 Connessione SSE già attiva');
            return;
        }

        try {
            const sseUrl = `${window.API_BASE_URL}/api/slots/events`;
            console.log('🔔 Connessione SSE a:', sseUrl);
            
            this.eventSource = new EventSource(sseUrl);
            
            this.eventSource.onopen = () => {
                console.log('✅ Connessione SSE stabilita per notifiche slot');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connection', { status: 'connected' });
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('🔔 Notifica slot ricevuta:', data);
                    this.handleSlotNotification(data);
                } catch (error) {
                    console.error('❌ Errore parsing notifica slot:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('❌ Errore connessione SSE slot:', error);
                this.isConnected = false;
                this.emit('connection', { status: 'error', error: error });
                
                // Tentativo di riconnessione
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 Tentativo riconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
                    
                    setTimeout(() => {
                        this.disconnect();
                        this.connect();
                    }, this.reconnectDelay);
                    
                    // Aumenta il delay per il prossimo tentativo
                    this.reconnectDelay *= 2;
                } else {
                    console.error('❌ Raggiunto limite tentativi riconnessione SSE');
                    this.emit('connection', { status: 'failed' });
                }
            };

        } catch (error) {
            console.error('❌ Errore creazione connessione SSE:', error);
            this.emit('connection', { status: 'error', error: error });
        }
    }

    // Disconnessione SSE
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
        console.log('🔌 Connessione SSE slot chiusa');
    }

    // Gestisce le notifiche slot ricevute
    handleSlotNotification(data) {
        console.log('🔔 Gestione notifica slot:', data.type, data);

        switch (data.type) {
            case 'connection':
                console.log('🔔 Connessione SSE stabilita');
                break;

            case 'heartbeat':
                // Mantieni connessione attiva
                break;

            case 'slot_occupied':
                this.handleSlotOccupied(data);
                break;

            case 'slot_available':
                this.handleSlotAvailable(data);
                break;

            case 'slot_confirmed':
                this.handleSlotConfirmed(data);
                break;

            case 'slots_status_update':
                this.handleSlotsStatusUpdate(data);
                break;

            case 'slot_update':
                this.handleSlotUpdate(data);
                break;

            default:
                console.log('🔔 Tipo notifica slot non gestito:', data.type);
        }
    }

    // Gestisce notifica slot occupato
    handleSlotOccupied(data) {
        console.log('🔔 Slot occupato:', data);
        
        // Mostra notifica toast
        this.showNotification({
            type: 'warning',
            title: 'Slot Occupato',
            message: data.message,
            duration: 5000
        });

        // Aggiorna UI slot
        this.updateSlotStatus(data.idSpazio, 'occupied', {
            prenotazioneId: data.prenotazioneId,
            minutesRemaining: data.minutesRemaining
        });

        // Emetti evento personalizzato
        this.emit('slot_occupied', data);
    }

    // Gestisce notifica slot disponibile
    handleSlotAvailable(data) {
        console.log('🔔 Slot disponibile:', data);
        
        // Mostra notifica toast
        this.showNotification({
            type: 'success',
            title: 'Slot Disponibile',
            message: data.message,
            duration: 5000
        });

        // Aggiorna UI slot
        this.updateSlotStatus(data.idSpazio, 'available');

        // Aggiorna stato completo degli slot se disponibile
        if (data.slotsStatus) {
            this.updateAllSlotsStatus(data.slotsStatus);
        }

        // Emetti evento personalizzato
        this.emit('slot_available', data);
    }

    // Gestisce notifica slot confermato
    handleSlotConfirmed(data) {
        console.log('🔔 Slot confermato:', data);
        
        // Mostra notifica toast
        this.showNotification({
            type: 'info',
            title: 'Slot Confermato',
            message: data.message,
            duration: 3000
        });

        // Aggiorna UI slot
        this.updateSlotStatus(data.idSpazio, 'booked');

        // Emetti evento personalizzato
        this.emit('slot_confirmed', data);
    }

    // Gestisce aggiornamento stato completo slot
    handleSlotsStatusUpdate(data) {
        console.log('🔔 Aggiornamento stato slot completo:', data);
        
        if (data.slotsStatus) {
            this.updateAllSlotsStatus(data.slotsStatus);
        }

        // Emetti evento personalizzato
        this.emit('slots_status_update', data);
    }

    // Gestisce aggiornamento singolo slot
    handleSlotUpdate(data) {
        console.log('🔔 Aggiornamento singolo slot:', data);
        
        this.updateSlotStatus(data.slotId, data.status, data.data);

        // Emetti evento personalizzato
        this.emit('slot_update', data);
    }

    // Aggiorna stato di un singolo slot nell'UI
    updateSlotStatus(slotId, status, extraData = {}) {
        console.log(`🔔 Aggiornamento slot ${slotId} a stato: ${status}`);

        // Trova il bottone dello slot
        const slotButton = document.querySelector(`[data-slot-id="${slotId}"]`) || 
                          document.querySelector(`[data-orario="${slotId}"]`) ||
                          document.querySelector(`.time-slot[data-orario="${slotId}"]`);

        if (slotButton) {
            // Rimuovi classi di stato precedenti
            slotButton.classList.remove('slot-available', 'slot-occupied', 'slot-booked', 'slot-past');
            
            // Aggiungi nuova classe di stato
            slotButton.classList.add(`slot-${status}`);

            // Aggiorna attributi
            slotButton.setAttribute('data-status', status);

            // Aggiorna testo se necessario
            if (status === 'occupied' && extraData.minutesRemaining) {
                slotButton.title = `Slot occupato - scadenza in ${extraData.minutesRemaining} minuti`;
            } else if (status === 'available') {
                slotButton.title = 'Slot disponibile';
                slotButton.disabled = false;
            } else if (status === 'booked') {
                slotButton.title = 'Slot prenotato';
                slotButton.disabled = true;
            }

            console.log(`✅ Slot ${slotId} aggiornato a stato: ${status}`);
        } else {
            console.warn(`⚠️ Slot ${slotId} non trovato nell'UI`);
        }
    }

    // Aggiorna stato di tutti gli slot
    updateAllSlotsStatus(slotsStatus) {
        console.log('🔔 Aggiornamento stato completo slot:', slotsStatus);

        if (Array.isArray(slotsStatus)) {
            slotsStatus.forEach(slot => {
                this.updateSlotStatus(slot.orario, slot.status, {
                    title: slot.title
                });
            });
        }
    }

    // Mostra notifica toast
    showNotification({ type, title, message, duration = 5000 }) {
        // Crea elemento notifica
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        notification.innerHTML = `
            <strong>${title}</strong><br>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Aggiungi al DOM
        document.body.appendChild(notification);

        // Rimuovi automaticamente dopo la durata specificata
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    // Sistema di eventi personalizzati
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('❌ Errore in callback evento slot:', error);
                }
            });
        }
    }

    // Ottieni stato connessione
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

// Istanza globale del manager notifiche slot
window.SlotNotificationManager = new SlotNotificationManager();

// Auto-connessione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔔 Auto-connessione SlotNotificationManager');
    window.SlotNotificationManager.connect();
});

// Disconnessione quando la pagina viene chiusa
window.addEventListener('beforeunload', () => {
    console.log('🔔 Disconnessione SlotNotificationManager');
    window.SlotNotificationManager.disconnect();
});

console.log('🔔 SlotNotificationManager caricato e pronto');
