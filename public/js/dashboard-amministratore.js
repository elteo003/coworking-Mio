/* ===== DASHBOARD AMMINISTRATORE - FUNZIONALITÀ COMPLETE ===== */

// ✅ Inizializza navbar universale all'avvio
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Dashboard amministratore - Inizializzazione navbar universale...');
    if (typeof window.initializeNavbar === 'function') {
        window.initializeNavbar();
        console.log('✅ Navbar universale inizializzata');
    } else {
        console.log('⚠️ Funzione initializeNavbar non disponibile');
    }
});

// Controllo autenticazione
function checkAuth() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (user && token) {
        try {
            const userData = JSON.parse(user);
            if (!userData.ruolo || userData.ruolo !== 'amministratore') {
                console.log('Utente non autorizzato, redirect alla dashboard appropriata');
                if (userData.ruolo === 'gestore') {
                    window.location.href = 'dashboard-responsabili.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
                return;
            }
            console.log('Utente autenticato e autorizzato:', userData.nome, userData.cognome, userData.ruolo);
            return;
        } catch (error) {
            console.error('Errore parsing user data:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'login.html?message=' + encodeURIComponent('Errore nei dati utente. Effettua nuovamente il login.');
            return;
        }
    }

    console.log('Utente non autenticato, redirect al login');
    window.location.href = 'login.html?message=' + encodeURIComponent('Devi effettuare il login per accedere alla dashboard amministratore.');
}

console.log('✅ Dashboard amministratore - Usa navbar universale per autenticazione');

class DashboardAmministratore {
    constructor() {
        this.currentSection = 'overview';
        this.charts = {};
        this.currentMonth = new Date();
        console.log('✅ Dashboard amministratore creata, in attesa di inizializzazione...');
    }

    checkAuthBeforeInit() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!user || !token) {
            console.log('Dashboard amministratore: utente non autenticato, non inizializzo');
            return false;
        }

        try {
            const userData = JSON.parse(user);
            if (!userData.ruolo || userData.ruolo !== 'amministratore') {
                console.log('Dashboard amministratore: utente non autorizzato, non inizializzo');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Dashboard amministratore: errore parsing user data:', error);
            return false;
        }
    }

    async init() {
        this.setupEventListeners();
        this.loadUserInfo();
        this.loadOverviewData();
        this.setupCharts();
        this.startAutoRefresh();
        console.log('✅ Dashboard amministratore inizializzata completamente');
    }

    setupEventListeners() {
        const tabs = document.querySelectorAll('#dashboardTabs .nav-link');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = e.target.getAttribute('data-bs-target');
                this.switchTab(targetTab);
            });
        });
    }

    loadUserInfo() {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                document.getElementById('userName').textContent = `${userData.nome} ${userData.cognome}`;
                document.getElementById('userRole').textContent = 'Amministratore';
                console.log('✅ Info utente caricate:', userData.nome, userData.cognome);
            } catch (error) {
                console.error('Errore caricamento info utente:', error);
            }
        }
    }

    switchTab(tabId) {
        document.querySelectorAll('#dashboardTabs .nav-link').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
        });

        const activeTab = document.querySelector(`[data-bs-target="${tabId}"]`);
        const activePane = document.querySelector(tabId);
        
        if (activeTab && activePane) {
            activeTab.classList.add('active');
            activePane.classList.add('show', 'active');
            this.currentSection = tabId.replace('#', '');
            console.log('✅ Tab attivato:', this.currentSection);
            
            // Carica i dati specifici del tab
            this.loadTabData(this.currentSection);
        }
    }

    loadTabData(section) {
        switch(section) {
            case 'utenti':
                this.loadUsers();
                break;
            case 'gestori':
                this.loadGestori();
                break;
            case 'sedi':
                this.loadSedi();
                break;
            case 'sistema':
                this.loadSystemMetrics();
                break;
            default:
                // Overview è già caricato
                break;
        }
    }

    async loadOverviewData() {
        try {
            console.log('📊 Caricamento dati overview...');
            
            const mockData = {
                totalUsers: 156,
                totalGestori: 8,
                totalSedi: 12,
                totalPrenotazioni: 23
            };

            document.getElementById('totalUsers').textContent = mockData.totalUsers;
            document.getElementById('totalGestori').textContent = mockData.totalGestori;
            document.getElementById('totalSedi').textContent = mockData.totalSedi;
            document.getElementById('totalPrenotazioni').textContent = mockData.totalPrenotazioni;
            document.getElementById('lastBackup').textContent = new Date().toLocaleDateString('it-IT');

            console.log('✅ Dati overview caricati');
        } catch (error) {
            console.error('❌ Errore caricamento dati overview:', error);
        }
    }

    setupCharts() {
        try {
            console.log('📈 Setup grafici...');
            
            const ctx = document.getElementById('systemChart');
            if (ctx) {
                this.charts.system = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
                        datasets: [{
                            label: 'Utenti Attivi',
                            data: [65, 78, 90, 95, 120, 156],
                            borderColor: '#D4AF37',
                            backgroundColor: 'rgba(212, 175, 55, 0.1)',
                            tension: 0.4
                        }, {
                            label: 'Prenotazioni',
                            data: [120, 150, 180, 200, 220, 250],
                            borderColor: '#B8860B',
                            backgroundColor: 'rgba(184, 134, 11, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
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

            console.log('✅ Grafici configurati');
        } catch (error) {
            console.error('❌ Errore setup grafici:', error);
        }
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadOverviewData();
            // Aggiorna anche le metriche del sistema se il tab è attivo
            if (this.currentSection === 'sistema') {
                this.loadSystemMetrics();
            }
        }, 5 * 60 * 1000);
        
        // Aggiorna le metriche del sistema ogni 30 secondi se il tab è attivo
        setInterval(() => {
            if (this.currentSection === 'sistema') {
                this.loadSystemMetrics();
            }
        }, 30 * 1000);
        
        console.log('✅ Auto-refresh avviato (ogni 5 minuti per overview, ogni 30 secondi per sistema)');
    }

    // ===== GESTIONE UTENTI =====
    async loadUsers() {
        try {
            console.log('👥 Caricamento utenti...');
            
            // Mock data per utenti
            const mockUsers = [
                { id: 1, nome: 'Mario', cognome: 'Rossi', email: 'mario@test.com', ruolo: 'cliente', telefono: '123456789', stato: 'attivo', dataRegistrazione: '2024-01-15' },
                { id: 2, nome: 'Giulia', cognome: 'Bianchi', email: 'giulia@test.com', ruolo: 'gestore', telefono: '987654321', stato: 'attivo', dataRegistrazione: '2024-01-20' },
                { id: 3, nome: 'Admin', cognome: 'System', email: 'admin@test.com', ruolo: 'amministratore', telefono: '555666777', stato: 'attivo', dataRegistrazione: '2024-01-01' }
            ];

            this.renderUsersTable(mockUsers);
            console.log('✅ Utenti caricati');
        } catch (error) {
            console.error('❌ Errore caricamento utenti:', error);
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.nome} ${user.cognome}</td>
                <td>${user.email}</td>
                <td><span class="badge badge-${this.getRoleBadgeClass(user.ruolo)}">${user.ruolo}</span></td>
                <td>${user.telefono || '-'}</td>
                <td><span class="badge badge-${user.stato === 'attivo' ? 'success' : 'warning'}">${user.stato}</span></td>
                <td>${new Date(user.dataRegistrazione).toLocaleDateString('it-IT')}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="dashboardAmministratore.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="dashboardAmministratore.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getRoleBadgeClass(ruolo) {
        switch(ruolo) {
            case 'amministratore': return 'danger';
            case 'gestore': return 'warning';
            case 'cliente': return 'info';
            default: return 'secondary';
        }
    }

    applyUserFilters() {
        const ruolo = document.getElementById('filterRuolo').value;
        const search = document.getElementById('searchUser').value;
        const status = document.getElementById('filterStatus').value;
        
        console.log('🔍 Applicazione filtri utenti:', { ruolo, search, status });
        this.loadUsers(); // Ricarica con filtri
    }

    showCreateUserModal() {
        alert('Modal creazione utente - da implementare');
    }

    editUser(userId) {
        console.log('✏️ Modifica utente:', userId);
        alert(`Modifica utente ${userId} - da implementare`);
    }

    deleteUser(userId) {
        if (confirm('Sei sicuro di voler eliminare questo utente?')) {
            console.log('🗑️ Eliminazione utente:', userId);
            alert(`Eliminazione utente ${userId} - da implementare`);
        }
    }

    // ===== GESTIONE GESTORI =====
    async loadGestori() {
        try {
            console.log('👔 Caricamento gestori...');
            
            const mockGestori = [
                { id: 1, nome: 'Giulia', cognome: 'Bianchi', email: 'giulia@test.com', telefono: '987654321', sede: 'Sede Milano', stato: 'attivo', dataAssegnazione: '2024-01-20' },
                { id: 2, nome: 'Marco', cognome: 'Verdi', email: 'marco@test.com', telefono: '123456789', sede: 'Sede Roma', stato: 'attivo', dataAssegnazione: '2024-02-01' }
            ];

            this.renderGestoriTable(mockGestori);
            console.log('✅ Gestori caricati');
        } catch (error) {
            console.error('❌ Errore caricamento gestori:', error);
        }
    }

    renderGestoriTable(gestori) {
        const tbody = document.getElementById('gestoriTableBody');
        if (!tbody) return;

        tbody.innerHTML = gestori.map(gestore => `
            <tr>
                <td>${gestore.id}</td>
                <td>${gestore.nome} ${gestore.cognome}</td>
                <td>${gestore.email}</td>
                <td>${gestore.telefono}</td>
                <td>${gestore.sede}</td>
                <td><span class="badge badge-${gestore.stato === 'attivo' ? 'success' : 'warning'}">${gestore.stato}</span></td>
                <td>${new Date(gestore.dataAssegnazione).toLocaleDateString('it-IT')}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="dashboardAmministratore.editGestore(${gestore.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="dashboardAmministratore.deleteGestore(${gestore.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    applyGestoreFilters() {
        const search = document.getElementById('searchGestore').value;
        const sede = document.getElementById('filterSedeGestore').value;
        
        console.log('🔍 Applicazione filtri gestori:', { search, sede });
        this.loadGestori();
    }

    showCreateGestoreModal() {
        alert('Modal creazione gestore - da implementare');
    }

    editGestore(gestoreId) {
        console.log('✏️ Modifica gestore:', gestoreId);
        alert(`Modifica gestore ${gestoreId} - da implementare`);
    }

    deleteGestore(gestoreId) {
        if (confirm('Sei sicuro di voler eliminare questo gestore?')) {
            console.log('🗑️ Eliminazione gestore:', gestoreId);
            alert(`Eliminazione gestore ${gestoreId} - da implementare`);
        }
    }

    // ===== GESTIONE SEDI =====
    async loadSedi() {
        try {
            console.log('🏢 Caricamento sedi...');
            
            const mockSedi = [
                { id: 1, nome: 'Sede Milano', citta: 'Milano', indirizzo: 'Via Roma 123', gestore: 'Giulia Bianchi', spazi: 15, stato: 'attiva' },
                { id: 2, nome: 'Sede Roma', citta: 'Roma', indirizzo: 'Via del Corso 456', gestore: 'Marco Verdi', spazi: 12, stato: 'attiva' }
            ];

            this.renderSediTable(mockSedi);
            console.log('✅ Sedi caricate');
        } catch (error) {
            console.error('❌ Errore caricamento sedi:', error);
        }
    }

    renderSediTable(sedi) {
        const tbody = document.getElementById('sediTableBody');
        if (!tbody) return;

        tbody.innerHTML = sedi.map(sede => `
            <tr>
                <td>${sede.id}</td>
                <td>${sede.nome}</td>
                <td>${sede.citta}</td>
                <td>${sede.indirizzo}</td>
                <td>${sede.gestore}</td>
                <td>${sede.spazi}</td>
                <td><span class="badge badge-${sede.stato === 'attiva' ? 'success' : 'warning'}">${sede.stato}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="dashboardAmministratore.editSede(${sede.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="dashboardAmministratore.deleteSede(${sede.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    applySedeFilters() {
        const search = document.getElementById('searchSede').value;
        const citta = document.getElementById('filterCittaSede').value;
        const status = document.getElementById('filterStatusSede').value;
        
        console.log('🔍 Applicazione filtri sedi:', { search, citta, status });
        this.loadSedi();
    }

    showCreateSedeModal() {
        alert('Modal creazione sede - da implementare');
    }

    editSede(sedeId) {
        console.log('✏️ Modifica sede:', sedeId);
        alert(`Modifica sede ${sedeId} - da implementare`);
    }

    deleteSede(sedeId) {
        if (confirm('Sei sicuro di voler eliminare questa sede?')) {
            console.log('🗑️ Eliminazione sede:', sedeId);
            alert(`Eliminazione sede ${sedeId} - da implementare`);
        }
    }

    // ===== CONTROLLO SISTEMA =====
    async loadSystemMetrics() {
        try {
            console.log('📊 Caricamento metriche sistema...');
            
            // Mock data per metriche sistema
            const metrics = {
                cpu: Math.floor(Math.random() * 100),
                memory: Math.floor(Math.random() * 100),
                disk: Math.floor(Math.random() * 100),
                network: Math.floor(Math.random() * 100)
            };

            this.updateSystemMetrics(metrics);
            console.log('✅ Metriche sistema caricate');
        } catch (error) {
            console.error('❌ Errore caricamento metriche sistema:', error);
        }
    }

    updateSystemMetrics(metrics) {
        const cpuBar = document.getElementById('cpuUsage');
        const memoryBar = document.getElementById('memoryUsage');
        const diskBar = document.getElementById('diskUsage');
        const networkBar = document.getElementById('networkUsage');

        if (cpuBar) {
            cpuBar.style.width = `${metrics.cpu}%`;
            cpuBar.textContent = `${metrics.cpu}%`;
        }
        if (memoryBar) {
            memoryBar.style.width = `${metrics.memory}%`;
            memoryBar.textContent = `${metrics.memory}%`;
        }
        if (diskBar) {
            diskBar.style.width = `${metrics.disk}%`;
            diskBar.textContent = `${metrics.disk}%`;
        }
        if (networkBar) {
            networkBar.style.width = `${metrics.network}%`;
            networkBar.textContent = `${metrics.network}%`;
        }
    }

    createBackup() {
        console.log('💾 Creazione backup database...');
        alert('Backup database avviato - da implementare');
    }

    clearLogs() {
        if (confirm('Sei sicuro di voler pulire tutti i logs?')) {
            console.log('🧹 Pulizia logs...');
            alert('Pulizia logs avviata - da implementare');
        }
    }

    restartServices() {
        if (confirm('Sei sicuro di voler riavviare i servizi?')) {
            console.log('🔄 Riavvio servizi...');
            alert('Riavvio servizi avviato - da implementare');
        }
    }

    emergencyMode() {
        if (confirm('ATTENZIONE: Modalità emergenza bloccherà tutti gli accessi. Continuare?')) {
            console.log('🚨 Attivazione modalità emergenza...');
            alert('Modalità emergenza attivata - da implementare');
        }
    }

    generateInviteCode() {
        console.log('🔑 Generazione codice invito...');
        const code = 'ADMIN-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        alert(`Codice invito generato: ${code}`);
    }
}

// Inizializzazione dashboard
let dashboardAmministratore = null;

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inizializzazione Dashboard Amministratore...');
    
    dashboardAmministratore = new DashboardAmministratore();
    
    if (dashboardAmministratore.checkAuthBeforeInit()) {
        dashboardAmministratore.init();
    } else {
        console.log('⚠️ Dashboard amministratore non inizializzata - utente non autenticato/autorisato');
    }
});

// Funzioni globali per compatibilità
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

function showLoginModal() {
    if (typeof window.showLoginModal === 'function') {
        window.showLoginModal();
    } else {
        window.location.href = 'login.html';
    }
}
