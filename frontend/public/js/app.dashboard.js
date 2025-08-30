/**
 * Applicazione Dashboard Gestori
 * Gestisce la dashboard completa per gestori e amministratori
 */

class DashboardApp {
    constructor() {
        this.currentUser = null;
        this.locations = [];
        this.spaces = [];
        this.reservations = [];
        this.currentSection = 'overview';
        this.charts = {};
        this.realtimeClient = null;

        this.init();
    }

    /**
     * Inizializza l'applicazione
     */
    init() {
        this.bindEvents();
        this.loadUserData();
        this.loadInitialData();
        this.initializeRealtime();
    }

    /**
     * Collega gli eventi
     */
    bindEvents() {
        // Navigazione sidebar
        $('.sidebar .nav-link').on('click', (e) => {
            e.preventDefault();
            const section = $(e.currentTarget).data('section');
            this.navigateToSection(section);
        });

        // Pulsante refresh
        $('#refreshBtn').on('click', () => {
            this.refreshData();
        });

        // Logout
        $('#logoutBtn').on('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Modal sede
        $('#saveSede').on('click', () => {
            this.saveLocation();
        });

        $('#addServizio').on('click', () => {
            this.addServiceField();
        });

        // Modal spazio
        $('#saveSpazio').on('click', () => {
            this.saveSpace();
        });

        $('#addAmenity').on('click', () => {
            this.addAmenityField();
        });

        // Upload foto
        this.bindUploadEvents();
    }

    /**
     * Collega gli eventi per l'upload
     */
    bindUploadEvents() {
        const uploadArea = $('#uploadArea');
        const fileInput = $('#fileInput');

        // Click per aprire file picker
        uploadArea.on('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.on('dragover', (e) => {
            e.preventDefault();
            uploadArea.addClass('drag-over');
        });

        uploadArea.on('dragleave', () => {
            uploadArea.removeClass('drag-over');
        });

        uploadArea.on('drop', (e) => {
            e.preventDefault();
            uploadArea.removeClass('drag-over');
            const files = e.originalEvent.dataTransfer.files;
            this.handleFileSelection(files);
        });

        // File input change
        fileInput.on('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Upload button
        $('#uploadPhotos').on('click', () => {
            this.uploadPhotos();
        });
    }

    /**
     * Carica i dati dell'utente
     */
    async loadUserData() {
        try {
            // Simula il caricamento dell'utente
            this.currentUser = {
                id: '00000000-0000-0000-0000-000000000001',
                role: 'amministratore',
                full_name: 'Admin Test'
            };

            $('#userName').text(this.currentUser.full_name);
        } catch (error) {
            console.error('Errore nel caricamento utente:', error);
            this.showToast('Errore nel caricamento dei dati utente', 'error');
        }
    }

    /**
     * Carica i dati iniziali
     */
    async loadInitialData() {
        try {
            await this.loadLocations();
            await this.loadSpaces();
            await this.loadReservations();
            this.updateStats();
            this.renderCharts();
            this.loadRecentActivity();
        } catch (error) {
            console.error('Errore nel caricamento dati iniziali:', error);
            this.showToast('Errore nel caricamento dei dati', 'error');
        }
    }

    /**
     * Carica le sedi
     */
    async loadLocations() {
        try {
            if (window.coworkspaceAPI) {
                this.locations = await window.coworkspaceAPI.getMyLocations();
            } else {
                this.locations = this.getFallbackLocations();
            }
        } catch (error) {
            console.error('Errore nel caricamento sedi:', error);
            this.locations = this.getFallbackLocations();
        }
    }

    /**
     * Carica gli spazi
     */
    async loadSpaces() {
        try {
            if (window.coworkspaceAPI) {
                this.spaces = [];
                for (const location of this.locations) {
                    const locationSpaces = await window.coworkspaceAPI.getSpacesByLocation(location.id);
                    this.spaces.push(...locationSpaces);
                }
            } else {
                this.spaces = this.getFallbackSpaces();
            }
        } catch (error) {
            console.error('Errore nel caricamento spazi:', error);
            this.spaces = this.getFallbackSpaces();
        }
    }

    /**
     * Carica le prenotazioni
     */
    async loadReservations() {
        try {
            if (window.coworkspaceAPI) {
                this.reservations = [];
                for (const space of this.spaces) {
                    const spaceReservations = await window.coworkspaceAPI.getReservationsBySpace(
                        space.id,
                        new Date().toISOString().split('T')[0],
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    );
                    this.reservations.push(...spaceReservations);
                }
            } else {
                this.reservations = this.getFallbackReservations();
            }
        } catch (error) {
            console.error('Errore nel caricamento prenotazioni:', error);
            this.reservations = this.getFallbackReservations();
        }
    }

    /**
     * Naviga a una sezione
     */
    navigateToSection(section) {
        // Aggiorna la navigazione
        $('.sidebar .nav-link').removeClass('active');
        $(`.sidebar .nav-link[data-section="${section}"]`).addClass('active');

        // Aggiorna il titolo
        const titles = {
            overview: 'Dashboard Gestori',
            sedi: 'Gestione Sedi',
            spazi: 'Gestione Spazi',
            calendario: 'Calendario',
            media: 'Gestione Media',
            report: 'Report',
            impostazioni: 'Impostazioni'
        };
        $('#pageTitle').text(titles[section] || 'Dashboard');

        // Nascondi tutte le sezioni
        $('.dashboard-section').hide();
        $('#dynamic-content').empty();

        // Mostra la sezione corrente
        if (section === 'overview') {
            $('#overview-section').show();
        } else {
            this.loadSection(section);
        }

        this.currentSection = section;
    }

    /**
     * Carica una sezione dinamica
     */
    loadSection(section) {
        const container = $('#dynamic-content');

        switch (section) {
            case 'sedi':
                this.loadLocationsSection(container);
                break;
            case 'spazi':
                this.loadSpacesSection(container);
                break;
            case 'calendario':
                this.loadCalendarSection(container);
                break;
            case 'media':
                this.loadMediaSection(container);
                break;
            case 'report':
                this.loadReportSection(container);
                break;
            case 'impostazioni':
                this.loadSettingsSection(container);
                break;
        }
    }

    /**
     * Carica la sezione sedi
     */
    loadLocationsSection(container) {
        container.html(`
            <div class="dashboard-section">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>Gestione Sedi</h3>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalSede">
                        <i class="fas fa-plus me-2"></i>Nuova Sede
                    </button>
                </div>
                <div class="row" id="locationsList">
                    <!-- Le sedi verranno caricate qui -->
                </div>
            </div>
        `);

        this.renderLocations();
    }

    /**
     * Renderizza le sedi
     */
    renderLocations() {
        const container = $('#locationsList');
        container.empty();

        if (this.locations.length === 0) {
            container.html(`
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-building fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Nessuna sede configurata</h5>
                        <p class="text-muted">Crea la tua prima sede per iniziare</p>
                    </div>
                </div>
            `);
            return;
        }

        this.locations.forEach(location => {
            const card = this.createLocationCard(location);
            container.append(card);
        });
    }

    /**
     * Crea una card per una sede
     */
    createLocationCard(location) {
        const firstPhoto = location.location_photos && location.location_photos.length > 0
            ? location.location_photos[0].url
            : 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop';

        const servicesHtml = (location.services || []).map(service =>
            `<span class="badge bg-primary me-1">${service}</span>`
        ).join('');

        return $(`
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <img src="${firstPhoto}" class="card-img-top" alt="${location.name}" style="height: 200px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${location.name}</h5>
                        <p class="card-text text-muted">${location.address || 'Indirizzo non disponibile'}</p>
                        <p class="card-text">${location.description || 'Nessuna descrizione disponibile'}</p>
                        <div class="mt-auto">
                            <div class="mb-2">
                                ${servicesHtml}
                            </div>
                            <div class="btn-group w-100" role="group">
                                <button class="btn btn-outline-primary btn-sm" onclick="dashboardApp.editLocation('${location.id}')">
                                    <i class="fas fa-edit me-1"></i>Modifica
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="dashboardApp.manageLocationPhotos('${location.id}')">
                                    <i class="fas fa-images me-1"></i>Foto
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="dashboardApp.deleteLocation('${location.id}')">
                                    <i class="fas fa-trash me-1"></i>Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    /**
     * Carica la sezione spazi
     */
    loadSpacesSection(container) {
        container.html(`
            <div class="dashboard-section">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>Gestione Spazi</h3>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalSpazio">
                        <i class="fas fa-plus me-2"></i>Nuovo Spazio
                    </button>
                </div>
                <div class="row" id="spacesList">
                    <!-- Gli spazi verranno caricate qui -->
                </div>
            </div>
        `);

        this.renderSpaces();
    }

    /**
     * Renderizza gli spazi
     */
    renderSpaces() {
        const container = $('#spacesList');
        container.empty();

        if (this.spaces.length === 0) {
            container.html(`
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-door-open fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Nessuno spazio configurato</h5>
                        <p class="text-muted">Crea il tuo primo spazio per iniziare</p>
                    </div>
                </div>
            `);
            return;
        }

        this.spaces.forEach(space => {
            const card = this.createSpaceCard(space);
            container.append(card);
        });
    }

    /**
     * Crea una card per uno spazio
     */
    createSpaceCard(space) {
        const location = this.locations.find(loc => loc.id === space.location_id);
        const amenitiesHtml = (space.amenities || []).map(amenity =>
            `<span class="badge bg-secondary me-1">${amenity}</span>`
        ).join('');

        return $(`
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${space.name}</h5>
                        <p class="card-text text-muted">${location ? location.name : 'Sede sconosciuta'}</p>
                        <p class="card-text">${space.description || 'Nessuna descrizione disponibile'}</p>
                        <div class="mb-2">
                            <small class="text-muted">Capacità: ${space.capacity || 'N/A'} persone</small>
                        </div>
                        <div class="mt-auto">
                            <div class="mb-2">
                                ${amenitiesHtml}
                            </div>
                            <div class="btn-group w-100" role="group">
                                <button class="btn btn-outline-primary btn-sm" onclick="dashboardApp.editSpace('${space.id}')">
                                    <i class="fas fa-edit me-1"></i>Modifica
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="dashboardApp.manageSpacePhotos('${space.id}')">
                                    <i class="fas fa-images me-1"></i>Foto
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="dashboardApp.deleteSpace('${space.id}')">
                                    <i class="fas fa-trash me-1"></i>Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    /**
     * Carica la sezione calendario
     */
    loadCalendarSection(container) {
        container.html(`
            <div class="dashboard-section">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>Calendario Prenotazioni</h3>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-primary active" data-view="week">Settimana</button>
                        <button type="button" class="btn btn-outline-primary" data-view="day">Giorno</button>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div id="calendarContainer">
                            <!-- Il calendario verrà renderizzato qui -->
                        </div>
                    </div>
                </div>
            </div>
        `);

        this.renderCalendar();
    }

    /**
     * Renderizza il calendario
     */
    renderCalendar() {
        const container = $('#calendarContainer');
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        let calendarHtml = `
            <div class="calendar-header mb-3">
                <div class="row">
                    <div class="col-6">
                        <h5>${this.formatDateRange(startOfWeek, 7)}</h5>
                    </div>
                    <div class="col-6 text-end">
                        <button class="btn btn-sm btn-outline-secondary" onclick="dashboardApp.previousWeek()">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="dashboardApp.nextWeek()">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="calendar-grid">
                <div class="row">
        `;

        // Header giorni
        const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        days.forEach(day => {
            calendarHtml += `<div class="col calendar-day-header">${day}</div>`;
        });
        calendarHtml += '</div>';

        // Griglia calendario
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);

            calendarHtml += '<div class="row calendar-row">';
            calendarHtml += `<div class="col calendar-day ${this.isToday(date) ? 'today' : ''}">`;
            calendarHtml += `<div class="day-number">${date.getDate()}</div>`;

            // Eventi del giorno
            const dayEvents = this.getEventsForDate(date);
            dayEvents.forEach(event => {
                calendarHtml += `<div class="calendar-event ${event.type}" title="${event.title}">${event.title}</div>`;
            });

            calendarHtml += '</div></div>';
        }

        calendarHtml += '</div>';
        container.html(calendarHtml);
    }

    /**
     * Carica la sezione media
     */
    loadMediaSection(container) {
        container.html(`
            <div class="dashboard-section">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>Gestione Media</h3>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalUpload">
                        <i class="fas fa-upload me-2"></i>Carica Foto
                    </button>
                </div>
                <div class="row" id="mediaList">
                    <!-- Le foto verranno caricate qui -->
                </div>
            </div>
        `);

        this.renderMedia();
    }

    /**
     * Renderizza i media
     */
    renderMedia() {
        const container = $('#mediaList');
        container.empty();

        // Raccoglie tutte le foto
        const allPhotos = [];
        this.locations.forEach(location => {
            if (location.location_photos) {
                location.location_photos.forEach(photo => {
                    allPhotos.push({
                        ...photo,
                        type: 'location',
                        parentName: location.name
                    });
                });
            }
        });

        this.spaces.forEach(space => {
            if (space.space_photos) {
                space.space_photos.forEach(photo => {
                    allPhotos.push({
                        ...photo,
                        type: 'space',
                        parentName: space.name
                    });
                });
            }
        });

        if (allPhotos.length === 0) {
            container.html(`
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-images fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Nessuna foto caricata</h5>
                        <p class="text-muted">Carica le prime foto per le tue sedi e spazi</p>
                    </div>
                </div>
            `);
            return;
        }

        allPhotos.forEach(photo => {
            const card = this.createPhotoCard(photo);
            container.append(card);
        });
    }

    /**
     * Crea una card per una foto
     */
    createPhotoCard(photo) {
        return $(`
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card">
                    <img src="${photo.url}" class="card-img-top" alt="Foto" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title">${photo.parentName}</h6>
                        <p class="card-text">
                            <span class="badge ${photo.type === 'location' ? 'bg-primary' : 'bg-secondary'}">
                                ${photo.type === 'location' ? 'Sede' : 'Spazio'}
                            </span>
                        </p>
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="dashboardApp.setCoverPhoto('${photo.id}', '${photo.type}')">
                                <i class="fas fa-star me-1"></i>Cover
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="dashboardApp.deletePhoto('${photo.id}', '${photo.type}')">
                                <i class="fas fa-trash me-1"></i>Elimina
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    /**
     * Aggiorna le statistiche
     */
    updateStats() {
        $('#statsSedi').text(this.locations.length);
        $('#statsSpazi').text(this.spaces.length);

        const today = new Date().toISOString().split('T')[0];
        const todayReservations = this.reservations.filter(r =>
            r.start_at.startsWith(today)
        );
        $('#statsPrenotazioni').text(todayReservations.length);

        // Calcola occupazione
        const totalCapacity = this.spaces.reduce((sum, space) => sum + (space.capacity || 0), 0);
        const occupiedCapacity = this.reservations.filter(r =>
            r.status === 'active' &&
            new Date(r.start_at) <= new Date() &&
            new Date(r.end_at) >= new Date()
        ).reduce((sum, r) => {
            const space = this.spaces.find(s => s.id === r.space_id);
            return sum + (space ? space.capacity || 0 : 0);
        }, 0);

        const occupancy = totalCapacity > 0 ? Math.round((occupiedCapacity / totalCapacity) * 100) : 0;
        $('#statsOccupazione').text(`${occupancy}%`);
    }

    /**
     * Renderizza i grafici
     */
    renderCharts() {
        this.renderReservationsChart();
        this.renderSpacesChart();
    }

    /**
     * Renderizza il grafico delle prenotazioni
     */
    renderReservationsChart() {
        const ctx = document.getElementById('chartPrenotazioni');
        if (!ctx) return;

        // Dati delle ultime 7 settimane
        const weeks = [];
        const data = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - (i * 7));
            weeks.push(`Sett ${date.getWeek()}`);

            const weekReservations = this.reservations.filter(r => {
                const resDate = new Date(r.start_at);
                return resDate >= date && resDate < new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
            });
            data.push(weekReservations.length);
        }

        if (this.charts.reservations) {
            this.charts.reservations.destroy();
        }

        this.charts.reservations = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Prenotazioni',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Renderizza il grafico degli spazi
     */
    renderSpacesChart() {
        const ctx = document.getElementById('chartSpazi');
        if (!ctx) return;

        // Raggruppa spazi per sede
        const spacesByLocation = {};
        this.spaces.forEach(space => {
            const location = this.locations.find(loc => loc.id === space.location_id);
            const locationName = location ? location.name : 'Sconosciuta';
            spacesByLocation[locationName] = (spacesByLocation[locationName] || 0) + 1;
        });

        const labels = Object.keys(spacesByLocation);
        const data = Object.values(spacesByLocation);

        if (this.charts.spaces) {
            this.charts.spaces.destroy();
        }

        this.charts.spaces = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Carica l'attività recente
     */
    loadRecentActivity() {
        const container = $('#recentActivity');
        container.empty();

        // Simula attività recente
        const activities = [
            { icon: 'fas fa-plus', text: 'Nuova sede "CoWork Milano Centro" creata', time: '2 ore fa' },
            { icon: 'fas fa-calendar', text: 'Prenotazione confermata per "Stanza Privata 1"', time: '4 ore fa' },
            { icon: 'fas fa-images', text: 'Foto caricate per "CoWork Roma Nord"', time: '1 giorno fa' },
            { icon: 'fas fa-edit', text: 'Spazio "Open Space" modificato', time: '2 giorni fa' }
        ];

        activities.forEach(activity => {
            container.append(`
                <div class="d-flex align-items-center mb-3">
                    <div class="flex-shrink-0">
                        <i class="${activity.icon} text-primary"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="text-sm">${activity.text}</div>
                        <div class="text-xs text-muted">${activity.time}</div>
                    </div>
                </div>
            `);
        });
    }

    /**
     * Inizializza il realtime
     */
    initializeRealtime() {
        if (window.supabase) {
            this.realtimeClient = window.supabase.createRealtimeClient();
            this.realtimeClient.connect();

            // Sottoscrivi ai cambiamenti
            this.realtimeClient.subscribe('reservations', (data) => {
                console.log('Nuova prenotazione:', data);
                this.refreshData();
            });
        }
    }

    /**
     * Aggiorna i dati
     */
    async refreshData() {
        try {
            await this.loadInitialData();
            this.showToast('Dati aggiornati', 'success');
        } catch (error) {
            console.error('Errore nell\'aggiornamento:', error);
            this.showToast('Errore nell\'aggiornamento dei dati', 'error');
        }
    }

    /**
     * Logout
     */
    logout() {
        localStorage.removeItem('supabase_token');
        window.location.href = 'login.html';
    }

    /**
     * Mostra un toast
     */
    showToast(message, type = 'info') {
        const toast = $('#toastNotifica');
        const toastMessage = $('#toastMessage');

        toastMessage.text(message);

        const icon = toast.find('.toast-header i');
        icon.removeClass().addClass('fas me-2');

        switch (type) {
            case 'success':
                icon.addClass('fa-check-circle text-success');
                break;
            case 'error':
                icon.addClass('fa-exclamation-circle text-danger');
                break;
            case 'warning':
                icon.addClass('fa-exclamation-triangle text-warning');
                break;
            default:
                icon.addClass('fa-info-circle text-primary');
        }

        const bsToast = new bootstrap.Toast(toast[0]);
        bsToast.show();
    }

    // Metodi di utilità
    formatDateRange(startDate, days) {
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + days - 1);
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    getEventsForDate(date) {
        return this.reservations.filter(r => {
            const resDate = new Date(r.start_at);
            return resDate.toDateString() === date.toDateString();
        }).map(r => ({
            title: r.notes || 'Prenotazione',
            type: r.kind === 'booking' ? 'booking' : 'occupation'
        }));
    }

    // Metodi per le azioni (da implementare)
    editLocation(locationId) {
        console.log('Edit location:', locationId);
        this.showToast('Funzionalità in sviluppo', 'info');
    }

    deleteLocation(locationId) {
        console.log('Delete location:', locationId);
        this.showToast('Funzionalità in sviluppo', 'info');
    }

    manageLocationPhotos(locationId) {
        console.log('Manage location photos:', locationId);
        this.showToast('Funzionalità in sviluppo', 'info');
    }

    editSpace(spaceId) {
        console.log('Edit space:', spaceId);
        this.showToast('Funzionalità in sviluppo', 'info');
    }

    deleteSpace(spaceId) {
        console.log('Delete space:', spaceId);
        this.showToast('Funzionalità in sviluppo', 'info');
    }

    manageSpacePhotos(spaceId) {
        console.log('Manage space photos:', spaceId);
        this.showToast('Funzionalità in sviluppo', 'info');
    }

    setCoverPhoto(photoId, type) {
        console.log('Set cover photo:', photoId, type);
        this.showToast('Funzionalità in sviluppo', 'info');
    }

    deletePhoto(photoId, type) {
        console.log('Delete photo:', photoId, type);
        this.showToast('Funzionalità in sviluppo', 'info');
    }

    // Dati di fallback
    getFallbackLocations() {
        return [
            {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'CoWork Milano Centro',
                address: 'Via Roma 1, Milano',
                description: 'Sede centrale di Milano con tutti i servizi moderni per il coworking',
                services: ['WiFi', 'Caffè', 'Parcheggio', 'Sala riunioni'],
                location_photos: [
                    { id: '1', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' },
                    { id: '2', url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800' }
                ]
            },
            {
                id: '22222222-2222-2222-2222-222222222222',
                name: 'CoWork Roma Nord',
                address: 'Via del Corso 10, Roma',
                description: 'Sede moderna nel centro di Roma con spazi flessibili',
                services: ['WiFi', 'Caffè', 'Sala riunioni', 'Terrazza'],
                location_photos: [
                    { id: '3', url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800' }
                ]
            }
        ];
    }

    getFallbackSpaces() {
        return [
            {
                id: '33333333-3333-3333-3333-333333333333',
                location_id: '11111111-1111-1111-1111-111111111111',
                name: 'Stanza Privata 1',
                description: 'Stanza privata con scrivania e sedia ergonomica',
                capacity: 1,
                amenities: ['WiFi', 'Scrivania', 'Sedia ergonomica'],
                space_photos: [
                    { id: '4', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600' }
                ]
            },
            {
                id: '44444444-4444-4444-4444-444444444444',
                location_id: '11111111-1111-1111-1111-111111111111',
                name: 'Open Space',
                description: 'Area coworking condivisa per team e freelancer',
                capacity: 10,
                amenities: ['WiFi', 'Scrivanie', 'Sedie', 'Caffè'],
                space_photos: [
                    { id: '5', url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600' }
                ]
            }
        ];
    }

    getFallbackReservations() {
        return [
            {
                id: '1',
                kind: 'booking',
                status: 'active',
                space_id: '33333333-3333-3333-3333-333333333333',
                start_at: new Date().toISOString(),
                end_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                notes: 'Prenotazione di test'
            }
        ];
    }
}

// Estende Date per aggiungere getWeek
Date.prototype.getWeek = function () {
    const onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

// Inizializza l'app quando il DOM è pronto
$(document).ready(function () {
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap non caricato');
        return;
    }

    window.dashboardApp = new DashboardApp();
});
