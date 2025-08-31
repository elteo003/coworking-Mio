# 📚 Documentazione Completa CoworkSpace v2.0

## 🎯 Panoramica del Progetto

CoworkSpace v2.0 è un sistema completo per la gestione di spazi di coworking con funzionalità real-time avanzate, caching intelligente e architettura scalabile. Il sistema permette agli utenti di prenotare spazi di lavoro, sale riunioni e uffici privati con un'interfaccia moderna e intuitiva.

### 🏗️ Architettura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Vanilla JS)  │◄──►│   (Express.js)  │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • Socket.IO     │    │ • Socket.IO     │    │ • Slots Table   │
│ • Optimistic UI │    │ • Redis Cache   │    │ • Expires_at    │
│ • Real-time     │    │ • JWT Auth      │    │ • Triggers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │                 │
                       │ • Cache Layer   │
                       │ • Pub/Sub       │
                       │ • Session Store │
                       └─────────────────┘
```

---

## 🖥️ Frontend

### Tecnologie Utilizzate

- **HTML5/CSS3**: Struttura semantica e stili moderni
- **Vanilla JavaScript**: Moduli modulari e performanti
- **Socket.IO Client**: Comunicazione real-time bidirezionale
- **Bootstrap 5**: Framework CSS per UI components
- **Font Awesome**: Icone e simboli grafici

### Struttura del Frontend

```
frontend/
├── public/
│   ├── index.html              # Pagina principale
│   ├── login.html              # Pagina di login
│   ├── dashboard.html          # Dashboard utente
│   ├── dashboard-amministratore.html  # Dashboard admin
│   ├── dashboard-gestori.html # Dashboard gestori
│   ├── selezione-slot.html     # Selezione slot
│   ├── pagamento.html          # Pagina pagamenti
│   ├── catalogo.html           # Catalogo spazi
│   ├── eventi.html             # Eventi e news
│   ├── css/
│   │   ├── style.css           # Stili principali
│   │   ├── modern-design.css   # Design moderno
│   │   ├── dashboard-*.css     # Stili dashboard
│   │   ├── catalog.css         # Stili catalogo
│   │   └── selezione-slot.css  # Stili selezione slot
│   └── js/
│       ├── auth.js             # Gestione autenticazione
│       ├── socket.js           # Gestione Socket.IO
│       ├── slots.js            # Gestione slot
│       ├── dashboard.js        # Logica dashboard
│       ├── payment.js          # Integrazione pagamenti
│       └── utils.js             # Utility comuni
```

### Caratteristiche Principali

#### 🔄 Optimistic UI System
Il frontend implementa un sistema di UI ottimistica che fornisce feedback immediato all'utente:

```javascript
// Esempio di UI ottimistica per prenotazione slot
function bookSlotOptimistic(slotId) {
    // Aggiorna UI immediatamente
    updateSlotUI(slotId, 'booked');
    
    // Invia richiesta al server
    fetch(`/api/slots/${slotId}/book`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) {
            // Rollback in caso di errore
            updateSlotUI(slotId, 'available');
            showError('Errore durante la prenotazione');
        }
    });
}
```

#### 📡 Real-time Communication
Socket.IO per aggiornamenti istantanei:

```javascript
// Connessione Socket.IO
const socket = io('http://localhost:3001');

// Ascolta aggiornamenti slot
socket.on('slot_update', (data) => {
    updateSlotDisplay(data.slot);
});

