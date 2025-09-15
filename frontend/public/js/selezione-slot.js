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

// Gestore slot semplificato
let slotManager = null;

// Nuovo sistema di selezione con START/END
let selectionState = {
    startSlot: null,    // ID del slot di inizio (blu)
    endSlot: null,      // ID del slot di fine (blu)
    allSelected: new Set() // Tutti gli slot selezionati (per calcoli)
};

// Inizializza il nuovo Slot Manager
async function initializeSlotManager() {


    if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
        const sedeId = window.selectedSede.id_sede;
        const spazioId = window.selectedSpazio.id_spazio;
        // Mantieni il timezone locale invece di convertire in UTC
        const year = window.selectedDateInizio.getFullYear();
        const month = String(window.selectedDateInizio.getMonth() + 1).padStart(2, '0');
        const day = String(window.selectedDateInizio.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;


        // Pulisci istanza precedente se esiste
        if (slotManager) {
            slotManager.cleanup();
        }

        // Reset selezione slot
        clearAllSelections();

        // PRIMA crea i bottoni degli slot con stati corretti
        await createTimeSlots();

        // POI crea nuova istanza di SimpleSlotManager
        if (typeof window.SimpleSlotManager === 'undefined') {
            console.error('❌ SimpleSlotManager non disponibile!');
            return false;
        }
        slotManager = new window.SimpleSlotManager();
        slotManager.init(sedeId, spazioId, date);
        window.slotManager = slotManager; // Esponi globalmente

        return true;
    }
    return false;
}

// Funzione per ottenere ID utente corrente
function getCurrentUserId() {
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

// Verifica disponibilità (SISTEMA SEMPLIFICATO)
async function checkAvailability(orarioInizio, orarioFine) {
    try {
        // Usa SimpleSlotManager se disponibile, altrimenti API diretta
        if (window.slotManager && window.slotManager.slotsStatus.size > 0) {
            return await window.slotManager.checkAvailability(orarioInizio, orarioFine);
        } else {
            return await checkAvailabilityFromAPI(orarioInizio, orarioFine);
        }
    } catch (error) {
        console.error('❌ Errore verifica disponibilità:', error);
        return false;
    }
}

// Funzione rimossa: checkAvailabilityFromSlotManager - ora gestita da SimpleSlotManager

// Funzione per applicare stato corretto a uno slot
function applySlotState(slot, status, slotData = {}) {
    // Rimuovi tutte le classi di stato precedenti
    slot.classList.remove('time-slot', 'slot-available', 'slot-booked', 'slot-occupied', 'slot-past', 'slot-selected', 'slot-start', 'slot-end', 'available', 'booked', 'occupied', 'past', 'selected');

    // Applica la classe base time-slot
    slot.classList.add('time-slot');

    // Applica nuovo stato
    switch (status) {
        case 'available':
            slot.classList.add('available', 'slot-available');
            slot.disabled = false;
            slot.title = 'Disponibile';
            break;
        case 'booked':
            slot.classList.add('booked', 'slot-booked');
            slot.disabled = true;
            slot.title = 'Prenotato';
            break;
        case 'occupied':
            // Tutti gli slot occupati sono non cliccabili, indipendentemente dall'utente
            slot.classList.add('occupied', 'slot-occupied');
            slot.disabled = true;
            slot.title = slotData.title || 'Occupato';
            break;
        case 'past':
            slot.classList.add('slot-past');
            slot.disabled = true;
            slot.title = 'Passato';
            break;
        default:
            slot.classList.add('slot-available');
            slot.disabled = false;
            slot.title = 'Disponibile';
    }
}

// ===== NUOVO SISTEMA DI SELEZIONE =====

// Gestisce il click su uno slot
async function handleSlotClick(slotId, slotElement) {
    // ✅ SISTEMA SEMPLIFICATO: toggle selezione singoli slot
    const slotIdStr = slotId.toString();
    
    if (selectionState.allSelected.has(slotIdStr)) {
        // Slot già selezionato → deseleziona
        deselectSlot(slotIdStr, slotElement);
    } else {
        // Slot non selezionato → seleziona
        selectSingleSlot(slotIdStr, slotElement);
    }
}

// Imposta uno slot come START (blu)
function setAsStart(slotId, slotElement) {

    // Pulisci selezione precedente
    clearAllSelections();

    // Imposta nuovo START
    selectionState.startSlot = slotId;
    selectionState.allSelected.add(slotId);

    // Applica stile START
    slotElement.classList.remove('slot-available', 'slot-booked', 'slot-occupied', 'slot-past');
    slotElement.classList.add('slot-start');
    slotElement.title = 'Inizio selezione';

    updateSelectionUI();
}

// Imposta uno slot come END (blu)
function setAsEnd(slotId, slotElement) {

    const startId = selectionState.startSlot;
    const startElement = document.querySelector(`[data-slot-id="${startId}"]`);

    if (!startElement) {
        console.error('❌ Elemento START non trovato:', startId);
        return;
    }

    // Determina range
    const minId = Math.min(startId, slotId);
    const maxId = Math.max(startId, slotId);

    // Pulisci selezione precedente
    clearAllSelections();

    // Imposta START e END
    selectionState.startSlot = minId;
    selectionState.endSlot = maxId;

    // Aggiungi tutti gli slot nel range
    for (let id = minId; id <= maxId; id++) {
        selectionState.allSelected.add(id);
    }

    // Applica stili
    startElement.classList.remove('slot-available', 'slot-booked', 'slot-occupied', 'slot-past');
    startElement.classList.add('slot-start');
    startElement.title = 'Inizio selezione';

    slotElement.classList.remove('slot-available', 'slot-booked', 'slot-occupied', 'slot-past');
    slotElement.classList.add('slot-end');
    slotElement.title = 'Fine selezione';

    // Applica stile SELECTED agli slot intermedi
    for (let id = minId + 1; id < maxId; id++) {
        const element = document.querySelector(`[data-slot-id="${id}"]`);
        if (element) {
            element.classList.remove('slot-available', 'slot-booked', 'slot-occupied', 'slot-past');
            element.classList.add('selected', 'slot-selected');
            element.title = 'Slot selezionato';
        }
    }

    updateSelectionUI();
}

// Gestisce selezione quando START e END sono già impostati
function handleFullSelection(slotId, slotElement) {

    if (slotId === selectionState.startSlot) {
        // Deseleziono START → END diventa nuovo START
        deselectStart();
    } else if (slotId === selectionState.endSlot) {
        // Deseleziono END → START rimane
        deselectEnd();
    } else {
        // Clicco su nuovo slot → diventa nuovo START
        setAsNewStart(slotId, slotElement);
    }
}

// Deseleziona START, END diventa nuovo START
function deselectStart() {

    const oldStartId = selectionState.startSlot;
    const endId = selectionState.endSlot;

    // Pulisci selezione
    clearAllSelections();

    // END diventa nuovo START
    selectionState.startSlot = endId;
    selectionState.endSlot = null;
    selectionState.allSelected.add(endId);

    // Applica stile START al nuovo START
    const newStartElement = document.querySelector(`[data-slot-id="${endId}"]`);
    if (newStartElement) {
        newStartElement.classList.add('slot-start');
        newStartElement.title = 'Inizio selezione';
    }

    updateSelectionUI();
}

// Deseleziona END, START rimane
function deselectEnd() {

    const startId = selectionState.startSlot;
    const oldEndId = selectionState.endSlot;

    // Pulisci selezione
    clearAllSelections();

    // START rimane
    selectionState.startSlot = startId;
    selectionState.endSlot = null;
    selectionState.allSelected.add(startId);

    // Applica stile START
    const startElement = document.querySelector(`[data-slot-id="${startId}"]`);
    if (startElement) {
        startElement.classList.add('slot-start');
        startElement.title = 'Inizio selezione';
    }

    updateSelectionUI();
}

// Imposta nuovo slot come START quando c'è già una selezione completa
function setAsNewStart(slotId, slotElement) {

    // Pulisci selezione precedente
    clearAllSelections();

    // Imposta nuovo START
    selectionState.startSlot = slotId;
    selectionState.endSlot = null;
    selectionState.allSelected.add(slotId);

    // Applica stile START
    slotElement.classList.add('slot-start');
    slotElement.title = 'Inizio selezione';

    updateSelectionUI();
}

// Verifica disponibilità usando API (NUOVO SISTEMA)
async function checkAvailabilityFromAPI(orarioInizio, orarioFine) {
    try {
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const dataSelezionata = formatDate(window.selectedDateInizio);
        const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${window.selectedSpazio.id_spazio}/disponibilita-slot/${dataSelezionata}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) return false;

        const data = await response.json();
        if (!data.success || !data.data?.slots) return false;

        // Verifica disponibilità per l'intervallo
        const orarioInizioHour = parseInt(orarioInizio.split(':')[0]);
        const orarioFineHour = parseInt(orarioFine.split(':')[0]);

        for (let hour = orarioInizioHour; hour < orarioFineHour; hour++) {
            const slotId = hour - 8;
            const slot = data.data.slots.find(s => s.id_slot === slotId);
            if (!slot || slot.status !== 'available') {
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('❌ Errore API disponibilità:', error);
        return false;
    }
}

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', function () {

    // Inizializza la navbar universale
    if (typeof window.initializeNavbar === 'function') {
        window.initializeNavbar();
    } else {
    }

    // Inizializza la pagina
    initializePage();
});

