// Configurazione API
// Configurazione API - usa quella globale da config.js

// Debug: verifica configurazione

// Funzioni di utilità
function showAlert(message, type = 'info') {
  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  $('body').prepend(alertHtml);
}

// Crea una prenotazione direttamente (per post-login)
async function createPrenotazioneDirect(selectionData) {
  console.log('📝 Creazione prenotazione diretta:', selectionData);
  
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Token di autenticazione non trovato');
  }
  
  const formatDate = (date) => {
    // Se è già una stringa formattata, restituiscila così com'è
    if (typeof date === 'string') {
      return date;
    }
    
    // Se è un oggetto Date, formattalo
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Fallback: prova a convertire in Date
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    throw new Error('Formato data non valido');
  };
  
  // Prepara le date in modo sicuro
  const dataInizioFormatted = formatDate(selectionData.dataInizio);
  const dataFineFormatted = formatDate(selectionData.dataFine);
  
  console.log('📅 Date formattate:', {
    dataInizio: dataInizioFormatted,
    dataFine: dataFineFormatted,
    orarioInizio: selectionData.orarioInizio,
    orarioFine: selectionData.orarioFine
  });
  
  const prenotazioneData = {
    id_spazio: selectionData.spazio.id_spazio,
    data_inizio: new Date(`${dataInizioFormatted}T${selectionData.orarioInizio}:00`).toISOString(),
    data_fine: new Date(`${dataFineFormatted}T${selectionData.orarioFine}:00`).toISOString()
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

// Gestisce la prenotazione in attesa dopo il login
async function handlePendingPrenotazione(prenotazioneData, response) {
  try {
    // Crea direttamente la prenotazione
    const prenotazione = await createPrenotazioneDirect(prenotazioneData);
    
    // Pulisci i dati temporanei
    localStorage.removeItem('pendingPrenotazione');
    localStorage.removeItem('redirectAfterLogin');
    
    // Reindirizza al pagamento
    setTimeout(() => {
      window.location.href = `/pagamento.html?id_prenotazione=${prenotazione.id_prenotazione}`;
    }, 1000);
  } catch (error) {
    console.error('Errore creazione prenotazione post-login:', error);
    // Fallback: vai alla dashboard
    const userRole = response.ruolo;
    setTimeout(() => {
      window.location.href = getDashboardUrl(userRole);
    }, 1000);
  }
}

// Aggiorna navbar usando il sistema universale
function updateNavbar() {
  if (typeof window.updateNavbarUniversal === 'function') {
    window.updateNavbarUniversal();
  } else {
    // Fallback alla vecchia logica se il sistema universale non è disponibile
    updateNavbarFallback();
  }
}

// Funzione di fallback per compatibilità
function updateNavbarFallback() {
  const userStr = localStorage.getItem('user');

  if (userStr) {
    try {
      const user = JSON.parse(userStr);

      const authSection = $('#authSection');
      if (authSection.length) {
        authSection.html(`
          <span class="nav-link text-light">
            <i class="fas fa-user me-2"></i>${user.nome} ${user.cognome}
            <small class="d-block text-muted">${user.ruolo}</small>
          </span>
        `);
      }

      // Aggiungi link Dashboard e Logout dopo la sezione auth
      const newItems = `
        <li class="nav-item">
          <a class="nav-link" href="#" onclick="navigateToProtectedPage('dashboard.html')">
            <i class="fas fa-tachometer-alt me-2"></i>Dashboard
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" onclick="logout()">
            <i class="fas fa-sign-out-alt me-2"></i>Logout
          </a>
        </li>
      `;

      authSection.after(newItems);
    } catch (error) {
      console.error('Errore parsing user:', error);
      localStorage.removeItem('user');
    }
  }
}

// Mostra navbar di default per utenti non autenticati
function showDefaultNavbar() {
  // NON sostituire la navbar originale - mantieni quella dell'HTML
  return;
}

// Funzione per determinare la dashboard corretta in base al ruolo
function getDashboardUrl(ruolo) {
  let url;
  switch(ruolo) {
    case 'amministratore':
      url = 'dashboard-amministratore.html';
      break;
    case 'gestore':
      url = 'dashboard-responsabili.html';
      break;
    default:
      url = 'dashboard.html';
      break;
  }
  return url;
}

// Funzione per navigare alle pagine protette verificando l'autenticazione
function navigateToProtectedPage(pageUrl) {

  // ✅ Verifica se l'utente è autenticato (con logica migliorata per gestori)
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);

      // ✅ Se l'utente è gestore o amministratore, mantieni la sessione anche senza token
      if (user.ruolo === 'gestore' || user.ruolo === 'amministratore') {
        if (user.id_utente) {

          // Verifica permessi per pagine specifiche
          if (pageUrl.includes('dashboard-responsabili.html')) {
            window.location.href = pageUrl;
            return;
          }

          if (pageUrl.includes('dashboard.html') || pageUrl.includes('dashboard-amministratore.html')) {
            window.location.href = pageUrl;
            return;
          }
        }
      }

      // ✅ Per utenti normali, usa la logica standard
      if (typeof window.isAuthenticated === 'function') {
        // ✅ Gestisci la funzione asincrona
        window.isAuthenticated().then(isAuth => {
          if (isAuth) {

            // Verifica permessi per pagine specifiche
            if (pageUrl.includes('dashboard-responsabili.html') && user.ruolo !== 'gestore' && user.ruolo !== 'amministratore') {
              showAlert('Non hai i permessi per accedere a questa pagina. Solo gestori e amministratori possono accedere.', 'warning');
              return;
            }

            window.location.href = pageUrl;
          } else {
            // ✅ Se arriviamo qui, l'utente ha user ma non è completamente autenticato
            localStorage.setItem('redirectAfterLogin', pageUrl);
            window.location.href = 'login.html?message=' + encodeURIComponent('Sessione scaduta. Effettua nuovamente il login.');
          }
        }).catch(error => {
          console.error('❌ Errore nella verifica autenticazione:', error);
          // Fallback: richiedi login
          localStorage.setItem('redirectAfterLogin', pageUrl);
          window.location.href = 'login.html?message=' + encodeURIComponent('Errore di autenticazione. Effettua nuovamente il login.');
        });
        return;
      }

    } catch (error) {
      console.error('Errore parsing user:', error);
      localStorage.removeItem('user');
      showAlert('Errore nei dati utente. Effettua nuovamente il login.', 'danger');
      window.location.href = 'login.html';
    }
  } else {
    // ✅ Utente completamente non autenticato
    localStorage.setItem('redirectAfterLogin', pageUrl);
    window.location.href = 'login.html?message=' + encodeURIComponent('Devi effettuare il login per accedere a questa pagina.');
  }
}

