// Configurazione e variabili globali
window.sedi = [];
window.spazi = [];
window.selectedSede = null;
window.selectedSpazio = null;
window.selectedDateInizio = null;
window.selectedDateFine = null;
window.selectedTimeInizio = null;
window.selectedTimeFine = null;
let datePicker = null;

// Nuovo Slot Manager per gestione real-time degli slot con SSE
let slotManager = null;

// Inizializza il nuovo Slot Manager
function initializeSlotManager() {
    if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
        const sedeId = window.selectedSede.id_sede;
        const spazioId = window.selectedSpazio.id_spazio;
        const date = window.selectedDateInizio.toISOString().split('T')[0];
        
        console.log('🚀 Inizializzazione nuovo Slot Manager per:', { sedeId, spazioId, date });
        
        // Pulisci istanza precedente se esiste
        if (slotManager) {
            slotManager.cleanup();
        }
        
        // Crea nuova istanza
        slotManager = new window.SlotManager();
        slotManager.init(sedeId, spazioId, date);
        
        return true;
    }
    return false;
}

        console.log('✅ Aggiornamento slot completato');
    },

    // Aggiorna slot basato su prenotazioni reali
    updateSlotsFromBookings(prenotazioni, keepUserSelection = false) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        console.log('🔄 Aggiornamento slot da prenotazioni:', {
            prenotazioni: prenotazioni.length,
            keepUserSelection,
            selectedSlots: this.getSelectedSlots()
        });

        // Se keepUserSelection = true, salva gli slot selezionati dall'utente
        let userSelectedSlots = [];
        if (keepUserSelection) {
            userSelectedSlots = this.getSelectedSlots();
            console.log('💾 Mantengo selezione utente:', userSelectedSlots);
        }

        // Aggiorna ogni slot
        this.slots.forEach((slotInfo, orario) => {
            const slot = document.querySelector(`[data-orario="${orario}"]`);
            if (!slot) return;

            // Trova prenotazioni per questo orario
            const prenotazione = prenotazioni.find(p => {
                const prenotazioneDate = new Date(p.data_inizio);
                const prenotazioneOra = prenotazioneDate.toTimeString().split(' ')[0].substring(0, 5);
                return prenotazioneOra === orario && p.stato === 'confermata';
            });

            if (prenotazione) {
                // Slot prenotato
                this.updateSlotState(slot, orario, 'booked', 'Prenotato');
            } else {
                // Controlla se è passato
                const slotTime = new Date(`${today}T${orario}:00`);
                if (slotTime < now) {
                    this.updateSlotState(slot, orario, 'past-time', 'Orario passato');
                } else {
                    // Se keepUserSelection = true e l'utente aveva selezionato questo slot, mantienilo
                    if (keepUserSelection && userSelectedSlots.includes(orario)) {
                        console.log('💾 Mantengo selezione utente per slot:', orario);
                        // Non fare nulla, mantieni lo stato attuale
                    } else {
                        // Slot disponibile
                        this.updateSlotState(slot, orario, 'available', 'Disponibile');
                    }
                }
            }
        });

        console.log('✅ Aggiornamento slot completato');
    },

    // Aggiorna slot basato su stato concorrenza
    updateSlotsFromConcurrency(statoConcorrenza) {
        console.log('🔄 Aggiornamento slot da concorrenza:', statoConcorrenza);

        // Aggiorna ogni slot con stato concorrenza
        this.slots.forEach((slotInfo, orario) => {
            const slot = document.querySelector(`[data-orario="${orario}"]`);
            if (!slot) return;

            // Trova stato concorrenza per questo orario
            const statoOrario = statoConcorrenza.slot[orario];

            if (statoOrario) {
                switch (statoOrario.stato) {
                    case 'disponibile':
                        // Slot libero
                        this.updateSlotState(slot, orario, 'available', 'Disponibile');
                        break;

                    case 'occupato_temporaneo':
                        // Slot occupato da prenotazione in attesa (15 min)
                        const tempoRimanente = Math.max(0, Math.ceil((statoOrario.scadenza - Date.now()) / 1000));
                        this.updateSlotState(slot, orario, 'occupied', `Occupato (libera in ${tempoRimanente}s)`);

                        // Se è scaduto, aggiorna automaticamente
                        if (tempoRimanente <= 0) {
                            this.updateSlotState(slot, orario, 'available', 'Disponibile');
                        }
                        break;

                    case 'prenotato_confermato':
                        // Slot prenotato e pagato
                        this.updateSlotState(slot, orario, 'booked', 'Prenotato e pagato');
                        break;

                    case 'in_prenotazione':
                        // Slot in fase di prenotazione da altro utente
                        this.updateSlotState(slot, orario, 'occupied', 'In prenotazione da altro utente');
                        break;

                    default:
                        // Stato sconosciuto, mantieni quello attuale
                        break;
                }
            }
        });

        console.log('✅ Aggiornamento concorrenza completato');
    },

    // Aggiorna stato concorrenza dal backend
    async updateConcurrencyStatus() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/concorrenza/spazi/${selectedSpazio.id_spazio}/stato-concorrenza`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const statoConcorrenza = await response.json();
                console.log('📊 Stato concorrenza aggiornato:', statoConcorrenza);

                // Aggiorna slot con stato concorrenza
                this.updateSlotsFromConcurrency(statoConcorrenza);
            }
        } catch (error) {
            console.error('❌ Errore aggiornamento concorrenza:', error);
        }
    },

    // Ottieni slot selezionati dall'utente
    getSelectedSlots() {
        const selectedSlots = [];
        this.slots.forEach((slotInfo, orario) => {
            if (slotInfo.stato === 'selected') {
                selectedSlots.push(orario);
            }
        });
        return selectedSlots;
    },

    // Aggiorna slot basato su stato locale (fallback)
    updateSlotsFromLocalState() {
        const now = new Date();

        document.querySelectorAll('.time-slot').forEach(slot => {
            const orario = slot.textContent.trim();
            const slotDate = new Date(window.selectedDateInizio);
            slotDate.setHours(parseInt(orario.split(':')[0]), 0, 0, 0);

            let stato = 'available';
            let motivo = '';

            if (slotDate < now) {
                stato = 'past-time';
                motivo = 'Orario passato';
            }

            this.updateSlotState(slot, orario, stato, motivo);
        });
    },

    // Aggiorna stato di un singolo slot
    updateSlotState(slot, orario, stato, motivo) {
        console.log('🎨 updateSlotState chiamato:', { orario, stato, motivo, slotElement: slot });

        // Rimuovi classi precedenti
        slot.classList.remove('available', 'occupied', 'booked', 'past-time', 'expired', 'selected');

        // Aggiungi nuova classe
        slot.classList.add(stato);

        console.log('🎨 Classi dopo aggiornamento:', slot.classList.toString());

        // Aggiorna stile e comportamento
        switch (stato) {
            case 'available':
                slot.style.cursor = 'pointer';
                slot.title = 'Disponibile';
                break;
            case 'selected':
                slot.style.cursor = 'pointer';
                slot.title = 'Selezionato';
                break;
            case 'occupied':
                slot.style.cursor = 'not-allowed';
                slot.title = `Occupato: ${motivo}`;
                break;
            case 'booked':
                slot.style.cursor = 'not-allowed';
                slot.title = `Prenotato: ${motivo}`;
                break;
            case 'past-time':
                slot.style.cursor = 'not-allowed';
                slot.title = `Orario passato`;
                break;
        }

        // Aggiorna mappa locale
        this.slots.set(orario, { stato, motivo, timestamp: Date.now() });

        console.log('🎨 Stato slot aggiornato:', { orario, stato, motivo, classi: slot.classList.toString() });
    },

    // Aggiorna lo stato di un intervallo di slot
    updateSlotRange(startTime, endTime, newStato, motivo) {
        const orarioInizio = parseInt(startTime.split(':')[0]);
        const orarioFine = parseInt(endTime.split(':')[0]);

        for (let hour = orarioInizio; hour < orarioFine; hour++) {
            const orario = `${hour.toString().padStart(2, '0')}:00`;
            this.updateSlotState(document.querySelector(`.time-slot[data-orario="${orario}"]`), orario, newStato, motivo);
        }
    },

    // Verifica disponibilità per un intervallo specifico
    async checkAvailability(startTime, endTime) {
        try {
            // Costruisci le date complete per l'intervallo selezionato
            const dataInizio = new Date(window.selectedDateInizio);
            const dataFine = new Date(window.selectedDateFine);

            // Imposta gli orari specifici
            const [oraInizio] = startTime.split(':');
            const [oraFine] = endTime.split(':');

            dataInizio.setHours(parseInt(oraInizio), 0, 0, 0);
            dataFine.setHours(parseInt(oraFine), 0, 0, 0);

            // IMPORTANTE: Mantieni il timezone locale invece di convertire in UTC
            // Calcola l'offset del timezone locale
            const timezoneOffset = dataInizio.getTimezoneOffset() * 60000; // in millisecondi

            // Crea le date in formato locale (senza conversione UTC)
            const dataInizioLocale = new Date(dataInizio.getTime() - timezoneOffset);
            const dataFineLocale = new Date(dataFine.getTime() - timezoneOffset);

            console.log('🔍 Verifica disponibilità per:', {
                spazio: window.selectedSpazio.id_spazio,
                dataInizioOriginale: dataInizio.toLocaleString('it-IT'),
                dataFineOriginale: dataFine.toLocaleString('it-IT'),
                dataInizioLocale: dataInizioLocale.toLocaleString('it-IT'),
                dataFineLocale: dataFineLocale.toLocaleString('it-IT'),
                startTime,
                endTime,
                timezoneOffset: timezoneOffset / 60000 + ' minuti'
            });

            const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${window.selectedSpazio.id_spazio}/disponibilita?data_inizio=${dataInizioLocale.toISOString()}&data_fine=${dataFineLocale.toISOString()}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Verifica disponibilità:', result);

                // Se non è disponibile, aggiorna lo stato degli slot
                if (!result.disponibile && result.motivo) {
                    console.log('❌ Slot non disponibile:', result.motivo);
                    console.log('🔍 Motivo completo:', result);
                    // Aggiorna lo stato degli slot nell'intervallo
                    this.updateSlotRange(startTime, endTime, 'occupied', result.motivo);
                }

                return result.disponibile;
            }

            console.log('⚠️ Errore verifica disponibilità:', response.status);
            return false;
        } catch (error) {
            console.error('❌ Errore verifica disponibilità:', error);
            return false;
        }
    }
};

// RIMUOVO COMPLETAMENTE TIMER E NOTIFICHE
// notificationSystem è stato eliminato

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 selezione-slot.js - DOMContentLoaded - Pagina caricata!');
    console.log('📍 URL corrente:', window.location.href);
    console.log('📄 Nome pagina:', window.location.pathname);

    // Inizializza la navbar universale
    if (typeof window.initializeNavbar === 'function') {
        console.log('✅ Funzione initializeNavbar disponibile');
        window.initializeNavbar();
    } else {
        console.log('❌ Funzione initializeNavbar non disponibile');
    }

    // Inizializza la pagina
    console.log('🔄 Chiamo initializePage...');
    initializePage();
});

// Inizializza la pagina
async function initializePage() {
    console.log('🚀 FUNZIONE INITIALIZEPAGE CHIAMATA!');

    try {
        console.log('🔄 Caricamento sedi...');
        // Carica le sedi
        await loadSedi();

        console.log('🔄 Inizializzazione calendario...');
        // Inizializza il calendario
        initializeCalendar();

        console.log('🔄 Configurazione event listener...');
        // Configura gli event listener
        setupEventListeners();

        console.log('🔄 Gestione parametri URL...');
        // Gestisci i parametri URL se presenti
        handleUrlParameters();

        // Nota: il redirect post-login ora gestisce direttamente il passaggio al pagamento

        console.log('✅ Pagina inizializzata correttamente');

        // Inizializza il sistema di gestione slot real-time solo se le sedi sono caricate
        if (window.sediLoaded) {
            initializeSlotManager();
        } else {
            console.log('⏳ Sedi non ancora caricate, rimando inizializzazione slot manager...');
        }
        // notificationSystem.init(); // Inizializza il sistema di notifiche - Rimosso

    } catch (error) {
        console.error('❌ Errore durante l\'inizializzazione:', error);
        showError('Errore durante l\'inizializzazione: ' + error.message);
    }
}

// Carica le sedi disponibili
async function loadSedi() {
    try {
        console.log('🔄 Caricamento sedi...');
        console.log('📍 API Base:', window.CONFIG.API_BASE);
        console.log('⏰ Inizio richiesta:', new Date().toISOString());

        // Aggiungi timeout e controller per la richiesta
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn('⚠️ Timeout richiesta sedi (10s) - Annullo richiesta');
            controller.abort();
        }, 10000); // 10 secondi di timeout

        const startTime = Date.now();

        const response = await fetch(`${window.CONFIG.API_BASE}/sedi`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        clearTimeout(timeoutId);
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ Richiesta completata in ${duration}ms`);
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`🔗 Headers:`, Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Risposta non OK:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Errore caricamento sedi: ${response.status} - ${response.statusText}`);
        }

        // Aggiorna la variabile globale sedi
        window.sedi = await response.json();
        console.log('✅ Sedi caricate:', window.sedi);
        console.log(`📋 Numero sedi: ${window.sedi.length}`);

        // Popola il select delle sedi
        populateSedeSelect();

        // Marca le sedi come caricate con successo
        window.sediLoaded = true;

    } catch (error) {
        console.error('❌ Errore caricamento sedi:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });

        // Gestione specifica per diversi tipi di errore
        if (error.name === 'AbortError') {
            console.error('🚫 Richiesta annullata per timeout');
            throw new Error('Timeout caricamento sedi: la richiesta ha impiegato troppo tempo');
        } else if (error.message.includes('Failed to fetch')) {
            console.error('🌐 Errore di rete - impossibile raggiungere il server');
            throw new Error('Errore di connessione: impossibile raggiungere il server');
        } else if (error.message.includes('Unexpected token')) {
            console.error('📄 Errore parsing JSON - risposta non valida');
            throw new Error('Errore parsing risposta: il server ha restituito dati non validi');
        }

        // Mostra errore e pulsante retry invece di continuare
        showSediError(error.message);
        throw error;
    }
}

// Popola il select delle sedi
function populateSedeSelect() {
    const sedeSelect = document.getElementById('sedeSelect');

    // Pulisci le opzioni esistenti
    sedeSelect.innerHTML = '<option value="">Seleziona una sede...</option>';

    // Aggiungi le sedi dalla variabile globale
    if (window.sedi && window.sedi.length > 0) {
        window.sedi.forEach(sede => {
            const option = document.createElement('option');
            option.value = sede.id_sede;
            option.textContent = `${sede.nome} - ${sede.citta}`;
            sedeSelect.appendChild(option);
        });
        console.log(`✅ Dropdown sedi popolato con ${window.sedi.length} sedi`);
    } else {
        console.warn('⚠️ Nessuna sede disponibile per popolare il dropdown');
        sedeSelect.innerHTML = '<option value="">Nessuna sede disponibile</option>';
    }
}

// Gestisce errori nel caricamento sedi
function showSediError(errorMessage) {
    const sedeSelect = document.getElementById('sedeSelect');
    const container = sedeSelect.parentElement;

    // Mostra messaggio di errore
    sedeSelect.innerHTML = '<option value="">Errore caricamento sedi</option>';
    sedeSelect.disabled = true;

    // Aggiungi pulsante retry
    if (!document.getElementById('retrySediBtn')) {
        const retryBtn = document.createElement('button');
        retryBtn.id = 'retrySediBtn';
        retryBtn.className = 'btn btn-warning btn-sm mt-2';
        retryBtn.innerHTML = '🔄 Riprova Caricamento Sedi';
        retryBtn.onclick = () => {
            sedeSelect.disabled = false;
            sedeSelect.innerHTML = '<option value="">Caricamento in corso...</option>';
            retryBtn.remove();
            loadSedi();
        };
        container.appendChild(retryBtn);
    }

    console.error('🚫 Caricamento sedi fallito:', errorMessage);
}

// Carica gli spazi per una sede specifica
async function loadSpazi(sedeId) {
    try {
        console.log(`🔄 Caricamento spazi per sede ${sedeId}...`);
        console.log(`📍 API Base: ${window.CONFIG.API_BASE}/spazi?id_sede=${sedeId}`);
        console.log(`⏰ Inizio richiesta:`, new Date().toISOString());

        // Aggiungi timeout e controller per la richiesta
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn('⚠️ Timeout richiesta spazi (10s) - Annullo richiesta');
            controller.abort();
        }, 10000); // 10 secondi di timeout

        const startTime = Date.now();

        const response = await fetch(`${window.CONFIG.API_BASE}/spazi?id_sede=${sedeId}`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        clearTimeout(timeoutId);
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ Richiesta spazi completata in ${duration}ms`);
        console.log(`📊 Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Risposta spazi non OK:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Errore caricamento spazi: ${response.status} - ${response.statusText}`);
        }

        // Aggiorna la variabile globale spazi
        window.spazi = await response.json();
        console.log('✅ Spazi caricati:', window.spazi);
        console.log(`📋 Numero spazi: ${window.spazi.length}`);

        // Popola il select degli spazi
        populateSpazioSelect();

    } catch (error) {
        console.error('❌ Errore caricamento spazi:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });

        // Gestione specifica per diversi tipi di errore
        if (error.name === 'AbortError') {
            console.error('🚫 Richiesta spazi annullata per timeout');
            showError('Timeout caricamento spazi: la richiesta ha impiegato troppo tempo');
        } else if (error.message.includes('Failed to fetch')) {
            console.error('🌐 Errore di rete per spazi - impossibile raggiungere il server');
            showError('Errore di connessione: impossibile raggiungere il server');
        } else {
            showError('Errore caricamento spazi: ' + error.message);
        }
    }
}