// Inizializza la pagina
async function initializePage() {

    try {
        // ✅ RIPRISTINA SELEZIONE PENDENTE: controlla se c'è una selezione salvata dopo il login
        const pendingSelection = localStorage.getItem('pendingSelection');
        if (pendingSelection) {
            try {
                const selection = JSON.parse(pendingSelection);
                console.log('🔄 Ripristino selezione pendente:', selection);
                
                // Ripristina le variabili globali
                window.selectedSede = selection.sede;
                window.selectedSpazio = selection.spazio;
                window.selectedDateInizio = new Date(selection.dataInizio);
                window.selectedDateFine = new Date(selection.dataFine);
                window.selectedTimeInizio = selection.timeInizio;
                window.selectedTimeFine = selection.timeFine;
                
                // Rimuovi la selezione pendente
                localStorage.removeItem('pendingSelection');
            } catch (error) {
                console.error('❌ Errore nel ripristino selezione pendente:', error);
                localStorage.removeItem('pendingSelection');
            }
        }

        // ✅ CONTROLLA SE L'UTENTE PUÒ ACCEDERE A QUESTA PAGINA
        if (!checkUserAccess()) {
            return;
        }

        // ✅ CONTROLLA SE CI SONO DATI PRENOTAZIONE IN ATTESA (POST-LOGIN)
        if (window.BookingOrchestrator) {
            window.BookingOrchestrator.handlePostLogin();
        }

        // Carica le sedi
        await loadSedi();

        // Inizializza il calendario
        initializeCalendar();

        // Configura gli event listener
        setupEventListeners();



        // Gestisci i parametri URL se presenti
        handleUrlParameters();



        // Inizializza il sistema di gestione slot real-time SOLO quando l'utente seleziona data
        // NON chiamare initializeSlotManager qui - verrà chiamato dopo selezione data

        // Nascondi il riepilogo all'inizializzazione
        hideSummary();

    } catch (error) {
        console.error('❌ Errore durante l\'inizializzazione:', error);
        showError('Errore durante l\'inizializzazione: ' + error.message);
    }
}

