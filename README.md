# 🏢 CoworkSpace v2.0 - Sistema di Gestione Coworking

## 🚀 Panoramica

CoworkSpace v2.0 è un sistema completo per la gestione di spazi di coworking con funzionalità real-time avanzate, caching intelligente e architettura scalabile.

### ✨ Nuove Funzionalità v2.0

- **🔌 Socket.IO Real-time**: Comunicazione bidirezionale per aggiornamenti istantanei
- **📦 Redis Caching**: Performance ottimizzate con cache intelligente
- **⏰ Gestione Slot Automatica**: Sistema `expires_at` senza cron jobs
- **🐳 Docker Ready**: Setup completo per sviluppo e produzione
- **🔄 Optimistic UI**: Feedback immediato per migliore UX
- **📈 Scalabilità Multi-Server**: Supporto Redis Pub/Sub

## 🏗️ Architettura

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

## 🛠️ Stack Tecnologico

### Frontend
- **HTML5/CSS3**: Interfaccia moderna e responsive
- **Vanilla JavaScript**: Moduli modulari e performanti
- **Socket.IO Client**: Comunicazione real-time
- **Bootstrap 5**: UI components e grid system
- **Font Awesome**: Icone e simboli

### Backend
- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web
- **Socket.IO**: Comunicazione real-time bidirezionale
- **Redis**: Caching e Pub/Sub
- **JWT**: Autenticazione stateless
- **Stripe**: Pagamenti online

### Database
- **PostgreSQL**: Database relazionale
- **Triggers**: Automazione database
- **Indici**: Performance ottimizzate
- **Funzioni**: Logica business

### DevOps
- **Docker**: Containerizzazione
- **Docker Compose**: Orchestrazione locale
- **Render**: Deployment cloud
- **Health Checks**: Monitoraggio servizi

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (opzionale per sviluppo)
- Docker & Docker Compose (opzionale)

### Setup Locale

1. **Clone e installa dipendenze**
```bash
git clone <repository>
cd Coworking
npm install
cd backend && npm install
```

2. **Setup Database**
```bash
# Crea database PostgreSQL
createdb coworkspace

# Esegui migrazioni
psql coworkspace < database/schema.sql
psql coworkspace < database/migration-slots-system.sql
psql coworkspace < database/add-expires-at-field.sql
```

3. **Avvia servizi**
```bash
# Backend
cd backend
npm start

# Frontend (Live Server o simile)
# Apri frontend/public/index.html
```

### Setup Docker (Raccomandato)

```bash
# Avvia tutti i servizi
docker-compose -f devops/docker-compose.yml up -d

# Verifica servizi
docker-compose -f devops/docker-compose.yml ps
```

## 📁 Struttura Progetto

```
CoworkSpace/
├── 📁 backend/                 # Backend Node.js
│   ├── 📁 src/
│   │   ├── 📁 controllers/     # Logica business
│   │   ├── 📁 middleware/      # Middleware Express
│   │   ├── 📁 routes/          # Route API
│   │   ├── 📁 services/        # Servizi (Redis, Socket.IO)
│   │   └── app.js             # Entry point
│   ├── 📁 config/             # Configurazioni
│   ├── Dockerfile             # Container backend
│   └── package.json           # Dipendenze backend
├── 📁 frontend/               # Frontend
│   └── 📁 public/
│       ├── 📁 js/             # JavaScript modulare
│       ├── 📁 css/            # Stili personalizzati
│       └── *.html             # Pagine applicazione
├── 📁 database/               # Database
│   ├── schema.sql             # Schema principale
│   ├── migration-*.sql        # Migrazioni
│   └── seed.sql               # Dati di test
├── 📁 docs/                   # Documentazione
│   ├── 📁 backend/            # Docs backend
│   ├── 📁 frontend/           # Docs frontend
│   └── 📁 database/           # Docs database
├── 📁 devops/                 # DevOps
│   └── docker-compose.yml     # Orchestrazione servizi
└── README_COWORKSPACE_V2.md   # Questo file
```

