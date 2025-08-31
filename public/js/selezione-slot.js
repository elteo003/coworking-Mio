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

// Gestione selezione multipla slot
let selectedSlots = new Set(); // Set per mantenere gli slot selezionati
let lastSelectedSlot = null; // Ultimo slot selezionato per selezione con Shift

// Inizializza il nuovo Slot Manager
function initializeSlotManager() {
    console.log('🚀 initializeSlotManager chiamata');
    console.log('🔍 Stato selezioni:', {
        selectedSede: !!window.selectedSede,
        selectedSpazio: !!window.selectedSpazio,
        selectedDateInizio: !!window.selectedDateInizio
    });

    if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
        const sedeId = window.selectedSede.id_sede;
        const spazioId = window.selectedSpazio.id_spazio;
        // Mantieni il timezone locale invece di convertire in UTC
        const year = window.selectedDateInizio.getFullYear();
        const month = String(window.selectedDateInizio.getMonth() + 1).padStart(2, '0');
        const day = String(window.selectedDateInizio.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;

        console.log('🚀 Inizializzazione nuovo Slot Manager per:', { sedeId, spazioId, date });

        // Pulisci istanza precedente se esiste
        if (slotManager) {
            slotManager.cleanup();
        }

        // Reset selezione slot
        clearAllSelections();

        // PRIMA crea i bottoni degli slot
        console.log('🔨 STEP 1: Creo i bottoni degli slot...');
        createTimeSlots();
        console.log('✅ STEP 1 COMPLETATO: Bottoni creati');

        // POI crea nuova istanza di SlotManager
        console.log('🚀 STEP 2: Creo SlotManager...');
        if (typeof window.SlotManager === 'undefined') {
            console.error('❌ SlotManager non disponibile!');
            return false;
        }
        slotManager = new window.SlotManager();
        slotManager.init(sedeId, spazioId, date);
        window.slotManager = slotManager; // Esponi globalmente
        console.log('✅ STEP 2 COMPLETATO: SlotManager inizializzato');
        console.log('🔍 SlotManager esposto globalmente:', !!window.slotManager);

        return true;
    }
    console.log('❌ initializeSlotManager fallita - selezioni incomplete');
    return false;
}

// Funzione unificata per verificare disponibilità (VERSIONE SEMPLIFICATA)
async function checkAvailability(orarioInizio, orarioFine) {
    console.log('🔍 Verifica disponibilità:', { orarioInizio, orarioFine });

    try {
        // Usa SlotManager se disponibile, altrimenti API diretta
        if (window.slotManager && window.slotManager.slotsStatus.size > 0) {
            return await checkAvailabilityFromSlotManager(orarioInizio, orarioFine);
        } else {
            return await checkAvailabilityFromAPI(orarioInizio, orarioFine);
        }
    } catch (error) {
        console.error('❌ Errore verifica disponibilità:', error);
        return false;
    }
}

// Verifica disponibilità usando SlotManager (VERSIONE SEMPLIFICATA)
async function checkAvailabilityFromSlotManager(orarioInizio, orarioFine) {
    const orarioInizioHour = parseInt(orarioInizio.split(':')[0]);
    const orarioFineHour = parseInt(orarioFine.split(':')[0]);

    // Controlla se tutti gli slot nell'intervallo sono disponibili
    for (let hour = orarioInizioHour; hour < orarioFineHour; hour++) {
        const slotId = hour - 8; // Converti orario in slot ID (9:00 = slot 1, 10:00 = slot 2, etc.)
        const slot = window.slotManager.slotsStatus.get(slotId);

        if (!slot || slot.status !== 'available') {
            return false;
        }
    }
    return true;
}

// Funzione rimossa: waitForSlotManager non più necessaria