// Carica le sedi disponibili
async function loadSedi() {
    try {

        const startTime = Date.now();

        const response = await fetch(`${window.CONFIG.API_BASE}/sedi`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const endTime = Date.now();
        const duration = endTime - startTime;


        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        window.sedi = await response.json();

        // Popola il dropdown delle sedi
        populateSediDropdown();
        window.sediLoaded = true;

        // SlotManager verrà inizializzato dopo selezione data, non qui

    } catch (error) {
        console.error('❌ Errore caricamento sedi:', error);
        showError('Errore nel caricamento delle sedi: ' + error.message);
        throw error;
    }
}

// Popola il dropdown delle sedi
function populateSediDropdown() {
    const sedeSelect = document.getElementById('sedeSelect');
    if (!sedeSelect) {
        console.error('❌ Dropdown sedi non trovato!');
        return;
    }

    // Pulisci opzioni esistenti
    sedeSelect.innerHTML = '<option value="">Seleziona una sede...</option>';

    // Aggiungi le sedi
    window.sedi.forEach(sede => {
        const option = document.createElement('option');
        option.value = sede.id_sede;
        option.textContent = sede.nome;
        sedeSelect.appendChild(option);
    });

}

// Carica gli spazi per una sede
async function loadSpazi(sedeId) {
    try {

        const startTime = Date.now();

        const response = await fetch(`${window.CONFIG.API_BASE}/spazi?id_sede=${sedeId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const endTime = Date.now();
        const duration = endTime - startTime;


        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        window.spazi = await response.json();

        // Popola il dropdown degli spazi
        populateSpaziDropdown();

        // SlotManager verrà inizializzato dopo selezione data, non qui

    } catch (error) {
        console.error('❌ Errore caricamento spazi:', error);
        showError('Errore nel caricamento degli spazi: ' + error.message);
    }
}

// Popola il dropdown degli spazi
function populateSpaziDropdown() {
    const spazioSelect = document.getElementById('stanzaSelect');
    if (!spazioSelect) {
        console.error('❌ Dropdown spazi non trovato!');
        return;
    }

    // Pulisci opzioni esistenti
    spazioSelect.innerHTML = '<option value="">Seleziona uno spazio...</option>';

    // Aggiungi gli spazi
    window.spazi.forEach(spazio => {
        const option = document.createElement('option');
        option.value = spazio.id_spazio;
        option.textContent = spazio.nome;
        spazioSelect.appendChild(option);
    });

}

// Inizializza il calendario
function initializeCalendar() {

    const datePickerElement = document.getElementById('datePicker');
    if (!datePickerElement) {
        console.error('❌ Elemento datePicker non trovato!');
        return;
    }

    // Configurazione Flatpickr
    datePicker = flatpickr(datePickerElement, {
        locale: 'it',
        mode: 'range',
        dateFormat: 'd/m/Y',
        minDate: 'today',
        maxDate: new Date().fp_incr(365), // 1 anno da oggi
        allowInput: true,
        clickOpens: true,
        // ✅ NUOVO: Disabilita giorni non disponibili
        disable: [],
        onReady: function(selectedDates, dateStr, instance) {
            // Quando il calendario è pronto, aggiorna i giorni disabilitati
            updateDisabledDays();
        },
        onMonthChange: function(selectedDates, dateStr, instance) {
            // Quando cambia mese, aggiorna i giorni disabilitati
            updateDisabledDays();
        },
        onOpen: function(selectedDates, dateStr, instance) {
            // Quando il calendario si apre, aggiorna i giorni disabilitati
            setTimeout(() => {
                updateDisabledDays();
            }, 200);
        },
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                window.selectedDateInizio = selectedDates[0];
                window.selectedDateFine = selectedDates[1];

                // ✅ VERIFICA SE È UNA SELEZIONE MULTI-GIORNO
                const giorniSelezionati = Math.ceil((selectedDates[1] - selectedDates[0]) / (1000 * 60 * 60 * 24)) + 1;
                
                if (giorniSelezionati > 1) {
                    // ✅ SELEZIONE MULTI-GIORNO: prenota tutto il giorno (9:00-18:00)
                    console.log(`📅 Selezione multi-giorno: ${giorniSelezionati} giorni`);
                    
                    // Imposta orari predefiniti per tutto il giorno
                    window.selectedTimeInizio = '09:00';
                    window.selectedTimeFine = '18:00';
                    
                    // Nascondi gli slot orari per selezione multi-giorno
                    const timeSlotsContainer = document.getElementById('timeSlots');
                    if (timeSlotsContainer) {
                        timeSlotsContainer.innerHTML = `
                            <div class="alert alert-info">
                                <i class="fas fa-calendar-day me-2"></i>
                                <strong>Prenotazione Multi-Giorno</strong><br>
                                Hai selezionato ${giorniSelezionati} giorni consecutivi.<br>
                                La prenotazione coprirà l'intera giornata lavorativa (9:00-18:00).
                            </div>
                        `;
                        timeSlotsContainer.style.display = 'block';
                    }
                    
                    // Aggiorna UI con selezione completa
                    updateSelectionUI();
                } else {
                    // ✅ SELEZIONE SINGOLO GIORNO: mostra slot orari
                    window.selectedTimeInizio = null;
                    window.selectedTimeFine = null;
                    
                    // Inizializza il slot manager per selezione orari
                    if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
                        initializeSlotManager();
                    }
                }
            }
        }
    });

}

// ✅ NUOVA FUNZIONE: Aggiorna i giorni disabilitati nel calendario
async function updateDisabledDays() {
    if (!window.selectedSpazio || !datePicker) {
        return;
    }

    try {
        // ✅ CORREZIONE: Flatpickr currentMonth è un numero (0-11), currentYear è un numero
        const mese = datePicker.currentMonth + 1; // Flatpickr usa 0-11, noi usiamo 1-12
        const anno = datePicker.currentYear;
        
        console.log(`📅 Aggiornamento giorni per ${mese}/${anno}`);

        // Chiama l'API per ottenere i giorni disponibili
        const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${window.selectedSpazio.id_spazio}/giorni-disponibili?mese=${mese}&anno=${anno}`);
        
        if (!response.ok) {
            console.warn('⚠️ Errore nel caricamento giorni disponibili:', response.status);
            return;
        }

        const data = await response.json();
        
        if (data.success && data.giorni) {
            // Prepara array di giorni da disabilitare
            const giorniDisabilitati = data.giorni
                .filter(giorno => !giorno.disponibile)
                .map(giorno => {
                    // Crea data nel formato corretto per Flatpickr
                    return new Date(anno, mese - 1, giorno.giorno);
                });

            // Aggiorna i giorni disabilitati nel date picker
            datePicker.set('disable', giorniDisabilitati);
            
            console.log(`📅 Giorni disabilitati per ${mese}/${anno}:`, giorniDisabilitati.length);
            
            // ✅ FORZA la disabilitazione anche tramite CSS
            setTimeout(() => {
                giorniDisabilitati.forEach(data => {
                    const dayElement = document.querySelector(`.flatpickr-day[aria-label*="${data.getDate()}"]`);
                    if (dayElement) {
                        dayElement.classList.add('disabled');
                        dayElement.style.pointerEvents = 'none';
                        dayElement.style.cursor = 'not-allowed';
                        dayElement.style.opacity = '0.7';
                        dayElement.style.backgroundColor = '#dc3545';
                        dayElement.style.color = 'white';
                    }
                });
            }, 100);
        }
    } catch (error) {
        console.error('❌ Errore nell\'aggiornamento giorni disabilitati:', error);
    }
}

// Configura gli event listener
function setupEventListeners() {

    // Event listener per selezione sede
    const sedeSelect = document.getElementById('sedeSelect');
    if (sedeSelect) {
        sedeSelect.addEventListener('change', function () {
            const sedeId = this.value;
            if (sedeId) {
                const sede = window.sedi.find(s => s.id_sede == sedeId);
                window.selectedSede = sede;

                // Carica spazi per questa sede
                loadSpazi(sedeId);

                // Abilita dropdown spazi
                document.getElementById('stanzaSelect').disabled = false;
            } else {
                window.selectedSede = null;
                window.selectedSpazio = null;
                document.getElementById('stanzaSelect').disabled = true;
                document.getElementById('stanzaSelect').innerHTML = '<option value="">Prima seleziona una sede...</option>';
            }
        });
    }

    // Event listener per selezione spazio
    const spazioSelect = document.getElementById('stanzaSelect');
    if (spazioSelect) {
        spazioSelect.addEventListener('change', function () {
            const spazioId = this.value;
            if (spazioId) {
                const spazio = window.spazi.find(s => s.id_spazio == spazioId);
                window.selectedSpazio = spazio;

                // ✅ AGGIORNA GIORNI DISABILITATI quando cambia spazio
                updateDisabledDays();

                // Inizializza il slot manager se tutto è pronto
                if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
                    initializeSlotManager();
                }
            } else {
                window.selectedSpazio = null;
                // ✅ Reset giorni disabilitati quando nessuno spazio è selezionato
                if (datePicker) {
                    datePicker.set('disable', []);
                }
            }
        });
    }

    // Event listener per il bottone "Prenota Ora"
    const btnBook = document.getElementById('btnBook');
    if (btnBook) {
        // Inizializza il bottone come disabilitato
        btnBook.disabled = true;
        btnBook.textContent = 'Seleziona orari...';
        btnBook.classList.add('btn-secondary');

        btnBook.addEventListener('click', async function () {
            // ✅ VERIFICA AUTENTICAZIONE: controlla se l'utente è loggato
            const isAuthenticated = await window.isAuthenticated();
            if (!isAuthenticated) {
                // Salva i dati della selezione per dopo il login
                const selectionData = {
                    sede: window.selectedSede,
                    spazio: window.selectedSpazio,
                    dataInizio: window.selectedDateInizio,
                    dataFine: window.selectedDateFine,
                    timeInizio: window.selectedTimeInizio,
                    timeFine: window.selectedTimeFine
                };
                
                localStorage.setItem('pendingSelection', JSON.stringify(selectionData));
                
                // Salva anche l'URL corrente per il redirect
                localStorage.setItem('redirectAfterLogin', window.location.href);
                
                // Reindirizza al login
                const loginUrl = 'login.html?message=' + encodeURIComponent('Effettua il login per completare la prenotazione.');
                window.location.href = loginUrl;
                return;
            }

            // Verifica che tutti i campi siano selezionati
            if (!window.selectedSede || !window.selectedSpazio || !window.selectedDateInizio || !window.selectedTimeInizio || !window.selectedTimeFine) {
                showError('Seleziona tutti i campi richiesti prima di procedere');
                return;
            }

            // Verifica disponibilità finale prima di procedere
            const isAvailable = await checkAvailability(window.selectedTimeInizio, window.selectedTimeFine);
            if (!isAvailable) {
                showError('Gli slot selezionati non sono più disponibili. Aggiorna la pagina e riprova.');
                return;
            }

            // Usa l'orchestratore per gestire il flusso di prenotazione
            const selectionData = {
                sede: window.selectedSede,
                spazio: window.selectedSpazio,
                dataInizio: window.selectedDateInizio,
                dataFine: window.selectedDateFine,
                orarioInizio: window.selectedTimeInizio,
                orarioFine: window.selectedTimeFine,
                slotSelezionati: selectionState.allSelected
            };

            // Delega all'orchestratore
            await window.BookingOrchestrator.handleBookNow(selectionData);
        });
    }

}

