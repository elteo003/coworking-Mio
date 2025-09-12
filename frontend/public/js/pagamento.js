// Configurazione per PRODUZIONE - CON STRIPE (TEMPORANEA)
// Versione ibrida: campi manuali + logica Stripe per il backend

// Configurazione Stripe (per ora disabilitata)
let stripe;
let elements;
let cardElement;

// Dati della prenotazione (verranno presi dal database)
let prenotazioneData = {};

// Flag per tracciare se il pagamento è stato completato
let pagamentoCompletato = false;

// Inizializzazione della pagina per produzione
$(document).ready(async function () {

    // Inizializza la navbar universale se disponibile
    if (typeof window.initializeNavbar === 'function') {
        window.initializeNavbar();
    }

    try {
        // Verifica se abbiamo parametri URL per la prenotazione
        const urlParams = new URLSearchParams(window.location.search);
        const prenotazioneId = urlParams.get('prenotazione') || urlParams.get('id_prenotazione');
        
        
        if (prenotazioneId) {
            // Carica i dati reali della prenotazione dal database
            await loadPrenotazioneData(prenotazioneId);
        } else {
            // Fallback: mostra errore se non c'è ID prenotazione
            showError('ID prenotazione mancante. Torna alla dashboard e riprova.');
            return;
        }
        
        // Configura gli event listener per i campi manuali
        setupEventListeners();
        
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        showError('Errore durante l\'inizializzazione: ' + error.message);
    }
});


// Carica i dati reali della prenotazione dal database
async function loadPrenotazioneData(prenotazioneId) {
    try {
        
        // Chiamata API per ottenere i dati della prenotazione
        const response = await fetch(`${CONFIG.API_BASE}/prenotazioni/${prenotazioneId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Errore API: ${response.status}`);
        }

        const data = await response.json();
        
        // Controlla se i dati sono in data.prenotazione o direttamente in data
        if (data.prenotazione) {
            prenotazioneData = data.prenotazione;
        } else {
            prenotazioneData = data;
        }
        
        // Popola i dettagli della prenotazione
        populatePrenotazioneDetails();
        
        // Carica e precompila i dati utente
        await loadAndPopulateUserData();
        
        // Aggiungi CSS per campi precompilati
        addPrefilledFieldsCSS();
        
        
    } catch (error) {
        console.error('❌ Errore caricamento prenotazione:', error);
        showError('Impossibile caricare i dati della prenotazione. Verifica la connessione e riprova.');
        throw error;
    }
}

// Inizializza Stripe
async function initializeStripe() {
    try {

        // Verifica se Stripe è disponibile
        if (typeof Stripe === 'undefined') {
            throw new Error('Libreria Stripe non caricata');
        }

        // Ottieni la chiave pubblica Stripe dal backend
        const response = await fetch(`${CONFIG.API_BASE}/config/stripe-key`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Impossibile ottenere la chiave Stripe');
        }

        const { publishableKey } = await response.json();
        
        // Inizializza Stripe
        stripe = Stripe(publishableKey);
        
        // Crea l'elemento carta
        elements = stripe.elements();
        cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
                invalid: {
                    color: '#9e2146',
                },
            },
        });

        // Monta l'elemento carta
        cardElement.mount('#card-element');
        
        // Gestisci errori della carta
        cardElement.on('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
                displayError.style.display = 'block';
            } else {
                displayError.textContent = '';
                displayError.style.display = 'none';
            }
        });

        // Configura gli event listener
        setupEventListeners();
        
        
    } catch (error) {
        console.error('❌ Errore inizializzazione Stripe:', error);
        showError('Errore configurazione pagamento: ' + error.message);
        throw error;
    }
}

