// Configurazione API dinamica per supportare sia sviluppo locale che produzione
const CONFIG = {
    // URL del backend - può essere configurato tramite variabili d'ambiente o fallback
    API_BASE: (() => {
        // Se siamo su Render, usa l'URL di produzione
        if (window.location.hostname.includes('onrender.com')) {
            return 'https://coworking-mio-1-backend.onrender.com/api';
        }
        // Se siamo in sviluppo locale, usa localhost
        return 'http://localhost:3002/api';
    })(),

    // Configurazione Supabase (solo per autenticazione se necessario)
    SUPABASE_URL: 'https://czkiuvmhijhxuqzdtnmz.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6a2l1dm1oaWpoeHVxemR0bm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjA5OTEsImV4cCI6MjA3MDQ5Njk5MX0.k2HuloheKebEfOXRYnvHq5smVzNZlnQAWNHZzetKxeY'
};

// Definisci API_BASE_URL per compatibilità con i file esistenti
const API_BASE_URL = CONFIG.API_BASE;
window.API_BASE_URL = API_BASE_URL; // Esponi globalmente per compatibilità


// Debug: log della configurazione per verificare che sia caricata

// Funzione per aggiungere l'header di autorizzazione alle richieste API
function getAuthHeaders() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');


    if (user && token) {
        try {
            const userData = JSON.parse(user);
            // Usa il token JWT per l'autenticazione
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            console.error('Errore parsing user:', error);
            // Se c'è un errore nel parsing, rimuovi i dati corrotti
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
    }

    // Se non c'è utente o token, restituisci solo gli header base
    // NON interferire con il flusso di prenotazione
    return {
        'Content-Type': 'application/json'
    };
}

// Funzione per gestire errori di autenticazione
function handleAuthError() {

    // Rimuovi solo i dati di sessione corrotti, non tutti
    try {
        const user = localStorage.getItem('user');
        if (user) {
            JSON.parse(user); // Testa se è valido
        }
    } catch (error) {
        // Solo se i dati sono corrotti, rimuovili
        localStorage.removeItem('user');
    }

    // Reindirizza al login con messaggio chiaro e appropriato
    const currentPage = window.location.pathname.split('/').pop();
    let message = 'Devi effettuare il login per completare questa azione.';

    // Personalizza il messaggio in base alla pagina
    if (currentPage === 'selezione-slot.html') {
        message = 'Devi effettuare il login per completare la prenotazione.';
    } else if (currentPage === 'pagamento.html') {
        message = 'Devi effettuare il login per completare il pagamento.';
    } else if (currentPage === 'dashboard.html') {
        message = 'Devi effettuare il login per accedere alla dashboard.';
    }

    const loginUrl = 'login.html?message=' + encodeURIComponent(message);
    window.location.href = loginUrl;
}

// Funzione centralizzata per il logout
function logout() {

    // Salva la pagina corrente per il redirect dopo il login
    const currentPage = window.location.pathname.split('/').pop();
    const currentUrl = window.location.href;

    // Determina se la pagina corrente richiede autenticazione
    const requiresAuth = isPageRequiringAuth(currentPage);

    if (requiresAuth) {
        // Se la pagina richiede autenticazione, salva l'URL per il redirect
        localStorage.setItem('redirectAfterLogin', currentUrl);
    } else {
        // Se la pagina non richiede auth, non salvare nulla
        localStorage.removeItem('redirectAfterLogin');
    }

    // Pulisci i dati della prenotazione in corso se siamo su selezione-slot.html
    if (currentPage === 'selezione-slot.html') {
        localStorage.removeItem('selectedSede');
        localStorage.removeItem('selectedSpazio');
        localStorage.removeItem('selectedDataInizio');
        localStorage.removeItem('selectedDataFine');
        localStorage.removeItem('disponibilitaVerificata');
    }

    // Rimuovi solo i dati di sessione, non tutto
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // ✅ SEMPRE reindirizza alla homepage dopo il logout
    window.location.href = 'index.html?message=' + encodeURIComponent('Logout effettuato con successo.');
}