// Logout locale - chiama la funzione centralizzata
function handleLogout() {

  // Usa la funzione centralizzata di config.js
  if (typeof window.logout === 'function') {
    window.logout();
  } else {
    // Fallback se la funzione non è disponibile
    localStorage.removeItem('user');
    // Ricarica la pagina per mostrare la navbar originale
    location.reload();
  }
}

// Caricamento sedi
function loadSedi(citta = '') {
  const url = citta ? `${window.CONFIG.API_BASE}/sedi?citta=${citta}` : `${window.CONFIG.API_BASE}/sedi`;

  $.ajax({
    url: url,
    method: 'GET'
    // Rimuovo headers per endpoint pubblico che non richiede autenticazione
  })
    .done(function (sedi) {
      displaySedi(sedi);
      populateCittaFilter(sedi);
    })
    .fail(function (xhr, status, error) {
      console.error('Errore caricamento sedi:', xhr, status, error);
      showAlert('Errore nel caricamento delle sedi', 'danger');
    });
}

// Visualizzazione sedi
function displaySedi(sedi) {
  const container = $('#catalogoSedi');
  container.empty();

  if (sedi.length === 0) {
    container.html('<div class="col-12 text-center"><p>Nessuna sede trovata</p></div>');
    return;
  }

  sedi.forEach(sede => {
    const card = `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">${sede.nome}</h5>
            <p class="card-text"><strong>Città:</strong> ${sede.citta}</p>
            <p class="card-text"><strong>Indirizzo:</strong> ${sede.indirizzo}</p>
            <p class="card-text">${sede.descrizione || ''}</p>
            <button class="btn btn-primary btn-sm" onclick="viewSpazi(${sede.id_sede})">
              Vedi spazi
            </button>
          </div>
        </div>
      </div>
    `;
    container.append(card);
  });
}

// Popola filtro città
function populateCittaFilter(sedi) {
  const citta = [...new Set(sedi.map(s => s.citta))];
  const select = $('#filtroCitta');
  select.find('option:not(:first)').remove();

  citta.forEach(c => {
    select.append(`<option value="${c}">${c}</option>`);
  });
}