// Ascolta slot liberati automaticamente
socket.on('slots_freed', (data) => {
    data.slotIds.forEach(slotId => {
        updateSlotDisplay({ id_slot: slotId, stato: 'available' });
    });
});
```

#### 🎨 Design System
- **Responsive Design**: Ottimizzato per desktop, tablet e mobile
- **Dark/Light Mode**: Supporto per temi chiari e scuri
- **Accessibilità**: Conformità WCAG 2.1
- **Performance**: Lazy loading e code splitting

### Pagine Principali

#### 1. Homepage (`index.html`)
- Presentazione del servizio
- Call-to-action per registrazione
- Informazioni sui servizi offerti

#### 2. Login (`login.html`)
- Form di autenticazione
- Validazione client-side
- Gestione errori di login

#### 3. Dashboard (`dashboard.html`)
- Panoramica prenotazioni utente
- Statistiche personali
- Azioni rapide

#### 4. Selezione Slot (`selezione-slot.html`)
- Visualizzazione calendario slot
- Selezione data e ora
- Conferma prenotazione

#### 5. Pagamento (`pagamento.html`)
- Integrazione Stripe
- Gestione metodi di pagamento
- Conferma transazione

---

## ⚙️ Backend

### Tecnologie Utilizzate

- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web
- **Socket.IO**: Comunicazione real-time
- **Redis**: Caching e Pub/Sub
- **JWT**: Autenticazione stateless
- **Stripe**: Pagamenti online
- **PostgreSQL**: Database relazionale

### Struttura del Backend

```
backend/
├── src/
│   ├── app.js                 # Entry point applicazione
│   ├── db.js                  # Configurazione database
│   ├── controllers/           # Logica business
│   │   ├── authController.js  # Gestione autenticazione
│   │   ├── slotController.js  # Gestione slot
│   │   ├── prenotazioniController.js # Gestione prenotazioni
│   │   ├── pagamentiController.js # Gestione pagamenti
│   │   └── adminController.js # Gestione amministrazione
│   ├── middleware/            # Middleware Express
│   │   ├── auth.js           # Autenticazione JWT
│   │   ├── slotTimer.js      # Timer slot automatico
│   │   └── sseAuth.js        # Autenticazione SSE
│   ├── routes/               # Route API
│   │   ├── auth.js          # Route autenticazione
│   │   ├── slots.js         # Route slot
│   │   ├── prenotazioni.js  # Route prenotazioni
│   │   ├── pagamenti.js     # Route pagamenti
│   │   └── admin.js         # Route amministrazione
│   ├── services/            # Servizi esterni
│   │   ├── redisService.js  # Servizio Redis
│   │   ├── socketService.js # Servizio Socket.IO
│   │   └── slotTimerService.js # Timer automatico
│   └── config/              # Configurazioni
│       ├── jwt.js          # Configurazione JWT
│       └── stripe.js       # Configurazione Stripe
├── config/
│   ├── config.js           # Configurazione generale
│   ├── env.js              # Variabili ambiente
│   └── stripe.js           # Configurazione Stripe
└── package.json            # Dipendenze
```

### API Endpoints Principali

#### Autenticazione
```javascript
// Registrazione utente
POST /api/auth/register
{
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "mario@example.com",
  "password": "password123",
  "ruolo": "utente",
  "telefono": "+39 123 456 7890"
}

// Login utente
POST /api/auth/login
{
  "email": "mario@example.com",
  "password": "password123"
}
```

#### Gestione Slot
```javascript
// Ottieni stato slot per spazio e data
GET /api/slots/{idSpazio}/{date}

// Occupa temporaneamente slot
POST /api/slots/{id}/hold
Authorization: Bearer <token>

// Conferma prenotazione
POST /api/slots/{id}/book
Authorization: Bearer <token>

// Rilascia slot
POST /api/slots/{id}/release
Authorization: Bearer <token>
```

#### Prenotazioni
```javascript
// Crea prenotazione
POST /api/prenotazioni
{
  "id_spazio": 1,
  "data": "2024-01-15",
  "ora_inizio": "09:00",
  "ora_fine": "12:00"
}

// Ottieni prenotazioni utente
GET /api/prenotazioni?stato=confirmed&data_inizio=2024-01-01

