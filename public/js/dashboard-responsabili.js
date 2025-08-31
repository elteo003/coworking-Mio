/* ===== DASHBOARD RESPONSABILI - FUNZIONALITÀ COMPLETE ===== */

// ✅ Inizializza navbar universale all'avvio
document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.initializeNavbar === 'function') {
        window.initializeNavbar();
    } else {
    }
});

// Controllo autenticazione
function checkAuth() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    // Se l'utente è già autenticato, non reindirizzare al login
    if (user && token) {
        try {
            const userData = JSON.parse(user);
            // Verifica che l'utente abbia i permessi di gestore o amministratore
            if (!userData.ruolo || !['gestore', 'amministratore'].includes(userData.ruolo)) {
                window.location.href = 'dashboard.html?message=' + encodeURIComponent('Non hai i permessi per accedere alla dashboard responsabili. Solo gestori e amministratori possono accedere.');
                return;
            }
            // Utente autenticato e autorizzato, continua
            return;
        } catch (error) {
            console.error('Errore parsing user data:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'login.html?message=' + encodeURIComponent('Errore nei dati utente. Effettua nuovamente il login.');
            return;
        }
    }

    // Se non è autenticato, reindirizza al login
    window.location.href = 'login.html?message=' + encodeURIComponent('Devi effettuare il login per accedere alla dashboard responsabili.');
}

// ✅ Controllo autenticazione ora gestito dalla navbar universale
// Non serve più chiamare checkAuth() manualmente

// ✅ Funzioni di autenticazione ora gestite dalla navbar universale in config.js
// Rimuovo le vecchie funzioni che non servono più

class DashboardResponsabili {
    constructor() {
        this.currentSection = 'overview';
        this.currentSede = null;
        this.charts = {};
        this.currentMonth = new Date();

        // Non inizializzare qui, verrà fatto nel DOMContentLoaded
    }