// Visualizza spazi di una sede
function viewSpazi(idSede) {
  // Per ora reindirizza a una pagina di prenotazione
  window.location.href = `selezione-slot.html?sede=${idSede}`;
}

// Login
window.handleLogin = function (event, email, password) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }

  // Se i parametri non sono forniti, leggi dal DOM (per compatibilità)
  if (!email || !password) {
    email = $('#loginEmail').val();
    password = $('#loginPassword').val();
  }

  const data = {
    email: email,
    password: password
  };

  // Mostra loading
  const submitBtn = $('#loginForm button[type="submit"]');
  const originalText = submitBtn.html();
  submitBtn.html('<i class="fas fa-spinner fa-spin me-2"></i>Accesso in corso...');
  submitBtn.prop('disabled', true);

  // Usa fetch invece di jQuery per migliore gestione errori
  fetch(`${window.CONFIG.API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data),
    timeout: 30000 // 30 secondi di timeout
  })
    .then(response => {
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Email o password non corretti');
        } else if (response.status === 404) {
          throw new Error('Servizio di login non disponibile. Contatta il supporto.');
        } else {
          throw new Error(`Errore del server: ${response.status}`);
        }
      }
      return response.json();
    })
    .then(response => {
      // Debug: mostra la risposta del login

      // Salva l'utente
      localStorage.setItem('user', JSON.stringify(response));

      // Salva il token se presente nella risposta
      if (response.token) {
        localStorage.setItem('token', response.token);

        // Verifica che il token sia stato salvato
        const savedToken = localStorage.getItem('token');
      } else {

        // Controlla se il token è in un campo diverso
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
        } else if (response.jwt) {
          localStorage.setItem('token', response.jwt);
        } else if (response.authToken) {
          localStorage.setItem('token', response.authToken);
        } else {

          // Mostra errore all'utente
          showAlert('Errore: Il server non ha restituito un token di autenticazione. Riprova il login.', 'danger');
          return;
        }
      }

      showAlert('Login effettuato con successo!', 'success');

      // Aggiorna la navbar per mostrare le informazioni dell'utente
      updateNavbar();

      // Controlla se c'è un redirect specifico salvato
      const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
      if (redirectAfterLogin) {
        // Rimuovi l'URL salvato e vai alla pagina originale
        localStorage.removeItem('redirectAfterLogin');

        // Se il redirect è verso selezione-slot.html, gestisci la prenotazione in attesa
        if (redirectAfterLogin.includes('selezione-slot.html')) {
          // Controlla se c'è una prenotazione in attesa
          const pendingPrenotazione = localStorage.getItem('pendingPrenotazione');
          if (pendingPrenotazione) {
            try {
              const prenotazioneData = JSON.parse(pendingPrenotazione);
              // Gestisci la prenotazione in modo asincrono
              handlePendingPrenotazione(prenotazioneData, response);
              return;
            } catch (error) {
              console.error('Errore parsing prenotazione:', error);
              // Fallback: vai alla dashboard
              const userRole = response.ruolo;
              setTimeout(() => {
                window.location.href = getDashboardUrl(userRole);
              }, 1000);
              return;
            }
          } else {
            // ✅ Nessuna prenotazione in attesa, ma torna alla pagina di selezione slot
            setTimeout(() => {
              // Aggiungi parametro per indicare che si torna dopo il login
              const separator = redirectAfterLogin.includes('?') ? '&' : '?';
              window.location.href = redirectAfterLogin + separator + 'fromLogin=true';
            }, 1000);
            return;
          }
        } else {
          // ✅ GESTISCI REDIRECT PER CATALOGO E ALTRE PAGINE
          setTimeout(() => {
            // Se il redirect contiene parametri, preservali
            if (redirectAfterLogin.includes('catalogo.html')) {
              // Per il catalogo, assicurati di tornare alla pagina corretta
              window.location.href = redirectAfterLogin;
            } else {
              window.location.href = redirectAfterLogin;
            }
          }, 1000);
        }
        return;
      }

      // Controlla se c'è una prenotazione in attesa
      const pendingPrenotazione = localStorage.getItem('pendingPrenotazione');

      if (pendingPrenotazione) {
        // Controlla se l'utente è arrivato dalla home o da una prenotazione
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const isFromHome = currentPage === 'index.html' || currentPage === '';

        if (isFromHome) {
          // Se l'utente si logga dalla home, non forzare il redirect al pagamento
          // Rimuovi i dati della prenotazione in attesa e vai alla dashboard appropriata
          localStorage.removeItem('pendingPrenotazione');

          // ✅ TUTTI GLI UTENTI VANNO ALLA DASHBOARD UTENTE NORMALE (login dalla home)
          const userRole = response.ruolo;

          // Mostra messaggio informativo
          showAlert('Login effettuato! Hai una prenotazione in attesa che puoi completare dalla dashboard.', 'info');

          setTimeout(() => {
            window.location.href = getDashboardUrl(userRole);
          }, 1000);
        } else {
          // Se l'utente si logga da una pagina di prenotazione, procedi al pagamento

          // Rimuovi i dati temporanei e vai direttamente al pagamento
          localStorage.removeItem('pendingPrenotazione');
          const prenotazioneData = JSON.parse(pendingPrenotazione);

          // Vai direttamente alla pagina di pagamento con i parametri della prenotazione
          const pagamentoUrl = new URL('pagamento.html', window.location.origin);
          pagamentoUrl.searchParams.set('sede', prenotazioneData.sede);
          pagamentoUrl.searchParams.set('spazio', prenotazioneData.spazio);
          pagamentoUrl.searchParams.set('dal', prenotazioneData.dataInizio);
          pagamentoUrl.searchParams.set('al', prenotazioneData.dataFine);
          pagamentoUrl.searchParams.set('orarioInizio', prenotazioneData.orarioInizio);
          pagamentoUrl.searchParams.set('orarioFine', prenotazioneData.orarioFine);


          setTimeout(() => {
            window.location.href = pagamentoUrl.toString();
          }, 1000);
        }
      } else {
        // ✅ TUTTI GLI UTENTI VANNO ALLA DASHBOARD UTENTE NORMALE (se non stanno prenotando)
        const userRole = response.ruolo;

        // Nessuna prenotazione in attesa, vai alla dashboard appropriata
        setTimeout(() => {
          window.location.href = getDashboardUrl(userRole);
        }, 1000);
      }
    })
    .catch(error => {
      console.error('Errore login:', error);

      // Gestione specifica per timeout e errori di connessione
      if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
        showAlert('🔄 Il server si sta svegliando... Riprova tra qualche secondo.', 'warning');
      } else {
        const errorMessage = error.message || 'Errore durante il login';
        showAlert(errorMessage, 'danger');
      }
    })
    .finally(() => {
      // Ripristina il pulsante
      submitBtn.html(originalText);
      submitBtn.prop('disabled', false);
    });
}

// Registrazione
window.handleRegistration = function (event, nome, cognome, email, password, telefono, ruolo, inviteCode) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }

  // Se i parametri non sono forniti, leggi dal DOM (per compatibilità)
  if (!nome || !cognome || !email || !password || !ruolo) {
    nome = $('#regNome').val();
    cognome = $('#regCognome').val();
    email = $('#regEmail').val();
    password = $('#regPassword').val();
    ruolo = $('#regRuolo').val();
    telefono = $('#regTelefono').val() || null;
    inviteCode = $('#regInviteCode').val() || null;
  }

  const data = {
    nome: nome,
    cognome: cognome,
    email: email,
    password: password,
    ruolo: ruolo,
    telefono: telefono || null,
    inviteCode: inviteCode || null
  };

  // Mostra loading
  const submitBtn = $('#registrazioneForm button[type="submit"]');
  const originalText = submitBtn.html();
  submitBtn.html('<i class="fas fa-spinner fa-spin me-2"></i>Registrazione in corso...');
  submitBtn.prop('disabled', true);

  // Usa fetch invece di jQuery per migliore gestione errori
  fetch(`${window.CONFIG.API_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => {
      if (!response.ok) {
        if (response.status === 400) {
          return response.json().then(err => {
            throw new Error(err.error || 'Dati di registrazione non validi');
          });
        } else if (response.status === 409) {
          throw new Error('Email già registrata. Usa un\'altra email o effettua il login.');
        } else if (response.status === 404) {
          throw new Error('Servizio di registrazione non disponibile. Contatta il supporto.');
        } else {
          throw new Error(`Errore del server: ${response.status}`);
        }
      }
      return response.json();
    })
    .then(response => {
      // Debug: mostra la risposta della registrazione

      // Salva l'utente
      localStorage.setItem('user', JSON.stringify(response));

      // Salva il token se presente nella risposta
      if (response.token) {
        localStorage.setItem('token', response.token);
      } else {
      }

      showAlert('Login automatico effettuato! Reindirizzamento alla dashboard...', 'success');

      // Aggiorna la navbar per mostrare le informazioni dell'utente
      updateNavbar();

      // Controlla se c'è una prenotazione in attesa
      const pendingPrenotazione = localStorage.getItem('pendingPrenotazione');
      if (pendingPrenotazione) {
        // Controlla se l'utente è arrivato dalla home o da una prenotazione
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const isFromHome = currentPage === 'index.html' || currentPage === '';

        if (isFromHome) {
          // Se l'utente si registra dalla home, non forzare il redirect al pagamento
          // Rimuovi i dati della prenotazione in attesa e vai alla dashboard appropriata
          localStorage.removeItem('pendingPrenotazione');

          // ✅ TUTTI GLI UTENTI VANNO ALLA DASHBOARD UTENTE NORMALE (registrazione dalla home)
          const userRole = response.ruolo;

          // Mostra messaggio informativo
          showAlert('Registrazione completata! Hai una prenotazione in attesa che puoi completare dalla dashboard.', 'info');

          setTimeout(() => {
            window.location.href = getDashboardUrl(userRole);
          }, 1500);
        } else {
          // Se l'utente si registra da una pagina di prenotazione, procedi al pagamento

          // Rimuovi i dati temporanei e vai direttamente al pagamento
          localStorage.removeItem('pendingPrenotazione');
          const prenotazioneData = JSON.parse(pendingPrenotazione);

          // Vai direttamente alla pagina di pagamento con i parametri della prenotazione
          const pagamentoUrl = new URL('pagamento.html', window.location.origin);
          pagamentoUrl.searchParams.set('sede', prenotazioneData.sede);
          pagamentoUrl.searchParams.set('spazio', prenotazioneData.spazio);
          pagamentoUrl.searchParams.set('dataInizio', prenotazioneData.dataInizio);
          pagamentoUrl.searchParams.set('dataFine', prenotazioneData.dataFine);
          pagamentoUrl.searchParams.set('orarioInizio', prenotazioneData.orarioInizio);
          pagamentoUrl.searchParams.set('orarioFine', prenotazioneData.orarioFine);

          setTimeout(() => {
            window.location.href = pagamentoUrl.toString();
          }, 1500);
        }
      } else {
        // ✅ TUTTI GLI UTENTI VANNO ALLA DASHBOARD UTENTE NORMALE (nessuna prenotazione)
        const userRole = response.ruolo;

        // Nessuna prenotazione in attesa, vai alla dashboard appropriata
        setTimeout(() => {
          window.location.href = getDashboardUrl(userRole);
        }, 1500);
      }
    })
    .catch(error => {
      console.error('Errore registrazione:', error);
      const errorMessage = error.message || 'Errore durante la registrazione';
      showAlert(errorMessage, 'danger');
    })
    .finally(() => {
      // Ripristina il pulsante
      submitBtn.html(originalText);
      submitBtn.prop('disabled', false);
    });
}