// Gestisce i parametri URL per pre-selezionare sede, spazio e date
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Gestisci sede
    const sedeId = urlParams.get('sede');
    if (sedeId) {
        console.log('🔄 Pre-selezione sede da URL:', sedeId);
        setTimeout(() => {
            document.getElementById('sedeSelect').value = sedeId;
            // Trigger change event per caricare gli spazi
            document.getElementById('sedeSelect').dispatchEvent(new Event('change'));
        }, 100);
    }

    // Gestisci spazio
    const spazioId = urlParams.get('spazio');
    if (spazioId) {
        console.log('🔄 Pre-selezione spazio da URL:', spazioId);
        // Aspetta che gli spazi siano caricati
        setTimeout(() => {
            document.getElementById('stanzaSelect').value = spazioId;
            document.getElementById('stanzaSelect').dispatchEvent(new Event('change'));
        }, 500);
    }

    // Gestisci date (dal catalogo)
    const dataInizio = urlParams.get('dataInizio');
    const dataFine = urlParams.get('dataFine');
    if (dataInizio && dataFine) {
        console.log('🔄 Pre-selezione date da URL:', dataInizio, dataFine);
        // Aspetta che il calendario sia inizializzato
        setTimeout(() => {
            if (datePicker) {
                datePicker.setDate([dataInizio, dataFine], true);
                // Trigger change event per aggiornare la selezione
                document.dispatchEvent(new Event('dateSelected'));
            }
        }, 1000);
    }
}