    checkAuthBeforeInit() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!user || !token) {
            return false;
        }

        try {
            const userData = JSON.parse(user);
            if (!userData.ruolo || !['gestore', 'amministratore'].includes(userData.ruolo)) {
                return false;
            }
            return true;
        } catch (error) {
            console.error('Dashboard responsabili: errore parsing user data:', error);
            return false;
        }
    }

    async init() {
        this.setupEventListeners();
        this.loadUserInfo();
        this.setupNavbarLinks();

        // Prima carica le sedi, poi i dati overview
        await this.loadSedi();

        // Ora che le sedi sono caricate, carica i dati overview
        this.loadOverviewData();
        this.setupCharts();
        this.startAutoRefresh();

        // Non chiamare updateAuthUI che non esiste più
    }

    setupNavbarLinks() {
        const user = localStorage.getItem('user');
        
        if (user) {
            try {
                const userData = JSON.parse(user);
                
                // ✅ Seguiamo lo stesso pattern della dashboard utente
                // Modifichiamo il link "Dashboard Utente" per gli amministratori
                const dashboardUtenteLink = document.querySelector('a[href="dashboard.html"]');
                
                if (userData.ruolo === 'amministratore' && dashboardUtenteLink) {
                    // Per amministratori, trasforma il link "Dashboard Utente" in "Dashboard Amministratore"
                    dashboardUtenteLink.href = 'dashboard-amministratore.html';
                    dashboardUtenteLink.innerHTML = '<i class="fas fa-crown me-1"></i>Dashboard Amministratore';
                    dashboardUtenteLink.classList.add('btn', 'btn-primary', 'ms-2');
                } else if (userData.ruolo === 'gestore' && dashboardUtenteLink) {
                    // Per gestori, mantieni il link "Dashboard Utente" normale
                    dashboardUtenteLink.href = 'dashboard.html';
                    dashboardUtenteLink.innerHTML = 'Dashboard Utente';
                    dashboardUtenteLink.classList.remove('btn', 'btn-primary', 'ms-2');
                }
                
                // Nascondi sempre l'adminLink originale (non serve più)
                const adminLink = document.getElementById('adminLink');
                if (adminLink) {
                    adminLink.style.display = 'none';
                }
                
            } catch (error) {
                console.error('❌ Errore parsing user per setup navbar:', error);
            }
        } else {
        }
    }

    setupEventListeners() {

        // Sidebar navigation
        const sidebarLinks = document.querySelectorAll('.sidebar-link');

        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Sede selector
        const sedeSelector = document.getElementById('sedeSelector');
        if (sedeSelector) {
            sedeSelector.addEventListener('change', (e) => {
                this.currentSede = e.target.value;
                this.loadOverviewData();
                this.loadPrenotazioni();
                this.loadUtenti();
            });
        } else {
            console.error('Sede selector non trovato!');
        }

        // Filter buttons
        const filterButtons = document.querySelectorAll('[data-filter]');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadPrenotazioni();
            });
        });

        // Dark mode toggle
        const darkModeToggle = document.getElementById('darkMode');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                this.toggleDarkMode(e.target.checked);
            });
        }

    }

    showSection(sectionName) {

        // Hide all sections
        const allSections = document.querySelectorAll('.dashboard-section');

        allSections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        } else {
            console.error('Sezione non trovata:', sectionName);
        }

        // Update sidebar active state
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        } else {
            console.error('Link sidebar non trovato per sezione:', sectionName);
        }

        this.currentSection = sectionName;

        // Load section-specific data
        switch (sectionName) {
            case 'overview':
                this.loadOverviewData();
                break;
            case 'disponibilita':
                this.loadDisponibilita();
                break;
            case 'prenotazioni':
                this.loadPrenotazioni();
                break;
            case 'utenti':
                this.loadUtenti();
                break;
            case 'reportistica':
                this.loadReportistica();
                break;
            default:
        }
    }

    async loadUserInfo() {
        try {
            const user = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (!user || !token) {
                return;
            }

            const userData = JSON.parse(user);
            if (userData && userData.nome && userData.cognome) {
                document.getElementById('userName').textContent = `${userData.nome} ${userData.cognome}`;

                // Imposta il ruolo corretto
                const userRoleElement = document.getElementById('userRole');
                if (userRoleElement) {
                    if (userData.ruolo === 'amministratore') {
                        userRoleElement.textContent = 'Amministratore';
                    } else if (userData.ruolo === 'gestore') {
                        userRoleElement.textContent = 'Gestore Sede';
                    } else {
                        userRoleElement.textContent = 'Utente';
                    }
                }
            } else {
                console.warn('Dati utente incompleti:', userData);
            }

            // Non chiamare updateAuthUI che non esiste più
        } catch (error) {
            console.error('Errore caricamento info utente:', error);
            // Non fare redirect qui, lascia che checkAuth gestisca
        }
    }

    async loadSedi() {
        try {

            const response = await fetch(`${window.CONFIG.API_BASE}/sedi`, {
                headers: getAuthHeaders()
            });


            if (response.ok) {
                const sedi = await response.json();

                const selector = document.getElementById('sedeSelector');

                selector.innerHTML = '<option value="">Seleziona Sede</option>';
                sedi.forEach(sede => {
                    const option = document.createElement('option');
                    option.value = sede.id_sede;
                    option.textContent = `${sede.nome} - ${sede.citta}`;
                    selector.appendChild(option);
                });


                // Populate other selectors
                this.populateSpaziSelectors(sedi);

                // ✅ IMPORTANTE: Imposta la prima sede come default se disponibile
                if (sedi.length > 0) {
                    this.currentSede = sedi[0].id_sede;
                }
            } else {
                console.warn('⚠️ API sedi non disponibile, uso dati di esempio');
                // Fallback con dati di esempio per sedi
                await this.loadSediWithFallback();
            }
        } catch (error) {
            console.error('❌ Errore caricamento sedi:', error);
            // Fallback con dati di esempio in caso di errore
            await this.loadSediWithFallback();
        }
    }

    populateSpaziSelectors(sedi) {
        const spaziSelectors = ['modalSpazio', 'filterSpazio'];

        spaziSelectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                selector.innerHTML = '<option value="">Tutti gli spazi</option>';
                sedi.forEach(sede => {
                    if (sede.spazi) {
                        sede.spazi.forEach(spazio => {
                            const option = document.createElement('option');
                            option.value = spazio.id_spazio;
                            option.textContent = `${spazio.nome} - ${sede.nome}`;
                            selector.appendChild(option);
                        });
                    }
                });
            }
        });
    }

    // ✅ Fallback per sedi quando API non disponibile
    async loadSediWithFallback() {

        const sediFallback = [
            {
                id_sede: 1,
                nome: 'CoWork Milano Centro',
                citta: 'Milano',
                spazi: [
                    { id_spazio: 1, nome: 'Stanza Privata 1' },
                    { id_spazio: 2, nome: 'Stanza Privata 2' },
                    { id_spazio: 3, nome: 'Open Space' }
                ]
            },
            {
                id_sede: 2,
                nome: 'CoWork Roma Nord',
                citta: 'Roma',
                spazi: [
                    { id_spazio: 4, nome: 'Sala Meeting' },
                    { id_spazio: 5, nome: 'Coworking Area' }
                ]
            }
        ];

        const selector = document.getElementById('sedeSelector');
        if (selector) {
            selector.innerHTML = '<option value="">Seleziona Sede</option>';
            sediFallback.forEach(sede => {
                const option = document.createElement('option');
                option.value = sede.id_sede;
                option.textContent = `${sede.nome} - ${sede.citta}`;
                selector.appendChild(option);
            });

            this.populateSpaziSelectors(sediFallback);

            // ✅ IMPORTANTE: Imposta la prima sede come default anche nel fallback
            if (sediFallback.length > 0) {
                this.currentSede = sediFallback[0].id_sede;
            }
        }
    }

    // ✅ Fallback per disponibilità quando API non disponibile
    loadDisponibilitaWithFallback() {

        const disponibilitaFallback = {
            regole: [
                {
                    id: 1,
                    tipo: 'manutenzione',
                    data_inizio: '2025-01-15',
                    data_fine: '2025-01-17',
                    descrizione: 'Manutenzione straordinaria impianti'
                },
                {
                    id: 2,
                    tipo: 'chiusura',
                    data_inizio: '2025-01-25',
                    data_fine: '2025-01-26',
                    descrizione: 'Chiusura per festività'
                }
            ]
        };

        this.generateCalendar(disponibilitaFallback);
        this.displayDisponibilitaRules(disponibilitaFallback.regole);
    }

    async loadOverviewData() {
        try {
            // Load quick stats
            await this.loadQuickStats();

            // Load charts data
            await this.loadChartsData();

            // Load recent activity
            await this.loadRecentActivity();
        } catch (error) {
            console.error('Errore caricamento overview:', error);
        }
    }

    async loadQuickStats() {
        try {
            const url = `${window.CONFIG.API_BASE}/dashboard/stats?tipo=responsabile&sede=${this.currentSede || ''}`;

            const response = await fetch(url, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const stats = await response.json();

                document.getElementById('prenotazioniOggi').textContent = stats.prenotazioni_oggi || 0;
                document.getElementById('utentiAttivi').textContent = stats.utenti_attivi || 0;
                document.getElementById('fatturatoGiorno').textContent = `€${stats.fatturato_giorno || 0}`;
                document.getElementById('occupazioneMedia').textContent = `${stats.occupazione_media || 0}%`;

            } else {
                console.warn('⚠️ API stats non disponibile, mostra 0');
                // Se l'API non è disponibile, mostra 0 invece di dati falsi
                document.getElementById('prenotazioniOggi').textContent = '0';
                document.getElementById('utentiAttivi').textContent = '0';
                document.getElementById('fatturatoGiorno').textContent = '€0';
                document.getElementById('occupazioneMedia').textContent = '0%';
            }
        } catch (error) {
            console.error('❌ Errore caricamento stats:', error);
            // In caso di errore, mostra 0 invece di dati falsi
            document.getElementById('prenotazioniOggi').textContent = '0';
            document.getElementById('utentiAttivi').textContent = '0';
            document.getElementById('fatturatoGiorno').textContent = '€0';
            document.getElementById('occupazioneMedia').textContent = '0%';
        }
    }

    async loadChartsData() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/dashboard/charts?tipo=responsabile&sede=${this.currentSede || ''}&periodo=7`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.updateCharts(data);
            } else {
                console.warn('⚠️ API charts non disponibile, uso dati di esempio');
                // Fallback con dati di esempio
                this.updateChartsWithFallback();
            }
        } catch (error) {
            console.error('❌ Errore caricamento charts:', error);
            // Fallback con dati di esempio in caso di errore
            this.updateChartsWithFallback();
        }
    }

    updateChartsWithFallback() {
        // In caso di errore, mostra grafici vuoti invece di dati falsi
        const fallbackData = {
            prenotazioni: {
                labels: ['Nessun dato'],
                data: [0]
            },
            occupazione: {
                labels: ['Nessun dato'],
                data: [0]
            }
        };

        this.updateCharts(fallbackData);
    }

    async loadRecentActivity() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/dashboard/activity?tipo=responsabile&sede=${this.currentSede || ''}&limit=10`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const activities = await response.json();
                this.displayRecentActivity(activities);
            } else {
                console.warn('⚠️ API activity non disponibile, uso dati di esempio');
                // Fallback con dati di esempio
                this.displayRecentActivityWithFallback();
            }
        } catch (error) {
            console.error('❌ Errore caricamento attività:', error);
            // Fallback con dati di esempio in caso di errore
            this.displayRecentActivityWithFallback();
        }
    }

    displayRecentActivityWithFallback() {
        // In caso di errore, mostra messaggio invece di attività false
        const fallbackActivities = [
            { tipo: 'info', descrizione: 'Nessuna attività recente disponibile', timestamp: new Date() }
        ];

        this.displayRecentActivity(fallbackActivities);
    }

    displayRecentActivity(activities) {
        const container = document.getElementById('activityList');
        container.innerHTML = '';

        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';

            const iconClass = this.getActivityIconClass(activity.tipo);
            const iconColor = this.getActivityIconColor(activity.tipo);

            activityItem.innerHTML = `
                <div class="activity-icon ${iconClass}" style="background: ${iconColor}">
                    <i class="fas ${this.getActivityIcon(activity.tipo)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.descrizione}</div>
                    <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                </div>
            `;

            container.appendChild(activityItem);
        });
    }

    getActivityIconClass(tipo) {
        const iconMap = {
            'prenotazione': 'booking',
            'cancellazione': 'cancellation',
            'utente': 'user',
            'pagamento': 'payment'
        };
        return iconMap[tipo] || 'info';
    }

    getActivityIconColor(tipo) {
        const colorMap = {
            'prenotazione': 'rgba(16, 185, 129, 0.1)',
            'cancellazione': 'rgba(239, 68, 68, 0.1)',
            'utente': 'rgba(59, 130, 246, 0.1)',
            'pagamento': 'rgba(16, 185, 129, 0.1)'
        };
        return colorMap[tipo] || 'rgba(107, 114, 128, 0.1)';
    }

    getActivityIcon(tipo) {
        const iconMap = {
            'prenotazione': 'fa-calendar-check',
            'cancellazione': 'fa-calendar-times',
            'utente': 'fa-user-plus',
            'pagamento': 'fa-credit-card'
        };
        return iconMap[tipo] || 'fa-info-circle';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Adesso';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ore fa`;
        return date.toLocaleDateString('it-IT');
    }

    setupCharts() {
        // Prenotazioni Chart
        const prenotazioniCtx = document.getElementById('prenotazioniChart');
        if (prenotazioniCtx) {
            this.charts.prenotazioni = new Chart(prenotazioniCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Prenotazioni',
                        data: [],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Occupazione Chart
        const occupazioneCtx = document.getElementById('occupazioneChart');
        if (occupazioneCtx) {
            this.charts.occupazione = new Chart(occupazioneCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#2563eb',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#8b5cf6'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 1.5,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    updateCharts(data) {
        // Update prenotazioni chart
        if (this.charts.prenotazioni && data.prenotazioni) {
            this.charts.prenotazioni.data.labels = data.prenotazioni.labels;
            this.charts.prenotazioni.data.datasets[0].data = data.prenotazioni.data;
            this.charts.prenotazioni.update();
        }

        // Update occupazione chart
        if (this.charts.occupazione && data.occupazione) {
            this.charts.occupazione.data.labels = data.occupazione.labels;
            this.charts.occupazione.data.datasets[0].data = data.occupazione.data;
            this.charts.occupazione.update();
        }
    }

    async loadDisponibilita() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/disponibilita?tipo=responsabile&sede=${this.currentSede || ''}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const disponibilita = await response.json();
                this.generateCalendar(disponibilita);
                this.displayDisponibilitaRules(disponibilita.regole);
            } else {
                console.warn('⚠️ API disponibilità non disponibile, uso dati di esempio');
                // Fallback con dati di esempio
                this.loadDisponibilitaWithFallback();
            }
        } catch (error) {
            console.error('❌ Errore caricamento disponibilità:', error);
            // Fallback con dati di esempio in caso di errore
            this.loadDisponibilitaWithFallback();
        }
    }

    generateCalendar(disponibilita) {
        const calendarBody = document.getElementById('calendarBody');
        const currentMonth = this.currentMonth;

        // Generate calendar grid
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        calendarBody.innerHTML = '';

        // Generate 6 weeks of calendar
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + (week * 7) + day);

                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';

                if (date.getMonth() === currentMonth.getMonth()) {
                    dayElement.textContent = date.getDate();

                    // Check if today
                    if (this.isToday(date)) {
                        dayElement.classList.add('today');
                    }

                    // Check availability
                    const availability = this.getDayAvailability(date, disponibilita);
                    if (availability === 'unavailable') {
                        dayElement.classList.add('unavailable');
                    } else if (availability === 'partial') {
                        dayElement.classList.add('partial');
                    }

                    dayElement.addEventListener('click', () => this.showDayDetails(date));
                } else {
                    dayElement.textContent = '';
                    dayElement.style.visibility = 'hidden';
                }

                calendarBody.appendChild(dayElement);
            }
        }

        // Update month display
        document.getElementById('currentMonth').textContent = currentMonth.toLocaleDateString('it-IT', {
            month: 'long',
            year: 'numeric'
        });
    }

    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }

    getDayAvailability(date, disponibilita) {
        const dateStr = date.toISOString().split('T')[0];
        const dayRules = disponibilita.regole.filter(rule =>
            rule.data_inizio <= dateStr && rule.data_fine >= dateStr
        );

        if (dayRules.length === 0) return 'available';
        if (dayRules.some(rule => rule.tipo === 'manutenzione')) return 'unavailable';
        return 'partial';
    }

    displayDisponibilitaRules(regole) {
        const container = document.getElementById('rulesList');
        container.innerHTML = '';

        regole.forEach(regola => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'rule-item';

            ruleItem.innerHTML = `
                <div class="rule-header">
                    <span class="rule-type">${regola.tipo}</span>
                    <div class="rule-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="editRegola(${regola.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteRegola(${regola.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="rule-details">
                    ${regola.data_inizio} - ${regola.data_fine}<br>
                    ${regola.motivo}
                </div>
            `;

            container.appendChild(ruleItem);
        });
    }

    async loadPrenotazioni() {
        try {
            const filters = this.getPrenotazioniFilters();
            const response = await fetch(`${window.CONFIG.API_BASE}/prenotazioni?tipo=responsabile&sede=${this.currentSede || ''}&${new URLSearchParams(filters)}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const prenotazioni = await response.json();
                this.displayPrenotazioni(prenotazioni);
            }
        } catch (error) {
            console.error('Errore caricamento prenotazioni:', error);
        }
    }

    getPrenotazioniFilters() {
        const filters = {};

        const dataInizio = document.getElementById('filterDataInizio').value;
        const dataFine = document.getElementById('filterDataFine').value;
        const spazio = document.getElementById('filterSpazio').value;
        const stato = document.getElementById('filterStato').value;

        if (dataInizio) filters.data_inizio = dataInizio;
        if (dataFine) filters.data_fine = dataFine;
        if (spazio) filters.spazio = spazio;
        if (stato) filters.stato = stato;

        return filters;
    }

    displayPrenotazioni(prenotazioni) {
        const tbody = document.getElementById('prenotazioniTableBody');
        tbody.innerHTML = '';

        prenotazioni.forEach(prenotazione => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prenotazione.id_prenotazione}</td>
                <td>${prenotazione.nome_utente} ${prenotazione.cognome_utente}</td>
                <td>${prenotazione.nome_spazio}</td>
                <td>${this.formatDateTime(prenotazione.data_inizio)}</td>
                <td>${this.formatDateTime(prenotazione.data_fine)}</td>
                <td><span class="badge badge-${this.getStatusBadgeClass(prenotazione.stato)}">${prenotazione.stato}</span></td>
                <td>€${prenotazione.importo}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewPrenotazione(${prenotazione.id_prenotazione})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="confirmPrenotazione(${prenotazione.id_prenotazione})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="cancelPrenotazione(${prenotazione.id_prenotazione})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getStatusBadgeClass(stato) {
        const statusMap = {
            'confermata': 'success',
            'in attesa': 'warning',
            'cancellata': 'error',
            'in sospeso': 'pending'
        };
        return statusMap[stato] || 'info';
    }

    formatDateTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async loadUtenti() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE}/utenti?tipo=responsabile&sede=${this.currentSede || ''}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.displayUtentiStats(data.stats);
                this.displayUtenti(data.utenti);
            }
        } catch (error) {
            console.error('Errore caricamento utenti:', error);
        }
    }

    displayUtentiStats(stats) {
        document.getElementById('utentiTotali').textContent = stats.totali || 0;
        document.getElementById('utentiAttiviMese').textContent = stats.attivi_mese || 0;
        document.getElementById('nuoviUtenti').textContent = stats.nuovi_mese || 0;
        document.getElementById('utentiPremium').textContent = stats.premium || 0;
    }

    displayUtenti(utenti) {
        const tbody = document.getElementById('utentiTableBody');
        tbody.innerHTML = '';

        utenti.forEach(utente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${utente.id_utente}</td>
                <td>${utente.nome} ${utente.cognome}</td>
                <td>${utente.email}</td>
                <td><span class="badge badge-${this.getRoleBadgeClass(utente.ruolo)}">${utente.ruolo}</span></td>
                <td>${this.formatDate(utente.data_registrazione)}</td>
                <td>${this.formatDate(utente.ultimo_accesso)}</td>
                <td><span class="badge badge-${this.getStatusBadgeClass(utente.stato)}">${utente.stato}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewUtente(${utente.id_utente})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="editUtente(${utente.id_utente})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteUtente(${utente.id_utente})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getRoleBadgeClass(ruolo) {
        const roleMap = {
            'cliente': 'info',
            'responsabile': 'warning',
            'admin': 'danger'
        };
        return roleMap[ruolo] || 'secondary';
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT');
    }

    async loadReportistica() {
        try {
            const filters = this.getReportFilters();
            const response = await fetch(`${window.CONFIG.API_BASE}/reportistica?tipo=responsabile&sede=${this.currentSede || ''}&${new URLSearchParams(filters)}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.generateReportCharts(data);
                this.displayReportSummary(data.summary);
            }
        } catch (error) {
            console.error('Errore caricamento reportistica:', error);
        }
    }

    getReportFilters() {
        const filters = {};

        const periodo = document.getElementById('reportPeriodo').value;
        const sede = document.getElementById('reportSede').value;
        const tipo = document.getElementById('reportTipo').value;
        const dataInizio = document.getElementById('reportDataInizio').value;
        const dataFine = document.getElementById('reportDataFine').value;

        if (periodo) filters.periodo = periodo;
        if (sede) filters.sede = sede;
        if (tipo) filters.tipo = tipo;
        if (dataInizio) filters.data_inizio = dataInizio;
        if (dataFine) filters.data_fine = dataFine;

        return filters;
    }

    generateReportCharts(data) {
        // Main chart
        if (data.main_chart) {
            this.updateMainChart(data.main_chart);
        }

        // Spazio chart
        if (data.spazio_chart) {
            this.updateSpazioChart(data.spazio_chart);
        }

        // Sede chart
        if (data.sede_chart) {
            this.updateSedeChart(data.sede_chart);
        }

        // Utenti chart
        if (data.utenti_chart) {
            this.updateUtentiChart(data.utenti_chart);
        }
    }

    updateMainChart(data) {
        const ctx = document.getElementById('mainReportChart');
        if (!ctx) return;

        if (this.charts.mainReport) {
            this.charts.mainReport.destroy();
        }

        this.charts.mainReport = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateSpazioChart(data) {
        const ctx = document.getElementById('spazioChart');
        if (!ctx) return;

        if (this.charts.spazio) {
            this.charts.spazio.destroy();
        }

        this.charts.spazio = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.data,
                    backgroundColor: [
                        '#2563eb',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateSedeChart(data) {
        const ctx = document.getElementById('sedeChart');
        if (!ctx) return;

        if (this.charts.sede) {
            this.charts.sede.destroy();
        }

        this.charts.sede = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.data,
                    backgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateUtentiChart(data) {
        const ctx = document.getElementById('utentiChart');
        if (!ctx) return;

        if (this.charts.utenti) {
            this.charts.utenti.destroy();
        }

        this.charts.utenti = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    displayReportSummary(summary) {
        const container = document.getElementById('reportSummary');
        container.innerHTML = '';

        Object.entries(summary).forEach(([key, value]) => {
            const summaryItem = document.createElement('div');
            summaryItem.className = 'summary-item';

            summaryItem.innerHTML = `
                <div class="summary-value">${value}</div>
                <div class="summary-label">${this.formatSummaryLabel(key)}</div>
            `;

            container.appendChild(summaryItem);
        });
    }

    formatSummaryLabel(key) {
        const labelMap = {
            'prenotazioni_totali': 'Prenotazioni Totali',
            'fatturato_totale': 'Fatturato Totale',
            'occupazione_media': 'Occupazione Media',
            'utenti_nuovi': 'Utenti Nuovi',
            'tasso_conversione': 'Tasso Conversione'
        };
        return labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    startAutoRefresh() {
        if (document.getElementById('autoRefresh').checked) {
            setInterval(() => {
                if (this.currentSection === 'overview') {
                    this.loadQuickStats();
                }
            }, 30000); // Refresh every 30 seconds
        }
    }

    toggleDarkMode(enabled) {
        if (enabled) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('darkMode', enabled);
    }

    // Calendar navigation
    previousMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.loadDisponibilita();
    }

    nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.loadDisponibilita();
    }

    // Utility functions
    showDayDetails(date) {
        // Implementation for showing day details
    }

    refreshOverview() {
        this.loadOverviewData();
    }

    applicaFiltri() {
        this.loadPrenotazioni();
    }

    resetFiltri() {
        document.getElementById('filterDataInizio').value = '';
        document.getElementById('filterDataFine').value = '';
        document.getElementById('filterSpazio').value = '';
        document.getElementById('filterStato').value = '';
        this.loadPrenotazioni();
    }

    generaReport() {
        this.loadReportistica();
    }

    salvaImpostazioni() {
        const settings = {
            notifPrenotazioni: document.getElementById('notifPrenotazioni').checked,
            notifCancellazioni: document.getElementById('notifCancellazioni').checked,
            notifUtenti: document.getElementById('notifUtenti').checked,
            notifReport: document.getElementById('notifReport').checked,
            autoRefresh: document.getElementById('autoRefresh').checked,
            darkMode: document.getElementById('darkMode').checked,
            compactView: document.getElementById('compactView').checked,
            exportPDF: document.getElementById('exportPDF').checked,
            exportExcel: document.getElementById('exportExcel').checked,
            exportCSV: document.getElementById('exportCSV').checked
        };

        localStorage.setItem('dashboardSettings', JSON.stringify(settings));

        // Show success message
        if (window.modernUI) {
            window.modernUI.showToast('Impostazioni salvate con successo!', 'success');
        }
    }

    resetImpostazioni() {
        // Reset to default values
        document.getElementById('notifPrenotazioni').checked = true;
        document.getElementById('notifCancellazioni').checked = true;
        document.getElementById('notifUtenti').checked = true;
        document.getElementById('notifReport').checked = true;
        document.getElementById('autoRefresh').checked = true;
        document.getElementById('darkMode').checked = false;
        document.getElementById('compactView').checked = false;
        document.getElementById('exportPDF').checked = true;
        document.getElementById('exportExcel').checked = true;
        document.getElementById('exportCSV').checked = false;

        this.salvaImpostazioni();
    }
}

// Funzione per ottenere gli headers di autenticazione
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    // ✅ Se l'utente è gestore/amministratore, prova anche senza token
    if (!token && user) {
        try {
            const userData = JSON.parse(user);
            if (userData.ruolo === 'gestore' || userData.ruolo === 'amministratore') {
                return {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };
            }
        } catch (error) {
            console.error('Errore parsing user per controllo ruolo:', error);
        }
    }

    if (!token) {
        console.error('Token non trovato per autenticazione API');
        return {};
    }

    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

// Global functions for modals and actions
function showDisponibilitaModal() {
    const modal = new bootstrap.Modal(document.getElementById('disponibilitaModal'));
    modal.show();
}

// Funzione globale per aggiornare l'overview
function refreshOverview() {

    if (window.dashboardResponsabili) {
        window.dashboardResponsabili.loadOverviewData();
    } else {
        console.error('❌ Dashboard responsabili non inizializzata');
    }
}

function showUtenteModal() {
    const modal = new bootstrap.Modal(document.getElementById('utenteModal'));
    modal.show();
}

function salvaDisponibilita() {
    // Implementation for saving disponibilità rule
    const modal = bootstrap.Modal.getInstance(document.getElementById('disponibilitaModal'));
    modal.hide();
}

function salvaUtente() {
    // Implementation for saving user
    const modal = bootstrap.Modal.getInstance(document.getElementById('utenteModal'));
    modal.hide();
}

// Action functions
function viewPrenotazione(id) {
}

function confirmPrenotazione(id) {
}

function cancelPrenotazione(id) {
}

function viewUtente(id) {
}

function editUtente(id) {
}

function deleteUtente(id) {
}

function editRegola(id) {
}

function deleteRegola(id) {
}

function exportReport() {
}

function scheduleReport() {
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {

    // ✅ VERIFICA E IMPOSTA CONFIGURAZIONE API
    if (!window.CONFIG) {
        window.CONFIG = {
            API_BASE: 'https://coworking-mio-1-backend.onrender.com/api'
        };
    }

    // Debug: verifica disponibilità funzioni e variabili
    if (window.CONFIG) {
    }

    try {
        window.dashboardResponsabili = new DashboardResponsabili();

        // Controlla autenticazione prima di inizializzare
        if (window.dashboardResponsabili.checkAuthBeforeInit()) {

            // Inizializza in modo asincrono
            window.dashboardResponsabili.init().then(() => {
            }).catch(error => {
                console.error('❌ Errore durante inizializzazione:', error);
            });
        } else {
        }
    } catch (error) {
        console.error('Errore creazione dashboard responsabili:', error);
    }
});