// ✅ FUNZIONE PER GESTIRE "PRENOTA ORA" DALLA NAVBAR (nessuna preselezione)
window.handleNavbarPrenota = function() {
  console.log('🎯 Click "Prenota Ora" dalla navbar - nessuna preselezione');
  
  // Pulisce eventuali parametri di prenotazione precedenti
  localStorage.removeItem('bookingParams');
  
  // Verifica autenticazione
  const token = localStorage.getItem('token');
  if (!token) {
    // Salva il redirect per tornare alla prenotazione senza preselezione
    localStorage.setItem('redirectAfterLogin', 'selezione-slot.html');
    window.location.href = 'login.html';
    return;
  }
  
  // Utente autenticato, vai direttamente alla prenotazione
  window.location.href = 'selezione-slot.html';
};

// Funzione per pulire prenotazioni in attesa obsolete
function cleanupPendingPrenotazioni() {
  const pendingPrenotazione = localStorage.getItem('pendingPrenotazione');
  if (pendingPrenotazione) {
    try {
      const prenotazioneData = JSON.parse(pendingPrenotazione);

      // Se la prenotazione è più vecchia di 1 ora, rimuovila
      const dataPrenotazione = new Date(prenotazioneData.timestamp || Date.now());
      const ora = new Date();
      const oreTrascorse = (ora - dataPrenotazione) / (1000 * 60 * 60);

      if (oreTrascorse > 1) {
        localStorage.removeItem('pendingPrenotazione');
      }
    } catch (error) {
      console.error('Errore pulizia prenotazione in attesa:', error);
      // Se c'è un errore nel parsing, rimuovi comunque i dati corrotti
      localStorage.removeItem('pendingPrenotazione');
    }
  }
}