// Popola i dettagli della prenotazione
function populatePrenotazioneDetails() {
    const data = prenotazioneData;
    
    if (!data) {
        return;
    }

    // Formatta le date
    const dataInizio = new Date(data.data_inizio);
    const dataFine = new Date(data.data_fine);

    // Formatta la data in italiano
    const dataFormattata = dataInizio.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Formatta l'orario
    const orarioInizio = dataInizio.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const orarioFine = dataFine.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Aggiorna l'interfaccia
    document.getElementById('sede-prenotazione').textContent = data.nome_sede || 'Caricamento...';
    
    document.getElementById('spazio-prenotazione').textContent = data.nome_spazio || 'Caricamento...';
    
    document.getElementById('data-inizio-prenotazione').textContent = `${dataFormattata} dalle ${orarioInizio}`;
    
    document.getElementById('data-fine-prenotazione').textContent = `${dataFine.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })} alle ${orarioFine}`;
    
    // Usa durata_ore dal database se disponibile, altrimenti calcola
    let durataOre;
    if (data.durata_ore && !isNaN(data.durata_ore)) {
        durataOre = data.durata_ore;
    } else {
        // Fallback: calcola dalle date
        const durataMs = dataFine.getTime() - dataInizio.getTime();
        durataOre = Math.round(durataMs / (1000 * 60 * 60));
    }
    
    // Formatta la durata
    let durataText = '';
    if (durataOre >= 1) {
        const ore = Math.floor(durataOre);
        const minuti = Math.round((durataOre - ore) * 60);
        if (minuti > 0) {
            durataText = `${ore}h ${minuti}m`;
        } else {
            durataText = `${ore}h`;
        }
    } else {
        const minuti = Math.round(durataOre * 60);
        durataText = `${minuti}m`;
    }

    document.getElementById('durata-prenotazione').textContent = durataText;
    
    // Calcola il totale usando la stessa logica della dashboard (€10/ora)
    const prezzoOrario = 10.00; // Stesso prezzo della dashboard
    const totale = durataOre * prezzoOrario;
    
    document.getElementById('totale-prenotazione').textContent = `€${totale.toFixed(2)}`;
    
    // Salva il totale nei dati per usarlo nel pagamento
    prenotazioneData.importo = totale;

}

// Carica e precompila i dati utente nel form di pagamento
async function loadAndPopulateUserData() {
    try {
        
        // Estrai i dati utente dal token JWT
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        
        // Decodifica il token JWT (parte payload)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            return;
        }
        
        // Decodifica la parte payload (seconda parte)
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // Precompila i campi del form
        populateUserFormFields(payload);
        
        
    } catch (error) {
        console.error('❌ Errore caricamento dati utente:', error);
    }
}

// Precompila i campi del form con i dati utente
function populateUserFormFields(userData) {
    
    // Campi da precompilare (sempre disponibili dal token JWT)
    const fieldsToPopulate = {
        'cardholder-name': (userData.nome || '') + ' ' + (userData.cognome || ''),
        'cardholder-email': userData.email || ''
    };
    
    // Rimuovi spazi doppi se nome o cognome mancano
    if (fieldsToPopulate['cardholder-name']) {
        fieldsToPopulate['cardholder-name'] = fieldsToPopulate['cardholder-name'].trim();
    }
    
    // Aggiungi campi opzionali se disponibili nel token o database utente
    if (userData.telefono) {
        fieldsToPopulate['billing-phone'] = userData.telefono;
    }
    if (userData.indirizzo) {
        fieldsToPopulate['billing-address'] = userData.indirizzo;
    }
    if (userData.citta) {
        fieldsToPopulate['billing-city'] = userData.citta;
    }
    if (userData.provincia) {
        fieldsToPopulate['billing-province'] = userData.provincia;
    }
    if (userData.cap) {
        fieldsToPopulate['billing-zip'] = userData.cap;
    }
    
    // Precompila ogni campo se esiste
    Object.entries(fieldsToPopulate).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field && value) {
            field.value = value;
            
            // Aggiungi classe per indicare che è precompilato
            field.classList.add('pre-filled');
            
            // Aggiungi indicatore visivo al label
            const label = document.querySelector(`label[for="${fieldId}"]`);
            if (label && !label.querySelector('.pre-filled-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'pre-filled-indicator';
                indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
                indicator.title = 'Campo precompilato dai tuoi dati';
                label.appendChild(indicator);
            }
            
            // Trigger evento input per attivare validazione
            field.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
        }
    });
    
    // Log dei campi trovati e non trovati
    Object.keys(fieldsToPopulate).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
        } else {
        }
    });
}

