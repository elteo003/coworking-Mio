// Configurazione API
// Configurazione API - usa quella globale da config.js

// Variabili globali
let currentUser = null;
let currentStep = 1;

// Inizializzazione dashboard
$(document).ready(function () {
  // Verifica validità token all'avvio
  validateTokenOnStartup().then(() => {
    checkAuth();
    setupEventHandlers();
  });

  // Ferma il countdown quando si lascia la pagina
  $(window).on('beforeunload', function () {
    stopCountdownUpdates();
  });

  // Ferma il countdown quando si cambia tab o si naviga
  $(document).on('visibilitychange', function () {
    if (document.hidden) {
      stopCountdownUpdates();
    } else {
      // Riprendi il countdown quando si torna alla pagina
      if (window.currentPrenotazioni && window.currentPrenotazioni.length > 0) {
        startCountdownUpdates();
      }
    }
  });
});

// Controllo autenticazione
function checkAuth() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = JSON.parse(userStr);
  setupDashboard();
}

// Logout locale - chiama la funzione centralizzata
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

// Setup dashboard basato sul ruolo
function setupDashboard() {
  updateUserInfo();
  createTabs();
  loadInitialData();
}

// Aggiorna info utente nella navbar
function updateUserInfo() {
  $('#userInfo').text(`${currentUser.nome} ${currentUser.cognome} (${currentUser.ruolo})`);

  // Aggiorna il titolo di benvenuto in base al ruolo
  if (currentUser.ruolo === 'amministratore') {
    $('#welcomeTitle').text(`Benvenuto Amministratore, ${currentUser.nome}!`);
    $('#welcomeSubtitle').text('Gestisci il sistema completo e monitora tutte le sedi');
  } else if (currentUser.ruolo === 'gestore') {
    $('#welcomeTitle').text(`Benvenuto Gestore, ${currentUser.nome}!`);
    $('#welcomeSubtitle').text('Gestisci le tue sedi e monitora le performance');
  } else {
    $('#welcomeTitle').text(`Benvenuto, ${currentUser.nome}!`);
    $('#welcomeSubtitle').text('Gestisci le tue prenotazioni e attività');
  }

  // Aggiorna il link della navbar in base al ruolo
  updateNavbarLink();
}

// Aggiorna il link della navbar in base al ruolo
function updateNavbarLink() {
  const prenotaLink = $('#prenotaLink');

  if (currentUser.ruolo === 'amministratore') {
    // Per amministratori, mostra il link "Amministratore"
    prenotaLink.attr('href', 'dashboard-amministratore.html');
    prenotaLink.html('<i class="fas fa-crown me-1"></i>Amministratore');
    prenotaLink.removeClass('nav-link').addClass('nav-link btn btn-primary ms-2');
  } else if (currentUser.ruolo === 'gestore') {
    // Per gestori, mostra il link "Gestore"
    prenotaLink.attr('href', 'dashboard-responsabili.html');
    prenotaLink.html('<i class="fas fa-chart-line me-1"></i>Gestore');
    prenotaLink.removeClass('nav-link').addClass('nav-link btn btn-primary ms-2');
  } else {
    // Per i clienti, mantieni il link "Prenota"
    prenotaLink.attr('href', 'selezione-slot.html');
    prenotaLink.html('<i class="fas fa-calendar-plus me-1"></i>Prenota');
    prenotaLink.removeClass('btn btn-primary ms-2').addClass('nav-link');
  }
}

