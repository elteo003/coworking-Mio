/**
 * Client SSE (Server-Sent Events) per ricevere notifiche real-time
 * Gestisce aggiornamenti automatici degli slot quando le prenotazioni scadono
 */
class SSEClient {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 secondi
        this.listeners = new Map();

        console.log('🚀 SSEClient inizializzato');
    }

    /**
     * Connette al server SSE
     */
    connect() {
        if (this.isConnected) {
            console.log('⚠️ SSE già connesso');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('⚠️ Nessun token trovato, SSE non connesso');
                return;
            }

            const sseUrl = `${window.CONFIG.API_BASE}/sse/status-stream?token=${encodeURIComponent(token)}`;
            console.log('🔗 Connessione SSE a:', sseUrl);

            this.eventSource = new EventSource(sseUrl);

            this.eventSource.onopen = () => {
                console.log('✅ Connessione SSE stabilita');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 Messaggio SSE ricevuto:', data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('❌ Errore parsing messaggio SSE:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('❌ Errore connessione SSE:', error);
                this.isConnected = false;
                this.emit('error', error);

                // Tentativo di riconnessione
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 Tentativo di riconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

                    setTimeout(() => {
                        this.disconnect();
                        this.connect();
                    }, this.reconnectDelay);
                } else {
                    console.log('❌ Raggiunto limite tentativi di riconnessione');
                    this.emit('max_reconnect_attempts');
                }
            };

        } catch (error) {
            console.error('❌ Errore inizializzazione SSE:', error);
        }
    }

    /**
     * Disconnette dal server SSE
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
        console.log('🔌 Connessione SSE chiusa');
    }

    /**
     * Gestisce i messaggi ricevuti dal server
     */
    handleMessage(data) {
        switch (data.type) {
            case 'connection':
                console.log('📡 Connessione SSE confermata:', data.message);
                break;

            case 'heartbeat':
                // Heartbeat - mantiene la connessione attiva
                break;

            case 'slot_update':
                console.log('🎯 Aggiornamento slot ricevuto:', data);
                this.handleSlotUpdate(data);
                break;

            case 'slots_status_update':
                console.log('📊 Aggiornamento stato slot ricevuto:', data);
                this.handleSlotsStatusUpdate(data);
                break;

            default:
                console.log('❓ Tipo messaggio SSE sconosciuto:', data.type);
        }
    }

    /**
     * Gestisce aggiornamenti di singoli slot
     */
    handleSlotUpdate(data) {
        const { slotId, status, data: slotData } = data;

        // Notifica tutti i listener
        this.emit('slot_update', {
            slotId,
            status,
            data: slotData,
            timestamp: data.timestamp
        });

        // Aggiorna UI se siamo nella pagina selezione slot
        if (window.location.pathname.includes('selezione-slot.html')) {
            this.updateSlotUI(slotId, status, slotData);
        }

        // Mostra notifica toast se lo slot è stato liberato
        if (status === 'available' && slotData?.reason === 'timer_expired') {
            this.showSlotFreedNotification(slotData);
        }
    }

    /**
     * Gestisce aggiornamenti di stato di tutti gli slot
     */
    handleSlotsStatusUpdate(data) {
        const { sedeId, spazioId, data: date, slotsStatus } = data;

        // Notifica tutti i listener
        this.emit('slots_status_update', {
            sedeId,
            spazioId,
            date,
            slotsStatus,
            timestamp: data.timestamp
        });

        // Aggiorna UI se siamo nella pagina selezione slot
        if (window.location.pathname.includes('selezione-slot.html')) {
            this.updateAllSlotsUI(slotsStatus);
        }
    }

    /**
     * Aggiorna l'UI di un singolo slot
     */
    updateSlotUI(slotId, status, slotData) {
        const slotButton = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (!slotButton) return;

        // Rimuovi classi di stato precedenti
        slotButton.classList.remove('slot-available', 'slot-booked', 'slot-occupied', 'slot-past');

        // Aggiungi nuova classe di stato
        slotButton.classList.add(`slot-${status}`);

        // Aggiorna attributi
        slotButton.dataset.status = status;

        if (status === 'available') {
            slotButton.disabled = false;
            slotButton.title = 'Slot disponibile';
        } else if (status === 'booked') {
            slotButton.disabled = true;
            slotButton.title = 'Slot prenotato';
        } else if (status === 'occupied') {
            slotButton.disabled = true;
            slotButton.title = 'Slot occupato (in attesa pagamento)';
        } else if (status === 'past') {
            slotButton.disabled = true;
            slotButton.title = 'Orario passato';
        }

        console.log(`🎨 Slot ${slotId} aggiornato a stato: ${status}`);
    }

    /**
     * Aggiorna l'UI di tutti gli slot
     */
    updateAllSlotsUI(slotsStatus) {
        if (!Array.isArray(slotsStatus)) return;

        slotsStatus.forEach(slot => {
            this.updateSlotUI(slot.id_slot, slot.status, slot);
        });

        console.log(`🎨 Aggiornati ${slotsStatus.length} slot`);
    }

    /**
     * Mostra notifica quando uno slot viene liberato
     */
    showSlotFreedNotification(slotData) {
        // Crea notifica toast
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-unlock text-success me-2"></i>
                <span>Slot liberato automaticamente dopo 15 minuti</span>
            </div>
        `;

        // Stili per la notifica
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d4edda;
            color: #155724;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #c3e6cb;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-size: 14px;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;

        // Aggiungi animazione CSS se non esiste
        if (!document.querySelector('#toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Rimuovi notifica dopo 5 secondi
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);

        console.log('🔔 Notifica slot liberato mostrata');
    }

    /**
     * Aggiunge un listener per eventi specifici
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Rimuove un listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emette un evento a tutti i listener
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Errore in listener per evento ${event}:`, error);
                }
            });
        }
    }

    /**
     * Ottiene lo stato della connessione
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

// Crea istanza globale
window.sseClient = new SSEClient();

// Auto-connessione quando la pagina è caricata
document.addEventListener('DOMContentLoaded', () => {
    // Connessione automatica solo se l'utente è autenticato
    const token = localStorage.getItem('token');
    if (token) {
        console.log('🔗 Auto-connessione SSE per utente autenticato');
        window.sseClient.connect();
    }
});

// Disconnessione quando la pagina viene chiusa
window.addEventListener('beforeunload', () => {
    if (window.sseClient) {
        window.sseClient.disconnect();
    }
});

console.log('📡 SSEClient caricato e pronto');
