# 🚀 Backend CoworkSpace v2.0

## 📋 Panoramica

Backend Node.js/Express per il sistema di gestione coworking con funzionalità real-time avanzate, caching intelligente e architettura scalabile.

## 🏗️ Architettura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Express.js    │    │   Socket.IO     │    │   PostgreSQL    │
│                 │    │                 │    │                 │
│ • REST API      │◄──►│ • Real-time     │◄──►│ • Database      │
│ • Middleware    │    │ • Rooms         │    │ • Triggers      │
│ • Controllers   │    │ • Events        │    │ • Functions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis Cache   │    │   JWT Auth      │    │   Stripe API    │
│                 │    │                 │    │                 │
│ • Caching       │    │ • Authentication│    │ • Payments      │
│ • Pub/Sub       │    │ • Authorization │    │ • Webhooks      │
│ • Sessions      │    │ • Middleware    │    │ • Refunds       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Stack Tecnologico

### Core
- **Node.js 18+** - Runtime JavaScript
- **Express.js** - Framework web
- **Socket.IO** - Comunicazione real-time bidirezionale
- **PostgreSQL** - Database relazionale
- **Redis** - Caching e Pub/Sub (opzionale)

### Autenticazione & Sicurezza
- **JWT** - Autenticazione stateless
- **Helmet** - Sicurezza HTTP headers
- **CORS** - Cross-Origin Resource Sharing
- **bcrypt** - Hashing password

### Pagamenti
- **Stripe** - Gateway pagamenti
- **Webhooks** - Notifiche real-time

### DevOps
- **Docker** - Containerizzazione
- **dotenv** - Gestione variabili ambiente
- **nodemon** - Auto-reload sviluppo

## 📁 Struttura Progetto

```
backend/
├── 📁 src/
│   ├── 📁 controllers/          # Logica business
│   │   ├── authController.js    # Autenticazione
│   │   ├── slotController.js    # Gestione slot
│   │   ├── prenotazioniController.js # Prenotazioni
│   │   ├── pagamentiController.js    # Pagamenti Stripe
│   │   └── ...
│   ├── 📁 middleware/           # Middleware Express
│   │   ├── auth.js             # Autenticazione JWT
│   │   ├── slotTimer.js        # Timer slot automatico
│   │   └── sseAuth.js          # Autenticazione SSE
│   ├── 📁 routes/              # Route API
│   │   ├── auth.js             # Route autenticazione
│   │   ├── slots.js            # Route slot
│   │   ├── prenotazioni.js     # Route prenotazioni
│   │   └── ...
│   ├── 📁 services/            # Servizi
│   │   ├── socketService.js    # Gestione Socket.IO
│   │   ├── redisService.js     # Gestione Redis
│   │   ├── slotTimerService.js # Timer automatico
│   │   └── scadenzeService.js  # Gestione scadenze
│   ├── 📁 config/              # Configurazioni
│   │   └── jwt.js              # Configurazione JWT
│   ├── 📁 cron/                # Job schedulati
│   │   └── scadenzeCron.js     # Cron scadenze
│   ├── db.js                   # Connessione database
│   └── app.js                  # Entry point
├── 📁 config/                  # Configurazioni esterne
│   ├── config.js               # Configurazione generale
│   ├── env.js                  # Gestione ambiente
│   └── stripe.js               # Configurazione Stripe
├── Dockerfile                  # Container Docker
├── package.json                # Dipendenze e script
└── WEBHOOK_SETUP.md           # Setup webhook Stripe
```

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (opzionale per sviluppo)

### Installazione

1. **Installa dipendenze**
   ```bash
   cd backend
   npm install
   ```

2. **Configura variabili ambiente**
   ```bash
   cp .env.example .env
   # Modifica .env con le tue configurazioni
   ```

3. **Setup database**
   ```bash
   # Esegui migrazioni
   psql -d coworkspace < ../database/schema.sql
   psql -d coworkspace < ../database/migration-slots-system.sql
   ```

4. **Avvia server**
   ```bash
   # Sviluppo
   npm run dev
   
   # Produzione
   npm start
   ```

## 🔧 Configurazione

### Variabili Ambiente