// Cancella prenotazione
DELETE /api/prenotazioni/{id}
```

### Sistema di Caching Redis

```javascript
// Esempio di caching per query pesanti
async function getSpacesWithCache() {
    const cacheKey = 'spaces:all';
    
    // Prova a recuperare da cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Query database se non in cache
    const spaces = await pool.query('SELECT * FROM Spazio');
    
    // Salva in cache per 5 minuti
    await redis.setex(cacheKey, 300, JSON.stringify(spaces.rows));
    
    return spaces.rows;
}
```

### Sistema Timer Automatico

```javascript
// Timer per liberazione automatica slot scaduti
const slotTimerService = {
    async checkExpiredSlots() {
        const expiredSlots = await pool.query(`
            SELECT id_slot FROM Slot 
            WHERE stato = 'occupied' 
            AND expires_at < NOW()
        `);
        
        for (const slot of expiredSlots.rows) {
            await this.releaseSlot(slot.id_slot);
            // Notifica real-time
            io.emit('slots_freed', { slotIds: [slot.id_slot] });
        }
    }
};
```

### Integrazione Stripe

```javascript
// Creazione Payment Intent
app.post('/api/pagamenti/create-payment-intent', async (req, res) => {
    const { id_prenotazione, amount } = req.body;
    
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'eur',
            metadata: { prenotazione_id: id_prenotazione }
        });
        
        res.json({
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## 🗄️ Database

### Tecnologie Utilizzate

- **PostgreSQL 15+**: Database relazionale principale
- **Triggers**: Automazione database
- **Indici**: Ottimizzazione performance
- **Funzioni**: Logica business nel database
- **Viste**: Viste per query complesse

### Schema del Database

#### Tabelle Principali

```sql
-- Tabella Utenti
CREATE TABLE Utente (
    id_utente SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    ruolo VARCHAR(20) NOT NULL CHECK (ruolo IN ('utente', 'gestore', 'amministratore')),
    telefono VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Sedi
CREATE TABLE Sede (
    id_sede SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    indirizzo TEXT NOT NULL,
    citta VARCHAR(100) NOT NULL,
    cap VARCHAR(10),
    telefono VARCHAR(20)
);

-- Tabella Spazi
CREATE TABLE Spazio (
    id_spazio SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT,
    id_sede INTEGER REFERENCES Sede(id_sede),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('sala_riunioni', 'postazione_lavoro', 'ufficio_privato')),
    prezzo_ora DECIMAL(10,2) NOT NULL,
    capacita INTEGER DEFAULT 1
);

-- Tabella Slot
CREATE TABLE Slot (
    id_slot SERIAL PRIMARY KEY,
    id_spazio INTEGER REFERENCES Spazio(id_spazio),
    data DATE NOT NULL,
    ora_inizio TIME NOT NULL,
    ora_fine TIME NOT NULL,
    stato VARCHAR(20) DEFAULT 'available' CHECK (stato IN ('available', 'occupied', 'booked', 'expired')),
    id_utente INTEGER REFERENCES Utente(id_utente),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Prenotazioni
CREATE TABLE Prenotazione (
    id_prenotazione SERIAL PRIMARY KEY,
    id_utente INTEGER REFERENCES Utente(id_utente),
    id_spazio INTEGER REFERENCES Spazio(id_spazio),
    data DATE NOT NULL,
    ora_inizio TIME NOT NULL,
    ora_fine TIME NOT NULL,
    stato VARCHAR(20) DEFAULT 'pending' CHECK (stato IN ('pending', 'confirmed', 'cancelled', 'suspended')),
    prezzo DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Pagamenti
CREATE TABLE Pagamento (
    id_pagamento SERIAL PRIMARY KEY,
    id_prenotazione INTEGER REFERENCES Prenotazione(id_prenotazione),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Indici per Performance

```sql
-- Indici per ottimizzare query frequenti
CREATE INDEX idx_slot_spazio_data ON Slot(id_spazio, data);
CREATE INDEX idx_slot_stato ON Slot(stato);
CREATE INDEX idx_slot_expires_at ON Slot(expires_at);
CREATE INDEX idx_prenotazione_utente ON Prenotazione(id_utente);
CREATE INDEX idx_prenotazione_data ON Prenotazione(data);
CREATE INDEX idx_prenotazione_stato ON Prenotazione(stato);
```

#### Trigger per Automazione

```sql
-- Trigger per aggiornare stato slot quando viene creata una prenotazione
CREATE OR REPLACE FUNCTION update_slot_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Slot 
    SET stato = 'booked', id_utente = NEW.id_utente
    WHERE id_spazio = NEW.id_spazio 
    AND data = NEW.data 
    AND ora_inizio = NEW.ora_inizio 
    AND ora_fine = NEW.ora_fine;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_slot_on_booking
    AFTER INSERT ON Prenotazione
    FOR EACH ROW
    EXECUTE FUNCTION update_slot_on_booking();
```

#### Funzioni Database

```sql
-- Funzione per liberare slot scaduti
CREATE OR REPLACE FUNCTION free_expired_slots()
RETURNS INTEGER AS $$
DECLARE
    freed_count INTEGER;
BEGIN
    UPDATE Slot 
    SET stato = 'available', id_utente = NULL, expires_at = NULL
    WHERE stato = 'occupied' AND expires_at < NOW();
    
    GET DIAGNOSTICS freed_count = ROW_COUNT;
    RETURN freed_count;
END;
$$ LANGUAGE plpgsql;

-- Funzione per calcolare occupazione
CREATE OR REPLACE FUNCTION calculate_occupancy_rate(
    p_spazio_id INTEGER,
    p_data_inizio DATE,
    p_data_fine DATE
)
RETURNS TABLE(data DATE, occupancy_rate DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.data,
        (COUNT(CASE WHEN s.stato = 'booked' THEN 1 END) * 100.0 / COUNT(*))::DECIMAL(5,2)
    FROM generate_series(p_data_inizio, p_data_fine, '1 day'::interval)::date AS s(data)
    LEFT JOIN Slot sl ON sl.id_spazio = p_spazio_id AND sl.data = s.data
    GROUP BY s.data
    ORDER BY s.data;
END;
$$ LANGUAGE plpgsql;
```

### Migrazioni Database

```sql
-- Migrazione per aggiungere campo expires_at
ALTER TABLE Slot ADD COLUMN expires_at TIMESTAMP;

-- Migrazione per aggiungere constraint
ALTER TABLE Prenotazione ADD CONSTRAINT check_prenotazione_time
CHECK (ora_fine > ora_inizio);

-- Migrazione per aggiungere indice
CREATE INDEX CONCURRENTLY idx_slot_composite 
ON Slot(id_spazio, data, stato);
```

---

## 🚀 Deployment e DevOps

### Tecnologie Utilizzate

- **Docker**: Containerizzazione
- **Docker Compose**: Orchestrazione locale
- **Render**: Platform as a Service
- **GitHub Actions**: CI/CD
- **Health Checks**: Monitoraggio servizi

### Configurazione Docker

#### Dockerfile Backend

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm ci --only=production

# Copia codice sorgente
COPY . .

# Esponi porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Comando di avvio
CMD ["npm", "start"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - REDIS_ENABLED=true
      - REDIS_URL=redis://redis:6379
      - PGUSER=postgres
      - PGHOST=postgres
      - PGDATABASE=coworkspace
      - PGPASSWORD=postgres
      - PGPORT=5432
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=coworkspace
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/migration-slots-system.sql:/docker-entrypoint-initdb.d/02-slots.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
```

### Deployment su Render

#### Configurazione Render

1. **Environment Variables**:
```bash
NODE_ENV=production
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-host:6379
JWT_SECRET=your-super-secret-jwt-key
PGUSER=postgres
PGHOST=your-postgres-host
PGDATABASE=coworkspace
PGPASSWORD=your-postgres-password
PGPORT=5432
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

2. **Build Command**:
```bash
npm install
```

3. **Start Command**:
```bash
npm start
```

4. **Health Check URL**:
```
/api/health
```

### Monitoraggio e Logging

#### Health Checks

```javascript
// Endpoint health check
app.get('/api/health', async (req, res) => {
    try {
        // Verifica connessione database
        await pool.query('SELECT 1');
        
        // Verifica connessione Redis (se abilitato)
        if (redisEnabled) {
            await redis.ping();
        }
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                redis: redisEnabled ? 'connected' : 'disabled'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});
```

#### Logging Strutturato

```javascript
// Configurazione logging
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'coworkspace-api' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}
```

### Sicurezza

#### Best Practices Implementate

1. **JWT Token Security**:
   - Token con scadenza (24 ore)
   - Refresh token per rinnovo automatico
   - Blacklist per token revocati

2. **Input Validation**:
   - Validazione lato server per tutti gli input
   - Sanitizzazione dati
   - Protezione da SQL injection

3. **Rate Limiting**:
   - Limite richieste per IP
   - Protezione da brute force
   - Throttling per endpoint sensibili

4. **CORS Configuration**:
   - Configurazione CORS specifica per dominio
   - Credentials support per autenticazione
   - Preflight requests gestiti

```javascript
// Configurazione CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // 5 tentativi
    message: 'Troppi tentativi di login, riprova più tardi'
});

app.use('/api/auth/login', authLimiter);
```

---

## 📊 Testing

### Strategia di Testing

#### Test Unitari
```javascript
// Test controller autenticazione
describe('AuthController', () => {
    test('should register new user', async () => {
        const userData = {
            nome: 'Test',
            cognome: 'User',
            email: 'test@example.com',
            password: 'password123',
            ruolo: 'utente'
        };
        
        const response = await request(app)
            .post('/api/auth/register')
            .send(userData);
        
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('token');
    });
});
```

#### Test di Integrazione
```javascript
// Test flusso prenotazione completo
describe('Booking Flow', () => {
    test('should complete booking process', async () => {
        // 1. Login
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'password123' });
        
        const token = loginResponse.body.token;
        
        // 2. Occupa slot
        const holdResponse = await request(app)
            .post('/api/slots/1/hold')
            .set('Authorization', `Bearer ${token}`);
        
        expect(holdResponse.status).toBe(200);
        
        // 3. Conferma prenotazione
        const bookResponse = await request(app)
            .post('/api/slots/1/book')
            .set('Authorization', `Bearer ${token}`);
        
        expect(bookResponse.status).toBe(200);
    });
});
```

#### Test di Performance
```javascript
// Test performance endpoint slot
describe('Slots Performance', () => {
    test('should respond within 200ms', async () => {
        const startTime = Date.now();
        
        await request(app)
            .get('/api/slots/1/2024-01-15');
        
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(200);
    });
});
```

### Test Manuali

#### Checklist Test Funzionali

- [ ] Registrazione nuovo utente
- [ ] Login con credenziali valide
- [ ] Login con credenziali invalide
- [ ] Visualizzazione slot disponibili
- [ ] Occupazione temporanea slot
- [ ] Conferma prenotazione
- [ ] Rilascio slot
- [ ] Pagamento con Stripe
- [ ] Visualizzazione prenotazioni
- [ ] Cancellazione prenotazione

#### Test Real-time

```javascript
// Test Socket.IO connection
const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('Connected to server');
    
    // Test join space
    socket.emit('join_space', { spazioId: 1 });
});