// Event handlers
$(document).ready(function () {

  // Pulisci prenotazioni in attesa obsolete
  cleanupPendingPrenotazioni();

  // Inizializza la navbar universale
  if (typeof window.initializeNavbar === 'function') {
    window.initializeNavbar();
  } else {
    // Fallback alla vecchia logica
    validateTokenOnStartup().then(() => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        updateNavbar();
      }
    });
  }

  // Carica sedi all'avvio se siamo sulla home
  if ($('#catalogoSedi').length) {
    loadSedi();
  }

  // Pulsante Catalogo (ricarica le sedi)
  $('#btnCatalogo').click(function (e) {
    e.preventDefault();
    loadSedi();
    // Scroll verso il catalogo
    $('html, body').animate({
      scrollTop: $('#catalogoSedi').parent().offset().top
    }, 500);
  });

  // Filtro sedi
  $('#btnFiltra').click(function () {
    const citta = $('#filtroCitta').val();
    loadSedi(citta);
  });

  // Login form
  $('#loginForm').submit(handleLogin);

  // Registrazione form
  $('#registrazioneForm').submit(handleRegistration);

  // Gestione hash URL per tab registrazione
  if (window.location.hash === '#registrazione') {
    $('#registrazione-tab').tab('show');
  }

  // Gestione redirect per prenotazione
  if (typeof handlePrenotazioneRedirect === 'function') {
    handlePrenotazioneRedirect();
  }
});

