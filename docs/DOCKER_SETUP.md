# 🐳 Setup Docker per CoworkSpace

## Panoramica

CoworkSpace utilizza Docker per containerizzare l'applicazione e semplificare il deployment. Il setup include:

- **Backend**: Node.js con Express
- **Frontend**: Nginx con file statici
- **Database**: PostgreSQL 15
- **Cache**: Redis 7

## Prerequisiti

- Docker Desktop installato
- Docker Compose v2.0+
- Porte disponibili: 3000, 3001, 5432, 6379

## Struttura Docker

```
coworkspace/
├── backend/
│   ├── Dockerfile          # Container Node.js
│   └── package.json
├── frontend/
│   ├── Dockerfile          # Container Nginx
│   └── nginx.conf         # Configurazione Nginx
└── devops/
    └── docker-compose.yml  # Orchestrazione servizi
```

## Quick Start

### 1. Avvia tutti i servizi

```bash
# Dalla root del progetto
docker-compose -f devops/docker-compose.yml up -d
```

### 2. Verifica i servizi

```bash
# Controlla lo stato dei container
docker-compose -f devops/docker-compose.yml ps

# Visualizza i log
docker-compose -f devops/docker-compose.yml logs -f
```

### 3. Accedi all'applicazione

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432
- **Redis**: localhost:6379

## Configurazione Servizi

### Backend (Node.js)

**Dockerfile**: `backend/Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3001
CMD ["npm", "start"]
```

**Caratteristiche**:
- Base: Node.js 18 Alpine (leggero)
- Utente non-root per sicurezza
- Dipendenze di produzione only
- Health check integrato

### Frontend (Nginx)

**Dockerfile**: `frontend/Dockerfile`

```dockerfile
FROM nginx:alpine
COPY public/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Caratteristiche**:
- Base: Nginx Alpine (leggero)
- Configurazione personalizzata
- Compressione Gzip
- Cache per file statici
- Headers di sicurezza

### Database (PostgreSQL)

**Configurazione**:
- Versione: PostgreSQL 15
- Database: `coworkspace`
- Utente: `postgres`
- Password: `postgres`
- Porta: `5432`

**Volumi**:
- Dati persistenti in `coworkspace-db-data`

### Cache (Redis)

**Configurazione**:
- Versione: Redis 7 Alpine
- Porta: `6379`
- Nessuna password (sviluppo)

**Volumi**:
- Dati persistenti in `coworkspace-redis-data`

## Comandi Utili

### Gestione Container

```bash
# Avvia servizi
docker-compose -f devops/docker-compose.yml up -d

# Ferma servizi
docker-compose -f devops/docker-compose.yml down

# Riavvia servizi
docker-compose -f devops/docker-compose.yml restart

# Ricostruisce immagini
docker-compose -f devops/docker-compose.yml up --build
```

### Debug e Logs

```bash
# Logs di tutti i servizi
docker-compose -f devops/docker-compose.yml logs

# Logs di un servizio specifico
docker-compose -f devops/docker-compose.yml logs backend

# Logs in tempo reale
docker-compose -f devops/docker-compose.yml logs -f

# Accesso shell al container
docker-compose -f devops/docker-compose.yml exec backend sh
docker-compose -f devops/docker-compose.yml exec db psql -U postgres -d coworkspace
```

### Database

```bash
# Backup database
docker-compose -f devops/docker-compose.yml exec db pg_dump -U postgres coworkspace > backup.sql

# Restore database
docker-compose -f devops/docker-compose.yml exec -T db psql -U postgres coworkspace < backup.sql

# Accesso diretto al database
docker-compose -f devops/docker-compose.yml exec db psql -U postgres -d coworkspace
```

## Variabili d'Ambiente

### Backend

```bash
# Database
PGUSER=postgres
PGHOST=db
PGDATABASE=coworkspace
PGPASSWORD=postgres
PGPORT=5432

# Redis
REDIS_ENABLED=true
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server
NODE_ENV=development
PORT=3001
```

### Produzione

Per la produzione, modifica le variabili d'ambiente:

```bash
# In docker-compose.yml o tramite .env
NODE_ENV=production
JWT_SECRET=your-production-secret-key
PGPASSWORD=your-secure-password
```

## Health Checks

Tutti i servizi includono health checks:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/api/ping"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Volumi Persistenti

```yaml
volumes:
  coworkspace-db-data:    # Dati PostgreSQL
  coworkspace-redis-data: # Dati Redis
```

## Troubleshooting

### Porte Occupate

```bash
# Verifica porte in uso
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
netstat -tulpn | grep :5432
netstat -tulpn | grep :6379

# Ferma servizi che usano le porte
sudo lsof -ti:3000 | xargs kill -9
```

### Container Non Si Avvia

```bash
# Verifica logs
docker-compose -f devops/docker-compose.yml logs backend

# Ricostruisci immagini
docker-compose -f devops/docker-compose.yml build --no-cache

# Pulisci volumi
docker-compose -f devops/docker-compose.yml down -v
```

### Database Non Accessibile

```bash
# Verifica connessione
docker-compose -f devops/docker-compose.yml exec backend npm run setup-db

# Reset database
docker-compose -f devops/docker-compose.yml down -v
docker-compose -f devops/docker-compose.yml up -d
```

## Deployment Produzione

### 1. Configurazione Ambiente

```bash
# Crea file .env.production
NODE_ENV=production
JWT_SECRET=your-production-secret
PGPASSWORD=your-secure-password
```

### 2. Build Immagini

```bash
# Build per produzione
docker-compose -f devops/docker-compose.yml build --no-cache
```

### 3. Deploy

```bash
# Avvia in produzione
docker-compose -f devops/docker-compose.yml up -d
```

## Monitoraggio

### Health Status

```bash
# Verifica stato servizi
docker-compose -f devops/docker-compose.yml ps

# Health check manuale
curl http://localhost:3001/api/ping
curl http://localhost:3000
```

### Metriche

```bash
# Utilizzo risorse
docker stats

# Logs in tempo reale
docker-compose -f devops/docker-compose.yml logs -f --tail=100
```

---

**CoworkSpace Docker Setup** - Containerizzazione completa per sviluppo e produzione 🐳
