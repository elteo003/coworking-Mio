# 🏢 CoworkSpace v2.0 - Sistema di Gestione Coworking

## 🚀 Panoramica

CoworkSpace v2.0 è un sistema completo per la gestione di spazi di coworking con architettura semplificata, caching intelligente e deployment facilitato.

### ✨ Caratteristiche Principali

- **📦 Redis Caching**: Performance ottimizzate con cache intelligente
- **⏰ Gestione Slot Automatica**: Sistema semplificato di gestione slot
- **🐳 Docker Ready**: Setup completo per sviluppo e produzione
- **🧪 Test Automatici**: Suite completa di test per backend e frontend
- **📚 Documentazione Completa**: API documentate con Swagger
- **🔒 Sistema Multi-Ruolo**: Gestione utenti con ruoli diversi

## 🏗️ Architettura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Vanilla JS)  │◄──►│   (Express.js)  │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • Modern UI     │    │ • REST API      │    │ • Slots Table   │
│ • Responsive    │    │ • Redis Cache   │    │ • Expires_at    │
│ • User Friendly │    │ • JWT Auth      │    │ • Triggers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │                 │
                       │ • Cache Layer   │
                       │ • Performance   │
                       │ • Session Store │
                       └─────────────────┘
```

## 🛠️ Stack Tecnologico

### Frontend
- **HTML5/CSS3**: Interfaccia moderna e responsive
- **Vanilla JavaScript**: Moduli modulari e performanti
- **Bootstrap 5**: UI components e grid system
- **Font Awesome**: Icone e simboli

### Backend
- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web
- **Redis**: Caching e performance
- **JWT**: Autenticazione stateless
- **Sistema Pagamenti**: Pagamenti semplificati

### Database
- **PostgreSQL**: Database relazionale
- **Triggers**: Automazione database
- **Indici**: Performance ottimizzate
- **Funzioni**: Logica business

### DevOps
- **Docker**: Containerizzazione
- **Docker Compose**: Orchestrazione locale
- **Jest**: Test automatici
- **Puppeteer**: Test end-to-end
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
├── 📁 docs/                   # Documentazione completa
│   ├── 📄 INDEX.md            # Indice navigazione documentazione
│   ├── 📁 backend/            # Documentazione backend
│   │   ├── README.md          # Documentazione principale backend
│   │   ├── CONFIGURAZIONE.md  # Configurazione backend
│   │   ├── RENDER_SETUP.md    # Setup deployment
│   │   ├── SLOT_TIMER_SYSTEM.md # Sistema timer automatico
│   │   ├── SOCKET_IO_INTEGRATION.md # Integrazione Socket.IO
│   │   └── SOCKET_IO_MIGRATION.md # Migrazione da SSE
│   ├── 📁 frontend/           # Documentazione frontend
│   │   ├── README.md          # Documentazione principale frontend
│   │   ├── SLOT_MANAGEMENT_SYSTEM.md # Sistema gestione slot
│   │   └── OPTIMISTIC_UI_SYSTEM.md # Sistema optimistic UI
│   ├── 📁 database/           # Documentazione database
│   │   ├── README.md          # Documentazione principale database
│   │   ├── SETUP_DATABASE.md  # Setup database
│   │   ├── SLOTS_SCHEMA.md    # Schema database
│   │   └── README_FIX_PRENOTAZIONE.md # Fix constraint
│   ├── PRENOTAZIONE_SISTEMA.md # Sistema prenotazioni
│   └── README.md              # Panoramica documentazione
├── 📁 backend/                # Backend Node.js
├── 📁 frontend/               # Frontend
├── 📁 database/               # Database
├── 📁 devops/                 # DevOps
│   └── docker-compose.yml     # Orchestrazione servizi
└── README.md                  # Questo file
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

## 🔄 Sistema Semplificato

### Caratteristiche Principali
- **API REST**: Comunicazione HTTP standard
- **Gestione Slot**: Sistema automatico di gestione slot
- **Cache Redis**: Performance ottimizzate
- **Test Automatici**: Suite completa di test

## 📊 Performance

### Caching Strategy

1. **Redis Cache Layer**: Query pesanti cached per 5 minuti
2. **Database Indices**: Ottimizzazione query slot
3. **Connection Pooling**: Gestione connessioni PostgreSQL
4. **Lazy Loading**: Caricamento on-demand

### Monitoring

- **Health Checks**: Docker health checks per tutti i servizi
- **Logging**: Log strutturati con livelli
- **Metrics**: Cache hit rate e performance API

## 🧪 Testing

### Test Automatici

1. **Test Backend**
   ```bash
   cd backend
   npm test
   npm run test:coverage
   ```

2. **Test Frontend**
   ```bash
   cd frontend/tests
   npm test
   npm run test:booking
   ```

3. **Test Database**
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

### README Principali
- **[📚 Indice Documentazione](docs/INDEX.md)** - Navigazione rapida documentazione
- **[Backend](docs/backend/README.md)** - Documentazione completa backend
- **[Frontend](docs/frontend/README.md)** - Documentazione completa frontend  
- **[Database](docs/database/README.md)** - Documentazione completa database
- **[Documentazione Generale](docs/README.md)** - Panoramica documentazione

### Documentazione Tecnica
- **[Slot Timer System](docs/backend/SLOT_TIMER_SYSTEM.md)** - Sistema timer automatico
- **[Configuration Guide](docs/backend/CONFIGURAZIONE.md)** - Configurazione backend
- **[Render Setup](docs/backend/RENDER_SETUP.md)** - Setup deployment
- **[Slot Management](docs/frontend/SLOT_MANAGEMENT_SYSTEM.md)** - Sistema slot frontend
- **[Database Schema](docs/database/SLOTS_SCHEMA.md)** - Schema database
- **[Database Setup](docs/database/SETUP_DATABASE.md)** - Setup database
- **[Docker Setup](docs/DOCKER_SETUP.md)** - Setup Docker completo
- **[Fix Prenotazioni](docs/database/README_FIX_PRENOTAZIONE.md)** - Fix constraint prenotazioni

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

**CoworkSpace v2.0** - Sistema semplificato e robusto per la gestione di spazi di coworking 🚀