// Nota: la gestione del redirect post-login è ora gestita direttamente in main.js
// per reindirizzare al pagamento senza passare per selezione-slot

// Popola il select degli spazi
function populateSpazioSelect() {
    const spazioSelect = document.getElementById('stanzaSelect');

    // Pulisci le opzioni esistenti
    spazioSelect.innerHTML = '<option value="">Seleziona una stanza...</option>';

    // Aggiungi gli spazi dalla variabile globale
    if (window.spazi && window.spazi.length > 0) {
        window.spazi.forEach(spazio => {
            const option = document.createElement('option');
            option.value = spazio.id_spazio;
            option.textContent = `${spazio.nome} (${spazio.tipo})`;
            option.dataset.tipo = spazio.tipo;
            option.dataset.capacita = spazio.capacita;
            option.dataset.prezzo = spazio.prezzo_ora || 10; // Prezzo default 10€/ora
            spazioSelect.appendChild(option);
        });
        console.log(`✅ Dropdown spazi popolato con ${window.spazi.length} spazi`);
    } else {
        console.warn('⚠️ Nessuno spazio disponibile per popolare il dropdown');
        spazioSelect.innerHTML = '<option value="">Nessuno spazio disponibile</option>';
    }

    // Abilita il select
    spazioSelect.disabled = false;
}