// ✅ NUOVA FUNZIONE: tenta di ripristinare i dati utente dal token
async function attemptUserRestoreFromToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        return false;
    }

    try {

        // Prova a decodificare il JWT per estrarre informazioni base
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
            try {
                const payload = JSON.parse(atob(tokenParts[1]));

                // Se il token contiene dati utente, ricrea l'oggetto user
                if (payload.id_utente || payload.sub) {
                    const restoredUser = {
                        id_utente: payload.id_utente || payload.sub,
                        nome: payload.nome || 'Utente',
                        cognome: payload.cognome || 'Ripristinato',
                        email: payload.email || 'email@example.com',
                        ruolo: payload.ruolo || 'cliente',
                        message: 'Utente ripristinato dal token'
                    };

                    localStorage.setItem('user', JSON.stringify(restoredUser));
                    return true;
                }
            } catch (decodeError) {
            }
        }

        // Se non riesco a decodificare, prova a chiamare l'API per verificare il token
        const response = await fetch(`${window.CONFIG.API_BASE}/verify-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'token': token,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const userData = await response.json();
            localStorage.setItem('user', JSON.stringify(userData));
            return true;
        } else {
            return false;
        }

    } catch (error) {
        console.error('❌ Errore nel tentativo di ripristino dati utente:', error);
        return false;
    }
}

// Funzione per verificare se l'utente è autenticato
async function isAuthenticated() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!user && token) {
        // ✅ NUOVO CASO: token presente ma user mancante, prova a ripristinare
        const restored = await attemptUserRestoreFromToken();
        if (restored) {
            return true;
        }
    }

    if (!user) {
        return false;
    }

    try {
        const userData = JSON.parse(user);

        // ✅ Se l'utente è gestore o amministratore, mantieni la sessione anche senza token
        if (userData.ruolo === 'gestore' || userData.ruolo === 'amministratore') {
            if (userData.id_utente) {
                return true;
            }
        }

        // ✅ Per utenti normali, richiedi sia user che token
        if (!token) {
            return false;
        }

        const isAuthenticated = userData && userData.id_utente;
        return isAuthenticated;
    } catch (error) {
        console.error('isAuthenticated - Errore parsing user:', error);
        return false;
    }
}

// Funzione per verificare e ripristinare il token mancante
function checkAndRestoreToken() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');


    if (user && !token) {

        try {
            const userData = JSON.parse(user);

            // Se l'utente ha un messaggio di login, potrebbe essere necessario un nuovo login
            if (userData.message === 'Login effettuato') {
                localStorage.removeItem('user'); // Rimuovi dati corrotti
                return false;
            }

            // Se l'utente ha tutti i campi necessari ma manca il token, potrebbe essere un bug
            if (userData.id_utente && userData.nome && userData.cognome) {
                // ✅ NON rimuovere l'utente, potrebbe essere un problema temporaneo
                // ✅ Restituisci true per mantenere la sessione attiva
                return true;
            }
        } catch (error) {
            console.error('checkAndRestoreToken - Errore parsing user:', error);
            localStorage.removeItem('user');
            return false;
        }
    }

    return true;
}

// Funzione per forzare un nuovo login se necessario
function forceReLogin(reason = 'Token mancante o non valido') {

    // Pulisci tutti i dati di sessione
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('redirectAfterLogin');

    // Reindirizza al login con messaggio
    const loginUrl = 'login.html?message=' + encodeURIComponent(`Errore di autenticazione: ${reason}. Effettua nuovamente il login.`);
    window.location.href = loginUrl;
}

// Funzione per verificare la validità della sessione all'avvio
async function validateTokenOnStartup() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');


    if (user && token) {
        try {
            const userData = JSON.parse(user);

            // Verifica che l'utente abbia i campi necessari
            if (!userData.id_utente || !userData.nome || !userData.cognome) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                return false;
            }

            return true;
        } catch (error) {
            // User non valido, pulisci i dati
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            return false;
        }
    } else if (user && !token) {
        // Caso speciale: user presente ma token mancante

        try {
            const userData = JSON.parse(user);
            // ✅ Se l'utente è gestore o amministratore, mantieni la sessione anche senza token
            if (userData.ruolo === 'gestore' || userData.ruolo === 'amministratore') {
                return true;
            }
        } catch (error) {
        }

        return checkAndRestoreToken();
    } else if (!user && token) {
        // ✅ NUOVO CASO: token presente ma user mancante (situazione attuale)

        // Prova a ripristinare i dati utente dal token
        return await attemptUserRestoreFromToken();
    } else {
        return false;
    }
}

// Funzione per verificare se una pagina richiede autenticazione
function isPageRequiringAuth(pageName) {
    const pagesRequiringAuth = [
        'dashboard.html',
        'pagamento.html',
        'dashboard-responsabili.html',
        'selezione-slot.html' // ✅ SEMPRE richiede autenticazione per prenotare
    ];

    return pagesRequiringAuth.includes(pageName);
}

// Funzione per verificare se un utente può accedere a una pagina specifica
function canUserAccessPage(pageName, userRole) {
    // I gestori e amministratori non possono accedere alla pagina di selezione slot
    if (pageName === 'selezione-slot.html' && (userRole === 'gestore' || userRole === 'amministratore')) {
        return false;
    }

    // I gestori e amministratori non possono accedere alla pagina di pagamento
    if (pageName === 'pagamento.html' && (userRole === 'gestore' || userRole === 'amministratore')) {
        return false;
    }

    return true;
}

// ===== NAVBAR UNIVERSALE =====
// Sistema centralizzato per gestire la navbar in tutte le pagine

// Configurazione navbar per diverse pagine
const NAVBAR_CONFIG = {
    // Pagina: { mostraDashboard: boolean, mostraLogout: boolean, mostraPrenota: boolean }
    'index.html': { mostraDashboard: true, mostraLogout: true, mostraPrenota: true },
    'selezione-slot.html': { mostraDashboard: true, mostraLogout: true, mostraPrenota: true },
    'catalogo.html': { mostraDashboard: true, mostraLogout: true, mostraPrenota: true },
    'pagamento.html': { mostraDashboard: true, mostraLogout: true, mostraPrenota: false },
    'dashboard.html': { mostraDashboard: false, mostraLogout: true, mostraPrenota: true },
    'dashboard-responsabili.html': { mostraDashboard: false, mostraLogout: true, mostraPrenota: false }
};

// Funzione universale per aggiornare la navbar
function updateNavbarUniversal() {

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const config = NAVBAR_CONFIG[currentPage] || NAVBAR_CONFIG['index.html'];
    const userStr = localStorage.getItem('user');


    // Trova la sezione auth
    const authSection = document.getElementById('authSection');
    if (!authSection) {
        return;
    }

    // ✅ Rimuovi tutti gli elementi dinamici esistenti per evitare duplicati

    // Rimuovi link dinamici (Dashboard, etc.)
    document.querySelectorAll('.nav-item.dynamic-nav-item').forEach(item => {
        item.remove();
    });

    // ✅ Info utente non più gestito, navbar più pulita

    if (userStr) {
        try {
            const user = JSON.parse(userStr);

            // ✅ RIMUOVI SOLO IL BOTTONE LOGOUT, MANTIENI LA SEZIONE AUTH PER IL DASHBOARD
            // Il logout è disponibile solo nelle dashboard
            if (authSection) {
                // Rimuovi solo il contenuto del bottone logout, mantieni la struttura
                authSection.innerHTML = '';
            }

            // ✅ Info utente rimosso per navbar più pulita

            // Aggiungi Dashboard in base al ruolo dell'utente
            if (config.mostraDashboard) {
                let dashboardItems = '';

                if (user.ruolo === 'gestore') {
                    // Per gestori: Solo Dashboard Gestori (principale)
                    dashboardItems = `
                        <li class="nav-item dynamic-nav-item">
                            <a class="nav-link" href="dashboard-responsabili.html">
                                <i class="fas fa-users-cog me-2"></i>Dashboard Gestori
                            </a>
                        </li>
                    `;
                } else if (user.ruolo === 'cliente') {
                    // Per clienti: Solo Dashboard Utente (senza nome utente)
                    dashboardItems = `
                        <li class="nav-item dynamic-nav-item">
                            <a class="nav-link" href="dashboard.html">
                                <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                            </a>
                        </li>
                    `;
                }
                // ✅ Amministratori: Nessun link dashboard nella navbar universale
                // Gli amministratori accedono alle dashboard tramite i link nelle rispettive pagine

                if (dashboardItems) {
                    authSection.insertAdjacentHTML('afterend', dashboardItems);
                }
            }

            // ✅ Logout ora è integrato direttamente nella sezione auth (vedi sopra)
            // Non serve più aggiungere un pulsante Logout separato

            // Gestisci la visibilità del link "Prenota" in base al ruolo
            managePrenotaLinkVisibility(user.ruolo);


        } catch (error) {
            console.error('updateNavbarUniversal - Errore parsing user:', error);
            localStorage.removeItem('user');
            // Fallback: mostra navbar per utenti non autenticati
            showNavbarForUnauthenticatedUser(config);
        }
    } else {
        // Utente non autenticato
        showNavbarForUnauthenticatedUser(config);
    }
}

// Funzione per gestire la visibilità del link "Prenota" in base al ruolo
function managePrenotaLinkVisibility(userRole) {
    // Trova tutti i link "Prenota" nella navbar
    const prenotaLinks = document.querySelectorAll('a[href="selezione-slot.html"]');

    prenotaLinks.forEach(link => {
        // Se l'utente è gestore o amministratore, nascondi il link Prenota
        if (userRole === 'gestore' || userRole === 'amministratore') {
            link.style.display = 'none';
            // Nascondi anche l'elemento padre se è un nav-item
            const navItem = link.closest('.nav-item');
            if (navItem) {
                navItem.style.display = 'none';
            }
        } else {
            // Per utenti normali, mostra il link
            link.style.display = 'inline-block';
            const navItem = link.closest('.nav-item');
            if (navItem) {
                navItem.style.display = 'block';
            }
        }
    });

    // Gestisci anche i pulsanti "Prenota Ora" nelle pagine
    managePrenotaButtonsVisibility(userRole);
}

// Funzione per gestire la visibilità dei pulsanti "Prenota Ora" in base al ruolo
function managePrenotaButtonsVisibility(userRole) {
    // Se l'utente è gestore o amministratore, nascondi i pulsanti di prenotazione
    if (userRole === 'gestore' || userRole === 'amministratore') {

        // ✅ Metodo corretto: cerca pulsanti con testo specifico
        const allButtons = document.querySelectorAll('button, .btn');
        let hiddenCount = 0;

        allButtons.forEach(button => {
            if (button.textContent && button.textContent.includes('Prenota Ora')) {
                button.style.display = 'none';
                hiddenCount++;
            }
        });

        // Nascondi anche i pulsanti con ID specifici
        const btnBook = document.getElementById('btnBook');
        if (btnBook) {
            btnBook.style.display = 'none';
            hiddenCount++;
        }

    } else {
    }
}

// Funzione per mostrare navbar per utenti non autenticati
function showNavbarForUnauthenticatedUser(config) {

    // ✅ CONTROLLO: verifica se l'utente è effettivamente autenticato
    const user = localStorage.getItem('user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            return; // Non mostrare navbar non autenticata se l'utente è già loggato
        } catch (error) {
        }
    }

    const authSection = document.getElementById('authSection');
    if (!authSection) {
        return;
    }

    // ✅ Mostra sempre il tasto Accedi per utenti non autenticati (soprattutto sulla homepage)

    // ✅ Rimuovi elementi dinamici rimasti per navbar pulita

    // Rimuovi eventuali link dinamici rimasti
    const dynamicItems = authSection.parentElement.querySelectorAll('.dynamic-nav-item');
    dynamicItems.forEach(item => {
        item.remove();
    });

    // ✅ Mostra tasto Accedi
    authSection.innerHTML = `
        <a class="nav-link btn btn-primary ms-2" href="#" onclick="showLoginModal()">
            <i class="fas fa-sign-in-alt me-1"></i>
            Accedi
        </a>
    `;
}

// Funzione per inizializzare la navbar all'avvio
function initializeNavbar() {

    // Verifica token all'avvio
    validateTokenOnStartup().then(() => {
        // Aggiorna navbar dopo la validazione
        updateNavbarUniversal();
    }).catch(error => {
        console.error('initializeNavbar - Errore validazione token:', error);
        // Fallback: aggiorna navbar senza validazione
        updateNavbarUniversal();
    });
}

// Esporta per uso globale
window.CONFIG = CONFIG;
window.getAuthHeaders = getAuthHeaders;
window.handleAuthError = handleAuthError;
window.logout = logout;
window.isAuthenticated = isAuthenticated;
window.validateTokenOnStartup = validateTokenOnStartup;
window.isPageRequiringAuth = isPageRequiringAuth;
window.updateNavbarUniversal = updateNavbarUniversal;
window.initializeNavbar = initializeNavbar;
window.forceReLogin = forceReLogin;