// Aggiungi CSS per evidenziare i campi precompilati
function addPrefilledFieldsCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .pre-filled {
            background-color: #f8f9fa !important;
            border-left: 4px solid #28a745 !important;
        }
        
        .pre-filled:focus {
            background-color: #ffffff !important;
            border-left: 4px solid #007bff !important;
        }
        
        .pre-filled::placeholder {
            color: #6c757d !important;
            opacity: 0.6;
        }
        
        .form-label .pre-filled-indicator {
            color: #28a745;
            font-size: 0.8em;
            margin-left: 5px;
        }
    `;
    document.head.appendChild(style);
}

// Configura gli event listener
function setupEventListeners() {
    // Event listener per il form di pagamento
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmit);
    }

    // Event listener per i campi di input (validazione in tempo reale)
    setupInputValidation();
    
}

// Configura la validazione in tempo reale dei campi
function setupInputValidation() {
    // Validazione nome e cognome
    const cardholderName = document.getElementById('cardholder-name');
    if (cardholderName) {
        cardholderName.addEventListener('input', function() {
            validateField(this, this.value.length >= 3, 'Il nome deve contenere almeno 3 caratteri');
        });
    }

    // Validazione email
    const cardholderEmail = document.getElementById('cardholder-email');
    if (cardholderEmail) {
        cardholderEmail.addEventListener('input', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            validateField(this, emailRegex.test(this.value), 'Inserisci un\'email valida');
        });
    }

    // Validazione indirizzo
    const billingAddress = document.getElementById('billing-address');
    if (billingAddress) {
        billingAddress.addEventListener('input', function() {
            validateField(this, this.value.length >= 10, 'L\'indirizzo deve contenere almeno 10 caratteri');
        });
    }

    // Validazione città
    const billingCity = document.getElementById('billing-city');
    if (billingCity) {
        billingCity.addEventListener('input', function() {
            validateField(this, this.value.length >= 2, 'La città deve contenere almeno 2 caratteri');
        });
    }

    // Validazione provincia
    const billingProvince = document.getElementById('billing-province');
    if (billingProvince) {
        billingProvince.addEventListener('input', function() {
            validateField(this, this.value.length === 2, 'La provincia deve essere di 2 caratteri');
        });
    }

    // Validazione CAP
    const billingZip = document.getElementById('billing-zip');
    if (billingZip) {
        billingZip.addEventListener('input', function() {
            validateField(this, this.value.length === 5 && /^\d+$/.test(this.value), 'Il CAP deve essere di 5 cifre');
        });
    }

    // Validazione data scadenza
    const cardExpiry = document.getElementById('card-expiry');
    if (cardExpiry) {
        cardExpiry.addEventListener('input', function() {
            const value = this.value;
            if (value.length === 2 && !value.includes('/')) {
                this.value = value + '/';
            }
            const isValid = /^\d{2}\/\d{2}$/.test(value);
            validateField(this, isValid, 'Formato: MM/AA');
        });
    }

    // Validazione numero carta
    const cardNumber = document.getElementById('card-number');
    if (cardNumber) {
        cardNumber.addEventListener('input', function() {
            // Formatta il numero carta con spazi ogni 4 cifre
            let value = this.value.replace(/\s/g, '');
            if (value.length > 16) value = value.substring(0, 16);
            
            // Aggiungi spazi ogni 4 cifre
            const formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            this.value = formattedValue;
            
            // Valida (almeno 13 cifre per una carta valida)
            const isValid = value.length >= 13 && /^\d+$/.test(value);
            validateField(this, isValid, 'Il numero carta deve contenere almeno 13 cifre');
        });
    }

    // Validazione CVC
    const cardCvc = document.getElementById('card-cvc');
    if (cardCvc) {
        cardCvc.addEventListener('input', function() {
            const isValid = /^\d{3,4}$/.test(this.value);
            validateField(this, isValid, 'Il CVC deve essere di 3-4 cifre');
        });
    }

    // Validazione termini e condizioni
    const termsAccept = document.getElementById('terms-accept');
    if (termsAccept) {
        termsAccept.addEventListener('change', function() {
            validateField(this, this.checked, 'Devi accettare i termini e condizioni');
        });
    }
}

// Valida un campo e mostra/nascondi errori
function validateField(field, isValid, errorMessage) {
    const errorElement = field.parentNode.querySelector('.field-error');
    
    if (!isValid && field.value.trim() !== '') {
        // Mostra errore
        if (!errorElement) {
            const error = document.createElement('div');
            error.className = 'field-error text-danger mt-1 small';
            error.textContent = errorMessage;
            field.parentNode.appendChild(error);
        } else {
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
        }
        
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
    } else if (isValid || field.value.trim() === '') {
        // Nascondi errore e mostra successo se valido
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        if (isValid && field.value.trim() !== '') {
            field.classList.add('is-valid');
            field.classList.remove('is-invalid');
        } else {
            field.classList.remove('is-valid', 'is-invalid');
        }
    }
}

// Gestisce l'invio del form di pagamento
async function handlePaymentSubmit(event) {
    event.preventDefault();


    // Valida tutti i campi
    if (!validateAllFields()) {
        showError('Per favore completa tutti i campi obbligatori correttamente');
        return;
    }

    // Disabilita il pulsante di pagamento
    const payButton = document.getElementById('pay-button');
    payButton.disabled = true;
    payButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Elaborazione...';

    try {
        
        // Simula elaborazione pagamento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simula successo pagamento
        const simulatedPayment = {
            id: 'sim_' + Date.now(),
            status: 'succeeded',
            method: 'carta_credito_manuale',
            amount: prenotazioneData.importo
        };

        // Gestisci il successo del pagamento
        await handlePaymentSuccess(simulatedPayment);

    } catch (error) {
        console.error('Errore pagamento:', error);
        showError('Errore durante il pagamento: ' + error.message);
    } finally {
        // Riabilita il pulsante di pagamento
        payButton.disabled = false;
        payButton.innerHTML = '<i class="fas fa-lock me-2"></i>Paga in Sicurezza';
    }
}

// Crea l'intent di pagamento
async function createPaymentIntent() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/pagamenti/create-intent`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prenotazione_id: prenotazioneData.id_prenotazione,
                importo: prenotazioneData.importo,
                descrizione: `Prenotazione ${prenotazioneData.nome_spazio} - ${prenotazioneData.nome_sede}`
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore creazione intent di pagamento');
        }

        return await response.json();

    } catch (error) {
        console.error('Errore creazione intent:', error);
        throw error;
    }
}