// Inizializza il calendario
function initializeCalendar() {
    const datePickerElement = document.getElementById('datePicker');

    // Configurazione Flatpickr per selezione intervallo
    datePicker = flatpickr(datePickerElement, {
        locale: 'it',
        dateFormat: 'd/m/Y',
        minDate: 'today',
        maxDate: new Date().fp_incr(30), // 30 giorni da oggi
        mode: 'range', // Abilita selezione intervallo
        disable: [
            function (date) {
                // Disabilita i weekend (sabato = 6, domenica = 0)
                return date.getDay() === 0 || date.getDay() === 6;
            }
        ],
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                window.selectedDateInizio = selectedDates[0];
                window.selectedDateFine = selectedDates[1];
                console.log('📅 Date selezionate:', selectedDateInizio, 'a', selectedDateFine);

                // Carica gli orari disponibili per la data selezionata
                if (window.selectedSede && window.selectedSpazio) {
                    console.log('✅ Sede e spazio selezionati, chiamo loadOrariDisponibili');
                    loadOrariDisponibili();
                } else {
                    console.log('⚠️ Sede o spazio non selezionati, non posso caricare orari');
                }

                // Aggiorna il riepilogo
                updateSummary();
            } else if (selectedDates.length === 1) {
                // Reset se viene selezionata solo una data
                window.selectedDateInizio = null;
                window.selectedDateFine = null;
                hideSummary();
            }
        }
    });

    console.log('✅ Calendario inizializzato');
}

