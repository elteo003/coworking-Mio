/**
 * Orchestratore per il flusso di prenotazione
 * Gestisce tutti i scenari: utenti autenticati e non autenticati
 */

class BookingOrchestrator {
    constructor() {
        this.state = {
            isAuthenticated: false,
            hasPendingBooking: false,
            currentStep: 'selection', // selection, login, booking, payment
            bookingData: null
        };
        
        this.init();
    }

    init() {
        console.log('🎭 BookingOrchestrator inizializzato');
        this.checkAuthentication();
        this.checkPendingBooking();
    }

    // Verifica se l'utente è autenticato
    checkAuthentication() {
        const token = localStorage.getItem('token');
        this.state.isAuthenticated = !!token;
        console.log('🔐 Controllo autenticazione:');
        console.log('  - Token presente:', !!token);
        console.log('  - Token value:', token ? token.substring(0, 20) + '...' : 'null');
        console.log('  - Utente autenticato:', this.state.isAuthenticated);
    }

    // Verifica se ci sono prenotazioni in attesa
    checkPendingBooking() {
        const pendingData = localStorage.getItem('pendingPrenotazione');
        const redirectUrl = localStorage.getItem('redirectAfterLogin');
        
        if (pendingData && redirectUrl) {
            this.state.hasPendingBooking = true;
            this.state.bookingData = JSON.parse(pendingData);
            this.state.currentStep = 'login';
            console.log('📋 Prenotazione in attesa trovata:', this.state.bookingData);
        }
    }

    // Gestisce il click su "Prenota Ora"
    async handleBookNow(selectionData) {
        console.log('🎯 Gestione click "Prenota Ora"', selectionData);
        console.log('🔐 Stato autenticazione:', this.state.isAuthenticated);
        
        if (!this.state.isAuthenticated) {
            console.log('👤 Flusso utente NON autenticato');
            // Flusso utente non autenticato
            await this.handleUnauthenticatedUser(selectionData);
        } else {
            console.log('👤 Flusso utente autenticato');
            // Flusso utente autenticato
            await this.handleAuthenticatedUser(selectionData);
        }
    }

    // Gestisce utente non autenticato
    async handleUnauthenticatedUser(selectionData) {
        console.log('👤 Gestione utente non autenticato');
        
        // Salva i dati di selezione
        this.saveSelectionData(selectionData);
        
        // Reindirizza al login
        this.redirectToLogin();
    }

    // Gestisce utente autenticato
    async handleAuthenticatedUser(selectionData) {
        console.log('✅ Gestione utente autenticato');
        
        try {
            // Crea direttamente la prenotazione
            const prenotazione = await this.createPrenotazione(selectionData);
            
            // Reindirizza al pagamento
            this.redirectToPayment(prenotazione.id_prenotazione);
            
        } catch (error) {
            console.error('❌ Errore creazione prenotazione:', error);
            this.showError('Errore durante la creazione della prenotazione: ' + error.message);
        }
    }

    // Gestisce il ripristino dopo il login
    async handlePostLogin() {
        console.log('🔄 Gestione post-login');
        
        if (this.state.hasPendingBooking) {
            console.log('📋 Prenotazione in attesa trovata, creazione in corso...');
            
            // Crea direttamente la prenotazione senza ripristinare l'UI
            await this.createPrenotazioneAfterLogin();
        }
    }

    // Salva i dati di selezione
    saveSelectionData(selectionData) {
        console.log('💾 Salvataggio dati selezione:', selectionData);
        
        const dataToSave = {
            sede: selectionData.sede,
            spazio: selectionData.spazio,
            dataInizio: selectionData.dataInizio,
            dataFine: selectionData.dataFine,
            orarioInizio: selectionData.orarioInizio,
            orarioFine: selectionData.orarioFine,
            slotSelezionati: Array.from(selectionData.slotSelezionati || [])
        };
        
        localStorage.setItem('pendingPrenotazione', JSON.stringify(dataToSave));
        localStorage.setItem('redirectAfterLogin', '/selezione-slot.html');
        
        this.state.hasPendingBooking = true;
        this.state.bookingData = dataToSave;
    }