// Inizializzazione quando il DOM è pronto
$(document).ready(function () {

  // Test connessione API
  testAPIConnection();

  // Inizializza la navbar universale
  if (typeof window.initializeNavbar === 'function') {
    window.initializeNavbar();
  } else {
    // Fallback alla vecchia logica
    if (typeof window.validateTokenOnStartup === 'function') {
      window.validateTokenOnStartup().then(isValid => {
        if (isValid) {
          updateNavbar();
        } else {
        }
      });
    }
  }

  // Inizializza il sistema di toggle password
  setupPasswordToggles();

  // Inizializza i modali di autenticazione
  setupAuthModals();

  // Inizializza la validazione dei form
  setupFormValidation();

  // Inizializza il sistema di notifiche
});

// Funzione per testare la connessione API
function testAPIConnection() {

  fetch(`${window.CONFIG.API_BASE}/ping`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 secondi di timeout
  })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    })
    .then(data => {
    })
    .catch(error => {
      console.error('❌ Errore connessione API:', error);

      // Se è un timeout, mostra messaggio specifico per Render
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        showAlert('🔄 Il server si sta svegliando... Riprova tra qualche secondo.', 'info');

        // Riprova automaticamente dopo 5 secondi
        setTimeout(() => {
          testAPIConnection();
        }, 5000);
      } else {
        showAlert('⚠️ Impossibile raggiungere il server. Verifica la connessione o riprova più tardi.', 'warning');
      }
    });
}

// ===== PASSWORD TOGGLE SYSTEM =====
function setupPasswordToggles() {

  // Toggle per login password
  const toggleLoginPassword = document.getElementById('toggleLoginPassword');
  const loginPassword = document.getElementById('loginPassword');
  const loginPasswordIcon = document.getElementById('loginPasswordIcon');

  if (toggleLoginPassword && loginPassword && loginPasswordIcon) {
    // Aggiungi attributi ARIA
    toggleLoginPassword.setAttribute('aria-label', 'Mostra password');
    toggleLoginPassword.setAttribute('type', 'button');
    toggleLoginPassword.setAttribute('tabindex', '0');

    toggleLoginPassword.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePasswordVisibility(loginPassword, loginPasswordIcon);
    });

    // Supporto per tastiera
    toggleLoginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(loginPassword, loginPasswordIcon);
      }
    });
  } else {
  }

  // Toggle per registrazione password
  const toggleRegPassword = document.getElementById('toggleRegPassword');
  const regPassword = document.getElementById('regPassword');
  const regPasswordIcon = document.getElementById('regPasswordIcon');

  if (toggleRegPassword && regPassword && regPasswordIcon) {
    // Aggiungi attributi ARIA
    toggleRegPassword.setAttribute('aria-label', 'Mostra password');
    toggleRegPassword.setAttribute('type', 'button');
    toggleRegPassword.setAttribute('tabindex', '0');

    toggleRegPassword.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePasswordVisibility(regPassword, regPasswordIcon);
    });

    // Supporto per tastiera
    toggleRegPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(regPassword, regPasswordIcon);
      }
    });
  } else {
  }

  // Toggle per conferma password
  const toggleRegConfirmPassword = document.getElementById('toggleRegConfirmPassword');
  const regConfirmPassword = document.getElementById('regConfirmPassword');
  const regConfirmPasswordIcon = document.getElementById('regConfirmPasswordIcon');

  if (toggleRegConfirmPassword && regConfirmPassword && regConfirmPasswordIcon) {
    // Aggiungi attributi ARIA
    toggleRegConfirmPassword.setAttribute('aria-label', 'Mostra password');
    toggleRegConfirmPassword.setAttribute('type', 'button');
    toggleRegConfirmPassword.setAttribute('tabindex', '0');

    toggleRegConfirmPassword.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePasswordVisibility(regConfirmPassword, regConfirmPasswordIcon);
    });

    // Supporto per tastiera
    toggleRegConfirmPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePasswordVisibility(regConfirmPassword, regConfirmPasswordIcon);
      }
    });
  } else {
  }
}