// Crea tab dinamici basati sul ruolo
function createTabs() {
  const tabsContainer = $('#dashboardTabs');
  const contentContainer = $('#dashboardTabsContent');

  if (currentUser.ruolo === 'gestore' || currentUser.ruolo === 'amministratore') {
    // Tab per gestore e amministratore
    tabsContainer.html(`
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="overview-tab" data-bs-toggle="tab" data-bs-target="#overview" type="button" role="tab">
          <i class="fas fa-chart-line me-2"></i>Overview
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="sedi-tab" data-bs-toggle="tab" data-bs-target="#sedi" type="button" role="tab">
          <i class="fas fa-building me-2"></i>Le mie sedi
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="prenotazioni-tab" data-bs-toggle="tab" data-bs-target="#prenotazioni" type="button" role="tab">
          <i class="fas fa-calendar-check me-2"></i>Prenotazioni
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="utenti-tab" data-bs-toggle="tab" data-bs-target="#utenti" type="button" role="tab">
          <i class="fas fa-users me-2"></i>Utenti
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="report-tab" data-bs-toggle="tab" data-bs-target="#report" type="button" role="tab">
          <i class="fas fa-chart-bar me-2"></i>Report
        </button>
      </li>
    `);

    contentContainer.html(`
      <div class="tab-pane fade show active" id="overview" role="tabpanel">
        <div class="text-center py-5">
          <div class="row justify-content-center">
            <div class="col-md-8">
              <h2 class="mb-4">
                <i class="fas fa-chart-line text-primary me-3"></i>
                Dashboard Gestore
              </h2>
              <p class="lead text-muted mb-4">
                Benvenuto nella tua dashboard di gestione. Qui puoi accedere rapidamente alle funzionalità principali.
              </p>
              
              <div class="row g-4 mb-4">
                <div class="col-md-6">
                  <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body text-center">
                      <i class="fas fa-building fa-2x text-primary mb-3"></i>
                      <h5>Gestione Sedi</h5>
                      <p class="text-muted small">Gestisci sedi, spazi e disponibilità</p>
                      <a href="${getDashboardUrl(currentUser.ruolo)}" class="btn btn-outline-primary">
                        <i class="fas fa-arrow-right me-2"></i>Accedi
                      </a>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body text-center">
                      <i class="fas fa-chart-bar fa-2x text-success mb-3"></i>
                      <h5>Report e Analytics</h5>
                      <p class="text-muted small">Statistiche avanzate e performance</p>
                      <a href="${getDashboardUrl(currentUser.ruolo)}" class="btn btn-outline-success">
                        <i class="fas fa-arrow-right me-2"></i>Accedi
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <a href="${getDashboardUrl(currentUser.ruolo)}" class="btn btn-primary btn-lg">
                <i class="fas fa-chart-line me-2"></i>Accedi alla Dashboard Completa
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="tab-pane fade" id="sedi" role="tabpanel">
        <div id="sediContent">Caricamento...</div>
      </div>
      <div class="tab-pane fade" id="prenotazioni" role="tabpanel">
        <div id="prenotazioniContent">Caricamento...</div>
      </div>
      <div class="tab-pane fade" id="utenti" role="tabpanel">
        <div id="utentiContent">Caricamento...</div>
      </div>
      <div class="tab-pane fade" id="report" role="tabpanel">
        <div id="reportContent">Caricamento...</div>
      </div>
    `);
  } else {
    // Tab per cliente
    tabsContainer.html(`
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="prenotazioni-tab" data-bs-toggle="tab" data-bs-target="#prenotazioni" type="button" role="tab">
          Le mie prenotazioni
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="pagamenti-tab" data-bs-toggle="tab" data-bs-target="#pagamenti" type="button" role="tab">
          I miei pagamenti
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="scadute-tab" data-bs-toggle="tab" data-bs-target="#scadute" type="button" role="tab">
          <i class="fas fa-clock me-2"></i>Scadute
        </button>
      </li>
    `);

    contentContainer.html(`
      <div class="tab-pane fade show active" id="prenotazioni" role="tabpanel">
        <div id="prenotazioniContent">Caricamento...</div>
      </div>
      <div class="tab-pane fade" id="pagamenti" role="tabpanel">
        <div id="pagamentiContent">Caricamento...</div>
      </div>
      <div class="tab-pane fade" id="scadute" role="tabpanel">
        <div id="scaduteContent">Caricamento...</div>
      </div>
    `);
  }
}

// Carica dati iniziali
function loadInitialData() {
  if (currentUser.ruolo === 'gestore' || currentUser.ruolo === 'amministratore') {
    // ✅ PER GESTORI: Carica le sezioni speciali con bottoni per dashboard completa
    loadSediGestore();
    loadPrenotazioniGestore();
    loadUtentiGestore();
    loadReportGestore();
  } else {
    // Per clienti: carica prenotazioni e pagamenti IN PARALLELO

    // Carica tutte le sezioni contemporaneamente
    Promise.all([
      new Promise(resolve => {
        loadPrenotazioniUtente();
        resolve();
      }),
      new Promise(resolve => {
        loadPagamentiUtente();
        resolve();
      }),
      new Promise(resolve => {
        loadPrenotazioniScadute();
        resolve();
      })
    ]).then(() => {
    }).catch(error => {
      console.error('❌ Errore caricamento sezioni:', error);
    });
  }
}

