# 🔌 Documentazione API CoworkSpace v2.0

## 📋 Panoramica

La documentazione completa delle API di CoworkSpace v2.0 è disponibile in formato **Swagger/OpenAPI 3.0** nel file [`swagger.yaml`](swagger.yaml).

## 🚀 Come Utilizzare la Documentazione

### 1. Swagger UI Online

1. Vai su [Swagger Editor](https://editor.swagger.io/)
2. Copia il contenuto del file `swagger.yaml`
3. Incolla nel pannello sinistro
4. Visualizza la documentazione interattiva nel pannello destro

### 2. Swagger UI Locale

```bash
# Installa Swagger UI
npm install -g swagger-ui-express

# Avvia server locale
swagger-ui-express swagger.yaml
```

### 3. Postman Collection

1. Apri Postman
2. Vai su "Import" → "Link"
3. Inserisci l'URL del file swagger.yaml
4. Postman genererà automaticamente una collection con tutti gli endpoint

## 📚 Struttura API

### 🔐 Autenticazione

Il sistema utilizza **JWT (JSON Web Tokens)** per l'autenticazione:

```bash
# Header per richieste autenticate
Authorization: Bearer <your-jwt-token>
```

### 📡 Endpoint Principali

#### Autenticazione
- `POST /api/auth/register` - Registrazione nuovo utente
- `POST /api/auth/login` - Login utente

#### Gestione Slot
- `GET /api/slots/{idSpazio}/{date}` - Stato slot per spazio e data
- `POST /api/slots/{id}/hold` - Occupa slot temporaneamente
- `POST /api/slots/{id}/book` - Conferma prenotazione
- `POST /api/slots/{id}/release` - Rilascia slot

#### Prenotazioni
- `GET /api/prenotazioni` - Lista prenotazioni utente
- `POST /api/prenotazioni` - Crea nuova prenotazione
- `GET /api/prenotazioni/{id}` - Dettagli prenotazione
- `DELETE /api/prenotazioni/{id}` - Cancella prenotazione

#### Spazi e Sedi
- `GET /api/spazi` - Lista spazi disponibili
- `GET /api/sedi` - Lista sedi

#### Pagamenti
- `POST /api/pagamenti/create-payment-intent` - Crea intent di pagamento

#### Amministrazione
- `GET /api/admin/dashboard` - Dashboard amministratore

## 🔄 Real-time Communication

### Socket.IO Events

Il sistema supporta comunicazione real-time tramite Socket.IO:

#### Client → Server
```javascript
// Entra in room spazio
socket.emit('join_space', { spazioId: 1 });

// Esce da room spazio
socket.emit('leave_space', { spazioId: 1 });
```

#### Server → Client
```javascript
// Ascolta aggiornamenti slot
socket.on('slot_update', (data) => {
    console.log('Slot aggiornato:', data.slot);
});

// Ascolta slot liberati automaticamente
socket.on('slots_freed', (data) => {
    console.log('Slot liberati:', data.slotIds);
});

// Conferma connessione
socket.on('connection_confirmed', (data) => {
    console.log('Connessione confermata:', data.message);
});
```

## 🧪 Testing delle API

### Esempi cURL

#### Registrazione Utente
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "mario@example.com",
    "password": "password123",
    "ruolo": "utente",
    "telefono": "+39 123 456 7890"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mario@example.com",
    "password": "password123"
  }'
```

#### Ottieni Slot
```bash
curl http://localhost:3001/api/slots/1/2024-01-15
```

#### Prenota Slot (con autenticazione)
```bash
curl -X POST http://localhost:3001/api/slots/1/book \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript Client

```javascript
// Esempio di client JavaScript
const apiClient = {
    baseURL: 'http://localhost:3001/api',
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        const response = await fetch(url, config);
        return response.json();
    },
    
    // Autenticazione
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    // Gestione slot
    async getSlots(spazioId, date) {
        return this.request(`/slots/${spazioId}/${date}`);
    },
    
    async holdSlot(slotId, token) {
        return this.request(`/slots/${slotId}/hold`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    },
    
    async bookSlot(slotId, token) {
        return this.request(`/slots/${slotId}/book`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    },
    
    // Prenotazioni
    async getPrenotazioni(token, filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/prenotazioni?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    },
    
    async createPrenotazione(prenotazioneData, token) {
        return this.request('/prenotazioni', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(prenotazioneData)
        });
    }
};

// Esempio di utilizzo
async function example() {
    try {
        // Login
        const loginResponse = await apiClient.login('user@example.com', 'password123');
        const token = loginResponse.token;
        
        // Ottieni slot
        const slots = await apiClient.getSlots(1, '2024-01-15');
        console.log('Slot disponibili:', slots);
        
        // Occupa slot
        const holdResponse = await apiClient.holdSlot(1, token);
        console.log('Slot occupato:', holdResponse);
        
        // Conferma prenotazione
        const bookResponse = await apiClient.bookSlot(1, token);
        console.log('Prenotazione confermata:', bookResponse);
        
    } catch (error) {
        console.error('Errore:', error);
    }
}
```

## 📊 Codici di Risposta

### Success Codes
- `200 OK` - Richiesta completata con successo
- `201 Created` - Risorsa creata con successo

### Error Codes
- `400 Bad Request` - Dati invalidi o mancanti
- `401 Unauthorized` - Token mancante o invalido
- `403 Forbidden` - Accesso negato
- `404 Not Found` - Risorsa non trovata
- `409 Conflict` - Conflitto (es. email già registrata)
- `500 Internal Server Error` - Errore server

## 🔒 Sicurezza

### Autenticazione JWT
- Token con scadenza (24 ore)
- Refresh token per rinnovo automatico
- Blacklist per token revocati

### Rate Limiting
- Limite richieste per IP
- Protezione da brute force
- Throttling per endpoint sensibili

### Input Validation
- Validazione lato server per tutti gli input
- Sanitizzazione dati
- Protezione da SQL injection

## 📈 Performance

### Caching
- Redis per query pesanti
- Cache TTL di 5 minuti
- Cache invalidation automatica

### Ottimizzazioni
- Query parametrizzate
- Indici database ottimizzati
- Connection pooling

## 🚀 Deployment

### Sviluppo Locale
```bash
# URL base
http://localhost:3001/api
```

### Produzione
```bash
# URL base
https://coworkspace.onrender.com/api
```

## 📞 Supporto

- **Documentazione Swagger**: [`swagger.yaml`](swagger.yaml)
- **Documentazione Completa**: [`DOCUMENTAZIONE_COMPLETA.md`](DOCUMENTAZIONE_COMPLETA.md)
- **Issues**: Apri issue su GitHub
- **Email**: support@coworkspace.com

---

**API Documentation CoworkSpace v2.0** - Documentazione completa e interattiva delle API 🔌
