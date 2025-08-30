/**
 * API Locali per il Catalogo
 * Sostituisce Supabase con le nostre API locali
 */

class LocalAPI {
    constructor() {
        this.baseUrl = window.API_BASE || '/api';
    }

    /**
     * Headers per le richieste
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Esegue una richiesta GET
     */
    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Local API GET error:', error);
            throw error;
        }
    }

    /**
     * Esegue una richiesta POST
     */
    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Local API POST error:', error);
            throw error;
        }
    }

    /**
     * Esegue una richiesta PUT
     */
    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Local API PUT error:', error);
            throw error;
        }
    }

    /**
     * Esegue una richiesta DELETE
     */
    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Local API DELETE error:', error);
            throw error;
        }
    }
}

/**
 * Wrapper per le API del Catalogo
 * Fornisce un'interfaccia compatibile con il sistema esistente
 */
class CoWorkSpaceAPI {
    constructor() {
        this.api = new LocalAPI();
    }

    /**
     * Ottiene tutte le sedi (pubbliche)
     */
    async getMyLocations() {
        try {
            const sedi = await this.api.get('/sedi');

            // Trasforma i dati per essere compatibili con il formato atteso
            return sedi.map(sede => ({
                id: sede.id_sede,
                name: sede.nome,
                address: `${sede.indirizzo}, ${sede.citta}`,
                city: sede.citta,
                description: sede.descrizione || '',
                created_at: new Date().toISOString(),
                location_photos: this.getDefaultPhotos(sede.nome)
            }));
        } catch (error) {
            console.error('Errore nel caricamento delle sedi:', error);
            // Restituisci dati di fallback
            return this.getFallbackLocations();
        }
    }

    /**
     * Ottiene gli spazi per una sede specifica
     */
    async getSpacesByLocation(locationId) {
        try {
            const spazi = await this.api.get(`/sedi/${locationId}/spazi`);

            // Trasforma i dati per essere compatibili
            return spazi.map(spazio => ({
                id: spazio.id_spazio,
                name: spazio.nome,
                type: spazio.tipologia,
                capacity: spazio.capienza,
                description: spazio.descrizione || '',
                location_id: locationId,
                created_at: new Date().toISOString(),
                space_photos: this.getDefaultSpacePhotos(spazio.tipologia),
                location: {
                    id: locationId,
                    name: 'Sede'
                }
            }));
        } catch (error) {
            console.error('Errore nel caricamento degli spazi:', error);
            return [];
        }
    }

    /**
     * Ottiene i servizi disponibili
     */
    async getServices() {
        try {
            const servizi = await this.api.get('/servizi');

            return servizi.map(servizio => ({
                id: servizio.id_servizio,
                name: servizio.nome,
                description: servizio.descrizione || ''
            }));
        } catch (error) {
            console.error('Errore nel caricamento dei servizi:', error);
            return this.getFallbackServices();
        }
    }

    /**
     * Ottiene i servizi per uno spazio specifico
     */
    async getSpaceServices(spaceId) {
        try {
            const servizi = await this.api.get(`/spazi/${spaceId}/servizi`);
            return servizi;
        } catch (error) {
            console.error('Errore nel caricamento dei servizi dello spazio:', error);
            return [];
        }
    }

    /**
     * Genera foto di default per le sedi
     */
    getDefaultPhotos(sedeName) {
        const baseImages = [
            'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop'
        ];

        return baseImages.map((url, index) => ({
            id: index + 1,
            url: url,
            alt: `${sedeName} - Immagine ${index + 1}`,
            is_primary: index === 0
        }));
    }

    /**
     * Genera foto di default per gli spazi
     */
    getDefaultSpacePhotos(tipologia) {
        const imageSets = {
            'stanza privata': [
                'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop'
            ],
            'postazione': [
                'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop'
            ],
            'sala riunioni': [
                'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop'
            ]
        };

        const images = imageSets[tipologia] || imageSets['postazione'];

        return images.map((url, index) => ({
            id: index + 1,
            url: url,
            alt: `${tipologia} - Immagine ${index + 1}`,
            is_primary: index === 0
        }));
    }

    /**
     * Dati di fallback per le sedi
     */
    getFallbackLocations() {
        return [
            {
                id: '1',
                name: 'Sede Milano Centro',
                address: 'Via Roma 123, Milano',
                city: 'Milano',
                description: 'Spazio moderno nel cuore di Milano con ambienti di lavoro contemporanei',
                created_at: new Date().toISOString(),
                location_photos: this.getDefaultPhotos('Sede Milano Centro')
            },
            {
                id: '2',
                name: 'Sede Roma Termini',
                address: 'Via Nazionale 456, Roma',
                city: 'Roma',
                description: 'Ambiente contemporaneo a Roma con servizi all\'avanguardia',
                created_at: new Date().toISOString(),
                location_photos: this.getDefaultPhotos('Sede Roma Termini')
            },
            {
                id: '3',
                name: 'Sede Firenze Centro',
                address: 'Via del Duomo 789, Firenze',
                city: 'Firenze',
                description: 'Spazio elegante nel centro storico di Firenze',
                created_at: new Date().toISOString(),
                location_photos: this.getDefaultPhotos('Sede Firenze Centro')
            }
        ];
    }

    /**
     * Dati di fallback per i servizi
     */
    getFallbackServices() {
        return [
            {
                id: 1,
                name: 'WiFi Premium',
                description: 'Connessione internet ad alta velocità'
            },
            {
                id: 2,
                name: 'Caffè e Snack',
                description: 'Area relax con caffè e snack gratuiti'
            },
            {
                id: 3,
                name: 'Parcheggio',
                description: 'Posti auto riservati per i membri'
            },
            {
                id: 4,
                name: 'Sala Riunioni',
                description: 'Spazi per meeting e presentazioni'
            },
            {
                id: 5,
                name: 'Stampante',
                description: 'Servizio di stampa e fotocopie'
            }
        ];
    }
}

// Inizializza l'API globale
window.coworkspaceAPI = new CoWorkSpaceAPI();

// Export per uso modulare
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocalAPI, CoWorkSpaceAPI };
}