// Funzione per toggle della visibilità password
function togglePasswordVisibility(passwordInput, iconElement) {

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    iconElement.className = 'fas fa-eye-slash';
    iconElement.title = 'Nascondi password';
    iconElement.setAttribute('aria-label', 'Nascondi password');
    // Aggiungi classe per styling
    passwordInput.parentElement.classList.add('password-visible');
  } else {
    passwordInput.type = 'password';
    iconElement.className = 'fas fa-eye';
    iconElement.title = 'Mostra password';
    iconElement.setAttribute('aria-label', 'Mostra password');
    // Rimuovi classe per styling
    passwordInput.parentElement.classList.remove('password-visible');
  }

  // Focus sul campo password per migliorare l'UX
  passwordInput.focus();
}

// Funzione per migliorare l'accessibilità dei campi password
function setupPasswordAccessibility() {
  const passwordFields = document.querySelectorAll('input[type="password"]');

  passwordFields.forEach(field => {
    // Aggiungi aria-describedby se c'è un messaggio di errore
    const errorElement = field.parentElement.querySelector('.invalid-feedback');
    if (errorElement) {
      field.setAttribute('aria-describedby', errorElement.id);
    }

    // Aggiungi aria-invalid se il campo ha errori
    if (field.classList.contains('is-invalid')) {
      field.setAttribute('aria-invalid', 'true');
    }

    // Aggiungi aria-required se il campo è obbligatorio
    if (field.hasAttribute('required')) {
      field.setAttribute('aria-required', 'true');
    }

    // Aggiungi validazione in tempo reale usando il sistema unificato
    field.addEventListener('input', () => validateField(field));
    field.addEventListener('blur', () => validateField(field));
  });
}

// ===== AUTH MODALS SYSTEM =====
function setupAuthModals() {
  // Inizializza i modal di autenticazione
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');

  if (loginModal) {
    // Gestione apertura modal login
    const loginButtons = document.querySelectorAll('[data-bs-target="#loginModal"]');
    loginButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Reset form login
        const loginForm = loginModal.querySelector('form');
        if (loginForm) loginForm.reset();

        // Rimuovi messaggi di errore
        const errorElements = loginModal.querySelectorAll('.invalid-feedback');
        errorElements.forEach(el => el.remove());

        // Rimuovi classi di validazione
        const inputs = loginModal.querySelectorAll('input');
        inputs.forEach(input => {
          input.classList.remove('is-valid', 'is-invalid');
          input.removeAttribute('aria-invalid');
        });
      });
    });
  }

  if (registerModal) {
    // Gestione apertura modal registrazione
    const registerButtons = document.querySelectorAll('[data-bs-target="#registerModal"]');
    registerButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Reset form registrazione
        const registerForm = registerModal.querySelector('form');
        if (registerForm) registerForm.reset();

        // Rimuovi messaggi di errore
        const errorElements = registerModal.querySelectorAll('.invalid-feedback');
        errorElements.forEach(el => el.remove());

        // Rimuovi classi di validazione
        const inputs = registerModal.querySelectorAll('input');
        inputs.forEach(input => {
          input.classList.remove('is-valid', 'is-invalid');
          input.removeAttribute('aria-invalid');
        });
      });
    });
  }

  // Gestione chiusura modal
  const modals = [loginModal, registerModal].filter(Boolean);
  modals.forEach(modal => {
    modal.addEventListener('hidden.bs.modal', () => {
      // Reset form quando si chiude il modal
      const form = modal.querySelector('form');
      if (form) form.reset();

      // Rimuovi messaggi di errore
      const errorElements = modal.querySelectorAll('.invalid-feedback');
      errorElements.forEach(el => el.remove());

      // Rimuovi classi di validazione
      const inputs = modal.querySelectorAll('input');
      inputs.forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
        input.removeAttribute('aria-invalid');
      });
    });
  });
}

