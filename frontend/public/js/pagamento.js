// Configurazione per PRODUZIONE - CON STRIPE
// Versione completa per gestire pagamenti reali

// Configurazione Stripe
let stripe;
let elements;
let cardElement;

// Dati della prenotazione (verranno presi dal database)
let prenotazioneData = {};

// Flag per tracciare se il pagamento è stato completato
let pagamentoCompletato = false;

// Inizializzazione della pagina per produzione
$(document).ready(async function () {
    console.log('🚀 pagamento.js - Inizializzazione per PRODUZIONE (CON STRIPE)');

    // Inizializza la navbar universale se disponibile
    if (typeof window.initializeNavbar === 'function') {
        window.initializeNavbar();
    }

    try {
        // Verifica se abbiamo parametri URL per la prenotazione
        const urlParams = new URLSearchParams(window.location.search);
        const prenotazioneId = urlParams.get('prenotazione');
        
        if (prenotazioneId) {
            // Carica i dati reali della prenotazione dal database
            await loadPrenotazioneData(prenotazioneId);
        } else {
            // Fallback: mostra errore se non c'è ID prenotazione
            showError('ID prenotazione mancante. Torna alla dashboard e riprova.');
            return;
        }

        // Inizializza Stripe
        await initializeStripe();
        
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        showError('Errore durante l\'inizializzazione: ' + error.message);
    }
});

// Carica i dati reali della prenotazione dal database
async function loadPrenotazioneData(prenotazioneId) {
    try {
        console.log('📊 Carico dati prenotazione:', prenotazioneId);
        
        // Chiamata API per ottenere i dati della prenotazione
        const response = await fetch(`${API_BASE_URL}/prenotazioni/${prenotazioneId}`, {
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
        prenotazioneData = data.prenotazione;
        
        // Popola i dettagli della prenotazione
        populatePrenotazioneDetails();
        
        console.log('✅ Dati prenotazione caricati:', prenotazioneData);
        
    } catch (error) {
        console.error('❌ Errore caricamento prenotazione:', error);
        showError('Impossibile caricare i dati della prenotazione. Verifica la connessione e riprova.');
        throw error;
    }
}

// Inizializza Stripe
async function initializeStripe() {
    try {
        console.log('💳 Inizializzazione Stripe...');

        // Verifica se Stripe è disponibile
        if (typeof Stripe === 'undefined') {
            throw new Error('Libreria Stripe non caricata');
        }

        // Ottieni la chiave pubblica Stripe dal backend
        const response = await fetch(`${API_BASE_URL}/config/stripe-key`, {
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
        
        console.log('✅ Stripe inizializzato con successo');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione Stripe:', error);
        showError('Errore configurazione pagamento: ' + error.message);
        throw error;
    }
}

// Popola i dettagli della prenotazione
function populatePrenotazioneDetails() {
    const data = prenotazioneData;
    if (!data) return;

    console.log('populatePrenotazioneDetails - Dati prenotazione:', data);

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
    
    // Formatta la durata
    let durataText = '';
    if (data.durata_ore >= 1) {
        const ore = Math.floor(data.durata_ore);
        const minuti = Math.round((data.durata_ore - ore) * 60);
        if (minuti > 0) {
            durataText = `${ore}h ${minuti}m`;
        } else {
            durataText = `${ore}h`;
        }
    } else {
        const minuti = Math.round(data.durata_ore * 60);
        durataText = `${minuti}m`;
    }

    document.getElementById('durata-prenotazione').textContent = durataText;
    document.getElementById('totale-prenotazione').textContent = `€${data.importo ? data.importo.toFixed(2) : '0.00'}`;

    console.log('✅ Dettagli prenotazione popolati');
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
    
    console.log('✅ Event listener configurati');
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

    console.log('💳 Gestione pagamento reale...');

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
        // Crea l'intent di pagamento
        const paymentIntent = await createPaymentIntent();
        console.log('Payment Intent creato:', paymentIntent);

        // Conferma il pagamento con Stripe
        const { error, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
            paymentIntent.client_secret,
            {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: document.getElementById('cardholder-name').value,
                        email: document.getElementById('cardholder-email').value,
                        address: {
                            line1: document.getElementById('billing-address').value,
                            city: document.getElementById('billing-city').value,
                            state: document.getElementById('billing-province').value,
                            postal_code: document.getElementById('billing-zip').value,
                            country: 'IT'
                        }
                    }
                }
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        // Gestisci il successo del pagamento
        await handlePaymentSuccess(confirmedIntent);

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
        const response = await fetch(`${API_BASE_URL}/pagamenti/create-intent`, {
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

        // Salva il pagamento nel database
        await savePaymentToDatabase(paymentIntent);

        // Mostra la pagina di ringraziamento
        showThankYouPage();

        console.log('✅ Pagamento completato con successo');

    } catch (error) {
        console.error('Errore gestione successo pagamento:', error);
        showError('Errore durante il salvataggio del pagamento: ' + error.message);
    }
}

// Salva il pagamento nel database
async function savePaymentToDatabase(paymentIntent) {
    try {
        const response = await fetch(`${API_BASE_URL}/pagamenti/confirm`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prenotazione_id: prenotazioneData.id_prenotazione,
                payment_intent_id: paymentIntent.id,
                importo: prenotazioneData.importo,
                metodo_pagamento: 'carta_credito',
                stato: 'completato'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore salvataggio pagamento');
        }

        console.log('✅ Pagamento salvato nel database');

    } catch (error) {
        console.error('Errore salvataggio pagamento:', error);
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

    // Redirect automatico alla dashboard dopo 10 secondi
    setTimeout(() => {
        window.location.href = 'dashboard.html';
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
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}