// Verifica disponibilità usando API (VERSIONE SEMPLIFICATA)
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
        // ✅ CONTROLLA SE L'UTENTE PUÒ ACCEDERE A QUESTA PAGINA
        if (!checkUserAccess()) {
            return;
        }

        // ✅ CONTROLLA SE CI SONO DATI PRENOTAZIONE IN ATTESA (POST-LOGIN)
        restorePendingPrenotazione();

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

        console.log('🔄 Database Supabase già popolato con prenotazioni...');

        console.log('✅ Pagina inizializzata correttamente');

        // Inizializza il sistema di gestione slot real-time SOLO quando l'utente seleziona data
        // NON chiamare initializeSlotManager qui - verrà chiamato dopo selezione data
        console.log('⏳ SlotManager verrà inizializzato dopo selezione data...');

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
        console.log('🔄 Caricamento sedi...');
        console.log('📍 API Base:', window.CONFIG.API_BASE);
        console.log('⏰ Inizio richiesta:', new Date().toISOString());

        const startTime = Date.now();

        const response = await fetch(`${window.CONFIG.API_BASE}/sedi`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ Richiesta completata in ${duration}ms`);
        console.log(`📊 Status: ${response.status}`);
        console.log(`🔗 Headers:`, response.headers);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        window.sedi = await response.json();
        console.log('✅ Sedi caricate:', window.sedi);
        console.log('📋 Numero sedi:', window.sedi.length);

        // Popola il dropdown delle sedi
        populateSediDropdown();
        window.sediLoaded = true;

        // SlotManager verrà inizializzato dopo selezione data, non qui
        console.log('✅ Sedi caricate, SlotManager verrà inizializzato dopo selezione data...');

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

    console.log('✅ Dropdown sedi popolato con', window.sedi.length, 'sedi');
}

// Carica gli spazi per una sede
async function loadSpazi(sedeId) {
    try {
        console.log(`🔄 Caricamento spazi per sede ${sedeId}...`);
        console.log('📍 API Base:', `${window.CONFIG.API_BASE}/spazi?id_sede=${sedeId}`);

        const startTime = Date.now();

        const response = await fetch(`${window.CONFIG.API_BASE}/spazi?id_sede=${sedeId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ Richiesta spazi completata in ${duration}ms`);
        console.log(`📊 Status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        window.spazi = await response.json();
        console.log('✅ Spazi caricati:', window.spazi);
        console.log('📋 Numero spazi:', window.spazi.length);

        // Popola il dropdown degli spazi
        populateSpaziDropdown();

        // SlotManager verrà inizializzato dopo selezione data, non qui
        console.log('✅ Spazi caricati, SlotManager verrà inizializzato dopo selezione data...');

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

    console.log('✅ Dropdown spazi popolato con', window.spazi.length, 'spazi');
}

// Inizializza il calendario
function initializeCalendar() {
    console.log('🔄 Inizializzazione calendario...');

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
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                window.selectedDateInizio = selectedDates[0];
                window.selectedDateFine = selectedDates[1];
                console.log('📅 Date selezionate:', window.selectedDateInizio, 'a', window.selectedDateFine);

                // Inizializza il slot manager se tutto è pronto
                if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
                    initializeSlotManager();
                }
            }
        }
    });

    console.log('✅ Calendario inizializzato');
}

