/**
 * Contratti JavaScript per CoWorkSpace
 * Tipi di dati per il nuovo schema con gestione sedi, spazi e foto
 */

// Tipi di ruolo utente
const AppRole = {
    USER: 'user',
    GESTORE: 'gestore',
    AMMINISTRATORE: 'amministratore'
};

// Tipi di prenotazione
const ReservationKind = {
    BOOKING: 'booking',
    OCCUPAZIONE: 'occupazione'
};

// Stati prenotazione
const ReservationStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled'
};

// Tipi di foto
const PhotoParent = {
    LOCATION: 'location',
    SPACE: 'space'
};

/**
 * Profilo utente
 * @typedef {Object} Profile
 * @property {string} id - UUID del profilo
 * @property {string} role - Ruolo dell'utente (user, gestore, amministratore)
 * @property {string} full_name - Nome completo
 * @property {string} created_at - Data di creazione
 */

/**
 * Sede di coworking
 * @typedef {Object} Location
 * @property {string} id - UUID della sede
 * @property {string} name - Nome della sede
 * @property {string} address - Indirizzo
 * @property {string} description - Descrizione
 * @property {string[]} services - Array di servizi disponibili
 * @property {string} admin_id - UUID dell'amministratore proprietario
 * @property {string} created_at - Data di creazione
 * @property {LocationPhoto[]} photos - Foto della sede
 */

/**
 * Spazio all'interno di una sede
 * @typedef {Object} Space
 * @property {string} id - UUID dello spazio
 * @property {string} location_id - UUID della sede di appartenenza
 * @property {string} name - Nome dello spazio
 * @property {string} description - Descrizione
 * @property {number} capacity - Capacità massima
 * @property {string[]} amenities - Array di amenities disponibili
 * @property {string} created_at - Data di creazione
 * @property {SpacePhoto[]} photos - Foto dello spazio
 * @property {Location} location - Dati della sede (popolato in join)
 */

/**
 * Foto di una sede
 * @typedef {Object} LocationPhoto
 * @property {string} id - UUID della foto
 * @property {string} location_id - UUID della sede
 * @property {string} url - URL della foto
 * @property {number} sort_order - Ordine di visualizzazione
 * @property {string} created_at - Data di creazione
 */

/**
 * Foto di uno spazio
 * @typedef {Object} SpacePhoto
 * @property {string} id - UUID della foto
 * @property {string} space_id - UUID dello spazio
 * @property {string} url - URL della foto
 * @property {number} sort_order - Ordine di visualizzazione
 * @property {string} created_at - Data di creazione
 */

/**
 * Prenotazione o occupazione
 * @typedef {Object} Reservation
 * @property {string} id - UUID della prenotazione
 * @property {string} kind - Tipo (booking o occupazione)
 * @property {string} status - Stato (active o cancelled)
 * @property {string} space_id - UUID dello spazio
 * @property {string} user_id - UUID dell'utente
 * @property {string} start_at - Data/ora inizio
 * @property {string} end_at - Data/ora fine
 * @property {string} notes - Note aggiuntive
 * @property {string} created_at - Data di creazione
 * @property {Space} space - Dati dello spazio (popolato in join)
 * @property {Profile} user - Dati dell'utente (popolato in join)
 */

/**
 * Disponibilità di uno spazio
 * @typedef {Object} SpaceAvailability
 * @property {string} space_id - UUID dello spazio
 * @property {boolean} is_booked_now - Se è prenotato ora
 * @property {boolean} is_occupied_now - Se è occupato ora
 */

/**
 * Risposta API standard
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Se l'operazione è riuscita
 * @property {*} data - Dati della risposta
 * @property {string} message - Messaggio di risposta
 * @property {string} error - Eventuale errore
 */

/**
 * Filtri per la ricerca sedi
 * @typedef {Object} LocationFilters
 * @property {string} city - Città
 * @property {string} service - Servizio specifico
 * @property {string} search - Testo di ricerca
 */

/**
 * Filtri per la ricerca spazi
 * @typedef {Object} SpaceFilters
 * @property {string} location_id - UUID della sede
 * @property {string} amenity - Amenity specifica
 * @property {number} min_capacity - Capacità minima
 * @property {number} max_capacity - Capacità massima
 */

/**
 * Filtri per le prenotazioni
 * @typedef {Object} ReservationFilters
 * @property {string} space_id - UUID dello spazio
 * @property {string} user_id - UUID dell'utente
 * @property {string} kind - Tipo di prenotazione
 * @property {string} status - Stato della prenotazione
 * @property {string} start_date - Data inizio (ISO string)
 * @property {string} end_date - Data fine (ISO string)
 */

/**
 * Dati per creare una nuova sede
 * @typedef {Object} CreateLocationData
 * @property {string} name - Nome della sede
 * @property {string} address - Indirizzo
 * @property {string} description - Descrizione
 * @property {string[]} services - Array di servizi
 */

/**
 * Dati per creare un nuovo spazio
 * @typedef {Object} CreateSpaceData
 * @property {string} location_id - UUID della sede
 * @property {string} name - Nome dello spazio
 * @property {string} description - Descrizione
 * @property {number} capacity - Capacità
 * @property {string[]} amenities - Array di amenities
 */

/**
 * Dati per creare una nuova prenotazione
 * @typedef {Object} CreateReservationData
 * @property {string} kind - Tipo (booking o occupazione)
 * @property {string} space_id - UUID dello spazio
 * @property {string} start_at - Data/ora inizio (ISO string)
 * @property {string} end_at - Data/ora fine (ISO string)
 * @property {string} notes - Note aggiuntive
 */

/**
 * Dati per l'upload di una foto
 * @typedef {Object} UploadPhotoData
 * @property {string} parent_type - Tipo (location o space)
 * @property {string} parent_id - UUID del parent
 * @property {File} file - File della foto
 * @property {number} sort_order - Ordine di visualizzazione
 */

/**
 * Configurazione del calendario
 * @typedef {Object} CalendarConfig
 * @property {string} view - Vista (day, week, month)
 * @property {Date} current_date - Data corrente
 * @property {string} space_id - UUID dello spazio (opzionale)
 * @property {string} location_id - UUID della sede (opzionale)
 */

/**
 * Evento del calendario
 * @typedef {Object} CalendarEvent
 * @property {string} id - UUID dell'evento
 * @property {string} title - Titolo dell'evento
 * @property {Date} start - Data/ora inizio
 * @property {Date} end - Data/ora fine
 * @property {string} type - Tipo (booking, occupazione)
 * @property {string} status - Stato
 * @property {string} color - Colore per la visualizzazione
 * @property {Reservation} reservation - Dati della prenotazione
 */

// Esporta i tipi per uso globale
window.CoWorkSpaceTypes = {
    AppRole,
    ReservationKind,
    ReservationStatus,
    PhotoParent
};

// Esporta anche le costanti per compatibilità
window.AppRole = AppRole;
window.ReservationKind = ReservationKind;
window.ReservationStatus = ReservationStatus;
window.PhotoParent = PhotoParent;
