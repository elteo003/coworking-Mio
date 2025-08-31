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
            if (window.coworkspaceAPI) {
                this.locations = await window.coworkspaceAPI.getMyLocations();
            } else {
                // Dati di fallback per demo
                this.locations = this.getFallbackLocations();
            }

            this.renderLocations();
        } catch (error) {
            console.error('Errore nel caricamento delle sedi:', error);
            // Usa dati di fallback
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

        // Inizializza i caroselli immersivi per le sedi
        setTimeout(() => {
            const carousels = container.find('.immersive-carousel');

            carousels.each((index, element) => {
                if (window.ImmersiveCarousel) {
                    try {
                        new window.ImmersiveCarousel(element, {
                            autoplay: true,
                            autoplayDelay: 4000,
                            showArrows: false,
                            showDots: true,
                            enableHover: true,
                            enableKeyboard: true,
                            enableTouch: true
                        });
                    } catch (error) {
                        console.error(`❌ Errore inizializzazione carosello ${index + 1}:`, error);
                    }
                } else {
                    console.error('❌ ImmersiveCarousel non disponibile');
                }
            });
        }, 200);
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
                    <!-- Carosello Immersivo -->
                    <div class="immersive-carousel" 
                         style="height: 200px;" 
                         data-autoplay="true" 
                         data-autoplay-delay="4000"
                         data-show-arrows="true" 
                         data-show-dots="true"
                         data-enable-hover="true"
                         data-enable-keyboard="true"
                         data-enable-touch="true">
                        ${carouselHtml}
                    </div>
                    
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${location.name}</h5>
                        <p class="card-text text-muted">${location.address || 'Indirizzo non disponibile'}</p>
                        <p class="card-text">${location.description || 'Nessuna descrizione disponibile'}</p>
                        <div class="location-services mt-auto">
                            ${servicesHtml}
                        </div>
                        <button class="btn btn-scopri mt-3" 
                                data-bs-toggle="modal" 
                                data-bs-target="#modalSede"
                                data-location-id="${location.id}">
                            <i class="fas fa-eye me-2"></i>Scopri
                        </button>
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

            // Renderizza i servizi
            const servicesHtml = (this.currentLocation.services || []).map(service =>
                `<span class="badge service-badge">${service}</span>`
            ).join('');
            $('#sedeServizi').html(servicesHtml);

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
            // Foto di default
            carouselContainer.html(`
                <div class="immersive-carousel" 
                     style="height: 400px;" 
                     data-autoplay="true" 
                     data-autoplay-delay="5000"
                     data-show-arrows="true" 
                     data-show-dots="true"
                     data-enable-hover="true"
                     data-enable-keyboard="true"
                     data-enable-touch="true">
                    <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=400&fit=crop" 
                         alt="${this.currentLocation.name}" 
                         loading="lazy">
                </div>
            `);
        } else {
            // Crea il carosello immersivo con le foto senza overlay
            const carouselHtml = photos.map((photo, index) =>
                `<img src="${photo.url}" 
                     alt="${photo.alt || this.currentLocation.name}" 
                     loading="lazy">`
            ).join('');

            carouselContainer.html(`
                <div class="immersive-carousel" 
                     style="height: 400px;" 
                     data-autoplay="true" 
                     data-autoplay-delay="5000"
                     data-show-arrows="true" 
                     data-show-dots="true"
                     data-enable-hover="true"
                     data-enable-keyboard="true"
                     data-enable-touch="true">
                    ${carouselHtml}
                </div>
            `);
        }

        // Reinizializza il carosello immersivo
        setTimeout(() => {
            if (window.ImmersiveCarousel) {
                new window.ImmersiveCarousel(carouselContainer.find('.immersive-carousel')[0], {
                    autoplay: true,
                    autoplayDelay: 5000,
                    showArrows: false,
                    showDots: true,
                    enableHover: true,
                    enableKeyboard: true,
                    enableTouch: true
                });
            }
        }, 100);
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

        // Inizializza i caroselli immersivi per gli spazi
        setTimeout(() => {
            container.find('.immersive-carousel').each((index, element) => {
                if (window.ImmersiveCarousel) {
                    new window.ImmersiveCarousel(element, {
                        autoplay: true,
                        autoplayDelay: 3000,
                        showArrows: false,
                        showDots: true,
                        enableHover: true,
                        enableKeyboard: true,
                        enableTouch: true
                    });
                }
            });
        }, 100);
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
                    <!-- Carosello Immersivo per Spazio -->
                    <div class="immersive-carousel" 
                         style="height: 150px; margin-bottom: 1rem;" 
                         data-autoplay="true" 
                         data-autoplay-delay="3000"
                         data-show-arrows="true" 
                         data-show-dots="true"
                         data-enable-hover="true"
                         data-enable-keyboard="true"
                         data-enable-touch="true">
                        ${carouselHtml}
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
                        <button class="btn btn-dettagli" 
                                data-bs-toggle="modal" 
                                data-bs-target="#modalSpazio"
                                data-space-id="${space.id}">
                            <i class="fas fa-info-circle me-1"></i>Dettagli
                        </button>
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
            // Foto di default
            carouselContainer.html(`
                <div class="immersive-carousel" 
                     style="height: 300px;" 
                     data-autoplay="true" 
                     data-autoplay-delay="4000"
                     data-show-arrows="true" 
                     data-show-dots="true"
                     data-enable-hover="true"
                     data-enable-keyboard="true"
                     data-enable-touch="true">
                    <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop" 
                         alt="${this.currentSpace.name}" 
                         loading="lazy">
                </div>
            `);
        } else {
            // Crea il carosello immersivo con le foto senza overlay
            const carouselHtml = photos.map((photo, index) =>
                `<img src="${photo.url}" 
                     alt="${photo.alt || this.currentSpace.name}" 
                     loading="lazy">`
            ).join('');

            carouselContainer.html(`
                <div class="immersive-carousel" 
                     style="height: 300px;" 
                     data-autoplay="true" 
                     data-autoplay-delay="4000"
                     data-show-arrows="true" 
                     data-show-dots="true"
                     data-enable-hover="true"
                     data-enable-keyboard="true"
                     data-enable-touch="true">
                    ${carouselHtml}
                </div>
            `);
        }

        // Reinizializza il carosello immersivo
        setTimeout(() => {
            if (window.ImmersiveCarousel) {
                new window.ImmersiveCarousel(carouselContainer.find('.immersive-carousel')[0], {
                    autoplay: true,
                    autoplayDelay: 4000,
                    showArrows: false,
                    showDots: true,
                    enableHover: true,
                    enableKeyboard: true,
                    enableTouch: true
                });
            }
        }, 100);
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
                    { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' },
                    { url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800' }
                ]
            },
            {
                id: '22222222-2222-2222-2222-222222222222',
                name: 'CoWork Roma Nord',
                address: 'Via del Corso 10, Roma',
                description: 'Sede moderna nel centro di Roma con spazi flessibili',
                services: ['WiFi', 'Caffè', 'Sala riunioni', 'Terrazza'],
                location_photos: [
                    { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800' }
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