socket.on('slot_update', (data) => {
    console.log('Slot updated:', data);
});

socket.on('slots_freed', (data) => {
    console.log('Slots freed:', data);
});
```

---

## 🔧 Configurazione e Setup

### Variabili Ambiente

#### Sviluppo Locale
```bash
# Database
PGUSER=postgres
PGHOST=localhost
PGDATABASE=coworkspace
PGPASSWORD=postgres
PGPORT=5432

# Redis
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-dev

# Server
PORT=3001
NODE_ENV=development

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

#### Produzione
```bash
# Database
PGUSER=postgres
PGHOST=your-postgres-host
PGDATABASE=coworkspace
PGPASSWORD=your-secure-password
PGPORT=5432

# Redis
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-host:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-prod

# Server
PORT=3001
NODE_ENV=production

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Setup Locale

#### Prerequisiti
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (opzionale)
- Docker & Docker Compose (opzionale)

#### Setup Manuale

1. **Clone Repository**:
```bash
git clone <repository-url>
cd coworkspace
```

2. **Setup Database**:
```bash
# Crea database
createdb coworkspace

# Esegui migrazioni
psql coworkspace < database/schema.sql
psql coworkspace < database/migration-slots-system.sql
psql coworkspace < database/add-expires-at-field.sql
```

3. **Setup Backend**:
```bash
cd backend
npm install
npm start
```

4. **Setup Frontend**:
```bash
# Apri frontend/public/index.html in browser
# Oppure usa un server locale
cd frontend/public
python -m http.server 3000
```

#### Setup Docker

```bash
# Avvia tutti i servizi
docker-compose -f devops/docker-compose.yml up -d