// Valida tutti i campi del form
function validateAllFields() {
    const requiredFields = [
        'cardholder-name',
        'cardholder-email',
        'billing-address',
        'billing-city',
        'billing-province',
        'billing-zip',
        'card-number',
        'card-expiry',
        'card-cvc',
        'terms-accept'
    ];

    let allValid = true;

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;

        let isValid = false;

        switch (fieldId) {
            case 'cardholder-name':
                isValid = field.value.length >= 3;
                break;
            case 'cardholder-email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(field.value);
                break;
            case 'billing-address':
                isValid = field.value.length >= 10;
                break;
            case 'billing-city':
                isValid = field.value.length >= 2;
                break;
            case 'billing-province':
                isValid = field.value.length === 2;
                break;
            case 'billing-zip':
                isValid = field.value.length === 5 && /^\d+$/.test(field.value);
                break;
            case 'card-number':
                const cardValue = field.value.replace(/\s/g, '');
                isValid = cardValue.length >= 13 && /^\d+$/.test(cardValue);
                break;
            case 'card-expiry':
                isValid = /^\d{2}\/\d{2}$/.test(field.value);
                break;
            case 'card-cvc':
                isValid = /^\d{3,4}$/.test(field.value);
                break;
            case 'terms-accept':
                isValid = field.checked;
                break;
        }

        if (!isValid) {
            allValid = false;
            field.classList.add('is-invalid');
            field.classList.remove('is-valid');
        } else {
            field.classList.add('is-valid');
            field.classList.remove('is-invalid');
        }
    });

    return allValid;
}

// Gestisce il successo del pagamento
async function handlePaymentSuccess(paymentIntent) {
    try {
        // Imposta il flag che il pagamento è stato completato
        pagamentoCompletato = true;
        
        await savePaymentToDatabase(paymentIntent);

        // Mostra la pagina di ringraziamento
        showThankYouPage();


    } catch (error) {
        console.error('Errore gestione successo pagamento:', error);
        showError('Errore durante il salvataggio del pagamento: ' + error.message);
    }
}

