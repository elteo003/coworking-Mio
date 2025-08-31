/**
 * Slot Manager Semplificato - Gestione slot in tempo reale
 * Versione ottimizzata con meno complessità e più performance
 */

class SlotManager {
    constructor() {
        this.eventSource = null;
        this.slotsStatus = new Map();
        this.currentSede = null;
        this.currentSpazio = null;
        this.currentDate = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3; // Ridotto da 5 a 3
        this.reconnectDelay = 1000; // Ridotto da 2000 a 1000
    }

    // Inizializza il sistema SSE
    init(sedeId, spazioId, date) {
        this.currentSede = sedeId;
        this.currentSpazio = spazioId;
        this.currentDate = date;


        // Controlla se l'utente è autenticato
        const token = localStorage.getItem('token');

        if (token) {
            // Carica stato iniziale degli slot
            this.loadInitialSlotsStatus();
            // Connessione SSE per aggiornamenti real-time
            this.connectSSE();
        } else {
            // Utenti non autenticati vedono lo stato reale degli slot
            // ma non ricevono aggiornamenti real-time
            this.loadInitialSlotsStatus();
            // Gestisci utente non autenticato dopo caricamento stato
            setTimeout(() => this.handleUnauthenticatedUser(), 100);
        }
    }

    // Carica stato iniziale degli slot (VERSIONE OTTIMIZZATA)
    async loadInitialSlotsStatus() {
        // Se gli slot sono già stati caricati con stati corretti, non ricaricare
        if (this.slotsStatus.size > 0) {
            this.updateAllSlotButtons();
            return;
        }

        try {
            // Ottieni il token di autenticazione
            const token = localStorage.getItem('token');

            let response;

            if (token) {
                // Utente autenticato: usa endpoint protetto
                response = await fetch(`${window.CONFIG.API_BASE}/sse/slots-status/${this.currentSede}/${this.currentSpazio}/${this.currentDate}?token=${encodeURIComponent(token)}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                // Utente non autenticato: usa endpoint pubblico per stato slot
                response = await fetch(`${window.CONFIG.API_BASE}/spazi/${this.currentSpazio}/disponibilita-slot/${this.currentDate}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }

            if (response.ok) {
                const data = await response.json();

                // Gestisci entrambi i formati di risposta
                let slotsArray;
                if (data.data && data.data.slots) {
                    // Formato nuovo: { data: { slots: [...] } }
                    slotsArray = data.data.slots;
                } else if (Array.isArray(data.data)) {
                    // Formato SSE: { data: [...] }
                    slotsArray = data.data;
                } else if (Array.isArray(data)) {
                    // Formato diretto: [...]
                    slotsArray = data;
                } else {
                    console.error('❌ SlotManager - Formato risposta non riconosciuto:', data);
                    return;
                }

                this.updateSlotsFromStatus(slotsArray);
            } else {
                console.error('❌ SlotManager - Errore caricamento stato iniziale:', response.status);
            }
        } catch (error) {
            console.error('❌ SlotManager - Errore caricamento stato iniziale:', error);
        }
    }

    // Connessione SSE
    connectSSE() {
        try {
            // Ottieni il token di autenticazione
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('❌ SlotManager - Token di autenticazione mancante');
                return;
            }

            // Crea URL con token nella query string per autenticazione SSE
            const url = `${window.CONFIG.API_BASE}/sse/status-stream?token=${encodeURIComponent(token)}`;

            this.eventSource = new EventSource(url);

            this.eventSource.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleSSEMessage(data);
                } catch (error) {
                    console.error('❌ SlotManager - Errore parsing messaggio SSE:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('❌ SlotManager - Errore connessione SSE:', error);
                this.isConnected = false;
                this.handleSSEError();
            };

        } catch (error) {
            console.error('❌ SlotManager - Errore creazione connessione SSE:', error);
        }
    }

    // Gestisce messaggi SSE
    handleSSEMessage(data) {
        switch (data.type) {
            case 'connection':
                break;

            case 'heartbeat':
                // Heartbeat per mantenere connessione attiva
                break;

            case 'slot_update':
                this.handleSlotUpdate(data);
                break;

            case 'slots_status_update':
                this.updateSlotsFromStatus(data.slotsStatus);
                break;

            default:
        }
    }

    // Gestisce aggiornamento singolo slot
    handleSlotUpdate(data) {
        const { slotId, status, data: slotData } = data;


        // Aggiorna stato locale
        this.slotsStatus.set(slotId, {
            status: status,
            ...slotData
        });

        // Aggiorna bottone corrispondente
        this.updateSlotButton(slotId, status, slotData);
    }

