# Setup Database PostgreSQL 17

Questo documento spiega come configurare il database PostgreSQL 17 per il progetto CoWorking.

## 📋 Prerequisiti

- **PostgreSQL 17** installato e in esecuzione
- **psql** disponibile nel PATH (per script PowerShell/Batch)
- **Node.js** (per script JavaScript)

## 🚀 Script Disponibili

### 1. **PowerShell** (Raccomandato per Windows)
```powershell
.\setup-database-postgres17.ps1
```

**Parametri opzionali:**
```powershell
.\setup-database-postgres17.ps1 -Host "localhost" -Port 5432 -Username "postgres" -Password "postgres" -DatabaseName "coworking"
```

### 2. **Batch** (Windows)
```cmd
setup-database-postgres17.bat
```

### 3. **Node.js** (Cross-platform)
```bash
node setup-database-postgres17.js
```

## 🔧 Configurazione

### Variabili d'Ambiente (per script Node.js)
```bash
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=postgres
export PGDATABASE=coworking
```

### Configurazione di Default
- **Host**: localhost
- **Port**: 5432
- **Username**: postgres
- **Password**: postgres
- **Database**: coworking

## 📁 File Richiesti

Lo script cerca automaticamente questi file:
- `database/schema.sql` - Schema del database
- `database/seed.sql` - Dati di esempio

## 🎯 Cosa Fa lo Script

1. **Test Connessione**: Verifica che PostgreSQL sia raggiungibile
2. **Controllo Database**: Controlla se il database 'coworking' esiste
3. **Creazione Database**: Crea il database se non esiste
4. **Esecuzione Schema**: Esegue lo schema SQL per creare le tabelle
5. **Dati di Seed**: Inserisce dati di esempio se disponibili

## 🔍 Troubleshooting

### Errore "psql non trovato"
```bash
# Windows: Aggiungi PostgreSQL al PATH
# Cerca "Environment Variables" nel menu Start
# Aggiungi: C:\Program Files\PostgreSQL\17\bin
```

### Errore "Connessione rifiutata"
- Verifica che PostgreSQL sia in esecuzione
- Controlla che la porta 5432 sia aperta
- Verifica username/password

### Errore "Database già esiste"
- Lo script rileva automaticamente se il database esiste
- Non sovrascrive database esistenti

### Errore "Permessi insufficienti"
- Assicurati che l'utente 'postgres' abbia privilegi di creazione database
- Oppure usa un utente con privilegi amministrativi

## 📋 Output di Esempio

```
🚀 Setup Database PostgreSQL 17
=================================

📋 Configurazione:
   Host: localhost
   Port: 5432
   Username: postgres
   Database: coworking

🔍 Test connessione PostgreSQL...
✅ Connessione PostgreSQL riuscita!
📋 Versione: PostgreSQL 17.0

🔍 Controllo esistenza database 'coworking'...
⚠️ Database 'coworking' non esiste.

🔨 Creazione database 'coworking'...
✅ Database 'coworking' creato con successo!

📋 Esecuzione schema database...
✅ Schema database eseguito con successo!

🌱 Esecuzione dati di seed...
✅ Dati di seed eseguiti con successo!

🎉 Setup database completato!

📋 Prossimi passi:
   1. Configura le variabili d'ambiente nel backend
   2. Avvia il server backend: npm start
   3. Testa la connessione con il frontend
```

## 🔗 Integrazione con Backend

Dopo aver eseguito lo script, configura il backend:

### File `.env` nel backend:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coworking
DB_USER=postgres
DB_PASSWORD=postgres
```

### Test connessione:
```bash
cd backend
npm start
```

## 🛡️ Sicurezza

- **Non usare** password di default in produzione
- **Configura** utenti specifici per l'applicazione
- **Abilita** SSL per connessioni remote
- **Limita** privilegi utente al minimo necessario

## 📞 Supporto

Se incontri problemi:
1. Verifica i prerequisiti
2. Controlla i log di errore
3. Testa la connessione manualmente con psql
4. Verifica i permessi utente