// Configura gli event listener
function setupEventListeners() {
    console.log('🔄 Configurazione event listener...');

    // Event listener per selezione sede
    const sedeSelect = document.getElementById('sedeSelect');
    if (sedeSelect) {
        sedeSelect.addEventListener('change', function () {
            const sedeId = this.value;
            if (sedeId) {
                const sede = window.sedi.find(s => s.id_sede == sedeId);
                window.selectedSede = sede;
                console.log('🏢 Sede selezionata:', sede);

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
                console.log('🚪 Spazio selezionato:', spazio);

                // Inizializza il slot manager se tutto è pronto
                if (window.selectedSede && window.selectedSpazio && window.selectedDateInizio) {
                    initializeSlotManager();
                }
            } else {
                window.selectedSpazio = null;
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
        console.log('🔒 Bottone Prenota Ora inizializzato come disabilitato');

        btnBook.addEventListener('click', async function () {
            console.log('🎯 Bottone Prenota Ora cliccato');

            // Controlla se l'utente è autenticato
            const token = localStorage.getItem('token');

            if (!token) {
                // ✅ UTENTE NON AUTENTICATO: Mostra modal di login con riepilogo
                console.log('👤 Utente non autenticato, mostro modal di login');
                if (window.showAuthModal) {
                    window.showAuthModal();
                } else {
                    // Fallback: reindirizza alla pagina di login
                    window.location.href = '/login.html';
                }
                return;
            }

            // Utente autenticato: procedi con la prenotazione
            console.log('🔐 Utente autenticato, procedo con prenotazione');

            // Verifica che tutti i campi siano selezionati
            if (!window.selectedSede || !window.selectedSpazio || !window.selectedDateInizio || !window.selectedTimeInizio || !window.selectedTimeFine) {
                showError('Seleziona tutti i campi richiesti prima di procedere');
                return;
            }

            // Verifica disponibilità finale prima di procedere
            console.log('🔍 Verifica disponibilità finale prima di procedere...');
            const isAvailable = await checkAvailability(window.selectedTimeInizio, window.selectedTimeFine);
            if (!isAvailable) {
                showError('Gli slot selezionati non sono più disponibili. Aggiorna la pagina e riprova.');
                return;
            }

            // Crea la prenotazione nel database prima del pagamento
            // Mantieni il timezone locale invece di convertire in UTC
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            // Crea la prenotazione nel database con retry automatico
            const prenotazioneData = {
                id_spazio: window.selectedSpazio.id_spazio,
                data_inizio: new Date(`${formatDate(window.selectedDateInizio)}T${window.selectedTimeInizio}:00`).toISOString(),
                data_fine: new Date(`${formatDate(window.selectedDateFine)}T${window.selectedTimeFine}:00`).toISOString()
            };

            console.log('📝 Dati prenotazione:', prenotazioneData);

            try {
                console.log('🚀 Creazione prenotazione prima del pagamento...');

                // Usa ErrorHandler per retry automatico
                const result = await window.ErrorHandler.withRetry(async () => {
                    const response = await fetch(`${CONFIG.API_BASE}/prenotazioni`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify(prenotazioneData)
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
                        const error = new Error(`Errore creazione prenotazione: ${errorData.error || response.status}`);
                        error.status = response.status;
                        error.details = errorData.details || errorData.reason || '';
                        throw error;
                    }

                    return await response.json();
                }, { operation: 'create_prenotazione' });

                console.log('✅ Prenotazione creata:', result);

                // Invalida cache per aggiornare disponibilità
                const dataSelezionata = formatDate(window.selectedDateInizio);
                window.CacheManager.invalidatePattern(`disponibilita_${window.selectedSpazio.id_spazio}_${dataSelezionata}`);

                // Reindirizza alla pagina di pagamento con l'ID della prenotazione
                window.location.href = `/pagamento.html?id_prenotazione=${result.id_prenotazione}`;

            } catch (error) {
                console.error('❌ Errore creazione prenotazione:', error);

                // Usa ErrorHandler per gestione intelligente degli errori
                const errorInfo = await window.ErrorHandler.handlePrenotazioneError(error, {
                    operation: 'create_prenotazione',
                    prenotazioneData: prenotazioneData || { id_spazio: window.selectedSpazio?.id_spazio }
                });

                // Mostra messaggio specifico in base al tipo di errore
                if (errorInfo.type === 'auth') {
                    showError('Sessione scaduta. Effettua nuovamente il login per completare la prenotazione.');
                    // Opzionalmente reindirizza al login
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                } else if (errorInfo.type === 'validation') {
                    showError(`Errore di validazione: ${errorInfo.message}`);
                } else if (errorInfo.type === 'network') {
                    showError('Problema di connessione. Verifica la tua connessione internet e riprova.');
                } else if (error.status === 409) {
                    // Errore di conflitto - slot non disponibili
                    const details = error.details || 'Gli slot selezionati non sono più disponibili.';
                    showError(`${details} Aggiorna la pagina e riprova con slot diversi.`);
                } else {
                    showError(`Errore durante la creazione della prenotazione: ${errorInfo.message}`);
                }
            }
        });
    }

    console.log('✅ Event listener configurati');
}

// Gestisce i parametri URL
function handleUrlParameters() {
    console.log('🔄 Gestione parametri URL...');

    const urlParams = new URLSearchParams(window.location.search);
    const sedeId = urlParams.get('sede');
    const spazioId = urlParams.get('spazio');
    const data = urlParams.get('data');

    if (sedeId && spazioId && data) {
        console.log('📍 Parametri URL trovati:', { sedeId, spazioId, data });

        // Seleziona sede
        const sedeSelect = document.getElementById('sedeSelect');
        if (sedeSelect) {
            sedeSelect.value = sedeId;
            sedeSelect.dispatchEvent(new Event('change'));
        }

        // La selezione dello spazio avverrà automaticamente dopo il caricamento delle sedi
    }

    console.log('✅ Gestione parametri URL completata');
}

// Crea gli slot temporali (versione semplificata per SlotManager)
function createTimeSlots() {
    const timeSlotsContainer = document.getElementById('timeSlots');

    console.log('🔨 createTimeSlots chiamata, container:', timeSlotsContainer);

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
    for (let i = 0; i < orariApertura.length; i++) {
        const orario = orariApertura[i];
        console.log('🔨 Creo slot per orario:', orario);

        const slot = document.createElement('button');
        slot.className = 'btn btn-lg slot-button slot-available';
        slot.textContent = orario;
        slot.dataset.orario = orario;
        slot.dataset.slotId = i + 1; // ID univoco per ogni slot

        // Aggiungi event listener per tutti gli slot
        slot.addEventListener('click', (event) => selectTimeSlot(orario, slot, event));
        slot.title = 'Click per selezionare (1 ora)';

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
    console.log('🔍 Bottoni disponibili nel DOM:', document.querySelectorAll('[data-slot-id]').length);
    console.log('🔍 Bottoni disponibili nel DOM:', document.querySelectorAll('[data-slot-id]'));

    // Mostra i controlli rapidi
    const quickControls = document.getElementById('quickControls');
    if (quickControls) {
        quickControls.style.display = 'block';
    }
}

// Mostra gli slot temporali disponibili (versione originale per compatibilità)
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
    for (let i = 0; i < orariApertura.length; i++) {
        const orario = orariApertura[i];
        console.log('🔨 Creo slot per orario:', orario);

        const slot = document.createElement('button');
        slot.className = 'btn btn-lg slot-button slot-available';
        slot.textContent = orario;
        slot.dataset.orario = orario;
        slot.dataset.slotId = i + 1; // ID univoco per ogni slot

        // Aggiungi event listener per tutti gli slot
        slot.addEventListener('click', (event) => selectTimeSlot(orario, slot, event));
        slot.title = 'Click per selezionare (1 ora)';

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

    // Mostra tutti gli slot come disponibili (SlotManager si occuperà di aggiornarli)
    const allButtons = document.querySelectorAll('[data-slot-id]');
    allButtons.forEach(button => {
        button.classList.remove('btn-danger', 'btn-warning', 'btn-secondary', 'btn-outline-primary', 'btn-success');
        button.classList.add('slot-available');
        button.disabled = false;
        button.title = 'Clicca per prenotare questo slot (1 ora)';
    });

    if (orariApertura.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="text-muted">Nessun orario disponibile per questa data</p>';

        // Nascondi i controlli rapidi
        const quickControls = document.getElementById('quickControls');
        if (quickControls) {
            quickControls.style.display = 'none';
        }
    }
}

// Seleziona uno slot temporale (VERSIONE SEMPLIFICATA)
async function selectTimeSlot(orario, slotElement, event = null) {
    const slotId = slotElement.dataset.slotId;
    const isSelected = selectedSlots.has(slotId);

    // Se è già selezionato, lo deseleziona
    if (isSelected) {
        deselectSlot(slotId, slotElement);
        await updateSelectionUI();
        return;
    }

    // Se non c'è nessun slot selezionato, seleziona questo come inizio
    if (selectedSlots.size === 0) {
        selectSingleSlot(slotId, slotElement, orario);
        lastSelectedSlot = slotId;
        await updateSelectionUI();
        return;
    }

    // Se c'è già un slot selezionato, questo diventa la fine dell'intervallo
    if (selectedSlots.size === 1) {
        const firstSlot = parseInt(Array.from(selectedSlots)[0]);
        const secondSlot = parseInt(slotId);

        if (secondSlot <= firstSlot) {
            showError('L\'orario di fine deve essere successivo all\'orario di inizio');
            return;
        }

        selectSlotRange(firstSlot.toString(), slotId);
        await updateSelectionUI();
        return;
    }

    // Se ci sono già 2+ slot selezionati, resetta e seleziona questo
    if (selectedSlots.size >= 2) {
        clearAllSelections();
        selectSingleSlot(slotId, slotElement, orario);
        lastSelectedSlot = slotId;
        await updateSelectionUI();
    }
}

// Seleziona un singolo slot (VERSIONE SEMPLIFICATA)
function selectSingleSlot(slotId, slotElement, orario) {
    selectedSlots.add(slotId);
    slotElement.classList.remove('slot-available');
    slotElement.classList.add('slot-selected');
    slotElement.title = 'Selezionato';

    if (window.slotManager) {
        window.slotManager.selectSlot(slotId);
    }
}

// Deseleziona un slot (VERSIONE SEMPLIFICATA)
function deselectSlot(slotId, slotElement) {
    selectedSlots.delete(slotId);
    slotElement.classList.remove('slot-selected');
    slotElement.classList.add('slot-available');
    slotElement.title = 'Disponibile';

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
            selectedSlots.add(slotId.toString());
            slotElement.classList.remove('slot-available');
            slotElement.classList.add('slot-selected');
            slotElement.title = 'Selezionato';

            if (window.slotManager) {
                window.slotManager.selectSlot(slotId.toString());
            }
        }
    }
}

// Aggiorna UI dopo selezione (VERSIONE SEMPLIFICATA)
async function updateSelectionUI() {
    const btnBook = document.getElementById('btnBook');

    if (selectedSlots.size === 0) {
        hideSummary();
        hideTimeSelectionMessage();
        btnBook.disabled = true;
        btnBook.textContent = 'Seleziona uno slot';
        return;
    }

    // Calcola intervallo di tempo
    const sortedSlots = Array.from(selectedSlots).sort((a, b) => parseInt(a) - parseInt(b));
    const firstSlot = Math.min(...sortedSlots.map(s => parseInt(s)));
    const lastSlot = Math.max(...sortedSlots.map(s => parseInt(s)));

    const firstHour = firstSlot + 8; // slot 1 = 9:00, slot 2 = 10:00
    const lastHour = lastSlot + 9;   // slot 1 = 10:00, slot 2 = 11:00

    window.selectedTimeInizio = `${firstHour.toString().padStart(2, '0')}:00`;
    window.selectedTimeFine = `${lastHour.toString().padStart(2, '0')}:00`;

    // Mostra messaggio appropriato
    if (selectedSlots.size === 1) {
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
    btnBook.textContent = `Prenota Ora (${selectedSlots.size} slot)`;
    btnBook.className = 'btn btn-success';
    updateSummary();
    showSummary();
}

// Deseleziona tutti gli slot (VERSIONE SEMPLIFICATA)
function clearAllSelections() {
    selectedSlots.clear();
    lastSelectedSlot = null;

    document.querySelectorAll('.slot-button').forEach(slot => {
        if (slot.classList.contains('slot-selected')) {
            slot.classList.remove('slot-selected');
            slot.classList.add('slot-available');
            slot.title = 'Disponibile';
        }
    });

    updateSelectionUI();
}

// Undo ultima selezione (VERSIONE SEMPLIFICATA)
function undoLastSelection() {
    if (selectedSlots.size > 0) {
        const lastSlot = Array.from(selectedSlots).pop();
        const slotElement = document.querySelector(`[data-slot-id="${lastSlot}"]`);
        if (slotElement) {
            deselectSlot(lastSlot, slotElement);
            updateSelectionUI();
        }
    }
}

// Selezioni rapide preset (VERSIONE SEMPLIFICATA)
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

    // Seleziona slot nel range
    for (let hour = startHour; hour <= endHour; hour++) {
        const slotId = hour - 8;
        const slotElement = document.querySelector(`[data-slot-id="${slotId}"]`);

        if (slotElement && !slotElement.disabled && slotElement.classList.contains('slot-available')) {
            selectedSlots.add(slotId.toString());
            slotElement.classList.remove('slot-available');
            slotElement.classList.add('slot-selected');
            slotElement.title = 'Selezionato';

            if (window.slotManager) {
                window.slotManager.selectSlot(slotId.toString());
            }
        }
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
    console.log('ℹ️ Info:', message);
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, 'info');
    }
}

// Calcola il prezzo della prenotazione (VERSIONE SEMPLIFICATA)
function calculatePrice() {
    if (selectedSlots.size === 0) return 0;

    const prezzoPerOra = 10; // €10/ora
    return selectedSlots.size * prezzoPerOra;
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
    if (summaryData) summaryData.textContent = window.selectedDateInizio ? window.selectedDateInizio.toLocaleDateString('it-IT') : '-';

    if (summaryOrario && window.selectedTimeInizio && window.selectedTimeFine) {
        const oreTotali = selectedSlots.size;
        summaryOrario.textContent = `${window.selectedTimeInizio} - ${window.selectedTimeFine} (${oreTotali} ${oreTotali === 1 ? 'ora' : 'ore'})`;
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
    // Salva dati selezione per post-login
    const formatDate = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const selectionData = {
        sede: window.selectedSede,
        spazio: window.selectedSpazio,
        dataInizio: formatDate(window.selectedDateInizio),
        dataFine: formatDate(window.selectedDateFine),
        orarioInizio: window.selectedTimeInizio,
        orarioFine: window.selectedTimeFine
    };

    localStorage.setItem('pendingPrenotazione', JSON.stringify(selectionData));
    localStorage.setItem('redirectAfterLogin', '/pagamento.html');
    window.location.href = '/login.html';
}

// Funzione per ripristinare dati post-login (VERSIONE SEMPLIFICATA)
async function restorePendingPrenotazione() {
    const pendingData = localStorage.getItem('pendingPrenotazione');
    const redirectUrl = localStorage.getItem('redirectAfterLogin');

    if (pendingData && redirectUrl) {
        try {
            const data = JSON.parse(pendingData);
            if (data.sede && data.spazio && data.dataInizio && data.orarioInizio) {
                // Crea prenotazione
                const prenotazioneData = {
                    id_spazio: data.spazio,
                    data_inizio: new Date(`${data.dataInizio}T${data.orarioInizio}:00`).toISOString(),
                    data_fine: new Date(`${data.dataFine}T${data.orarioFine}:00`).toISOString()
                };

                const response = await fetch(`${CONFIG.API_BASE}/prenotazioni`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(prenotazioneData)
                });

                if (response.ok) {
                    const result = await response.json();
                    localStorage.removeItem('pendingPrenotazione');
                    localStorage.removeItem('redirectAfterLogin');
                    window.location.href = `/pagamento.html?id_prenotazione=${result.id_prenotazione}`;
                }
            }
        } catch (error) {
            console.error('❌ Errore ripristino prenotazione:', error);
            localStorage.removeItem('pendingPrenotazione');
            localStorage.removeItem('redirectAfterLogin');
        }
    }
}

// Funzione per verificare accesso utente (VERSIONE SEMPLIFICATA)
function checkUserAccess() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.ruolo === 'gestore' || user.ruolo === 'amministratore') {
                showError('I gestori non possono effettuare prenotazioni. Reindirizzamento alla dashboard...');
                setTimeout(() => window.location.href = '/dashboard.html', 3000);
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
window.restorePendingPrenotazione = restorePendingPrenotazione;
window.checkUserAccess = checkUserAccess;