// Configura gli event listener
function setupEventListeners() {
    // Select sede
    document.getElementById('sedeSelect').addEventListener('change', function (e) {
        const sedeId = e.target.value;

        if (sedeId) {
            window.selectedSede = window.sedi.find(s => s.id_sede == sedeId);
            console.log('🏢 Sede selezionata:', window.selectedSede);

            // Carica gli spazi per questa sede
            loadSpazi(sedeId);

            // Reset selezione spazio
            window.selectedSpazio = null;
            document.getElementById('stanzaSelect').value = '';
            document.getElementById('stanzaSelect').disabled = true;

            // Reset calendario
            if (datePicker) {
                datePicker.clear();
                window.selectedDateInizio = null;
                window.selectedDateFine = null;
            }

            // Nascondi riepilogo
            hideSummary();

        } else {
            window.selectedSede = null;
            document.getElementById('stanzaSelect').disabled = true;
            document.getElementById('stanzaSelect').innerHTML = '<option value="">Prima seleziona una sede...</option>';
        }
    });

    // Select spazio
    document.getElementById('stanzaSelect').addEventListener('change', function (e) {
        const spazioId = e.target.value;

        if (spazioId) {
            selectedSpazio = window.spazi.find(s => s.id_spazio == spazioId);
            console.log('🚪 Spazio selezionato:', selectedSpazio);

            // Reset calendario
            if (datePicker) {
                datePicker.clear();
                window.selectedDateInizio = null;
                window.selectedDateFine = null;
            }

            // Nascondi riepilogo
            hideSummary();

        } else {
            window.selectedSpazio = null;
        }
    });

    // Pulsante prenota
    document.getElementById('btnBook').addEventListener('click', function () {
        console.log('🖱️ Pulsante Prenota Ora cliccato!');
        if (validateSelection()) {
            console.log('✅ Selezione valida, chiamo proceedToBooking');
            proceedToBooking().catch(error => {
                console.error('❌ Errore in proceedToBooking:', error);
                showError('Errore durante la prenotazione: ' + error.message);
            });
        } else {
            console.log('❌ Selezione non valida, non chiamo proceedToBooking');
        }
    });
}

// Carica gli orari disponibili per la data selezionata
async function loadOrariDisponibili() {
    console.log('🔄 loadOrariDisponibili chiamata');
    console.log('📍 Stato selezione:', { selectedSede: window.selectedSede, selectedSpazio: window.selectedSpazio, selectedDateInizio: window.selectedDateInizio, selectedDateFine: window.selectedDateFine });

    if (!window.selectedSede || !window.selectedSpazio) {
        console.log('⚠️ Sede o spazio non selezionati');
        return;
    }

    if (!window.selectedDateInizio || !window.selectedDateFine) {
        console.log('⚠️ Date non selezionate');
        return;
    }

    try {
        console.log(`🔄 Caricamento orari disponibili dal ${window.selectedDateInizio.toLocaleDateString('it-IT')} al ${window.selectedDateFine.toLocaleDateString('it-IT')}...`);

        // Inizializza il slotManager se non è ancora stato fatto
        if (!slotManager.initialized) {
            console.log('🔄 Inizializzazione slotManager...');
            initializeSlotManager();
        }

        console.log('📅 Caricamento orari per l\'intervallo selezionato');
        const disponibilita = await getOrariDisponibili();
        console.log('✅ Chiamo displayTimeSlots con:', disponibilita);
        await displayTimeSlots(disponibilita);

    } catch (error) {
        console.error('❌ Errore caricamento orari disponibili:', error);
        showError('Errore caricamento orari disponibili: ' + error.message);
    }
}