// Carica sedi del gestore
function loadSediGestore() {
  const container = $('#sediContent');
  container.html(`
    <div class="text-center py-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <i class="fas fa-building fa-3x text-primary mb-4"></i>
          <h3 class="mb-3">Gestione Sedi e Spazi</h3>
          <p class="lead text-muted mb-4">
            Gestisci le tue sedi, configura spazi e monitora la disponibilità in tempo reale.
          </p>
          
          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-body text-center">
                  <i class="fas fa-building fa-2x text-info mb-2"></i>
                  <h6>Sedi</h6>
                  <p class="text-muted small">Gestisci le tue sedi</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-body text-center">
                  <i class="fas fa-door-open fa-2x text-success mb-2"></i>
                  <h6>Spazi</h6>
                  <p class="text-muted small">Configura gli spazi disponibili</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-body text-center">
                  <i class="fas fa-clock fa-2x text-warning mb-2"></i>
                  <h6>Orari</h6>
                  <p class="text-muted small">Imposta orari e disponibilità</p>
                </div>
              </div>
            </div>
          </div>
          
          <a href="${getDashboardUrl(currentUser.ruolo)}" class="btn btn-primary btn-lg">
            <i class="fas fa-arrow-right me-2"></i>Accedi alla Dashboard Completa
          </a>
        </div>
      </div>
    </div>
  `);
}

// Carica prenotazioni gestore
function loadPrenotazioniGestore() {
  const container = $('#prenotazioniContent');
  container.html(`
    <div class="text-center py-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <i class="fas fa-calendar-check fa-3x text-success mb-4"></i>
          <h3 class="mb-3">Gestione Prenotazioni</h3>
          <p class="lead text-muted mb-4">
            Monitora e gestisci tutte le prenotazioni delle tue sedi in tempo reale.
          </p>
          
          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-body text-center">
                  <i class="fas fa-clock fa-2x text-info mb-2"></i>
                  <h6>In Attesa</h6>
                  <p class="text-muted small">Prenotazioni da confermare</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-body text-center">
                  <i class="fas fa-check-circle fa-2x text-success mb-2"></i>
                  <h6>Confermate</h6>
                  <p class="text-muted small">Prenotazioni attive</p>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-body text-center">
                  <i class="fas fa-times-circle fa-2x text-danger mb-2"></i>
                  <h6>Cancellate</h6>
                  <p class="text-muted small">Gestisci cancellazioni</p>
                </div>
              </div>
            </div>
          </div>
          
          <a href="${getDashboardUrl(currentUser.ruolo)}" class="btn btn-success btn-lg">
            <i class="fas fa-arrow-right me-2"></i>Accedi alla Dashboard Completa
          </a>
        </div>
      </div>
    </div>
  `);
}

// Carica report gestore
function loadReportGestore() {
  const container = $('#reportContent');
  container.html(`
    <div class="text-center py-4">
      <h4>Report e Analytics</h4>
      <p class="text-muted">Per accedere ai report completi e alle statistiche avanzate</p>
      <a href="${getDashboardUrl(currentUser.ruolo)}" class="btn btn-primary">
        <i class="fas fa-chart-bar me-2"></i>Dashboard Completa
      </a>
    </div>
  `);
}

// Carica utenti gestore
function loadUtentiGestore() {
  const container = $('#utentiContent');
  container.html(`
    <div class="text-center py-4">
      <h4>Gestione Utenti</h4>
      <p class="text-muted">Per gestire utenti, ruoli e permessi</p>
      <a href="${getDashboardUrl(currentUser.ruolo)}" class="btn btn-primary">
        <i class="fas fa-users me-2"></i>Dashboard Completa
      </a>
    </div>
  `);
}