// Gestisce i parametri URL
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    let sedeId = urlParams.get('sede');
    let spazioId = urlParams.get('spazio');
    let dataInizio = urlParams.get('dataInizio');
    let dataFine = urlParams.get('dataFine');

    console.log('🔗 Parametri URL ricevuti:', { sedeId, spazioId, dataInizio, dataFine });

    // ✅ SALVA I PARAMETRI IN LOCALSTORAGE PER PERSISTENZA
    if (sedeId || spazioId || dataInizio || dataFine) {
        const bookingParams = {
            sede: sedeId,
            spazio: spazioId,
            dataInizio: dataInizio,
            dataFine: dataFine,
            timestamp: Date.now()
        };
        localStorage.setItem('bookingParams', JSON.stringify(bookingParams));
        console.log('💾 Parametri prenotazione salvati in localStorage:', bookingParams);
    }

    // ✅ LEGGI ANCHE DAL LOCALSTORAGE (per casi di redirect post-login)
    const savedParams = localStorage.getItem('bookingParams');
    if (savedParams) {
        try {
            const parsedParams = JSON.parse(savedParams);
            const isRecent = (Date.now() - parsedParams.timestamp) < 300000; // 5 minuti
            
            if (isRecent) {
                console.log('📖 Parametri letti da localStorage:', parsedParams);
                // Usa i parametri salvati se non ci sono parametri URL
                if (!sedeId && parsedParams.sede) {
                    sedeId = parsedParams.sede;
                }
                if (!spazioId && parsedParams.spazio) {
                    spazioId = parsedParams.spazio;
                }
                if (!dataInizio && parsedParams.dataInizio) {
                    dataInizio = parsedParams.dataInizio;
                }
                if (!dataFine && parsedParams.dataFine) {
                    dataFine = parsedParams.dataFine;
                }
            }
        } catch (error) {
            console.warn('⚠️ Errore nel parsing dei parametri salvati:', error);
        }
    }

    if (sedeId) {
        // ✅ PRESELEZIONA LA SEDE
        const sedeSelect = document.getElementById('sedeSelect');
        if (sedeSelect) {
            sedeSelect.value = sedeId;
            console.log(`✅ Sede preselezionata: ${sedeId}`);
            
            // Simula il cambio di sede per caricare gli spazi
            setTimeout(() => {
                sedeSelect.dispatchEvent(new Event('change'));
                
                // ✅ PRESELEZIONA LO SPAZIO se specificato
                if (spazioId) {
                    setTimeout(() => {
                        const spazioSelect = document.getElementById('stanzaSelect');
                        if (spazioSelect) {
                            spazioSelect.value = spazioId;
                            console.log(`✅ Spazio preselezionato: ${spazioId}`);
                            spazioSelect.dispatchEvent(new Event('change'));
                        }
                    }, 500);
                }
            }, 500);
        }
    }

    // ✅ GESTISCI LE DATE se specificate
    if (dataInizio) {
        const dataInizioObj = new Date(dataInizio);
        if (!isNaN(dataInizioObj.getTime())) {
            window.selectedDateInizio = dataInizioObj;
            console.log(`✅ Data inizio preselezionata: ${dataInizio}`);
        }
    }

    if (dataFine) {
        const dataFineObj = new Date(dataFine);
        if (!isNaN(dataFineObj.getTime())) {
            window.selectedDateFine = dataFineObj;
            console.log(`✅ Data fine preselezionata: ${dataFine}`);
        }
    }
}