// Mostra gli slot temporali disponibili
async function displayTimeSlots(disponibilita) {
    const timeSlotsContainer = document.getElementById('timeSlots');

    console.log('🔍 displayTimeSlots chiamata, container:', timeSlotsContainer);

    if (!timeSlotsContainer) {
        console.error('❌ Container timeSlots non trovato!');
        return;
    }

    // Orari di apertura (9:00 - 18:00)
    const orariApertura = [];
    for (let hour = 9; hour <= 17; hour++) {
        orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    console.log('⏰ Orari apertura:', orariApertura);

    // Pulisci il container
    timeSlotsContainer.innerHTML = '';

    // Crea gli slot temporali
    for (const orario of orariApertura) {
        console.log('🔨 Creo slot per orario:', orario);

        const slot = document.createElement('div');
        slot.className = 'time-slot available';
        slot.textContent = orario;
        slot.dataset.orario = orario;

        // Aggiungi event listener per tutti gli slot
        slot.addEventListener('click', () => selectTimeSlot(orario, slot));
        slot.title = 'Clicca per selezionare orario inizio/fine';

        // Applica solo la classe CSS per compatibilità
        slot.classList.add('time-slot', 'available');

        timeSlotsContainer.appendChild(slot);
        console.log('✅ Slot creato e aggiunto:', slot);
    }

    // Mostra il container
    timeSlotsContainer.style.display = 'block';

    // Assicurati che il container sia visibile
    const timeSlotsSection = document.getElementById('timeSlots');
    if (timeSlotsSection) {
        timeSlotsSection.style.display = 'block';
        console.log('🎯 Sezione timeSlots resa visibile');
    }

    console.log('🎯 Container slot mostrato, slot creati:', timeSlotsContainer.children.length);
    console.log('🎯 Container HTML:', timeSlotsContainer.innerHTML.substring(0, 200) + '...');

    // Verifica che gli slot siano visibili
    const createdSlots = timeSlotsContainer.querySelectorAll('.time-slot');
    console.log('🔍 Slot creati e trovati nel DOM:', createdSlots.length);
    createdSlots.forEach((slot, index) => {
        console.log(`🔍 Slot ${index + 1}:`, {
            text: slot.textContent,
            visible: slot.offsetParent !== null,
            display: window.getComputedStyle(slot).display,
            backgroundColor: window.getComputedStyle(slot).backgroundColor
        });
    });

    // COMMENTO TEMPORANEAMENTE - Il slotManager sta causando problemi
    // await slotManager.updateAllSlots();

    // Riabilito il slotManager ora che le API sono disponibili
    await slotManager.updateAllSlots();

    if (orariApertura.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="text-muted">Nessun orario disponibile per questa data</p>';
    }
}

// Verifica disponibilità di un orario specifico
async function checkTimeAvailability(orario, disponibilita) {
    console.log('🔍 checkTimeAvailability chiamato per:', orario);

    const now = new Date();
    const selectedDate = window.selectedDateInizio;

    // Crea la data completa per l'orario selezionato
    const [hour] = orario.split(':');
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(parseInt(hour), 0, 0, 0);

    // Se la data è passata, lo slot è scaduto
    if (selectedDate < now.toDateString()) {
        return { available: false, reason: 'expired', class: 'expired' };
    }

    // Se è oggi e l'orario è passato, lo slot è scaduto
    if (selectedDate.toDateString() === now.toDateString() && slotDateTime < now) {
        return { available: false, reason: 'past-time', class: 'past-time' };
    }

    // Usa il sistema di gestione slot real-time
    const slot = slotManager.slots.get(orario);

    if (slot) {
        console.log('📋 Stato slot da cache:', slot);
        return {
            available: slot.stato === 'available',
            reason: slot.motivo,
            class: slot.stato
        };
    }

    // Se non è in cache, è disponibile (verrà aggiornato dal manager)
    console.log('✅ Orario', orario, 'non in cache, considerato disponibile');
    return { available: true, reason: 'available', class: 'available' };
}

// Funzione per bloccare gli slot intermedi quando si seleziona un intervallo
function blockIntermediateSlots(startTime, endTime) {
    console.log('🔒 Blocco slot intermedi:', { startTime, endTime });

    // Trova tutti gli slot nell'intervallo selezionato
    const timeSlots = document.querySelectorAll('.time-slot');

    timeSlots.forEach(slot => {
        const slotTime = slot.textContent.trim();

        // Se lo slot è nell'intervallo selezionato, bloccalo
        if (slotTime >= startTime && slotTime < endTime) {
            // Non rimuovere la classe 'selected' dagli slot estremi
            if (slotTime !== startTime && slotTime !== endTime) {
                // Mantieni la classe 'available' ma aggiungi 'intermediate' per l'animazione
                slot.classList.remove('selected');
                slot.classList.add('intermediate');
                // Rimuovi stili inline per permettere al CSS di funzionare
                slot.style.removeProperty('cursor');
                slot.style.cursor = 'not-allowed';
                slot.title = 'Slot intermedio selezionato';
                console.log('🚫 Slot bloccato:', slotTime);
            }
        }
    });
}

// Seleziona uno slot temporale
async function selectTimeSlot(orario, slotElement) {
    console.log('🎯 selectTimeSlot chiamata:', { orario, slotElement, classList: slotElement.classList.toString() });

    // Se è già selezionato, lo deseleziona
    if (slotElement.classList.contains('selected')) {
        console.log('🔄 Deseleziono slot:', orario);
        slotElement.classList.remove('selected');
        window.selectedTimeInizio = null;
        window.selectedTimeFine = null;

        // Rimuovi tutti i blocchi e ripristina gli slot
        document.querySelectorAll('.time-slot').forEach(slot => {
            // Rimuovi tutte le classi di stato
            slot.classList.remove('selected', 'occupied', 'intermediate');
            // Ripristina la classe 'available' per tutti gli slot
            slot.classList.add('available');
            // Rimuovi stili inline per permettere al CSS di funzionare
            slot.style.removeProperty('cursor');
            // Ripristina il titolo originale
            slot.title = 'Clicca per selezionare orario inizio/fine';
        });

        hideSummary();
        return;
    }

    // Se è il primo orario selezionato
    if (!selectedTimeInizio) {
        // Rimuovi selezione precedente
        document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));

        // Seleziona il primo slot
        slotElement.classList.add('selected');
        window.selectedTimeInizio = orario;
        window.selectedTimeFine = null;

        console.log('⏰ Orario inizio selezionato:', window.selectedTimeInizio);
        console.log('🎨 Slot selezionato, classi:', slotElement.classList.toString());

        // Mostra messaggio per selezionare l'orario di fine
        showTimeSelectionMessage('Seleziona ora l\'orario di fine');

    } else {
        // È il secondo orario (fine)
        // Verifica che sia successivo all'orario di inizio
        const orarioInizio = parseInt(window.selectedTimeInizio.split(':')[0]);
        const orarioFine = parseInt(orario.split(':')[0]);

        if (orarioFine <= orarioInizio) {
            showError('L\'orario di fine deve essere successivo all\'orario di inizio');
            return;
        }

        // Seleziona il secondo slot
        slotElement.classList.add('selected');
        window.selectedTimeFine = orario;

        console.log('⏰ Orario fine selezionato:', window.selectedTimeFine);

        // Blocca gli slot intermedi
        blockIntermediateSlots(window.selectedTimeInizio, window.selectedTimeFine);

        // VERIFICA DISPONIBILITÀ FINALE PRIMA DI ABILITARE IL BOTTONE
        console.log('🔍 Verifica disponibilità finale prima di abilitare il bottone...');
        const disponibile = await slotManager.checkAvailability(window.selectedTimeInizio, window.selectedTimeFine);

        if (!disponibile) {
            // Slot non disponibile, disabilita il bottone e mostra errore
            document.getElementById('btnBook').disabled = true;
            // Rimuovi stili inline per permettere al CSS di funzionare
            document.getElementById('btnBook').classList.remove('btn-danger');
            document.getElementById('btnBook').textContent = 'Slot Non Disponibile';
            showError('🚫 Slot non disponibile per l\'orario selezionato');
            return;
        }

        // Aggiorna il riepilogo
        updateSummary();

        // Mostra il riepilogo
        showSummary();
    }
}

