/**
 * Applicazione Catalogo Sedi
 * Gestisce la visualizzazione delle sedi con modal e caroselli
 */

class CatalogApp {
    constructor() {
        this.locations = [];
        this.currentLocation = null;
        this.currentSpace = null;
        this.filters = {
            city: '',
            service: '',
            search: '',
            onlyWithSpaces: false
        };

        this.init();
    }

    /**
     * Inizializza l'applicazione
     */
    init() {
        this.bindEvents();
        this.loadInitialData();
    }

    /**
     * Collega gli eventi
     */
    bindEvents() {
        // Form filtri
        $('#formFiltri').on('submit', (e) => {
            e.preventDefault();
            this.applyFilters();
        });

        $('#btnReset').on('click', () => {
            this.resetFilters();
        });

        // Modal sede
        $('#modalSede').on('show.bs.modal', (e) => {
            const locationId = $(e.relatedTarget).data('location-id');
            this.loadLocationDetails(locationId);
        });

        // Modal spazio
        $('#modalSpazio').on('show.bs.modal', (e) => {
            const spaceId = $(e.relatedTarget).data('space-id');
            this.loadSpaceDetails(spaceId);
        });

        // ✅ BOTTONI PRENOTA SPAZIO
        $(document).on('click', '.btn-prenota-spazio', (e) => {
            e.preventDefault();
            const spaceId = $(e.currentTarget).data('space-id');
            const locationId = $(e.currentTarget).data('location-id');
            const spaceName = $(e.currentTarget).data('space-name');
            this.handleBookingRequest(spaceId, locationId, spaceName);
        });

        // ✅ BOTTONI PRENOTA SEDE
        $(document).on('click', '.btn-prenota-sede', (e) => {
            e.preventDefault();
            const locationId = $(e.currentTarget).data('location-id');
            const locationName = $(e.currentTarget).data('location-name');
            this.handleLocationBookingRequest(locationId, locationName);
        });

        // Tab spazi
        $('#spazi-tab').on('click', () => {
            if (this.currentLocation) {
                this.loadLocationSpaces(this.currentLocation.id);
            }
        });

        // Pulsanti prenotazione (nascosti per ora)
        $('#btnPrenotaSede, #btnPrenotaSpazio').on('click', () => {
            this.showToast('Funzionalità di prenotazione non disponibile nel catalogo', 'info');
        });
    }