// Carica prenotazioni utente
function loadPrenotazioniUtente() {
  $.ajax({
    url: `${window.CONFIG.API_BASE}/prenotazioni?utente=${currentUser.id_utente}`,
    method: 'GET',
    headers: getAuthHeaders()
  })
    .done(function (prenotazioni) {
      // Salva le prenotazioni globalmente per i countdown
      window.currentPrenotazioni = prenotazioni;

      // Mostra subito le prenotazioni per velocizzare il caricamento
      displayPrenotazioniUtente(prenotazioni);

      // Avvia l'aggiornamento dei countdown solo se non è già attivo
      if (!window.countdownInterval) {
        startCountdownUpdates();
      }

      // Sincronizza in background (non bloccante)
      syncPrenotazioniWithPagamenti().catch(error => {
        console.error('Errore sincronizzazione (non critico):', error);
      });
    })
    .fail(function (xhr) {
      if (xhr.status === 401) {
        handleAuthError();
      } else {
        $('#prenotazioniContent').html('<div class="alert alert-danger">Errore nel caricamento delle prenotazioni</div>');
      }
    });
}

// Carica prenotazioni scadute utente
function loadPrenotazioniScadute() {
  $.ajax({
    url: `${window.CONFIG.API_BASE}/scadenze/prenotazioni-scadute`,
    method: 'GET',
    headers: getAuthHeaders()
  })
    .done(function (data) {
      displayPrenotazioniScadute(data.prenotazioni);
    })
    .fail(function (xhr) {
      if (xhr.status === 401) {
        handleAuthError();
      } else {
        $('#scaduteContent').html('<div class="alert alert-danger">Errore nel caricamento delle prenotazioni scadute</div>');
      }
    });
}

