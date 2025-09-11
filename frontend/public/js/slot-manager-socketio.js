/**
 * Slot Manager con Socket.IO - Gestione slot in tempo reale
 * Versione migliorata che sostituisce SSE con Socket.IO
 * Supporta optimistic UI e gestione errori robusta
 */

class SlotManagerSocketIO {
    constructor() {
        this.socket = null;
        this.slotsStatus = new Map();
        this.currentSede = null;
        this.currentSpazio = null;
        this.currentDate = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.connectionCheckInterval = null;
    }

    // Inizializza il sistema Socket.IO
    init(sedeId, spazioId, date) {
        this.currentSede = sedeId;
        this.currentSpazio = spazioId;
        this.currentDate = date;


        // Controlla se l'utente è autenticato
        const token = localStorage.getItem('token');

        if (token) {
            // Carica stato iniziale degli slot
            this.loadInitialSlotsStatus();
            // Connessione Socket.IO per aggiornamenti real-time
            this.connectSocketIO();
        } else {
            // Utenti non autenticati vedono lo stato reale degli slot
            // ma non ricevono aggiornamenti real-time
            this.loadInitialSlotsStatus();
            // Gestisci utente non autenticato dopo caricamento stato
            setTimeout(() => this.handleUnauthenticatedUser(), 100);
        }
    }