    /**
     * Carica i dati iniziali
     */
    async loadInitialData() {
        try {
            this.showLoading(true);

            // Carica le sedi
            await this.loadLocations();

            // Carica le città per i filtri
            await this.loadCities();

            // Carica i servizi per i filtri
            await this.loadServices();

        } catch (error) {
            console.error('Errore nel caricamento iniziale:', error);
            this.showToast('Errore nel caricamento dei dati', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Carica le sedi
     */
    async loadLocations() {
        try {
            // ✅ CARICA LE SEDI DAL BACKEND REALE
            const response = await fetch(`${window.CONFIG.API_BASE}/sedi`);
            if (response.ok) {
                const sedi = await response.json();
                
                // ✅ TRASFORMA I DATI DEL BACKEND NEL FORMATO ATTESO
                this.locations = sedi.map(sede => ({
                    id: sede.id_sede,
                    name: sede.nome,
                    address: `${sede.indirizzo}, ${sede.citta}`,
                    description: sede.descrizione || 'Sede di coworking moderna e funzionale',
                    services: ['WiFi', 'Caffè', 'Sala riunioni', 'Parcheggio'], // Servizi di default
                    location_photos: sede.location_photos || [
                        {
                            url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop&auto=format',
                            alt: sede.nome
                        },
                        {
                            url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=800&fit=crop&auto=format',
                            alt: sede.nome
                        },
                        {
                            url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&h=800&fit=crop&auto=format',
                            alt: sede.nome
                        }
                    ]
                }));
                
                console.log(`✅ Caricate ${this.locations.length} sedi dal backend`);
            } else {
                throw new Error(`Errore HTTP: ${response.status}`);
            }

            this.renderLocations();
        } catch (error) {
            console.error('❌ Errore nel caricamento delle sedi:', error);
            // Usa dati di fallback migliorati
            this.locations = this.getFallbackLocations();
            this.renderLocations();
        }
    }

    /**
     * Carica le città per i filtri
     */
    async loadCities() {
        const cities = [...new Set(this.locations.map(loc => {
            // Estrai città dall'indirizzo
            const addressParts = loc.address ? loc.address.split(',') : [];
            return addressParts.length > 1 ? addressParts[1].trim() : 'Sconosciuta';
        }))];

        const select = $('#filtroCitta');
        select.empty().append('<option value="">Tutte le città</option>');

        cities.forEach(city => {
            select.append(`<option value="${city}">${city}</option>`);
        });
    }

    /**
     * Carica i servizi per i filtri
     */
    async loadServices() {
        const services = [...new Set(this.locations.flatMap(loc => loc.services || []))];

        const select = $('#filtroServizi');
        select.empty().append('<option value="">Tutti i servizi</option>');

        services.forEach(service => {
            select.append(`<option value="${service}">${service}</option>`);
        });
    }

    /**
     * Applica i filtri
     */
    applyFilters() {
        this.filters = {
            city: $('#filtroCitta').val(),
            service: $('#filtroServizi').val(),
            search: $('#filtroRicerca').val().toLowerCase(),
            onlyWithSpaces: $('#soloConSpazi').is(':checked')
        };

        this.renderLocations();
    }

    /**
     * Reset dei filtri
     */
    resetFilters() {
        $('#formFiltri')[0].reset();
        this.filters = {
            city: '',
            service: '',
            search: '',
            onlyWithSpaces: false
        };
        this.renderLocations();
    }

    /**
     * Renderizza le sedi
     */
    renderLocations() {
        const container = $('#risultati');
        const noResults = $('#nessunRisultato');

        // Filtra le sedi
        const filteredLocations = this.locations.filter(location => {
            // Filtro città
            if (this.filters.city) {
                const city = location.address ? location.address.split(',')[1]?.trim() : '';
                if (city !== this.filters.city) return false;
            }

            // Filtro servizio
            if (this.filters.service) {
                if (!location.services || !location.services.includes(this.filters.service)) {
                    return false;
                }
            }

            // Filtro ricerca
            if (this.filters.search) {
                const searchText = `${location.name} ${location.description} ${location.address}`.toLowerCase();
                if (!searchText.includes(this.filters.search)) return false;
            }

            return true;
        });

        // Mostra/nascondi messaggio nessun risultato
        if (filteredLocations.length === 0) {
            container.hide();
            noResults.removeClass('d-none');
            return;
        }

        noResults.addClass('d-none');
        container.show().empty();

        // Renderizza le card
        filteredLocations.forEach(location => {
            const card = this.createLocationCard(location);
            container.append(card);
        });

        // Carosello rimosso - le immagini vengono mostrate direttamente
    }

    /**
     * Crea una card per una sede
     */
    createLocationCard(location) {
        const photos = location.location_photos && location.location_photos.length > 0
            ? location.location_photos
            : [{
                url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop',
                alt: location.name
            }];

        const servicesHtml = (location.services || []).map(service =>
            `<span class="badge service-badge">${service}</span>`
        ).join('');

        // Crea il carosello immersivo senza overlay
        const carouselHtml = photos.map((photo, index) =>
            `<img src="${photo.url}" 
                 alt="${photo.alt || location.name}" 
                 loading="lazy">`
        ).join('');

        return $(`
            <div class="col-md-6 col-lg-4">
                <div class="card location-card catalog-card h-100 overflow-hidden">
                    <!-- Immagine singola senza carosello -->
                    <div class="location-image-container" style="height: 200px; overflow: hidden;">
                        <img src="${photos[0]?.url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop'}" 
                             alt="${photos[0]?.alt || location.name}" 
                             class="img-fluid"
                             style="width: 100%; height: 100%; object-fit: cover;"
                             loading="lazy">
                    </div>
                    
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${location.name}</h5>
                        <p class="card-text text-muted">${location.address || 'Indirizzo non disponibile'}</p>
                        <p class="card-text">${location.description || 'Nessuna descrizione disponibile'}</p>
                        <div class="location-services mt-auto">
                            ${servicesHtml}
                        </div>
                        <div class="d-flex gap-2 mt-3">
                            <button class="btn btn-outline-primary flex-fill" 
                                    data-bs-toggle="modal" 
                                    data-bs-target="#modalSede"
                                    data-location-id="${location.id}">
                                <i class="fas fa-eye me-2"></i>Scopri
                            </button>
                            <button class="btn btn-primary flex-fill btn-prenota-sede" 
                                    data-location-id="${location.id}"
                                    data-location-name="${location.name}">
                                <i class="fas fa-calendar-plus me-2"></i>Prenota
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    /**
     * Carica i dettagli di una sede
     */
    async loadLocationDetails(locationId) {
        try {
            this.currentLocation = this.locations.find(loc => loc.id === locationId);

            if (!this.currentLocation) {
                this.showToast('Sede non trovata', 'error');
                return;
            }

            // Aggiorna il modal
            $('#modalSedeLabel').text(this.currentLocation.name);
            $('#sedeNome').text(this.currentLocation.name);
            $('#sedeIndirizzo').text(this.currentLocation.address || 'Indirizzo non disponibile');
            $('#sedeDescrizione').text(this.currentLocation.description || 'Nessuna descrizione disponibile');

            // ✅ CARICA I SERVIZI REALI DAL BACKEND
            try {
                const serviziResponse = await fetch(`${window.CONFIG.API_BASE}/servizi`);
                if (serviziResponse.ok) {
                    const servizi = await serviziResponse.json();
                    const servicesHtml = servizi.map(servizio =>
                        `<span class="badge service-badge">${servizio.nome}</span>`
                    ).join('');
                    $('#sedeServizi').html(servicesHtml || '<span class="text-muted">Nessun servizio disponibile</span>');
                } else {
                    // Fallback ai servizi hardcoded
                    const servicesHtml = (this.currentLocation.services || []).map(service =>
                        `<span class="badge service-badge">${service}</span>`
                    ).join('');
                    $('#sedeServizi').html(servicesHtml);
                }
            } catch (serviziError) {
                console.warn('Errore caricamento servizi, uso servizi di default:', serviziError);
                const servicesHtml = (this.currentLocation.services || []).map(service =>
                    `<span class="badge service-badge">${service}</span>`
                ).join('');
                $('#sedeServizi').html(servicesHtml);
            }

            // ✅ MOSTRA IL BOTTONE PRENOTA SEDE
            const btnPrenotaSede = $('#btnPrenotaSede');
            btnPrenotaSede.show();
            btnPrenotaSede.off('click').on('click', () => {
                this.handleLocationBookingRequest(locationId, this.currentLocation.name);
            });

            // Carica le foto
            this.loadLocationPhotos();

        } catch (error) {
            console.error('Errore nel caricamento dettagli sede:', error);
            this.showToast('Errore nel caricamento dei dettagli', 'error');
        }
    }

    /**
     * Carica le foto di una sede
     */
    loadLocationPhotos() {
        const photos = this.currentLocation.location_photos || [];
        const carouselContainer = $('#caroselloSede');

        // Svuota il contenitore
        carouselContainer.empty();

        if (photos.length === 0) {
            // Foto di default senza carosello
            carouselContainer.html(`
                <div class="single-photo-container">
                    <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop" 
                         alt="${this.currentLocation.name}" 
                         class="img-fluid rounded shadow-sm"
                         style="width: 100%; height: 400px; object-fit: cover;"
                         loading="lazy">
                </div>
            `);
        } else {
            // Mostra tutte le foto in una griglia semplice senza carosello
            const photosHtml = photos.map((photo, index) =>
                `<div class="col-md-6 mb-3">
                    <img src="${photo.url}" 
                         alt="${photo.alt || this.currentLocation.name}" 
                         class="img-fluid rounded shadow-sm"
                         style="width: 100%; height: 250px; object-fit: cover;"
                         loading="lazy">
                </div>`
            ).join('');

            carouselContainer.html(`
                <div class="row">
                    ${photosHtml}
                </div>
            `);
        }
    }

    /**
     * Carica gli spazi di una sede
     */
    async loadLocationSpaces(locationId) {
        try {
            let spaces = [];

            if (window.coworkspaceAPI) {
                spaces = await window.coworkspaceAPI.getSpacesByLocation(locationId);
            } else {
                // Dati di fallback
                spaces = this.getFallbackSpaces(locationId);
            }

            this.renderLocationSpaces(spaces);

        } catch (error) {
            console.error('Errore nel caricamento spazi:', error);
            this.showToast('Errore nel caricamento degli spazi', 'error');
        }
    }

    /**
     * Renderizza gli spazi di una sede
     */
    renderLocationSpaces(spaces) {
        const container = $('#listaSpazi');
        container.empty();

        if (spaces.length === 0) {
            container.append(`
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="fas fa-door-open fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Nessuno spazio disponibile</h5>
                        <p class="text-muted">Questa sede non ha ancora spazi configurati.</p>
                    </div>
                </div>
            `);
            return;
        }

        spaces.forEach(space => {
            const spaceCard = this.createSpaceCard(space);
            container.append(spaceCard);
        });

        // Carosello rimosso - le immagini vengono mostrate direttamente
    }

    /**
     * Crea una card per uno spazio
     */
    createSpaceCard(space) {
        const amenitiesHtml = (space.amenities || []).map(amenity =>
            `<span class="badge amenity-badge">${amenity}</span>`
        ).join('');

        // Ottieni le foto dello spazio
        const photos = space.space_photos && space.space_photos.length > 0
            ? space.space_photos
            : [{
                url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop',
                alt: space.name
            }];

        // Crea il carosello immersivo per lo spazio
        const carouselHtml = photos.map((photo, index) =>
            `<img src="${photo.url}" 
                 alt="${photo.alt || space.name}" 
                 loading="lazy">`
        ).join('');

        // Determina il tipo di spazio
        const spaceType = space.type || 'Spazio di lavoro';
        const spaceTypeIcon = this.getSpaceTypeIcon(spaceType);

        return $(`
            <div class="col-md-6 col-lg-4">
                <div class="space-item catalog-card">
                    <!-- Immagine singola senza carosello -->
                    <div class="space-image-container" style="height: 150px; margin-bottom: 1rem; overflow: hidden;">
                        <img src="${photos[0]?.url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=150&fit=crop'}" 
                             alt="${photos[0]?.alt || space.name}" 
                             class="img-fluid"
                             style="width: 100%; height: 100%; object-fit: cover;"
                             loading="lazy">
                    </div>
                    
                    <div class="space-header">
                        <div>
                            <h6 class="space-title">
                                <i class="${spaceTypeIcon} me-2"></i>
                                ${space.name}
                            </h6>
                            <p class="space-capacity">Capacità: ${space.capacity || 'N/A'} persone</p>
                            <p class="space-type text-muted small">${spaceType}</p>
                        </div>
                    </div>
                    <p class="space-description">${space.description || 'Nessuna descrizione disponibile'}</p>
                    <div class="space-amenities mb-3">
                        ${amenitiesHtml}
                    </div>
                    <div class="space-status">
                        <span class="status-badge available">Disponibile</span>
                        <div class="space-actions d-flex gap-2 mt-2">
                            <button class="btn btn-outline-primary btn-sm" 
                                    data-bs-toggle="modal" 
                                    data-bs-target="#modalSpazio"
                                    data-space-id="${space.id}">
                                <i class="fas fa-info-circle me-1"></i>Dettagli
                            </button>
                            <button class="btn btn-primary btn-sm btn-prenota-spazio" 
                                    data-space-id="${space.id}"
                                    data-location-id="${this.currentLocation.id}"
                                    data-space-name="${space.name}">
                                <i class="fas fa-calendar-plus me-1"></i>Prenota
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    /**
     * Ottiene l'icona per il tipo di spazio
     */
    getSpaceTypeIcon(spaceType) {
        const iconMap = {
            'stanza privata': 'fas fa-door-closed',
            'postazione': 'fas fa-desktop',
            'sala riunioni': 'fas fa-users',
            'ufficio privato': 'fas fa-building',
            'area comune': 'fas fa-users',
            'spazio di lavoro': 'fas fa-briefcase'
        };
        return iconMap[spaceType] || 'fas fa-door-open';
    }

    /**
     * Carica i dettagli di uno spazio
     */
    async loadSpaceDetails(spaceId) {
        try {
            // Trova lo spazio tra tutti gli spazi delle sedi
            let space = null;
            for (const location of this.locations) {
                if (location.spaces) {
                    space = location.spaces.find(s => s.id === spaceId);
                    if (space) break;
                }
            }

            if (!space) {
                // Dati di fallback
                space = this.getFallbackSpace(spaceId);
            }

            this.currentSpace = space;

            // Aggiorna il modal
            $('#modalSpazioLabel').text(space.name);
            $('#spazioNome').text(space.name);
            $('#spazioSede').text(space.location ? space.location.name : 'Sede sconosciuta');
            $('#spazioDescrizione').text(space.description || 'Nessuna descrizione disponibile');
            $('#spazioCapacita').text(space.capacity || 'N/A');

            // Aggiorna il tipo di spazio
            const spaceType = space.type || 'Spazio di lavoro';
            const spaceTypeIcon = this.getSpaceTypeIcon(spaceType);
            $('#spazioNome').html(`<i class="${spaceTypeIcon} me-2"></i>${space.name}`);

            // Renderizza le amenities
            const amenitiesHtml = (space.amenities || []).map(amenity =>
                `<span class="badge amenity-badge">${amenity}</span>`
            ).join('');
            $('#spazioAmenities').html(amenitiesHtml);

            // ✅ MOSTRA IL BOTTONE PRENOTA
            const btnPrenotaSpazio = $('#btnPrenotaSpazio');
            btnPrenotaSpazio.show();
            btnPrenotaSpazio.off('click').on('click', () => {
                this.handleBookingRequest(spaceId, this.currentLocation.id, space.name);
            });

            // Carica le foto
            this.loadSpacePhotos();

        } catch (error) {
            console.error('Errore nel caricamento dettagli spazio:', error);
            this.showToast('Errore nel caricamento dei dettagli', 'error');
        }
    }

    /**
     * Carica le foto di uno spazio
     */
    loadSpacePhotos() {
        const photos = this.currentSpace.space_photos || [];
        const carouselContainer = $('#caroselloSpazio');

        // Svuota il contenitore
        carouselContainer.empty();

        if (photos.length === 0) {
            // Foto di default senza carosello
            carouselContainer.html(`
                <div class="single-photo-container">
                    <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop" 
                         alt="${this.currentSpace.name}" 
                         class="img-fluid rounded shadow-sm"
                         style="width: 100%; height: 300px; object-fit: cover;"
                         loading="lazy">
                </div>
            `);
        } else {
            // Mostra tutte le foto in una griglia semplice senza carosello
            const photosHtml = photos.map((photo, index) =>
                `<div class="col-md-6 mb-3">
                    <img src="${photo.url}" 
                         alt="${photo.alt || this.currentSpace.name}" 
                         class="img-fluid rounded shadow-sm"
                         style="width: 100%; height: 200px; object-fit: cover;"
                         loading="lazy">
                </div>`
            ).join('');

            carouselContainer.html(`
                <div class="row">
                    ${photosHtml}
                </div>
            `);
        }
    }

    /**
     * Mostra/nascondi loading
     */
    showLoading(show) {
        if (show) {
            $('#loading').removeClass('d-none');
            $('#risultati').hide();
        } else {
            $('#loading').addClass('d-none');
            $('#risultati').show();
        }
    }

    /**
     * Mostra un toast
     */
    showToast(message, type = 'info') {
        const toast = $('#toastNotifica');
        const toastMessage = $('#toastMessage');

        // Aggiorna il messaggio
        toastMessage.text(message);

        // Aggiorna l'icona in base al tipo
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

        // Mostra il toast
        const bsToast = new bootstrap.Toast(toast[0]);
        bsToast.show();
    }

    /**
     * ✅ Gestisce la richiesta di prenotazione per uno spazio specifico
     */
    async handleBookingRequest(spaceId, locationId, spaceName) {
        try {
            console.log(`🎯 Click "Prenota" modal spazio - sede + spazio: ${locationId} + ${spaceId}`);
            
            // Verifica se l'utente è autenticato
            const token = localStorage.getItem('token');
            
            if (!token) {
                // ✅ SALVA PARAMETRI SEDE + SPAZIO E REINDIRIZZA AL LOGIN
                const bookingParams = {
                    sede: locationId,
                    spazio: spaceId, // Spazio preselezionato
                    dataInizio: null,
                    dataFine: null,
                    timestamp: Date.now()
                };
                localStorage.setItem('bookingParams', JSON.stringify(bookingParams));
                localStorage.setItem('redirectAfterLogin', 'selezione-slot.html');
                
                console.log('💾 Parametri sede + spazio salvati:', bookingParams);
                window.location.href = 'login.html';
                return;
            }

            // ✅ UTENTE AUTENTICATO - Vai alla prenotazione con sede + spazio preselezionati
            const bookingUrl = `selezione-slot.html?sede=${locationId}&spazio=${spaceId}`;
            this.showToast(`Reindirizzamento alla prenotazione di "${spaceName}"...`, 'success');
            setTimeout(() => {
                window.location.href = bookingUrl;
            }, 1500);

        } catch (error) {
            console.error('Errore nella gestione prenotazione:', error);
            this.showToast('Errore durante la prenotazione', 'error');
        }
    }

    /**
     * ✅ Gestisce la richiesta di prenotazione per una sede (senza spazio specifico)
     */
    async handleLocationBookingRequest(locationId, locationName) {
        try {
            console.log(`🎯 Click "Prenota" card catalogo - solo sede: ${locationId}`);
            
            // Verifica se l'utente è autenticato
            const token = localStorage.getItem('token');
            
            if (!token) {
                // ✅ SALVA PARAMETRI SOLO SEDE E REINDIRIZZA AL LOGIN
                const bookingParams = {
                    sede: locationId,
                    spazio: null, // Nessuno spazio preselezionato
                    dataInizio: null,
                    dataFine: null,
                    timestamp: Date.now()
                };
                localStorage.setItem('bookingParams', JSON.stringify(bookingParams));
                localStorage.setItem('redirectAfterLogin', 'selezione-slot.html');
                
                console.log('💾 Parametri solo sede salvati:', bookingParams);
                window.location.href = 'login.html';
                return;
            }

            // ✅ UTENTE AUTENTICATO - Vai alla prenotazione con solo sede preselezionata
            const bookingUrl = `selezione-slot.html?sede=${locationId}`;
            this.showToast(`Reindirizzamento alla prenotazione nella sede "${locationName}"...`, 'success');
            setTimeout(() => {
                window.location.href = bookingUrl;
            }, 1500);

        } catch (error) {
            console.error('Errore nella gestione prenotazione sede:', error);
            this.showToast('Errore durante la prenotazione', 'error');
        }
    }

    /**
     * Dati di fallback per le sedi
     */
    getFallbackLocations() {
        return [
            {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'CoWork Milano Centro',
                address: 'Via Roma 1, Milano',
                description: 'Sede centrale di Milano con tutti i servizi moderni per il coworking',
                services: ['WiFi', 'Caffè', 'Parcheggio', 'Sala riunioni'],
                location_photos: [
                    { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop&auto=format' },
                    { url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=800&fit=crop&auto=format' },
                    { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&h=800&fit=crop&auto=format' }
                ]
            },
            {
                id: '22222222-2222-2222-2222-222222222222',
                name: 'CoWork Roma Nord',
                address: 'Via del Corso 10, Roma',
                description: 'Sede moderna nel centro di Roma con spazi flessibili',
                services: ['WiFi', 'Caffè', 'Sala riunioni', 'Terrazza'],
                location_photos: [
                    { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&h=800&fit=crop&auto=format' },
                    { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop&auto=format' },
                    { url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=800&fit=crop&auto=format' }
                ]
            }
        ];
    }

    /**
     * Dati di fallback per gli spazi
     */
    getFallbackSpaces(locationId) {
        if (locationId === '11111111-1111-1111-1111-111111111111') {
            return [
                {
                    id: '33333333-3333-3333-3333-333333333333',
                    name: 'Stanza Privata 1',
                    type: 'stanza privata',
                    description: 'Stanza privata con scrivania e sedia ergonomica',
                    capacity: 1,
                    amenities: ['WiFi', 'Scrivania', 'Sedia ergonomica'],
                    space_photos: [
                        { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop' },
                        { url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=400&fit=crop' }
                    ]
                },
                {
                    id: '44444444-4444-4444-4444-444444444444',
                    name: 'Sala Riunioni A',
                    type: 'sala riunioni',
                    description: 'Sala riunioni moderna per meeting e presentazioni',
                    capacity: 8,
                    amenities: ['WiFi', 'Proiettore', 'Lavagna', 'Caffè'],
                    space_photos: [
                        { url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&h=400&fit=crop' },
                        { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&h=400&fit=crop' }
                    ]
                },
                {
                    id: '55555555-5555-5555-5555-555555555555',
                    name: 'Postazione Condivisa',
                    type: 'postazione',
                    description: 'Postazione in area condivisa per lavoro individuale',
                    capacity: 1,
                    amenities: ['WiFi', 'Scrivania', 'Sedia', 'Prese elettriche'],
                    space_photos: [
                        { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop' }
                    ]
                }
            ];
        }
        return [];
    }

    /**
     * Dati di fallback per uno spazio specifico
     */
    getFallbackSpace(spaceId) {
        const spaces = this.getFallbackSpaces('11111111-1111-1111-1111-111111111111');
        return spaces.find(s => s.id === spaceId) || {
            id: spaceId,
            name: 'Spazio di Lavoro',
            type: 'spazio di lavoro',
            description: 'Spazio di lavoro moderno e funzionale',
            capacity: 1,
            amenities: ['WiFi', 'Scrivania', 'Sedia ergonomica'],
            space_photos: [
                { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop' },
                { url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=400&fit=crop' }
            ],
            location: {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'Sede Principale'
            }
        };
    }
}

// Inizializza l'app quando il DOM è pronto
$(document).ready(function () {
    // Verifica che le dipendenze siano caricate
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap non caricato');
        return;
    }

    // Inizializza l'app
    window.catalogApp = new CatalogApp();
});