// ✅ FUNZIONE PER PULIRE I PARAMETRI DI PRENOTAZIONE
function clearBookingParams() {
    localStorage.removeItem('bookingParams');
    console.log('🧹 Parametri prenotazione puliti dal localStorage');
}

// ✅ ESPONI LA FUNZIONE GLOBALMENTE
window.clearBookingParams = clearBookingParams;

// Crea gli slot temporali con stati corretti (VERSIONE OTTIMIZZATA)
async function createTimeSlots() {
    const timeSlotsContainer = document.getElementById('timeSlots');

    if (!timeSlotsContainer) {
        console.error('❌ Container timeSlots non trovato!');
        return;
    }

    // Orari di apertura (9:00 - 18:00)
    const orariApertura = [];
    for (let hour = 9; hour <= 17; hour++) {
        orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Pulisci il container
    timeSlotsContainer.innerHTML = '';

    // ✅ CARICA DATI REALI DI DISPONIBILITÀ
    let slotStatuses = {};
    
    if (window.selectedSpazio && window.selectedDateInizio) {
        try {
            const date = window.selectedDateInizio.toISOString().split('T')[0];
            const response = await fetch(`${window.CONFIG.API_BASE}/spazi/${window.selectedSpazio.id_spazio}/disponibilita-slot/${date}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.slots) {
                    // Mappa gli stati degli slot
                    data.slots.forEach(slot => {
                        slotStatuses[slot.orario] = slot.status;
                    });
                }
            }
        } catch (error) {
            console.error('❌ Errore nel caricamento disponibilità slot:', error);
        }
    }

    // Crea gli slot temporali con stati corretti
    for (let i = 0; i < orariApertura.length; i++) {
        const orario = orariApertura[i];
        const slotId = i + 1;

        // ✅ USA STATO REALE o default a "available"
        const status = slotStatuses[orario] || 'available';

        const slot = document.createElement('button');
        slot.className = 'btn btn-lg slot-button';
        slot.textContent = orario;
        slot.dataset.orario = orario;
        slot.dataset.slotId = slotId;

        // Applica stato corretto direttamente
        applySlotState(slot, status, {});

        // Aggiungi event listener per tutti gli slot
        slot.addEventListener('click', (event) => selectTimeSlot(orario, slot, event));

        timeSlotsContainer.appendChild(slot);
    }

    // Mostra il container
    timeSlotsContainer.style.display = 'block';

    // Assicurati che il container sia visibile
    const timeSlotsSection = document.getElementById('timeSlots');
    if (timeSlotsSection) {
        timeSlotsSection.style.display = 'block';
    }


    // Mostra i controlli rapidi
    const quickControls = document.getElementById('quickControls');
    if (quickControls) {
        quickControls.style.display = 'block';
    }
}

// Mostra gli slot temporali disponibili (versione originale per compatibilità)
async function displayTimeSlots(disponibilita) {
    const timeSlotsContainer = document.getElementById('timeSlots');


    if (!timeSlotsContainer) {
        console.error('❌ Container timeSlots non trovato!');
        return;
    }

    // Orari di apertura (9:00 - 18:00)
    const orariApertura = [];
    for (let hour = 9; hour <= 17; hour++) {
        orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
    }


    // Pulisci il container
    timeSlotsContainer.innerHTML = '';

    // Crea gli slot temporali
    for (let i = 0; i < orariApertura.length; i++) {
        const orario = orariApertura[i];

        const slot = document.createElement('button');
        slot.className = 'btn btn-lg slot-button slot-available';
        slot.textContent = orario;
        slot.dataset.orario = orario;
        slot.dataset.slotId = i + 1; // ID univoco per ogni slot

        // Aggiungi event listener per tutti gli slot
        slot.addEventListener('click', (event) => selectTimeSlot(orario, slot, event));
        slot.title = 'Click per selezionare (1 ora)';

        timeSlotsContainer.appendChild(slot);
    }

    // Mostra il container
    timeSlotsContainer.style.display = 'block';

    // Assicurati che il container sia visibile
    const timeSlotsSection = document.getElementById('timeSlots');
    if (timeSlotsSection) {
        timeSlotsSection.style.display = 'block';
    }


    // Gli slot sono già stati creati con gli stati corretti in createTimeSlots()
    // Non serve più impostarli tutti come disponibili

    if (orariApertura.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="text-muted">Nessun orario disponibile per questa data</p>';

        // Nascondi i controlli rapidi
        const quickControls = document.getElementById('quickControls');
        if (quickControls) {
            quickControls.style.display = 'none';
        }
    }
}

// Seleziona uno slot temporale (NUOVO SISTEMA)
async function selectTimeSlot(orario, slotElement, event = null) {
    const slotId = parseInt(slotElement.dataset.slotId);


    // Usa il nuovo sistema di selezione
    await handleSlotClick(slotId, slotElement);

    await updateSelectionUI();
}

// Seleziona un singolo slot (VERSIONE SEMPLIFICATA)
function selectSingleSlot(slotId, slotElement, orario) {
    selectionState.allSelected.add(slotId);
    slotElement.classList.remove('slot-available');
    slotElement.classList.add('selected', 'slot-selected');
    slotElement.title = 'Selezionato';

    if (window.slotManager) {
        window.slotManager.selectSlot(slotId);
    }
}

// Deseleziona un slot (VERSIONE SEMPLIFICATA)
function deselectSlot(slotId, slotElement) {
    selectionState.allSelected.delete(slotId);
    slotElement.classList.remove('selected', 'slot-selected');
    
    // ✅ RIPRISTINA lo stato originale dello slot
    if (!slotElement.disabled) {
        slotElement.classList.add('available', 'slot-available');
        slotElement.title = 'Disponibile';
    }

    if (window.slotManager) {
        window.slotManager.deselectSlot(slotId);
    }
}

// Seleziona un intervallo di slot (VERSIONE SEMPLIFICATA)
function selectSlotRange(startSlotId, endSlotId) {
    const startSlot = parseInt(startSlotId);
    const endSlot = parseInt(endSlotId);
    const minSlot = Math.min(startSlot, endSlot);
    const maxSlot = Math.max(startSlot, endSlot);

    // Seleziona tutti gli slot disponibili nell'intervallo
    for (let slotId = minSlot; slotId <= maxSlot; slotId++) {
        const slotElement = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (slotElement && !slotElement.disabled && slotElement.classList.contains('slot-available')) {
            selectionState.allSelected.add(slotId.toString());
            slotElement.classList.remove('slot-available');
            slotElement.classList.add('selected', 'slot-selected');
            slotElement.title = 'Selezionato';

            if (window.slotManager) {
                window.slotManager.selectSlot(slotId.toString());
            }
        }
    }
}

// Aggiorna UI dopo selezione (NUOVO SISTEMA)
async function updateSelectionUI() {
    const btnBook = document.getElementById('btnBook');

    // ✅ VERIFICA SE È SELEZIONE MULTI-GIORNO (senza slot selezionati ma con orari predefiniti)
    const isMultiDaySelection = window.selectedTimeInizio === '09:00' && window.selectedTimeFine === '18:00' && 
                                window.selectedDateInizio && window.selectedDateFine &&
                                window.selectedDateInizio.getTime() !== window.selectedDateFine.getTime();

    if (selectionState.allSelected.size === 0 && !isMultiDaySelection) {
        hideSummary();
        hideTimeSelectionMessage();
        btnBook.disabled = true;
        btnBook.textContent = 'Seleziona uno slot';
        return;
    }

    if (isMultiDaySelection) {
        // ✅ SELEZIONE MULTI-GIORNO: usa gli orari predefiniti
        console.log('📅 Aggiornamento UI per selezione multi-giorno');
    } else {
        // ✅ SELEZIONE SINGOLI SLOT: calcola intervallo di tempo
        const sortedSlots = Array.from(selectionState.allSelected).sort((a, b) => a - b);
        const firstSlot = Math.min(...sortedSlots);
        const lastSlot = Math.max(...sortedSlots);

        const firstHour = firstSlot + 8; // slot 1 = 9:00, slot 2 = 10:00
        const lastHour = lastSlot + 9;   // slot 1 = 10:00, slot 2 = 11:00

        window.selectedTimeInizio = `${firstHour.toString().padStart(2, '0')}:00`;
        window.selectedTimeFine = `${lastHour.toString().padStart(2, '0')}:00`;
    }

    // Mostra messaggio appropriato
    if (selectionState.allSelected.size === 1) {
        showTimeSelectionMessage('Seleziona l\'orario di fine per completare l\'intervallo');
    } else {
        hideTimeSelectionMessage();
    }

    // Controlla autenticazione
    const token = localStorage.getItem('token');
    if (!token) {
        btnBook.disabled = false;
        btnBook.textContent = 'Prenota Ora (Login Richiesto)';
        btnBook.className = 'btn btn-warning';
        updateSummary();
        showSummary();
        return;
    }

    // Se l'utente è autenticato e ci sono dati pending, nascondi il bottone
    // perché la prenotazione verrà creata automaticamente
    const pendingData = localStorage.getItem('pendingPrenotazione');
    if (pendingData) {
        btnBook.disabled = true;
        btnBook.textContent = 'Creazione prenotazione in corso...';
        btnBook.className = 'btn btn-info';
        updateSummary();
        showSummary();
        return;
    }

    // Verifica disponibilità per utenti autenticati
    const disponibile = await checkAvailability(window.selectedTimeInizio, window.selectedTimeFine);
    if (!disponibile) {
        btnBook.disabled = true;
        btnBook.textContent = 'Slot Non Disponibile';
        btnBook.className = 'btn btn-danger';
        return;
    }

    // Slot disponibili
    btnBook.disabled = false;
    
    // ✅ NON MOSTRARE il contatore slot per le prenotazioni multi-giorno
    if (isMultiDaySelection) {
        btnBook.textContent = 'Prenota Ora';
    } else {
        btnBook.textContent = `Prenota Ora (${selectionState.allSelected.size} slot)`;
    }
    
    btnBook.className = 'btn btn-success';
    updateSummary();
    showSummary();
}

// Deseleziona tutti gli slot (NUOVO SISTEMA)
function clearAllSelections() {

    // Pulisci stato
    selectionState.startSlot = null;
    selectionState.endSlot = null;
    selectionState.allSelected.clear();

    // Pulisci UI - rimuovi solo le classi di selezione
    document.querySelectorAll('.slot-button').forEach(slot => {
        slot.classList.remove('selected', 'slot-selected', 'slot-start', 'slot-end');
        // Mantieni le classi di stato originale (available, booked, etc.)
    });

    updateSelectionUI();
}

// Undo ultima selezione (NUOVO SISTEMA)
function undoLastSelection() {
    if (selectionState.allSelected.size === 0) {
        return;
    }

    // Se c'è solo START, deseleziona tutto
    if (selectionState.endSlot === null) {
        clearAllSelections();
        return;
    }

    // Se ci sono START e END, deseleziona END
    if (selectionState.endSlot !== null) {
        deselectEnd();
    }
}

// Selezioni rapide preset (NUOVO SISTEMA)
async function selectPreset(presetType) {
    clearAllSelections();

    let startHour, endHour;

    switch (presetType) {
        case 'mattina': startHour = 9; endHour = 12; break;
        case 'pomeriggio': startHour = 14; endHour = 17; break;
        case 'giornata': startHour = 9; endHour = 17; break;
        case 'mezza-giornata': startHour = 9; endHour = 13; break;
        default: return;
    }

    // Converti ore in slot ID
    const startSlotId = startHour - 8;
    const endSlotId = endHour - 8;

    // Trova gli elementi
    const startElement = document.querySelector(`[data-slot-id="${startSlotId}"]`);
    const endElement = document.querySelector(`[data-slot-id="${endSlotId}"]`);

    if (startElement && endElement &&
        !startElement.disabled && !endElement.disabled &&
        startElement.classList.contains('slot-available') &&
        endElement.classList.contains('slot-available')) {

        // Usa il nuovo sistema per impostare START e END
        setAsStart(startSlotId, startElement);
        setAsEnd(endSlotId, endElement);
    }

    await updateSelectionUI();
}

// Funzione rimossa: blockIntermediateSlots non più necessaria

// Mostra messaggio per selezione orario (VERSIONE SEMPLIFICATA)
function showTimeSelectionMessage(message) {
    let messageElement = document.getElementById('timeSelectionMessage');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'timeSelectionMessage';
        messageElement.className = 'alert alert-info mt-3';

        const timeSlotsContainer = document.getElementById('timeSlots');
        if (timeSlotsContainer) {
            timeSlotsContainer.parentNode.insertBefore(messageElement, timeSlotsContainer.nextSibling);
        }
    }

    messageElement.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
    messageElement.style.display = 'block';
}

// Nasconde il messaggio di selezione orario (VERSIONE SEMPLIFICATA)
function hideTimeSelectionMessage() {
    const messageElement = document.getElementById('timeSelectionMessage');
    if (messageElement) {
        messageElement.style.display = 'none';
    }
}

// Mostra errore (VERSIONE SEMPLIFICATA)
function showError(message) {
    console.error('❌ Errore:', message);
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'error');
    } else {
        alert('Errore: ' + message);
    }
}

// Mostra messaggio informativo (VERSIONE SEMPLIFICATA)
function showInfo(message) {
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'info');
    }
}

// Calcola il prezzo della prenotazione (VERSIONE CORRETTA)
function calculatePrice() {
    const prezzoPerOra = 10; // €10/ora
    
    // ✅ VERIFICA SE È SELEZIONE MULTI-GIORNO
    const isMultiDaySelection = window.selectedTimeInizio === '09:00' && window.selectedTimeFine === '18:00' && 
                                window.selectedDateInizio && window.selectedDateFine &&
                                window.selectedDateInizio.getTime() !== window.selectedDateFine.getTime();
    
    if (isMultiDaySelection) {
        // ✅ CALCOLO PER PRENOTAZIONI MULTI-GIORNO
        const giorniDiff = Math.ceil((window.selectedDateFine - window.selectedDateInizio) / (1000 * 60 * 60 * 24)) + 1;
        const orePerGiorno = 9; // 9:00-18:00 = 9 ore
        const oreTotali = giorniDiff * orePerGiorno;
        console.log(`📅 Calcolo multi-giorno: ${giorniDiff} giorni × ${orePerGiorno} ore = ${oreTotali} ore totali`);
        return oreTotali * prezzoPerOra;
    } else if (selectionState.allSelected.size > 0) {
        // ✅ CALCOLO PER PRENOTAZIONI SINGLE-DAY
        const oreTotali = selectionState.allSelected.size;
        console.log(`⏰ Calcolo single-day: ${oreTotali} slot selezionati = ${oreTotali} ore`);
        return oreTotali * prezzoPerOra;
    } else {
        // ✅ NESSUNA SELEZIONE
        return 0;
    }
}

// Aggiorna riepilogo (VERSIONE SEMPLIFICATA)
function updateSummary() {
    const summarySede = document.getElementById('summarySede');
    const summaryStanza = document.getElementById('summaryStanza');
    const summaryData = document.getElementById('summaryData');
    const summaryOrario = document.getElementById('summaryOrario');
    const summaryPrezzo = document.getElementById('summaryPrezzo');

    if (summarySede) summarySede.textContent = window.selectedSede ? window.selectedSede.nome : '-';
    if (summaryStanza) summaryStanza.textContent = window.selectedSpazio ? window.selectedSpazio.nome : '-';
    
    // ✅ GESTISCI LA DATA NEL RIEPILOGO
    if (summaryData) {
        if (window.selectedDateInizio && window.selectedDateFine && 
            window.selectedDateInizio.getTime() !== window.selectedDateFine.getTime()) {
            // ✅ SELEZIONE MULTI-GIORNO: mostra range di date
            const dataInizioStr = window.selectedDateInizio.toLocaleDateString('it-IT');
            const dataFineStr = window.selectedDateFine.toLocaleDateString('it-IT');
            summaryData.textContent = `${dataInizioStr} - ${dataFineStr}`;
        } else if (window.selectedDateInizio) {
            // ✅ SELEZIONE SINGOLO GIORNO: mostra data singola
            summaryData.textContent = window.selectedDateInizio.toLocaleDateString('it-IT');
        } else {
            summaryData.textContent = '-';
        }
    }

    if (summaryOrario && window.selectedTimeInizio && window.selectedTimeFine) {
        // ✅ VERIFICA SE È SELEZIONE MULTI-GIORNO
        const isMultiDaySelection = window.selectedTimeInizio === '09:00' && window.selectedTimeFine === '18:00' && 
                                    window.selectedDateInizio && window.selectedDateFine &&
                                    window.selectedDateInizio.getTime() !== window.selectedDateFine.getTime();
        
        if (isMultiDaySelection) {
            // ✅ CALCOLO ORE PER MULTI-GIORNO
            const giorniDiff = Math.ceil((window.selectedDateFine - window.selectedDateInizio) / (1000 * 60 * 60 * 24)) + 1;
            const orePerGiorno = 9; // 9:00-18:00 = 9 ore
            const oreTotali = giorniDiff * orePerGiorno;
            
            const dataInizioStr = window.selectedDateInizio.toLocaleDateString('it-IT');
            const dataFineStr = window.selectedDateFine.toLocaleDateString('it-IT');
            
            if (giorniDiff === 1) {
                summaryOrario.textContent = `${dataInizioStr} - ${window.selectedTimeInizio}/${window.selectedTimeFine} (${orePerGiorno} ore)`;
            } else {
                summaryOrario.textContent = `${dataInizioStr} - ${dataFineStr} (${giorniDiff} giorni × ${orePerGiorno}h = ${oreTotali} ore)`;
            }
        } else {
            // ✅ CALCOLO ORE PER SINGLE-DAY
            const oreTotali = selectionState.allSelected.size;
            summaryOrario.textContent = `${window.selectedTimeInizio} - ${window.selectedTimeFine} (${oreTotali} ${oreTotali === 1 ? 'ora' : 'ore'})`;
        }
    } else if (summaryOrario) {
        summaryOrario.textContent = '-';
    }

    if (summaryPrezzo) {
        const prezzo = calculatePrice();
        summaryPrezzo.textContent = `€${prezzo.toFixed(2)}`;
    }
}

// Mostra riepilogo (VERSIONE SEMPLIFICATA)
function showSummary() {
    const summaryCard = document.getElementById('summaryCard');
    if (summaryCard) {
        summaryCard.classList.remove('hidden');
        summaryCard.classList.add('active');
        updateSummary();

        // Scroll fluido verso il riepilogo
        setTimeout(() => {
            const summaryPosition = summaryCard.offsetTop;
            const windowHeight = window.innerHeight;
            const scrollTarget = summaryPosition - (windowHeight * 0.2);
            window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }, 300);
    }
}

// Nasconde riepilogo (VERSIONE SEMPLIFICATA)
function hideSummary() {
    const summaryCard = document.getElementById('summaryCard');
    if (summaryCard) {
        summaryCard.classList.remove('active');
        summaryCard.classList.add('hidden');
    }
}

// Funzione helper per ottenere headers di autenticazione (VERSIONE SEMPLIFICATA)
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Funzione per mostrare il modal di autenticazione (VERSIONE SEMPLIFICATA)
function showAuthModal() {
    // Reindirizza direttamente al login
    window.location.href = '/login.html';
}

// Funzione per andare al login (VERSIONE SEMPLIFICATA)
function goToLogin() {
    // Usa l'orchestratore per gestire il flusso
    if (window.BookingOrchestrator) {
        const selectionData = {
            sede: window.selectedSede,
            spazio: window.selectedSpazio,
            dataInizio: window.selectedDateInizio,
            dataFine: window.selectedDateFine,
            orarioInizio: window.selectedTimeInizio,
            orarioFine: window.selectedTimeFine,
            slotSelezionati: selectionState.allSelected
        };
        
        window.BookingOrchestrator.handleUnauthenticatedUser(selectionData);
    } else {
        // Fallback se l'orchestratore non è disponibile
        console.error('❌ BookingOrchestrator non disponibile');
        window.location.href = '/login.html';
    }
}

// Funzioni rimosse: ora gestite da BookingOrchestrator

// Funzione per verificare accesso utente (VERSIONE SEMPLIFICATA)
function checkUserAccess() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.ruolo === 'gestore' || user.ruolo === 'amministratore') {
                showError('I gestori non possono effettuare prenotazioni. Reindirizzamento alla dashboard...');
                setTimeout(() => {
                    const dashboardUrl = getDashboardUrl(user.ruolo);
                    window.location.href = dashboardUrl;
                }, 3000);
                return false;
            }
            return true;
        } catch (error) {
            return true; // In caso di errore, permetti l'accesso
        }
    }
    return true; // Utente non loggato può accedere
}





// Rendi le funzioni disponibili globalmente
window.showAuthModal = showAuthModal;
window.goToLogin = goToLogin;
window.checkUserAccess = checkUserAccess;