    // Carica stato iniziale degli slot
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
                response = await fetch(`${window.CONFIG.API_BASE}/slots/${this.currentSpazio}/${this.currentDate}?token=${encodeURIComponent(token)}`, {
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
                    console.error('❌ SlotManagerSocketIO - Formato risposta non riconosciuto:', data);
                    return;
                }

                this.updateSlotsFromStatus(slotsArray);
            } else {
                console.error('❌ SlotManagerSocketIO - Errore caricamento stato iniziale:', response.status);
            }
        } catch (error) {
            console.error('❌ SlotManagerSocketIO - Errore caricamento stato iniziale:', error);
        }
    }

    // Connessione Socket.IO
    connectSocketIO() {
        try {
            // Ottieni il token di autenticazione
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('❌ SlotManagerSocketIO - Token di autenticazione mancante');
                return;
            }

            // Importa Socket.IO dinamicamente
            if (typeof io === 'undefined') {
                console.error('❌ SlotManagerSocketIO - Socket.IO non caricato');
                return;
            }


            this.socket = io(window.SOCKET_BASE_URL, {
                auth: {
                    token: token
                },
                transports: ['websocket', 'polling']
            });

            this.setupSocketEventHandlers();

        } catch (error) {
            console.error('❌ SlotManagerSocketIO - Errore creazione connessione Socket.IO:', error);
        }
    }

    // Configura gestori eventi Socket.IO
    setupSocketEventHandlers() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Entra nella room dello spazio corrente
            this.joinSpaceRoom();
        });

        this.socket.on('connection_confirmed', (data) => {
        });

        this.socket.on('joined_space', (data) => {
        });

        this.socket.on('slot_update', (data) => {
            this.handleSlotUpdate(data);
        });

        this.socket.on('slots_status_update', (data) => {
            this.updateSlotsFromStatus(data.slotsStatus);
        });

        this.socket.on('slots_freed', (data) => {
            // Ricarica stato slot quando alcuni vengono liberati
            this.loadInitialSlotsStatus();
        });

        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            this.handleSocketDisconnect(reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ SlotManagerSocketIO - Errore connessione Socket.IO:', error);
            this.isConnected = false;
            this.handleSocketError(error);
        });
    }

    // Entra nella room dello spazio
    joinSpaceRoom() {
        if (this.socket && this.isConnected && this.currentSede && this.currentSpazio) {
            this.socket.emit('join_space', {
                spazioId: this.currentSpazio,
                sedeId: this.currentSede
            });
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

    // Aggiorna singolo bottone slot
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
            case 'scaduta': // Slot scaduto = disponibile
                button.classList.add('slot-available');
                button.disabled = false;
                button.title = 'Disponibile';
                button.setAttribute('aria-label', 'Slot disponibile per la prenotazione');
                button.setAttribute('role', 'button');
                break;
            case 'booked':
                button.classList.add('slot-booked');
                button.disabled = true;
                button.title = 'Prenotato';
                button.setAttribute('aria-label', 'Slot già prenotato');
                break;
            case 'occupied':
                // Tutti gli slot occupati sono non cliccabili
                button.classList.add('slot-occupied');
                button.disabled = true;
                button.title = slotData.title || 'Occupato';
                button.setAttribute('aria-label', slotData.title || 'Slot temporaneamente occupato');
                break;
            case 'past':
                button.classList.add('slot-past');
                button.disabled = true;
                button.title = 'Passato';
                button.setAttribute('aria-label', 'Slot con orario già passato');
                break;
            default:
                button.classList.add('slot-available');
                button.disabled = false;
                button.title = 'Disponibile';
                button.setAttribute('aria-label', 'Slot disponibile per la prenotazione');
        }
    }

    // Gestisce disconnessione Socket.IO
    handleSocketDisconnect(reason) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;

            setTimeout(() => {
                this.connectSocketIO();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ SlotManagerSocketIO - Riconnessione fallita, passaggio a polling');
            this.fallbackToPolling();
        }
    }

    // Gestisce errori Socket.IO
    handleSocketError(error) {
        console.error('❌ SlotManagerSocketIO - Errore Socket.IO:', error);
        this.handleSocketDisconnect('error');
    }

    // Fallback semplificato - ricarica stato una volta
    fallbackToPolling() {
        this.loadInitialSlotsStatus();

        // Avvia polling ogni 30 secondi
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }

        this.connectionCheckInterval = setInterval(() => {
            this.loadInitialSlotsStatus();
        }, 30000);
    }

    // Occupa uno slot (ottimistic UI)
    async holdSlot(slotId) {
        const button = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (!button || button.disabled) return false;

        const token = localStorage.getItem('token');
        // if (!token) {
        //     console.error('❌ Token mancante per occupare slot');
        //     return false;
        // }

        try {
            // Aggiornamento ottimistico UI - disabilita lo slot
            const originalStatus = button.className;
            button.classList.remove('slot-available');
            button.classList.add('slot-occupied');
            button.disabled = true;
            button.title = 'Occupato temporaneamente';

            // Chiamata API
            const response = await fetch(`${window.CONFIG.API_BASE}/slots/${slotId}/hold`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    idSpazio: this.currentSpazio,
                    sedeId: this.currentSede,
                    date: this.currentDate
                })
            });

            if (response.ok) {
                return true;
            } else {
                // Revert UI in caso di errore
                button.className = originalStatus;
                button.disabled = false;
                console.error('❌ Errore nell\'occupare slot:', response.status);
                return false;
            }
        } catch (error) {
            // Revert UI in caso di errore
            button.classList.remove('slot-occupied');
            button.classList.add('slot-available');
            button.disabled = false;
            button.title = 'Disponibile';
            console.error('❌ Errore nell\'occupare slot:', error);
            return false;
        }
    }

    // Rilascia uno slot occupato temporaneamente
    async releaseSlot(slotId) {
        const button = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (!button) return false;

        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ Token mancante per rilasciare slot');
            return false;
        }

        try {
            // Chiamata API per rilasciare lo slot
            const response = await fetch(`${window.CONFIG.API_BASE}/slots/${slotId}/release`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    idSpazio: this.currentSpazio,
                    sedeId: this.currentSede,
                    date: this.currentDate
                })
            });

            if (response.ok) {
                // Aggiorna UI - ripristina stato originale
                button.classList.remove('slot-occupied');
                button.classList.add('slot-available');
                button.disabled = false;
                button.title = 'Disponibile';
                return true;
            } else {
                console.error('❌ Errore nel rilasciare slot:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Errore nel rilasciare slot:', error);
            return false;
        }
    }

    // Ottieni ID utente corrente
    getCurrentUserId() {
        try {
            const user = localStorage.getItem('user');
            if (user) {
                const userData = JSON.parse(user);
                return userData.id_utente;
            }
        } catch (error) {
            console.error('❌ Errore nel recuperare ID utente:', error);
        }
        return null;
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

    // Pulisci e chiudi connessioni
    cleanup() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }

        this.isConnected = false;
    }

    // Gestione utenti non autenticati
    handleUnauthenticatedUser() {
        // Gli slot rimangono visibili ma la prenotazione richiede login
    }
}

// Esporta per uso globale
window.SlotManagerSocketIO = SlotManagerSocketIO;
