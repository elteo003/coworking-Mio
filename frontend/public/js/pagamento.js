// Configurazione per test locali - SENZA STRIPE
// Versione semplificata per testare l'interfaccia

// Dati della prenotazione di test
let prenotazioneData = {};

// Flag per tracciare se il pagamento è stato completato
let pagamentoCompletato = false;

// Inizializzazione della pagina per test locali
$(document).ready(async function () {
    console.log('🧪 pagamento.js - Inizializzazione per test locali (SENZA STRIPE)');

    // Inizializza la navbar universale se disponibile
    if (typeof window.initializeNavbar === 'function') {
        window.initializeNavbar();
    }

    try {
        // Inizializza automaticamente per test locali
        await initializeLocalTest();
        
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        showError('Errore durante l\'inizializzazione: ' + error.message);
    }
});

// Funzione per inizializzare il test locale
async function initializeLocalTest() {
    try {
        console.log('🧪 Inizializzazione test locale...');
        
        // Crea dati di test per la prenotazione
        const testData = {
            id_prenotazione: 'test_' + Date.now(),
            id_sede: 1,
            id_spazio: 1,
            nome_sede: 'Sede Test - Milano Centro',
            nome_spazio: 'Sala Meeting A',
            data_inizio: new Date().toISOString(),
            data_fine: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2 ore
            durata_ore: 2,
            importo: 20
        };
        
        // Salva i dati di test
        prenotazioneData = testData;
        
        // Popola i dettagli della prenotazione
        populatePrenotazioneDetails();
        
        // Configura gli event listener
        setupEventListeners();
        
        console.log('✅ Test locale inizializzato con successo');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione test locale:', error);
        showError('Errore configurazione test locale: ' + error.message);
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
    document.getElementById('sede-prenotazione').textContent = data.nome_sede;
    document.getElementById('spazio-prenotazione').textContent = data.nome_spazio;
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
    document.getElementById('totale-prenotazione').textContent = `€${data.importo.toFixed(2)}`;

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

    console.log('🧪 Gestione pagamento simulato...');

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
        console.log('⏳ Simulo elaborazione pagamento...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simula successo pagamento
        const simulatedPayment = {
            id: 'sim_' + Date.now(),
            status: 'succeeded',
            method: 'carta_simulata'
        };

        await handlePaymentSuccess(simulatedPayment);

    } catch (error) {
        console.error('Errore pagamento simulato:', error);
        showError('Errore durante il pagamento simulato. Riprova.');
    } finally {
        // Riabilita il pulsante di pagamento
        payButton.disabled = false;
        payButton.innerHTML = '<i class="fas fa-lock me-2"></i>Paga in Sicurezza';
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

        // Mostra messaggio di successo
        showSuccess('🎉 Pagamento completato con successo! La tua prenotazione è stata confermata.');

        // Aggiorna i dettagli della prenotazione
        const paymentDetails = document.querySelector('.payment-details');
        if (paymentDetails) {
            paymentDetails.querySelector('h4').innerHTML = '<i class="fas fa-check-circle me-2 text-success"></i>Prenotazione Confermata';
            paymentDetails.style.background = '#f8fff9';
            paymentDetails.style.border = '2px solid #28a745';
        }

        // Nascondi il form di pagamento
        const paymentForm = document.querySelector('.bg-light.p-4.rounded-3');
        if (paymentForm) {
            paymentForm.style.display = 'none';
        }

        // Aggiungi pulsante per tornare alla dashboard
        const backButton = document.createElement('a');
        backButton.href = 'dashboard.html';
        backButton.className = 'btn btn-outline-primary mt-3';
        backButton.innerHTML = '<i class="fas fa-arrow-left me-2"></i>Torna alla Dashboard';
        document.querySelector('.card-body').appendChild(backButton);

        console.log('✅ Pagamento simulato completato con successo');

    } catch (error) {
        console.error('Errore gestione successo pagamento:', error);
    }
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

// Mostra messaggio di successo
function showSuccess(message) {
    console.log('✅ Successo:', message);
    
    // Crea un alert temporaneo
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
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

// Logout locale
function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}