    // Aggiorna tutti gli slot da stato completo
    updateSlotsFromStatus(slotsStatus) {

        // Pulisci stato precedente
        this.slotsStatus.clear();

        // Aggiorna stato locale
        slotsStatus.forEach((slot, index) => {
            // Usa id_slot se presente, altrimenti usa l'indice + 1 o l'orario
            const slotId = slot.id_slot || slot.id || slot.orario || (index + 1);
            if (slotId) {
                this.slotsStatus.set(slotId, slot);
            } else {
                console.warn('⚠️ Slot senza ID valido:', slot);
            }
        });

        // Aggiorna tutti i bottoni
        this.updateAllSlotButtons();
    }

    // Aggiorna tutti i bottoni degli slot
    updateAllSlotButtons() {

        this.slotsStatus.forEach((slot, slotId) => {
            this.updateSlotButton(slotId, slot.status, slot);
        });
    }

    // Aggiorna singolo bottone slot (VERSIONE SEMPLIFICATA)
    updateSlotButton(slotId, status, slotData = {}) {
        // Trova il bottone (logica semplificata)
        const button = document.querySelector(`[data-slot-id="${slotId}"]`) ||
            document.querySelector(`[data-orario="${slotId}"]`);

        if (!button) {
            console.warn('⚠️ Bottone non trovato per slot:', slotId);
            return;
        }

        // Rimuovi tutte le classi di stato precedenti
        button.classList.remove('slot-available', 'slot-booked', 'slot-occupied', 'slot-past', 'slot-selected');

        // Applica nuovo stato (solo 4 stati principali)
        switch (status) {
            case 'available':
                button.classList.add('slot-available');
                button.disabled = false;
                button.title = 'Disponibile';
                break;
            case 'booked':
                button.classList.add('slot-booked');
                button.disabled = true;
                button.title = 'Prenotato';
                break;
            case 'occupied':
                button.classList.add('slot-occupied');
                button.disabled = true;
                button.title = 'Occupato';
                break;
            case 'past':
                button.classList.add('slot-past');
                button.disabled = true;
                button.title = 'Passato';
                break;
            default:
                button.classList.add('slot-available');
                button.disabled = false;
                button.title = 'Disponibile';
        }
    }

    // Gestisce errori SSE
    handleSSEError() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;

            setTimeout(() => {
                this.connectSSE();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ SlotManager - Riconnessione fallita, passaggio a polling');
            this.fallbackToPolling();
        }
    }

    // Fallback semplificato - ricarica stato una volta
    fallbackToPolling() {
        this.loadInitialSlotsStatus();
    }

    // Seleziona uno slot (VERSIONE SEMPLIFICATA)
    selectSlot(slotId) {
        const button = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (!button || button.disabled) return;

        // Rimuovi selezione precedente
        document.querySelectorAll('.slot-selected').forEach(btn => {
            btn.classList.remove('slot-selected');
            btn.classList.add('slot-available');
        });

        // Seleziona nuovo slot
        button.classList.remove('slot-available');
        button.classList.add('slot-selected');
        button.title = 'Selezionato';
    }

    // Deseleziona uno slot (VERSIONE SEMPLIFICATA)
    deselectSlot(slotId) {
        const button = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (!button) return;

        button.classList.remove('slot-selected');
        button.classList.add('slot-available');
        button.title = 'Disponibile';
    }

    // Ottieni stato corrente di uno slot
    getSlotStatus(slotId) {
        return this.slotsStatus.get(slotId);
    }

    // Ottieni tutti gli slot disponibili
    getAvailableSlots() {
        const available = [];
        this.slotsStatus.forEach((slot, slotId) => {
            if (slot.status === 'available') {
                available.push({ slotId, ...slot });
            }
        });
        return available;
    }

    // Ottieni tutti gli slot selezionati
    getSelectedSlots() {
        const selected = [];
        document.querySelectorAll('.slot-selected').forEach(button => {
            const slotId = button.getAttribute('data-slot-id');
            if (slotId) {
                selected.push(parseInt(slotId));
            }
        });
        return selected;
    }

    // Pulisci e chiudi connessioni (VERSIONE SEMPLIFICATA)
    cleanup() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
    }

    // Gestione utenti non autenticati (VERSIONE SEMPLIFICATA)
    handleUnauthenticatedUser() {
        // Gli slot rimangono visibili ma la prenotazione richiede login
    }
}

// Esporta per uso globale
window.SlotManager = SlotManager;
