# 🚀 Setup Ambiente di Sviluppo Locale

## 📋 Prerequisiti

### 1. PostgreSQL 17
- **Installa PostgreSQL 17** da [postgresql.org](https://www.postgresql.org/download/)
- **Configura password** per utente `postgres`: `postgres`
- **Database**: `coworkspace`
- **Verifica installazione**: `psql --version`

### 2. Node.js
- **Installa Node.js** da [nodejs.org](https://nodejs.org/)
- **Verifica installazione**: `node --version` e `npm --version`

## 🚀 Setup Automatico (Raccomandato)

### Opzione 1: Script Automatico
```bash
# Esegui lo script di setup automatico
./start-local-dev.bat
```

### Opzione 2: Setup Manuale

#### 1. Setup Database
```bash
cd backend
node setup-local-complete.js
```

#### 2. Avvio Backend
```bash
cd backend
node start-local.js
```

#### 3. Frontend
- Apri `frontend/public/index.html` nel browser
- Oppure usa un server HTTP locale

## 🔑 Credenziali Utenti

### Utente Normale
- **Email**: `frabro@email.com`
- **Password**: `frabro19`
- **Ruolo**: Cliente

### Gestore
- **Email**: `ilmiobro@email.com`
- **Password**: `ilmiobro19`
- **Ruolo**: Gestore

## 🌐 URL di Sviluppo

- **Backend**: `http://localhost:3002`
- **Frontend**: `file:///path/to/frontend/public/index.html`
- **API Base**: `http://localhost:3002/api`

## 📊 Database Locale (PostgreSQL 17)

- **Host**: `localhost`
- **Porta**: `5432`
- **Database**: `coworkspace`
- **Utente**: `postgres`
- **Password**: `postgres`
- **Versione**: PostgreSQL 17

## 🔧 Configurazione

### Backend
- File di configurazione: `backend/config-local.js`
- Database: `backend/src/db-local.js`
- Variabili d'ambiente: Impostate automaticamente

### Frontend
- File di configurazione: `frontend/public/js/config-local.js`
- API Base: `http://localhost:3002/api`

## 🐛 Risoluzione Problemi

### Errore Connessione Database
```bash
# Verifica che PostgreSQL sia in esecuzione
pg_ctl status

# Riavvia PostgreSQL se necessario
pg_ctl restart
```

### Errore Porta Occupata
```bash
# Cambia porta nel file start-local.js
process.env.PORT = '3003';
```

### Errore Permessi
```bash
# Verifica permessi utente postgres
psql -U postgres -c "SELECT version();"
```

## 📝 Note Sviluppo

- **Hot Reload**: Non disponibile (riavvia manualmente)
- **Logs**: Visibili nella console del backend
- **Database**: Reset completo ad ogni setup
- **CORS**: Configurato per localhost

## 🎯 Test Funzionalità

1. **Login**: Testa entrambi gli utenti
2. **Dashboard**: Verifica caricamento dati
3. **Prenotazioni**: Testa flusso completo
4. **Gestione**: Verifica funzionalità gestore

## 🔄 Reset Ambiente

```bash
# Reset completo database
cd backend
node setup-local-complete.js
```

## 📞 Supporto

In caso di problemi:
1. Verifica prerequisiti
2. Controlla logs backend
3. Verifica connessione database
4. Riavvia tutto il sistema