# Verifica servizi
docker-compose -f devops/docker-compose.yml ps

# Logs
docker-compose -f devops/docker-compose.yml logs -f backend
```

### Troubleshooting

#### Problemi Comuni

1. **Errore Connessione Database**:
```bash
# Verifica connessione
psql -h localhost -U postgres -d coworkspace -c "SELECT 1;"

# Verifica variabili ambiente
echo $PGHOST $PGPORT $PGDATABASE
```

2. **Errore Redis**:
```bash
# Verifica connessione Redis
redis-cli ping

# Disabilita Redis per sviluppo
export REDIS_ENABLED=false
```

3. **Errore Socket.IO**:
```bash
# Verifica porta Socket.IO
netstat -an | grep 3001

# Verifica firewall
sudo ufw status
```

---

## 📈 Performance e Ottimizzazione

### Metriche di Performance

#### Database
- **Query Response Time**: < 50ms per query semplici
- **Connection Pool**: 20 connessioni attive
- **Cache Hit Rate**: > 80% per query frequenti

#### API
- **Response Time**: < 200ms per endpoint principali
- **Throughput**: 1000+ richieste/secondo
- **Error Rate**: < 1%

#### Frontend
- **Page Load Time**: < 2 secondi
- **Time to Interactive**: < 3 secondi
- **Bundle Size**: < 500KB

### Ottimizzazioni Implementate

#### Database
```sql
-- Indici compositi per query frequenti
CREATE INDEX CONCURRENTLY idx_slot_lookup 
ON Slot(id_spazio, data, stato, ora_inizio);