## 🔧 Configurazione

### Variabili Ambiente

Il sistema usa variabili ambiente per la configurazione. Per sviluppo locale:

```bash
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
```

### Configurazione Produzione

Per Render.com, configura le variabili ambiente nel dashboard:

```bash
NODE_ENV=production
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-host:6379
JWT_SECRET=your-production-secret
```

## 🔌 API Endpoints

### Autenticazione
- `POST /api/auth/login` - Login utente
- `POST /api/auth/register` - Registrazione utente
- `GET /api/auth/me` - Profilo utente corrente

### Gestione Slot
- `GET /api/slots/:idSpazio/:date` - Stato slot per data
- `POST /api/slots/:id/hold` - Occupa slot temporaneamente
- `POST /api/slots/:id/book` - Conferma prenotazione
- `POST /api/slots/:id/release` - Rilascia slot

### Spazi e Sedi
- `GET /api/spazi` - Lista spazi disponibili
- `GET /api/sedi` - Lista sedi
- `GET /api/spazi/:id/disponibilita-slot/:date` - Disponibilità pubblica

## 🔄 Real-time Events

### Socket.IO Events

**Client → Server:**
- `join_space` - Entra in room spazio
- `leave_space` - Esce da room spazio

**Server → Client:**
- `slot_update` - Aggiornamento singolo slot
- `slots_status_update` - Aggiornamento completo
- `slots_freed` - Slot liberati automaticamente

## 📊 Performance

### Caching Strategy

1. **Redis Cache Layer**: Query pesanti cached per 5 minuti
2. **Database Indices**: Ottimizzazione query slot
3. **Connection Pooling**: Gestione connessioni PostgreSQL
4. **Lazy Loading**: Caricamento on-demand

### Monitoring

- **Health Checks**: Docker health checks per tutti i servizi
- **Logging**: Log strutturati con livelli
- **Metrics**: Connessioni Socket.IO e cache hit rate

## 🧪 Testing

### Test Manuali

1. **Test Connessione Socket.IO**
   - Apri console browser
   - Verifica eventi `connect` e `connection_confirmed`

2. **Test Slot Management**
   - Occupa slot → Verifica UI ottimistica
   - Rilascia slot → Verifica aggiornamento real-time

3. **Test Cache Redis**
   - Prima richiesta → Cache MISS
   - Seconda richiesta → Cache HIT

### Test Database

```sql
-- Test funzione liberazione slot
SELECT free_expired_slots();

-- Test vista disponibilità
SELECT * FROM slot_availability WHERE slot_status = 'available';
```

## 🚀 Deployment

### Render.com

1. **Connect Repository**: Collega GitHub repository
2. **Environment Variables**: Configura variabili ambiente
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Health Check**: `/api/health`

### Docker Production

```bash
# Build immagine
docker build -t coworkspace-backend ./backend

# Run container
docker run -d \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e REDIS_ENABLED=true \
  coworkspace-backend
```

## 📚 Documentazione

- **[Socket.IO Migration](docs/backend/SOCKET_IO_MIGRATION.md)** - Migrazione da SSE
- **[Redis Caching](docs/backend/REDIS_CACHING.md)** - Strategia caching
- **[Slot Management](docs/frontend/SLOT_MANAGEMENT_SYSTEM.md)** - Sistema slot
- **[Database Schema](docs/database/SLOTS_SCHEMA.md)** - Schema database

## 🤝 Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi `LICENSE` per dettagli.

## 🆘 Supporto

- **Issues**: Apri issue su GitHub
- **Documentation**: Consulta cartella `docs/`
- **Email**: support@coworkspace.com

---

**CoworkSpace v2.0** - Gestione intelligente di spazi di coworking con tecnologia real-time avanzata 🚀