// ===== FORM VALIDATION SYSTEM =====
function setupFormValidation() {
  // Inizializza la validazione dei form
  const forms = document.querySelectorAll('form');

  forms.forEach(form => {
    // Gestione submit form
    form.addEventListener('submit', (e) => {
      if (!validateForm(form)) {
        e.preventDefault();
        return false;
      }
    });

    // Validazione in tempo reale per i campi input
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => validateField(input));
    });
  });
}

// Funzione per validare un singolo campo
function validateField(field) {
  const inputGroup = field.closest('.input-group') || field.parentElement;

  // Rimuovi stati precedenti
  inputGroup.classList.remove('is-valid', 'is-invalid');
  field.classList.remove('is-valid', 'is-invalid');

  // Validazione base per campi obbligatori
  if (field.hasAttribute('required') && !field.value.trim()) {
    showFieldError(inputGroup, field, 'Questo campo è obbligatorio');
    return false;
  }

  // Validazione email
  if (field.type === 'email' && field.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(field.value)) {
      showFieldError(inputGroup, field, 'Inserisci un indirizzo email valido');
      return false;
    }
  }

  // Validazione per conferma password
  if (field.id === 'regConfirmPassword') {
    const passwordField = document.getElementById('regPassword');
    if (passwordField && field.value !== passwordField.value) {
      showFieldError(inputGroup, field, 'Le password non coincidono');
      return false;
    }
  }

  // Validazione lunghezza minima password
  if (field.type === 'password' && field.value.trim()) {
    if (field.value.length < 6) {
      showFieldError(inputGroup, field, 'La password deve essere di almeno 6 caratteri');
      return false;
    }
  }

  // Validazione telefono
  if (field.name === 'telefono' && field.value.trim()) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (!phoneRegex.test(field.value)) {
      showFieldError(inputGroup, field, 'Inserisci un numero di telefono valido');
      return false;
    }
  }

  // Se tutto è valido
  if (field.value.trim()) {
    showFieldSuccess(inputGroup, field);
    return true;
  }

  return true;
}

// Funzione per validare un intero form
function validateForm(form) {
  let isValid = true;
  const requiredFields = form.querySelectorAll('[required]');

  requiredFields.forEach(field => {
    if (!validateField(field)) {
      isValid = false;
    }
  });

  return isValid;
}

// Funzione per mostrare errori nei campi
function showFieldError(inputGroup, field, message) {
  inputGroup.classList.add('is-invalid');
  field.classList.add('is-invalid');
  field.setAttribute('aria-invalid', 'true');

  // Crea o aggiorna il messaggio di errore
  let errorElement = inputGroup.querySelector('.invalid-feedback');
  if (!errorElement) {
    errorElement = document.createElement('div');
    errorElement.className = 'invalid-feedback';
    errorElement.id = `${field.id || field.name}-error`;
    inputGroup.appendChild(errorElement);
  }

  errorElement.textContent = message;
  field.setAttribute('aria-describedby', errorElement.id);
}

// Funzione per mostrare successo nei campi
function showFieldSuccess(inputGroup, field) {
  inputGroup.classList.add('is-valid');
  field.classList.add('is-valid');
  field.setAttribute('aria-invalid', 'false');

  // Rimuovi messaggi di errore
  const errorElement = inputGroup.querySelector('.invalid-feedback');
  if (errorElement) {
    errorElement.remove();
  }

  // Rimuovi aria-describedby se non ci sono errori
  if (!field.getAttribute('aria-describedby')) {
    field.removeAttribute('aria-describedby');
  }
}

// Gestione redirect per prenotazione
function handlePrenotazioneRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');

  if (redirect === 'selezione-slot') {
    const redirectMessage = document.getElementById('redirectMessage');
    if (redirectMessage) {
      redirectMessage.style.display = 'block';
    }
  }
}

// Inizializza la gestione redirect quando il DOM è pronto
$(document).ready(function () {
  handlePrenotazioneRedirect();
}); 