// Verifica disponibilità finale prima di abilitare il bottone
async function verificaDisponibilitaFinale() {
    console.log('🔍 Verifica disponibilità finale per slot selezionati...');

    try {
        // Recupera disponibilità per lo spazio e data selezionati
        const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${window.selectedSpazio.id_spazio}/disponibilita`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const disponibilita = await response.json();
            console.log('📋 Disponibilità per lo spazio:', disponibilita);

            // Verifica se lo spazio è disponibile per la data e orario selezionati
            if (disponibilita.disponibile === false) {
                console.log('🚫 Spazio non disponibile:', disponibilita.motivo);
                return {
                    disponibile: false,
                    motivo: disponibilita.motivo || 'Spazio non disponibile per l\'orario selezionato'
                };
            }

            console.log('✅ Spazio disponibile per l\'orario selezionato');
            return { disponibile: true };
        } else {
            console.log('⚠️ Impossibile verificare disponibilità spazio');
            return { disponibile: true }; // Procedi se non puoi verificare
        }
    } catch (error) {
        console.log('⚠️ Errore verifica disponibilità finale:', error.message);
        return { disponibile: true }; // Procedi se c'è un errore
    }
}

// Aggiorna il riepilogo della selezione
function updateSummary() {
    if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio && window.selectedDateFine && window.selectedTimeInizio && window.selectedTimeFine) {
        document.getElementById('summarySede').textContent = window.selectedSede.nome;
        document.getElementById('summaryStanza').textContent = window.selectedSpazio.nome;
        document.getElementById('summaryData').textContent = `${window.selectedDateInizio.toLocaleDateString('it-IT')} - ${window.selectedDateFine.toLocaleDateString('it-IT')}`;
        document.getElementById('summaryOrario').textContent = `${window.selectedTimeInizio} - ${window.selectedTimeFine}`;

        // Calcola il prezzo totale per il numero di giorni e ore
        const giorni = Math.ceil((window.selectedDateFine - window.selectedDateInizio) / (1000 * 60 * 60 * 24)) + 1;
        const ore = parseInt(window.selectedTimeFine.split(':')[0]) - parseInt(window.selectedTimeInizio.split(':')[0]);
        const prezzoTotale = (window.selectedSpazio.prezzo_ora || 10) * giorni * Math.max(1, ore);
        document.getElementById('summaryPrezzo').textContent = `€${prezzoTotale}`;

        // Abilita il pulsante prenota
        document.getElementById('btnBook').disabled = false;
        document.getElementById('btnBook').textContent = 'Prenota Ora';
        // Rimuovi eventuali classi di errore
        document.getElementById('btnBook').classList.remove('btn-danger');
    }
}

// Mostra il riepilogo
function showSummary() {
    document.getElementById('summaryCard').classList.remove('hidden');
}

// Nascondi il riepilogo
function hideSummary() {
    document.getElementById('summaryCard').classList.add('hidden');
    document.getElementById('btnBook').disabled = true;

    // Rimuovi messaggi di selezione orario
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (timeSlotsContainer) {
        timeSlotsContainer.querySelectorAll('.alert').forEach(alert => alert.remove());
    }

    // Ripristina tutti gli slot quando si nasconde il riepilogo
    document.querySelectorAll('.time-slot').forEach(slot => {
        // Rimuovi tutte le classi di stato
        slot.classList.remove('selected', 'occupied', 'intermediate');
        // Ripristina la classe 'available' per tutti gli slot
        slot.classList.add('available');
        // Rimuovi stili inline per permettere al CSS di funzionare
        slot.style.removeProperty('cursor');
        // Ripristina il titolo originale
        slot.title = 'Clicca per selezionare orario inizio/fine';
    });
}

// Valida la selezione completa
function validateSelection() {
    if (!window.selectedSede) {
        showError('Seleziona una sede');
        return false;
    }

    if (!window.selectedSpazio) {
        showError('Seleziona una stanza');
        return false;
    }

    if (!window.selectedDateInizio || !window.selectedDateFine) {
        showError('Seleziona un intervallo di date');
        return false;
    }

    if (!window.selectedTimeInizio || !window.selectedTimeFine) {
        showError('Seleziona un intervallo di orari (inizio e fine)');
        return false;
    }

    return true;
}

// Procede alla prenotazione
async function proceedToBooking() {
    console.log('🚀 FUNZIONE PROCEEDTOBOOKING CHIAMATA!');

    try {
        console.log('🚀 Procedo alla prenotazione...');

        // Controlla se l'utente è loggato
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        console.log('🔍 Debug autenticazione:', {
            user: user ? 'presente' : 'mancante',
            token: token ? 'presente' : 'mancante',
            userContent: user ? JSON.parse(user) : null
        });

        // Log più dettagliati per debug
        console.log('🔍 Valori localStorage grezzi:');
        console.log('  - user (tipo):', typeof user, 'valore:', user);
        console.log('  - token (tipo):', typeof token, 'valore:', token);
        console.log('  - user === null:', user === null);
        console.log('  - user === "":', user === "");
        console.log('  - token === null:', token === null);
        console.log('  - token === "":', token === "");

        if (!user || !token) {
            console.log('🔐 Utente non loggato, reindirizzamento al login...');
            console.log('  - !user:', !user);
            console.log('  - !token:', !token);

            // Se l'utente è presente ma manca il token, potrebbe essere un bug
            if (user && !token) {
                console.log('⚠️ PROBLEMA RILEVATO: User presente ma token mancante!');
                console.log('🔍 Dettagli user:', user);

                try {
                    const userData = JSON.parse(user);
                    if (userData.message === 'Login effettuato') {
                        console.log('🚨 ERRORE: Utente ha messaggio di login ma token mancante');
                        console.log('💡 Possibili cause:');
                        console.log('   1. Bug nel backend (token non generato)');
                        console.log('   2. Bug nel frontend (token non salvato)');
                        console.log('   3. Problema di localStorage');

                        // Mostra errore all'utente
                        showError('Errore di autenticazione: token mancante. Effettua nuovamente il login.');

                        // Usa la funzione centralizzata per forzare il re-login
                        if (typeof window.forceReLogin === 'function') {
                            setTimeout(() => {
                                window.forceReLogin('Token di autenticazione mancante');
                            }, 2000);
                        } else {
                            // Fallback se la funzione non è disponibile
                            setTimeout(() => {
                                localStorage.removeItem('user');
                                localStorage.removeItem('token');
                                window.location.href = 'login.html?message=' + encodeURIComponent('Errore di autenticazione. Effettua nuovamente il login.');
                            }, 2000);
                        }
                        return;
                    }
                } catch (error) {
                    console.error('❌ Errore parsing user:', error);
                }
            }

            // Salva i dati della prenotazione per il redirect post-login
            const prenotazioneData = {
                sede: window.selectedSede.id_sede,
                spazio: window.selectedSpazio.id_spazio,
                dataInizio: window.selectedDateInizio.toISOString().split('T')[0],
                dataFine: window.selectedDateFine.toISOString().split('T')[0],
                orarioInizio: window.selectedTimeInizio,
                orarioFine: window.selectedTimeFine,
                prezzo: window.selectedSpazio.prezzo_ora || 10,
                timestamp: Date.now() // Aggiungi timestamp per pulizia automatica
            };

            localStorage.setItem('pendingPrenotazione', JSON.stringify(prenotazioneData));
            localStorage.setItem('redirectAfterLogin', window.location.href);

            // Reindirizza al login
            window.location.href = 'login.html?redirect=selezione-slot';
            return;
        }

        // Utente loggato, procede al pagamento
        console.log('✅ Utente loggato, procedo al pagamento...');

        // VERIFICA FINALE: Controlla che gli slot siano ancora disponibili
        console.log('🔍 Verifica finale disponibilità slot...');

        // TEMPORANEO: Per ora salta la verifica finale
        // TODO: Implementare quando le API saranno disponibili
        console.log('✅ Verifica finale saltata (API non ancora implementate)');

        // Prepara i parametri per la pagina di pagamento
        const params = new URLSearchParams({
            sede: window.selectedSede.id_sede,
            spazio: window.selectedSpazio.id_spazio,
            dal: window.selectedDateInizio.toISOString().split('T')[0],
            al: window.selectedDateFine.toISOString().split('T')[0],
            orarioInizio: window.selectedTimeInizio,
            orarioFine: window.selectedTimeFine
        });

        console.log('📋 Parametri URL per pagamento:', params.toString());

        // Reindirizza alla pagina di pagamento
        window.location.href = `pagamento.html?${params.toString()}`;

    } catch (error) {
        console.error('❌ Errore durante il reindirizzamento:', error);
        showError('Errore durante il reindirizzamento: ' + error.message);
    }
}



// Mostra messaggio di errore
function showError(message) {
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'error');
    } else {
        alert('Errore: ' + message);
    }
}

// Mostra messaggio di selezione orario
function showTimeSelectionMessage(message) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    const messageElement = document.createElement('div');
    messageElement.className = 'alert alert-info mt-3';
    messageElement.innerHTML = `
        <i class="fas fa-info-circle me-2"></i>
        ${message}
    `;

    // Rimuovi messaggi precedenti
    timeSlotsContainer.querySelectorAll('.alert').forEach(alert => alert.remove());

    // Aggiungi il nuovo messaggio
    timeSlotsContainer.appendChild(messageElement);
}

// Mostra messaggio di successo
function showSuccess(message) {
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'success');
    } else {
        alert('Successo: ' + message);
    }
}

// Verifica se uno slot è occupato (prenotato ma non pagato)
// TEMPORANEO: Per ora restituisce sempre false
async function checkSlotOccupancy(selectedDate, orario) {
    // TODO: Implementare quando le API saranno disponibili
    return false;
}

// Verifica se uno slot è già prenotato e pagato
// TEMPORANEO: Per ora restituisce sempre false
async function checkSlotBooked(selectedDate, orario) {
    // TODO: Implementare quando le API saranno disponibili
    return false;
}

// Converte il motivo di non disponibilità in testo leggibile
function getReasonText(reason) {
    switch (reason) {
        case 'expired':
            return 'Data scaduta';
        case 'past-time':
            return 'Orario già passato';
        case 'occupied':
            return 'Orario già prenotato';
        case 'booked':
            return 'Orario già pagato';
        case 'error':
            return 'Errore di verifica';
        default:
            return 'Non disponibile';
    }
}

// Inizializza il sistema di gestione slot
function initializeSlotManager() {
    console.log('🚀 Inizializzazione Slot Manager');

    // Aspetta che sede e spazio siano selezionati
    if (!window.selectedSede || !window.selectedSpazio) {
        console.log('⏳ Sede o spazio non ancora selezionati, rimando inizializzazione...');
        return false;
    }

    slotManager.init();
    return true;
}

// Ottiene gli orari disponibili dal backend
async function getOrariDisponibili() {
    try {
        // IMPORTANTE: Mantieni il timezone locale invece di convertire in UTC
        // Calcola l'offset del timezone locale
        const timezoneOffset = window.selectedDateInizio.getTimezoneOffset() * 60000; // in millisecondi

        // Crea le date in formato locale (senza conversione UTC)
        const dataInizioLocale = new Date(window.selectedDateInizio.getTime() - timezoneOffset);
        const dataFineLocale = new Date(window.selectedDateFine.getTime() - timezoneOffset);

        console.log('🌍 Date per orari disponibili:', {
            dataInizioOriginale: window.selectedDateInizio.toLocaleString('it-IT'),
            dataFineOriginale: window.selectedDateFine.toLocaleString('it-IT'),
            dataInizioLocale: dataInizioLocale.toLocaleString('it-IT'),
            dataFineLocale: dataFineLocale.toLocaleString('it-IT'),
            timezoneOffset: timezoneOffset / 60000 + ' minuti'
        });

        const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${window.selectedSpazio.id_spazio}/disponibilita?data_inizio=${dataInizioLocale.toISOString()}&data_fine=${dataFineLocale.toISOString()}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Orari disponibili ottenuti:', result);
            return result;
        } else {
            console.log('⚠️ Errore ottenimento orari disponibili:', response.status);
            // Fallback: tutti gli orari disponibili
            return { disponibile: true, orari: [] };
        }
    } catch (error) {
        console.error('❌ Errore ottenimento orari disponibili:', error);
        // Fallback: tutti gli orari disponibili
        return { disponibile: true, orari: [] };
    }
}
