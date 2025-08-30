/**
 * Wrapper jQuery/Ajax per Supabase
 * Fornisce un'interfaccia semplice per le operazioni CRUD
 */

class SupabaseClient {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.url;
        this.apiKey = config.anonKey;
        this.serviceKey = config.serviceKey; // Solo per operazioni server-side
    }

    /**
     * Headers di autenticazione
     */
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
        };

        if (includeAuth) {
            const token = localStorage.getItem('supabase_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    /**
     * Esegue una query GET
     */
    async get(table, options = {}) {
        const url = new URL(`${this.baseUrl}/rest/v1/${table}`);

        // Aggiungi parametri di query
        if (options.select) {
            url.searchParams.append('select', options.select);
        }
        if (options.filter) {
            Object.entries(options.filter).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }
        if (options.order) {
            url.searchParams.append('order', options.order);
        }
        if (options.limit) {
            url.searchParams.append('limit', options.limit);
        }
        if (options.offset) {
            url.searchParams.append('offset', options.offset);
        }

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Supabase GET error:', error);
            throw error;
        }
    }

    /**
     * Esegue una query POST
     */
    async post(table, data) {
        try {
            const response = await fetch(`${this.baseUrl}/rest/v1/${table}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Supabase POST error:', error);
            throw error;
        }
    }

    /**
     * Esegue una query PATCH
     */
    async patch(table, id, data) {
        try {
            const response = await fetch(`${this.baseUrl}/rest/v1/${table}?id=eq.${id}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Supabase PATCH error:', error);
            throw error;
        }
    }

    /**
     * Esegue una query DELETE
     */
    async delete(table, id) {
        try {
            const response = await fetch(`${this.baseUrl}/rest/v1/${table}?id=eq.${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Supabase DELETE error:', error);
            throw error;
        }
    }

    /**
     * Upload file a Supabase Storage
     */
    async uploadFile(bucket, path, file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${path}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Supabase upload error:', error);
            throw error;
        }
    }

    /**
     * Ottiene URL pubblico per un file
     */
    getPublicUrl(bucket, path) {
        return `${this.baseUrl}/storage/v1/object/public/${bucket}/${path}`;
    }

    /**
     * Crea un client Realtime per aggiornamenti in tempo reale
     */
    createRealtimeClient() {
        return new SupabaseRealtimeClient(this.config);
    }
}

/**
 * Client Realtime per Supabase
 */
class SupabaseRealtimeClient {
    constructor(config) {
        this.config = config;
        this.socket = null;
        this.subscriptions = new Map();
    }

    /**
     * Si connette al canale Realtime
     */
    connect() {
        if (this.socket) {
            return;
        }

        const wsUrl = this.config.url.replace('https://', 'wss://').replace('http://', 'ws://');
        this.socket = new WebSocket(`${wsUrl}/realtime/v1/websocket?apikey=${this.config.anonKey}`);

        this.socket.onopen = () => {
            console.log('Supabase Realtime connected');
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.socket.onclose = () => {
            console.log('Supabase Realtime disconnected');
            this.socket = null;
        };

        this.socket.onerror = (error) => {
            console.error('Supabase Realtime error:', error);
        };
    }

    /**
     * Gestisce i messaggi in arrivo
     */
    handleMessage(data) {
        if (data.event === 'postgres_changes') {
            const subscription = this.subscriptions.get(data.topic);
            if (subscription) {
                subscription.callback(data);
            }
        }
    }

    /**
     * Sottoscrive ai cambiamenti di una tabella
     */
    subscribe(table, callback) {
        const topic = `realtime:${table}`;

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                topic,
                event: 'phx_join',
                payload: {},
                ref: Date.now()
            }));

            this.subscriptions.set(topic, { callback });
        }

        return {
            unsubscribe: () => {
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({
                        topic,
                        event: 'phx_leave',
                        payload: {},
                        ref: Date.now()
                    }));
                }
                this.subscriptions.delete(topic);
            }
        };
    }

    /**
     * Disconnette il client
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.subscriptions.clear();
    }
}

/**
 * API helper per CoWorkSpace
 */
class CoWorkSpaceAPI {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Ottiene le sedi dell'utente corrente
     */
    async getMyLocations() {
        return await this.supabase.get('locations', {
            select: '*, location_photos(*)',
            order: 'created_at.desc'
        });
    }

    /**
     * Ottiene tutti gli spazi di una sede
     */
    async getSpacesByLocation(locationId) {
        return await this.supabase.get('spaces', {
            select: '*, space_photos(*), location:locations(*)',
            filter: { 'location_id': `eq.${locationId}` },
            order: 'created_at.desc'
        });
    }

    /**
     * Ottiene le prenotazioni per uno spazio
     */
    async getReservationsBySpace(spaceId, startDate, endDate) {
        const filter = {
            'space_id': `eq.${spaceId}`,
            'start_at': `gte.${startDate}`,
            'end_at': `lte.${endDate}`
        };

        return await this.supabase.get('reservations', {
            select: '*, space:spaces(*), user:profiles(*)',
            filter,
            order: 'start_at.asc'
        });
    }

    /**
     * Crea una nuova sede
     */
    async createLocation(locationData) {
        return await this.supabase.post('locations', locationData);
    }

    /**
     * Aggiorna una sede
     */
    async updateLocation(locationId, locationData) {
        return await this.supabase.patch('locations', locationId, locationData);
    }

    /**
     * Elimina una sede
     */
    async deleteLocation(locationId) {
        return await this.supabase.delete('locations', locationId);
    }

    /**
     * Crea un nuovo spazio
     */
    async createSpace(spaceData) {
        return await this.supabase.post('spaces', spaceData);
    }

    /**
     * Aggiorna uno spazio
     */
    async updateSpace(spaceId, spaceData) {
        return await this.supabase.patch('spaces', spaceId, spaceData);
    }

    /**
     * Elimina uno spazio
     */
    async deleteSpace(spaceId) {
        return await this.supabase.delete('spaces', spaceId);
    }

    /**
     * Crea una nuova prenotazione
     */
    async createReservation(reservationData) {
        return await this.supabase.post('reservations', reservationData);
    }

    /**
     * Aggiorna una prenotazione
     */
    async updateReservation(reservationId, reservationData) {
        return await this.supabase.patch('reservations', reservationId, reservationData);
    }

    /**
     * Elimina una prenotazione
     */
    async deleteReservation(reservationId) {
        return await this.supabase.delete('reservations', reservationId);
    }

    /**
     * Upload foto per una sede
     */
    async uploadLocationPhoto(locationId, file, sortOrder = 0) {
        const path = `locations/${locationId}/${Date.now()}-${file.name}`;
        await this.supabase.uploadFile('photos', path, file);

        return await this.supabase.post('location_photos', {
            location_id: locationId,
            url: this.supabase.getPublicUrl('photos', path),
            sort_order: sortOrder
        });
    }

    /**
     * Upload foto per uno spazio
     */
    async uploadSpacePhoto(spaceId, file, sortOrder = 0) {
        const path = `spaces/${spaceId}/${Date.now()}-${file.name}`;
        await this.supabase.uploadFile('photos', path, file);

        return await this.supabase.post('space_photos', {
            space_id: spaceId,
            url: this.supabase.getPublicUrl('photos', path),
            sort_order: sortOrder
        });
    }

    /**
     * Elimina una foto
     */
    async deletePhoto(photoId, parentType) {
        const table = parentType === 'location' ? 'location_photos' : 'space_photos';
        return await this.supabase.delete(table, photoId);
    }

    /**
     * Aggiorna l'ordine delle foto
     */
    async updatePhotoOrder(photoId, sortOrder, parentType) {
        const table = parentType === 'location' ? 'location_photos' : 'space_photos';
        return await this.supabase.patch(table, photoId, { sort_order: sortOrder });
    }
}

// Inizializza il client Supabase
function initializeSupabase() {
    const config = {
        url: window.CONFIG?.SUPABASE_URL || 'https://your-project.supabase.co',
        anonKey: window.CONFIG?.SUPABASE_ANON_KEY || 'your-anon-key',
        serviceKey: window.CONFIG?.SUPABASE_SERVICE_KEY || 'your-service-key'
    };

    const supabaseClient = new SupabaseClient(config);
    const api = new CoWorkSpaceAPI(supabaseClient);

    // Esponi globalmente
    window.supabase = supabaseClient;
    window.coworkspaceAPI = api;

    return { supabaseClient, api };
}

// Auto-inizializza quando il DOM è pronto
$(document).ready(function () {
    if (window.CONFIG) {
        initializeSupabase();
    } else {
        console.warn('CONFIG non disponibile, Supabase non inizializzato');
    }
});

// Esporta per uso modulare
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SupabaseClient,
        SupabaseRealtimeClient,
        CoWorkSpaceAPI,
        initializeSupabase
    };
}