-- Viste materializzate per report complessi
CREATE MATERIALIZED VIEW occupancy_summary AS
SELECT 
    id_spazio,
    data,
    COUNT(*) as total_slots,
    COUNT(CASE WHEN stato = 'booked' THEN 1 END) as booked_slots
FROM Slot
GROUP BY id_spazio, data;

-- Aggiornamento periodico vista
REFRESH MATERIALIZED VIEW CONCURRENTLY occupancy_summary;
```

#### Caching Strategy
```javascript
// Cache a più livelli
const cacheStrategy = {
    // Cache di primo livello (Redis)
    async getCachedData(key) {
        const cached = await redis.get(key);
        if (cached) return JSON.parse(cached);
        return null;
    },
    
    // Cache di secondo livello (Database)
    async getDataFromDB(query) {
        const result = await pool.query(query);
        return result.rows;
    },
    
    // Cache di terzo livello (Memory)
    memoryCache: new Map()
};
```

#### Code Splitting Frontend
```javascript
// Lazy loading per moduli pesanti
const PaymentModule = lazy(() => import('./modules/payment.js'));
const AnalyticsModule = lazy(() => import('./modules/analytics.js'));

// Preloading per moduli critici
const preloadCriticalModules = () => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = '/js/critical.js';
    document.head.appendChild(link);
};
```

---

## 🔒 Sicurezza

### Implementazioni di Sicurezza

#### Autenticazione e Autorizzazione
```javascript
// Middleware autenticazione JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token richiesto' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalido' });
        }
        req.user = user;
        next();
    });
};

// Middleware autorizzazione ruoli
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.ruolo)) {
            return res.status(403).json({ error: 'Accesso negato' });
        }
        next();
    };
};
```

#### Validazione Input
```javascript
// Validazione schema con Joi
const Joi = require('joi');

const bookingSchema = Joi.object({
    id_spazio: Joi.number().integer().positive().required(),
    data: Joi.date().iso().min('now').required(),
    ora_inizio: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    ora_fine: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
});

const validateBooking = (req, res, next) => {
    const { error } = bookingSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};
```

#### Protezione da Attacchi

1. **SQL Injection**: Query parametrizzate
2. **XSS**: Sanitizzazione output
3. **CSRF**: Token CSRF per form
4. **Brute Force**: Rate limiting
5. **DDoS**: Rate limiting e IP blocking

```javascript
// Protezione da XSS
const xss = require('xss');