// Salva il pagamento nel database
async function savePaymentToDatabase(paymentIntent) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/pagamenti/confirm`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_prenotazione: prenotazioneData.id_prenotazione,
                payment_intent_id: paymentIntent.id,
                method: 'carta_credito'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Errore backend:', errorData);
            
            // Gestisci specificamente l'errore di duplicato (sia da 400 che da 500)
            if (errorData.error && (
                errorData.error.includes('duplicate key value violates unique constraint') ||
                errorData.error.includes('duplicate key value violates unique constraint "unique_id_prenotazione"')
            )) {
                
                // Aggiorna solo lo stato della prenotazione a 'pagato'
                await updatePrenotazioneStatus();
                return;
            }
            
            throw new Error(errorData.error || errorData.message || 'Errore salvataggio pagamento');
        }

        const result = await response.json();

    } catch (error) {
        console.error('Errore salvataggio pagamento:', error);
        throw error;
    }
}

// Aggiorna solo lo stato della prenotazione a 'pagato'
async function updatePrenotazioneStatus() {
    try {
        
        const response = await fetch(`${CONFIG.API_BASE}/prenotazioni/${prenotazioneData.id_prenotazione}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stato: 'pagato'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Errore aggiornamento stato:', errorData);
            throw new Error('Errore aggiornamento stato prenotazione');
        }

        const result = await response.json();
        
    } catch (error) {
        console.error('Errore aggiornamento stato prenotazione:', error);
        throw error;
    }
}

// Mostra la pagina di ringraziamento
function showThankYouPage() {
    // Nascondi il form di pagamento
    const paymentForm = document.querySelector('.bg-light.p-4.rounded-3');
    if (paymentForm) {
        paymentForm.style.display = 'none';
    }

    // Aggiorna i dettagli della prenotazione
    const paymentDetails = document.querySelector('.payment-details');
    if (paymentDetails) {
        paymentDetails.querySelector('h4').innerHTML = '<i class="fas fa-check-circle me-2 text-success"></i>Prenotazione Confermata';
        paymentDetails.style.background = '#f8fff9';
        paymentDetails.style.border = '2px solid #28a745';
    }

    // Mostra messaggio di ringraziamento
    const thankYouMessage = document.createElement('div');
    thankYouMessage.className = 'text-center py-5';
    thankYouMessage.innerHTML = `
        <div class="mb-4">
            <i class="fas fa-check-circle fa-5x text-success mb-3"></i>
            <h2 class="text-success">Grazie per la tua prenotazione!</h2>
            <p class="lead">Il pagamento è stato completato con successo.</p>
        </div>
        <div class="alert alert-success">
            <h5><i class="fas fa-envelope me-2"></i>Email di conferma inviata</h5>
            <p class="mb-0">Ti abbiamo inviato un'email con tutti i dettagli della prenotazione.</p>
        </div>
        <div class="mt-4">
            <a href="dashboard.html" class="btn btn-primary btn-lg me-3">
                <i class="fas fa-tachometer-alt me-2"></i>Vai alla Dashboard
            </a>
            <a href="selezione-slot.html" class="btn btn-outline-primary btn-lg">
                <i class="fas fa-plus me-2"></i>Nuova Prenotazione
            </a>
        </div>
    `;

    document.querySelector('.card-body').appendChild(thankYouMessage);

    // Redirect automatico alla dashboard appropriata dopo 10 secondi
    setTimeout(() => {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                const dashboardUrl = getDashboardUrl(userData.ruolo);
                window.location.href = dashboardUrl;
            } catch (error) {
                console.error('Errore parsing user per redirect:', error);
                window.location.href = 'dashboard.html';
            }
        } else {
            window.location.href = 'dashboard.html';
        }
    }, 10000);
}

// Mostra messaggio di errore
function showError(message) {
    console.error('❌ Errore:', message);
    
    // Crea un alert temporaneo
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Rimuovi automaticamente dopo 5 secondi
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Logout
function handleLogout() {
    // Usa la funzione centralizzata di config.js
    if (typeof window.logout === 'function') {
        window.logout();
    } else {
        // Fallback se la funzione non è disponibile
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html?message=' + encodeURIComponent('Logout effettuato con successo.');
    }
}