```env
# Database
PGUSER=postgres
PGHOST=localhost
PGDATABASE=coworkspace
PGPASSWORD=postgres
PGPORT=5432

# Redis (opzionale)
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Server
PORT=3001
NODE_ENV=development

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Configurazione Produzione

Per Render.com o altri provider cloud:

```env
NODE_ENV=production
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-host:6379
JWT_SECRET=your-production-secret
STRIPE_SECRET_KEY=sk_live_...
```

## 🔌 API Endpoints

### Autenticazione
- `POST /api/auth/login` - Login utente
- `POST /api/auth/register` - Registrazione utente
- `GET /api/auth/me` - Profilo utente corrente
- `POST /api/auth/logout` - Logout utente

### Gestione Slot
- `GET /api/slots/:idSpazio/:date` - Stato slot per data
- `POST /api/slots/:id/hold` - Occupa slot temporaneamente (15 min)
- `POST /api/slots/:id/book` - Conferma prenotazione
- `POST /api/slots/:id/release` - Rilascia slot

### Prenotazioni
- `GET /api/prenotazioni` - Lista prenotazioni utente
- `POST /api/prenotazioni` - Crea nuova prenotazione
- `PUT /api/prenotazioni/:id` - Aggiorna prenotazione
- `DELETE /api/prenotazioni/:id` - Cancella prenotazione

### Spazi e Sedi
- `GET /api/spazi` - Lista spazi disponibili
- `GET /api/sedi` - Lista sedi
- `GET /api/spazi/:id/disponibilita-slot/:date` - Disponibilità pubblica

### Pagamenti
- `POST /api/pagamenti/create-payment-intent` - Crea payment intent
- `POST /api/pagamenti/confirm` - Conferma pagamento
- `POST /api/pagamenti/refund` - Rimborso
- `POST /webhook` - Webhook Stripe

## 🔄 Socket.IO Events

### Client → Server
- `join_space` - Entra in room spazio
- `leave_space` - Esce da room spazio
- `slot_hold` - Occupa slot
- `slot_release` - Rilascia slot

### Server → Client
- `connection_confirmed` - Conferma connessione
- `slot_update` - Aggiornamento singolo slot
- `slots_status_update` - Aggiornamento completo
- `slots_freed` - Slot liberati automaticamente
- `error` - Errore generico

## ⏰ Sistema Timer Automatico

### Funzionalità
- **Liberazione automatica** slot scaduti ogni 30 secondi
- **Notifiche real-time** quando slot vengono liberati
- **Gestione scadenze** prenotazioni
- **Cleanup automatico** dati obsoleti

### Configurazione
```javascript
// In slotTimerService.js
const TIMER_INTERVAL = 30000; // 30 secondi
const SLOT_EXPIRY_TIME = 15 * 60 * 1000; // 15 minuti
```

## 📦 Caching Strategy

### Redis Cache
- **Query pesanti** cached per 5 minuti
- **Stati slot** cached per 1 minuto
- **Dati utente** cached per 10 minuti
- **Invalidazione automatica** su aggiornamenti

### Cache Keys
```javascript
// Esempi di chiavi cache
`slots:${idSpazio}:${date}` // Stati slot
`user:${idUtente}` // Dati utente
`spazi:${idSede}` // Lista spazi
```

## 🧪 Testing

### Test Manuali
```bash
# Test connessione database
npm run test:db

# Test connessione Redis
npm run test:redis

# Test webhook Stripe
npm run test:stripe
```

### Test API
```bash
# Test endpoint autenticazione
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test endpoint slot
curl -X GET http://localhost:3001/api/slots/1/2024-01-01
```

## 🐳 Docker

### Build e Run
```bash
# Build immagine
docker build -t coworkspace-backend .

# Run container
docker run -d \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e REDIS_ENABLED=true \
  coworkspace-backend
```

### Docker Compose
```bash
# Avvia tutti i servizi
docker-compose -f ../devops/docker-compose.yml up -d
```

## 📊 Monitoring

### Health Checks
- `GET /api/health` - Stato generale
- `GET /api/health/db` - Stato database
- `GET /api/health/redis` - Stato Redis

### Logging
- **Console logs** per sviluppo
- **File logs** per produzione
- **Error tracking** con stack traces
- **Performance metrics** per API calls

## 🚀 Deployment

### Render.com
1. Connect GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Configure environment variables
5. Set health check: `/api/health`

### Altri Provider
- **Heroku**: Usa Procfile
- **AWS**: Usa Elastic Beanstalk
- **DigitalOcean**: Usa App Platform

## 📚 Documentazione Correlata

- **[Socket.IO Integration](SOCKET_IO_INTEGRATION.md)**
- **[Slot Timer System](SLOT_TIMER_SYSTEM.md)**
- **[Configuration Guide](CONFIGURAZIONE.md)**
- **[Render Setup](RENDER_SETUP.md)**
- **[Webhook Setup](../../backend/WEBHOOK_SETUP.md)**
- **[Frontend Documentation](../frontend/README.md)**
- **[Database Documentation](../database/README.md)**

## 🤝 Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi `LICENSE` per dettagli.

---

**Backend CoworkSpace v2.0** - Server Node.js con funzionalità real-time avanzate 🚀