    // Ripristina i dati di selezione
    restoreSelectionData() {
        console.log('🔄 Ripristino dati selezione');
        
        if (!this.state.bookingData) return;
        
        const data = this.state.bookingData;
        
        // Ripristina le variabili globali
        window.selectedSede = data.sede;
        window.selectedSpazio = data.spazio;
        window.selectedDateInizio = new Date(data.dataInizio);
        window.selectedDateFine = new Date(data.dataFine);
        window.selectedTimeInizio = data.orarioInizio;
        window.selectedTimeFine = data.orarioFine;
        
        // Ripristina gli slot selezionati
        if (data.slotSelezionati) {
            selectionState.allSelected = new Set(data.slotSelezionati);
        }
        
        // Aggiorna l'UI
        updateSelectionUI();
        showSummary();
        
        // Mostra messaggio
        this.showInfo('Dati ripristinati! Creazione prenotazione in corso...');
    }

    // Crea la prenotazione dopo il login
    async createPrenotazioneAfterLogin() {
        console.log('🔐 Creazione prenotazione dopo login');
        
        try {
            // Verifica autenticazione
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token di autenticazione non trovato');
            }
            
            // Verifica che ci siano dati di prenotazione
            if (!this.state.bookingData) {
                throw new Error('Dati di prenotazione non trovati');
            }
            
            // Crea la prenotazione direttamente
            const prenotazione = await this.createPrenotazione(this.state.bookingData);
            
            // Pulisci i dati temporanei
            this.cleanupPendingData();
            
            // Reindirizza al pagamento
            this.redirectToPayment(prenotazione.id_prenotazione);
            
        } catch (error) {
            console.error('❌ Errore creazione prenotazione dopo login:', error);
            this.showError('Errore durante la creazione della prenotazione: ' + error.message);
            this.cleanupPendingData();
        }
    }

    // Crea una prenotazione
    async createPrenotazione(selectionData) {
        console.log('📝 Creazione prenotazione:', selectionData);
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token di autenticazione non trovato');
        }
        
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const prenotazioneData = {
            id_spazio: selectionData.spazio.id_spazio,
            data_inizio: new Date(`${formatDate(selectionData.dataInizio)}T${selectionData.orarioInizio}:00`).toISOString(),
            data_fine: new Date(`${formatDate(selectionData.dataFine)}T${selectionData.orarioFine}:00`).toISOString()
        };
        
        const response = await fetch(`${CONFIG.API_BASE}/prenotazioni`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(prenotazioneData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
            throw new Error(`Errore creazione prenotazione: ${errorData.error || response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Prenotazione creata:', result);
        
        return result;
    }

    // Verifica disponibilità
    async checkAvailability() {
        // Implementa la verifica disponibilità
        // Per ora restituisce true, ma dovrebbe implementare la logica reale
        return true;
    }

    // Reindirizza al login
    redirectToLogin() {
        console.log('🔐 Reindirizzamento al login');
        window.location.href = '/login.html';
    }

    // Reindirizza al pagamento
    redirectToPayment(prenotazioneId) {
        console.log('💳 Reindirizzamento al pagamento:', prenotazioneId);
        this.showInfo('Prenotazione creata! Reindirizzamento al pagamento...');
        setTimeout(() => {
            window.location.href = `/pagamento.html?id_prenotazione=${prenotazioneId}`;
        }, 1500);
    }

    // Pulisce i dati temporanei
    cleanupPendingData() {
        console.log('🧹 Pulizia dati temporanei');
        localStorage.removeItem('pendingPrenotazione');
        localStorage.removeItem('redirectAfterLogin');
        this.state.hasPendingBooking = false;
        this.state.bookingData = null;
    }

    // Mostra messaggio di errore
    showError(message) {
        console.error('❌ Errore:', message);
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, 'error');
        } else {
            alert('Errore: ' + message);
        }
    }

    // Mostra messaggio informativo
    showInfo(message) {
        console.log('ℹ️ Info:', message);
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, 'info');
        }
    }
}

// Crea istanza globale
window.BookingOrchestrator = new BookingOrchestrator();

// Esponi funzioni globali per compatibilità
window.handleBookNow = (selectionData) => window.BookingOrchestrator.handleBookNow(selectionData);
window.handlePostLogin = () => window.BookingOrchestrator.handlePostLogin();