// Sincronizza prenotazioni con pagamenti
async function syncPrenotazioniWithPagamenti() {
  try {
    const response = await fetch(`${window.CONFIG.API_BASE}/prenotazioni/sync-with-pagamenti`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (response.ok) {
      const result = await response.json();

      // Se ci sono state modifiche, aggiorna solo i dati esistenti
      if (result.prenotazioni_aggiornate > 0 || result.prenotazioni_duplicate_cancellate > 0) {
        // Non ricaricare tutto, solo aggiornare i dati esistenti
        // loadPrenotazioniUtente(); // RIMOSSO: causava loop infinito
      }
    }
  } catch (error) {
    console.error('Errore sincronizzazione:', error);
  }
}

// Calcola il tempo rimanente per una prenotazione
function getTempoRimanente(prenotazione) {
  if (prenotazione.stato !== 'in attesa' && prenotazione.stato !== 'pendente') {
    return null;
  }

  // Usa SOLO scadenza_slot dal backend - non fare fallback
  if (!prenotazione.scadenza_slot) {
    console.warn('Prenotazione senza scadenza_slot:', prenotazione.id_prenotazione);
    return 'Calcolo...';
  }

  const scadenza = new Date(prenotazione.scadenza_slot);
  const now = new Date();
  const diff = scadenza - now;

  if (diff <= 0) {
    return 'SCADUTO';
  }

  const minuti = Math.floor(diff / (1000 * 60));
  const secondi = Math.floor((diff % (1000 * 60)) / 1000);

  return `${minuti}:${secondi.toString().padStart(2, '0')}`;
}

// Visualizza prenotazioni utente
function displayPrenotazioniUtente(prenotazioni) {
  const container = $('#prenotazioniContent');
  if (prenotazioni.length === 0) {
    container.html('<p>Nessuna prenotazione trovata</p>');
    return;
  }

  let html = '<div class="table-responsive"><table class="table table-striped">';
  html += '<thead><tr><th>Data</th><th>Sede</th><th>Via</th><th>Stato</th><th>Tempo Rimanente</th><th>Azioni</th></tr></thead><tbody>';

  prenotazioni.forEach(p => {
    const dataInizio = new Date(p.data_inizio).toLocaleString('it-IT');
    const dataFine = new Date(p.data_fine);
    const dataInizioObj = new Date(p.data_inizio);
    // Usa durata_ore dal database se disponibile, altrimenti calcola
    const durataOre = p.durata_ore || Math.round((dataFine - dataInizioObj) / (1000 * 60 * 60));
    const importo = durataOre * 10; // 10€/ora

    // Calcola tempo rimanente
    const tempoRimanente = getTempoRimanente(p);
    let tempoRimanenteHtml = '-';
    let countdownClass = '';

    if (tempoRimanente) {
      if (tempoRimanente === 'SCADUTO') {
        tempoRimanenteHtml = `<span class="countdown text-danger fw-bold">${tempoRimanente}</span>`;
      } else {
        // Controlla se mancano meno di 5 minuti
        const minutiRimanenti = parseInt(tempoRimanente.split(':')[0]);
        if (minutiRimanenti < 5) {
          countdownClass = 'countdown-urgente';
        }
        tempoRimanenteHtml = `<span class="countdown ${countdownClass}" data-prenotazione="${p.id_prenotazione}">${tempoRimanente}</span>`;
      }
    }

    // Determina se mostrare il pulsante di pagamento
    let azioniHtml = '';
    let rowClass = '';

    if (p.stato === 'scaduta') {
      rowClass = 'table-danger';
      azioniHtml = `
        <span class="badge bg-danger">
          <i class="fas fa-clock me-1"></i>Scaduta
        </span>
      `;
    } else if (p.stato === 'cancellata') {
      rowClass = 'prenotazione-cancellata';
      azioniHtml = `
        <span class="badge badge-cancellata">
          <i class="fas fa-times-circle me-1"></i>Cancellata
        </span>
      `;
    } else if (p.stato === 'in attesa' || p.stato === 'pendente') {
      // Controlla se la prenotazione è scaduta nel tempo
      if (tempoRimanente === 'SCADUTO') {
        // Prenotazione scaduta nel tempo - non permettere pagamento
        rowClass = 'table-danger';
        azioniHtml = `
          <span class="badge bg-danger">
            <i class="fas fa-clock me-1"></i>Scaduta
          </span>
        `;
      } else {
        // Prenotazione ancora valida - permettere pagamento
        // Evidenzia slot bloccati
        if (tempoRimanente && tempoRimanente !== 'SCADUTO') {
          rowClass = 'slot-bloccato';
        }

        azioniHtml = `
          <div class="btn-group" role="group">
            <button class="btn btn-success btn-sm" onclick="pagaPrenotazione(${p.id_prenotazione})">
              💳 Paga Ora (€${importo.toFixed(2)})
            </button>
            <button class="btn btn-danger btn-sm" onclick="cancellaPrenotazione(${p.id_prenotazione})">
              ❌ Cancella
            </button>
          </div>
        `;
      }
    } else if (p.stato === 'confermata') {
      azioniHtml = '<span class="badge bg-success">✅ Pagato</span>';
    } else if (p.stato === 'in sospeso') {
      azioniHtml = `
        <button class="btn btn-warning btn-sm" onclick="terminaPagamento(${p.id_prenotazione})">
          🔄 Termina Pagamento (€${importo.toFixed(2)})
        </button>
      `;
    } else if (p.stato === 'pagamento_fallito') {
      rowClass = 'table-warning';
      azioniHtml = `
        <button class="btn btn-warning btn-sm" onclick="pagaPrenotazione(${p.id_prenotazione})">
          🔄 Riprova Pagamento (€${importo.toFixed(2)})
        </button>
      `;
    } else {
      azioniHtml = '<span class="text-muted">-</span>';
    }

    html += `
      <tr class="${rowClass}">
        <td>${dataInizio}</td>
        <td>${p.nome_sede || 'Sede'}</td>
        <td>${p.indirizzo_sede || 'Via non disponibile'}</td>
        <td><span class="badge bg-${getStatusColor(p.stato)}">${p.stato}</span></td>
        <td>${tempoRimanenteHtml}</td>
        <td>${azioniHtml}</td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.html(html);
}

// Cancella una prenotazione
function cancellaPrenotazione(idPrenotazione) {
  if (!confirm('Sei sicuro di voler cancellare questa prenotazione? Lo slot sarà immediatamente disponibile per altri utenti.')) {
    return;
  }

  $.ajax({
    url: `${window.CONFIG.API_BASE}/prenotazioni/${idPrenotazione}`,
    method: 'DELETE',
    headers: getAuthHeaders()
  })
    .done(function (response) {
      showAlert('Prenotazione cancellata con successo!', 'success');

      // Ricarica le prenotazioni per mostrare l'aggiornamento
      loadPrenotazioniUtente();
    })
    .fail(function (xhr) {
      console.error('Errore cancellazione:', xhr.status, xhr.responseText);
      let errorMessage = 'Errore durante la cancellazione';

      if (xhr.responseJSON && xhr.responseJSON.error) {
        errorMessage = xhr.responseJSON.error;
      }

      showAlert(errorMessage, 'error');
    });
}

// Avvia gli aggiornamenti dei countdown
function startCountdownUpdates() {
  // Se è già attivo, non riavviarlo
  if (window.countdownInterval) {
    return;
  }


  // Aggiorna i countdown ogni secondo
  window.countdownInterval = setInterval(updateCountdowns, 1000);

  // Esegui il primo aggiornamento immediatamente
  updateCountdowns();
}

// Ferma gli aggiornamenti dei countdown
function stopCountdownUpdates() {
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
    window.countdownInterval = null;
  }
}

// Aggiorna i countdown in tempo reale
function updateCountdowns() {
  $('.countdown').each(function () {
    const countdownElement = $(this);
    const prenotazioneId = countdownElement.data('prenotazione');

    // Trova la prenotazione corrispondente
    const prenotazione = window.currentPrenotazioni ?
      window.currentPrenotazioni.find(p => p.id_prenotazione == prenotazioneId) : null;

    if (prenotazione) {
      const tempoRimanente = getTempoRimanente(prenotazione);
      if (tempoRimanente) {
        countdownElement.text(tempoRimanente);

        // Se è scaduto, aggiorna la visualizzazione
        if (tempoRimanente === 'SCADUTO') {
          countdownElement.addClass('text-danger fw-bold');
          // Ricarica le prenotazioni per aggiornare lo stato
          setTimeout(() => loadPrenotazioniUtente(), 1000);
        }
      }
    }
  });
}

// Carica pagamenti utente
function loadPagamentiUtente() {
  $.ajax({
    url: `${window.CONFIG.API_BASE}/pagamenti?utente=${currentUser.id_utente}`,
    method: 'GET',
    headers: getAuthHeaders()
  })
    .done(function (pagamenti) {
      displayPagamentiUtente(pagamenti);
    })
    .fail(function (xhr) {
      if (xhr.status === 401) {
        handleAuthError();
      } else {
        $('#pagamentiContent').html('<div class="alert alert-danger">Errore nel caricamento dei pagamenti</div>');
      }
    });
}

// Visualizza pagamenti utente
function displayPagamentiUtente(pagamenti) {
  const container = $('#pagamentiContent');
  if (pagamenti.length === 0) {
    container.html('<p>Nessun pagamento trovato</p>');
    return;
  }

  let html = '<div class="table-responsive"><table class="table table-striped">';
  html += '<thead><tr><th>Data</th><th>Importo</th><th>Dettagli</th><th>Stato</th></tr></thead><tbody>';

  pagamenti.forEach(p => {
    const dataPagamento = new Date(p.data_pagamento).toLocaleString('it-IT');

    // Crea i dettagli del pagamento
    let dettagli = 'N/A';
    if (p.nome_spazio && p.nome_sede && p.citta_sede) {
      dettagli = `${p.nome_spazio} - ${p.nome_sede} (${p.citta_sede})`;
    } else if (p.nome_spazio && p.nome_sede) {
      dettagli = `${p.nome_spazio} - ${p.nome_sede}`;
    } else if (p.nome_spazio) {
      dettagli = p.nome_spazio;
    }

    html += `
      <tr>
        <td>${dataPagamento}</td>
        <td>€${p.importo}</td>
        <td>${dettagli}</td>
        <td><span class="badge bg-${getPaymentStatusColor(p.stato)}">${p.stato}</span></td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.html(html);
}

// Visualizza prenotazioni scadute utente
function displayPrenotazioniScadute(prenotazioni) {
  const container = $('#scaduteContent');
  if (prenotazioni.length === 0) {
    container.html(`
      <div class="dashboard-empty">
        <i class="fas fa-check-circle"></i>
        <h3>Nessuna prenotazione scaduta</h3>
        <p>Ottimo! Non hai prenotazioni scadute.</p>
      </div>
    `);
    return;
  }

  let html = `
    <div class="alert alert-warning">
      <i class="fas fa-exclamation-triangle me-2"></i>
      <strong>Attenzione:</strong> Le seguenti prenotazioni sono scadute e non sono più saldabili.
    </div>
    <div class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Data Prenotazione</th>
            <th>Sede</th>
            <th>Spazio</th>
            <th>Durata</th>
            <th>Stato</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
  `;

  prenotazioni.forEach(p => {
    const dataInizio = new Date(p.data_inizio).toLocaleString('it-IT');
    const dataFine = new Date(p.data_fine);
    const dataInizioObj = new Date(p.data_inizio);
    // Usa durata_ore dal database se disponibile, altrimenti calcola
    const durataOre = p.durata_ore || Math.round((dataFine - dataInizioObj) / (1000 * 60 * 60));
    const importo = durataOre * 10; // 10€/ora

    html += `
      <tr class="table-danger">
        <td>${dataInizio}</td>
        <td>${p.nome_spazio || 'Spazio non disponibile'}</td>
        <td>${p.nome_sede || 'Sede non disponibile'}</td>
        <td>${durataOre}h (€${importo.toFixed(2)})</td>
        <td><span class="badge bg-danger">Scaduta</span></td>
        <td>
          <small class="text-muted">
            <i class="fas fa-clock me-1"></i>
            Scaduta il ${new Date(p.data_fine).toLocaleString('it-IT')}
          </small>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  container.html(html);

  // Le classi CSS si applicano automaticamente
}

// Utility functions
function getStatusColor(stato) {
  switch (stato) {
    case 'confermata': return 'success';
    case 'annullata': return 'danger';
    case 'completata': return 'info';
    case 'in sospeso': return 'warning';
    case 'in attesa': return 'secondary';
    case 'pendente': return 'secondary';
    case 'scaduta': return 'danger';
    case 'pagamento_fallito': return 'warning';
    case 'cancellata': return 'danger';
    default: return 'secondary';
  }
}

function getPaymentStatusColor(stato) {
  switch (stato) {
    case 'pagato': return 'success';
    case 'in attesa': return 'warning';
    case 'rimborsato': return 'info';
    case 'in sospeso': return 'warning';
    case 'fallito': return 'danger';
    default: return 'secondary';
  }
}

// Event handlers
function setupEventHandlers() {
  // Non è più necessario gestire il logout qui, viene gestito dall'onclick HTML

  // Gestione tab per gestori
  if (currentUser && (currentUser.ruolo === 'gestore' || currentUser.ruolo === 'amministratore')) {
    setupGestoreTabHandlers();
  }
}

// Setup event handlers per i tab dei gestori
function setupGestoreTabHandlers() {
  // Tab Overview - già gestito nell'HTML

  // Tab Sedi
  $('#sedi-tab').on('click', function () {
    loadSediGestore();
  });

  // Tab Prenotazioni
  $('#prenotazioni-tab').on('click', function () {
    loadPrenotazioniGestore();
  });

  // Tab Utenti
  $('#utenti-tab').on('click', function () {
    loadUtentiGestore();
  });

  // Tab Report
  $('#report-tab').on('click', function () {
    loadReportGestore();
  });
}

// Funzioni globali
function viewSpaziSede(idSede) {
  // Per ora mostra un alert, in futuro potrebbe aprire una modal
  alert(`Gestione spazi per sede ${idSede} - Funzionalità in sviluppo`);
}

// Funzione per avviare il pagamento di una prenotazione
function pagaPrenotazione(idPrenotazione) {
  // Verifica che l'utente sia autenticato
  if (!currentUser) {
    alert('Devi essere autenticato per procedere al pagamento');
    return;
  }

  // Reindirizza alla pagina di pagamento
  window.location.href = `pagamento.html?id_prenotazione=${idPrenotazione}`;
}

// Funzione per terminare il pagamento di una prenotazione in sospeso
function terminaPagamento(idPrenotazione) {
  // Verifica che l'utente sia autenticato
  if (!currentUser) {
    alert('Devi essere autenticato per procedere al pagamento');
    return;
  }

  // Reindirizza alla pagina di pagamento
  window.location.href = `pagamento.html?id_prenotazione=${idPrenotazione}`;
} 