const sanitizeOutput = (data) => {
    if (typeof data === 'string') {
        return xss(data);
    }
    if (typeof data === 'object') {
        return Object.keys(data).reduce((acc, key) => {
            acc[key] = sanitizeOutput(data[key]);
            return acc;
        }, {});
    }
    return data;
};
```

---

## 📚 Documentazione API

### Swagger Documentation

La documentazione completa delle API è disponibile in formato Swagger/OpenAPI 3.0 nel file `docs/swagger.yaml`.

#### Visualizzazione Swagger

1. **Swagger UI**:
   - Apri `docs/swagger.yaml` in Swagger Editor online
   - Oppure usa Swagger UI localmente

2. **Postman Collection**:
   - Importa il file Swagger in Postman
   - Testa le API direttamente

#### Endpoint Principali

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrazione utente |
| POST | `/api/auth/login` | Login utente |
| GET | `/api/slots/{idSpazio}/{date}` | Stato slot |
| POST | `/api/slots/{id}/hold` | Occupa slot |
| POST | `/api/slots/{id}/book` | Conferma prenotazione |
| GET | `/api/prenotazioni` | Lista prenotazioni |
| POST | `/api/prenotazioni` | Crea prenotazione |
| GET | `/api/spazi` | Lista spazi |

### Esempi di Utilizzo

#### JavaScript Client
```javascript
// Esempio di utilizzo API
const apiClient = {
    async login(email, password) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return response.json();
    },
    
    async getSlots(spazioId, date) {
        const response = await fetch(`/api/slots/${spazioId}/${date}`);
        return response.json();
    },
    
    async bookSlot(slotId, token) {
        const response = await fetch(`/api/slots/${slotId}/book`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
    }
};
```

#### cURL Examples
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Ottieni slot
curl http://localhost:3001/api/slots/1/2024-01-15

# Prenota slot
curl -X POST http://localhost:3001/api/slots/1/book \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🤝 Contribuire

### Processo di Contribuzione

1. **Fork del Repository**
2. **Crea Feature Branch**: `git checkout -b feature/nuova-funzionalita`
3. **Commit Changes**: `git commit -m 'Aggiungi nuova funzionalità'`
4. **Push Branch**: `git push origin feature/nuova-funzionalita`
5. **Apri Pull Request**

### Standard di Codice

#### JavaScript
```javascript
// ESLint configuration
module.exports = {
    extends: ['eslint:recommended'],
    env: {
        node: true,
        es6: true
    },
    rules: {
        'indent': ['error', 2],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-unused-vars': 'error',
        'no-console': 'warn'
    }
};
```

#### SQL
```sql
-- Standard SQL formatting
SELECT 
    s.id_slot,
    s.id_spazio,
    s.data,
    s.ora_inizio,
    s.ora_fine,
    s.stato
FROM Slot s
WHERE s.id_spazio = $1
    AND s.data = $2
ORDER BY s.ora_inizio;
```

### Testing Requirements

- **Test Coverage**: > 80%
- **Test Unitari**: Per ogni funzione
- **Test di Integrazione**: Per ogni endpoint
- **Test E2E**: Per flussi critici

---

## 📞 Supporto

### Canali di Supporto

- **GitHub Issues**: Per bug e feature requests
- **Email**: support@coworkspace.com
- **Documentazione**: Cartella `docs/`
- **Wiki**: Documentazione collaborativa

### FAQ

#### Domande Frequenti

**Q: Come posso aggiungere un nuovo tipo di spazio?**
A: Modifica la tabella `Spazio` e aggiungi il nuovo tipo nel constraint CHECK.

**Q: Come funziona il sistema di timer automatico?**
A: Il sistema usa trigger PostgreSQL e funzioni per liberare slot scaduti automaticamente.

**Q: Posso usare un database diverso da PostgreSQL?**
A: Il sistema è ottimizzato per PostgreSQL. Altri database potrebbero richiedere modifiche significative.

**Q: Come scalare il sistema per più utenti?**
A: Usa Redis per caching, implementa load balancing e considera microservizi.

---

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per dettagli completi.

---

## 🙏 Ringraziamenti

- **Team di Sviluppo**: Per il lavoro straordinario
- **Comunità Open Source**: Per le librerie utilizzate
- **Utenti Beta**: Per il feedback prezioso
- **Mentori**: Per la guida e supporto

---

**CoworkSpace v2.0** - Gestione intelligente di spazi di coworking con tecnologia real-time avanzata 🚀

*Ultimo aggiornamento: Gennaio 2024*

