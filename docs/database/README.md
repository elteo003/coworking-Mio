# 🗄️ Database CoworkSpace v2.0

## 📋 Panoramica

Database PostgreSQL per il sistema di gestione coworking con schema ottimizzato, funzioni automatiche e sistema di slot avanzato.

## 🏗️ Architettura Database

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Triggers      │    │   Functions     │
│                 │    │                 │    │                 │
│ • Tables        │◄──►│ • Auto-cleanup  │◄──►│ • Business Logic│
│ • Indexes       │    │ • Validation    │    │ • Slot Management│
│ • Constraints   │    │ • Notifications │    │ • Data Processing│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Views         │    │   Procedures    │    │   Extensions    │
│                 │    │                 │    │                 │
│ • Availability  │    │ • Slot Timer    │    │ • UUID          │
│ • Statistics    │    │ • Cleanup       │    │ • JSON          │
│ • Reports       │    │ • Maintenance   │    │ • Triggers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Stack Tecnologico

### Database
- **PostgreSQL 15+** - Database relazionale
- **PL/pgSQL** - Linguaggio stored procedures
- **JSON/JSONB** - Supporto dati semi-strutturati
- **UUID** - Identificatori univoci

### Features
- **Triggers** - Automazione database
- **Functions** - Logica business
- **Views** - Viste ottimizzate
- **Indexes** - Performance ottimizzate
- **Constraints** - Integrità dati

## 📁 Struttura File

```
database/
├── 📄 schema.sql                    # Schema principale
├── 📄 seed.sql                      # Dati di test
├── 📄 migration-new-schema.sql      # Migrazione schema base
├── 📄 migration-slots-system.sql    # Migrazione sistema slot
├── 📄 migration-stripe.sql          # Migrazione pagamenti
├── 📄 add-expires-at-field.sql      # Aggiunta campo expires_at
├── 📄 add-scadenza-slot-field.sql   # Aggiunta campo scadenza_slot
├── 📄 add-spazio-prenotazione-fields.sql # Campi prenotazione
├── 📄 functions-slots.sql           # Funzioni gestione slot
├── 📄 fix-pagamento-constraint.sql  # Fix constraint pagamenti
├── 📄 fix-prenotazione-stato-constraint.sql # Fix constraint prenotazioni
├── 📄 check-constraints.sql         # Verifica constraint
└── 📄 coworkspace.sqlite            # Database SQLite (backup)
```

## 🚀 Quick Start

### Prerequisiti
- PostgreSQL 15+
- Accesso amministratore database
- psql o client PostgreSQL

### Setup Database

1. **Crea database**
   ```bash
   createdb coworkspace
   ```

2. **Esegui schema principale**
   ```bash
   psql -d coworkspace -f schema.sql
   ```

3. **Esegui migrazioni**
   ```bash
   psql -d coworkspace -f migration-new-schema.sql
   psql -d coworkspace -f migration-slots-system.sql
   psql -d coworkspace -f migration-stripe.sql
   ```

4. **Aggiungi funzioni**
   ```bash
   psql -d coworkspace -f functions-slots.sql
   ```

5. **Popola con dati di test**
   ```bash
   psql -d coworkspace -f seed.sql
   ```

## 📊 Schema Database

### Tabelle Principali

#### Utenti
```sql
CREATE TABLE Utente (
    id_utente SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    ruolo VARCHAR(20) DEFAULT 'cliente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Sedi
```sql
CREATE TABLE Sede (
    id_sede SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    citta VARCHAR(100) NOT NULL,
    indirizzo TEXT NOT NULL,
    descrizione TEXT,
    orario_apertura TIME DEFAULT '09:00',
    orario_chiusura TIME DEFAULT '18:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Spazi
```sql
CREATE TABLE Spazio (
    id_spazio SERIAL PRIMARY KEY,
    id_sede INTEGER REFERENCES Sede(id_sede),
    nome VARCHAR(200) NOT NULL,
    tipologia VARCHAR(100) NOT NULL,
    descrizione TEXT,
    capacita INTEGER DEFAULT 1,
    prezzo_orario DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Prenotazioni
```sql
CREATE TABLE Prenotazione (
    id_prenotazione SERIAL PRIMARY KEY,
    id_utente INTEGER REFERENCES Utente(id_utente),
    id_spazio INTEGER REFERENCES Spazio(id_spazio),
    data_inizio TIMESTAMP NOT NULL,
    data_fine TIMESTAMP NOT NULL,
    stato VARCHAR(20) DEFAULT 'pendente',
    scadenza_slot TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Pagamenti
```sql
CREATE TABLE Pagamento (
    id_pagamento SERIAL PRIMARY KEY,
    id_prenotazione INTEGER REFERENCES Prenotazione(id_prenotazione),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indici per Performance

```sql
-- Indici per query frequenti
CREATE INDEX idx_prenotazione_spazio_data ON Prenotazione(id_spazio, data_inizio);
CREATE INDEX idx_prenotazione_utente ON Prenotazione(id_utente);
CREATE INDEX idx_prenotazione_stato ON Prenotazione(stato);
CREATE INDEX idx_prenotazione_scadenza ON Prenotazione(scadenza_slot);

-- Indici per join
CREATE INDEX idx_spazio_sede ON Spazio(id_sede);
CREATE INDEX idx_pagamento_prenotazione ON Pagamento(id_prenotazione);
```

## ⚡ Funzioni Database

### Gestione Slot Automatica

#### Liberazione Slot Scaduti
```sql
CREATE OR REPLACE FUNCTION free_expired_slots()
RETURNS INTEGER AS $$
DECLARE
    freed_count INTEGER;
BEGIN
    -- Libera slot scaduti
    UPDATE Prenotazione 
    SET stato = 'scaduta', scadenza_slot = NULL
    WHERE scadenza_slot < CURRENT_TIMESTAMP 
    AND stato = 'in attesa';
    
    GET DIAGNOSTICS freed_count = ROW_COUNT;
    
    -- Log dell'operazione
    INSERT INTO system_log (operation, details, created_at)
    VALUES ('free_expired_slots', 
            'Freed ' || freed_count || ' expired slots', 
            CURRENT_TIMESTAMP);
    
    RETURN freed_count;
END;
$$ LANGUAGE plpgsql;
```

#### Calcolo Disponibilità Slot
```sql
CREATE OR REPLACE FUNCTION get_slot_availability(
    p_id_spazio INTEGER,
    p_date DATE
)
RETURNS TABLE (
    orario TIME,
    status VARCHAR(20),
    prenotazione_id INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH time_slots AS (
        SELECT generate_series(
            '09:00'::TIME,
            '17:00'::TIME,
            '1 hour'::INTERVAL
        )::TIME AS orario
    ),
    prenotazioni AS (
        SELECT 
            EXTRACT(HOUR FROM data_inizio)::INTEGER as orario_inizio,
            EXTRACT(HOUR FROM data_fine)::INTEGER as orario_fine,
            stato,
            id_prenotazione
        FROM Prenotazione
        WHERE id_spazio = p_id_spazio
        AND DATE(data_inizio) = p_date
        AND stato IN ('confermata', 'in attesa')
    )
    SELECT 
        ts.orario,
        CASE 
            WHEN p.id_prenotazione IS NOT NULL THEN 'booked'
            WHEN ts.orario < CURRENT_TIME AND p_date = CURRENT_DATE THEN 'past'
            ELSE 'available'
        END as status,
        p.id_prenotazione
    FROM time_slots ts
    LEFT JOIN prenotazioni p ON ts.orario >= p.orario_inizio AND ts.orario < p.orario_fine;
END;
$$ LANGUAGE plpgsql;
```

### Triggers Automatici

#### Aggiornamento Timestamp
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica trigger a tutte le tabelle
CREATE TRIGGER update_utente_updated_at 
    BEFORE UPDATE ON Utente 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prenotazione_updated_at 
    BEFORE UPDATE ON Prenotazione 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Validazione Prenotazioni
```sql
CREATE OR REPLACE FUNCTION validate_prenotazione()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica che data_inizio < data_fine
    IF NEW.data_inizio >= NEW.data_fine THEN
        RAISE EXCEPTION 'data_inizio deve essere precedente a data_fine';
    END IF;
    
    -- Verifica che la prenotazione non sia nel passato
    IF NEW.data_inizio < CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Non è possibile prenotare nel passato';
    END IF;
    
    -- Verifica che non ci siano conflitti
    IF EXISTS (
        SELECT 1 FROM Prenotazione 
        WHERE id_spazio = NEW.id_spazio
        AND stato IN ('confermata', 'in attesa')
        AND (
            (NEW.data_inizio < data_fine AND NEW.data_fine > data_inizio)
        )
        AND id_prenotazione != COALESCE(NEW.id_prenotazione, 0)
    ) THEN
        RAISE EXCEPTION 'Conflitto con prenotazione esistente';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_prenotazione_trigger
    BEFORE INSERT OR UPDATE ON Prenotazione
    FOR EACH ROW EXECUTE FUNCTION validate_prenotazione();
```

## 📊 Viste Ottimizzate

### Vista Disponibilità Slot
```sql
CREATE VIEW slot_availability AS
SELECT 
    s.id_spazio,
    s.nome as spazio_nome,
    sed.nome as sede_nome,
    ts.orario,
    CASE 
        WHEN p.id_prenotazione IS NOT NULL THEN 'booked'
        WHEN ts.orario < CURRENT_TIME AND CURRENT_DATE = CURRENT_DATE THEN 'past'
        ELSE 'available'
    END as slot_status,
    p.id_prenotazione,
    p.stato as prenotazione_stato
FROM Spazio s
JOIN Sede sed ON s.id_sede = sed.id_sede
CROSS JOIN (
    SELECT generate_series(
        '09:00'::TIME,
        '17:00'::TIME,
        '1 hour'::INTERVAL
    )::TIME AS orario
) ts
LEFT JOIN Prenotazione p ON (
    s.id_spazio = p.id_spazio
    AND DATE(p.data_inizio) = CURRENT_DATE
    AND ts.orario >= EXTRACT(HOUR FROM p.data_inizio)::TIME
    AND ts.orario < EXTRACT(HOUR FROM p.data_fine)::TIME
    AND p.stato IN ('confermata', 'in attesa')
);
```

### Vista Statistiche
```sql
CREATE VIEW statistics_view AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_prenotazioni,
    COUNT(CASE WHEN stato = 'confermata' THEN 1 END) as prenotazioni_confermate,
    COUNT(CASE WHEN stato = 'in attesa' THEN 1 END) as prenotazioni_in_attesa,
    COUNT(CASE WHEN stato = 'scaduta' THEN 1 END) as prenotazioni_scadute,
    SUM(CASE WHEN stato = 'confermata' THEN 
        EXTRACT(EPOCH FROM (data_fine - data_inizio))/3600 
    END) as ore_prenotate
FROM Prenotazione
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🔧 Configurazione

### Variabili Ambiente

```bash
# Database
PGUSER=postgres
PGHOST=localhost
PGDATABASE=coworkspace
PGPASSWORD=postgres
PGPORT=5432

# Connection Pool
PG_MAX_CONNECTIONS=20
PG_IDLE_TIMEOUT=30000
PG_CONNECTION_TIMEOUT=2000
```

### Configurazione PostgreSQL

```sql
-- Configurazioni per performance
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Riavvia PostgreSQL per applicare le modifiche
SELECT pg_reload_conf();
```

## 🧪 Testing

### Test Funzioni

```sql
-- Test liberazione slot
SELECT free_expired_slots();

-- Test disponibilità slot
SELECT * FROM get_slot_availability(1, '2024-01-01');

-- Test vista disponibilità
SELECT * FROM slot_availability WHERE id_spazio = 1;
```

### Test Performance

```sql
-- Test query con EXPLAIN
EXPLAIN ANALYZE 
SELECT * FROM Prenotazione 
WHERE id_spazio = 1 
AND data_inizio >= '2024-01-01' 
AND data_fine <= '2024-01-02';

-- Test indici
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('prenotazione', 'spazio', 'utente');
```

## 🔄 Migrazioni

### Sistema Migrazioni

1. **Schema Base**
   ```bash
   psql -d coworkspace -f migration-new-schema.sql
   ```

2. **Sistema Slot**
   ```bash
   psql -d coworkspace -f migration-slots-system.sql
   ```

3. **Sistema Pagamenti**
   ```bash
   psql -d coworkspace -f migration-stripe.sql
   ```

4. **Campi Aggiuntivi**
   ```bash
   psql -d coworkspace -f add-expires-at-field.sql
   psql -d coworkspace -f add-scadenza-slot-field.sql
   ```

### Rollback

```sql
-- Rollback esempio
ALTER TABLE Prenotazione DROP COLUMN IF EXISTS scadenza_slot;
DROP FUNCTION IF EXISTS free_expired_slots();
```

## 📊 Monitoring

### Query di Monitoraggio

```sql
-- Connessioni attive
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Query lente
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Dimensioni tabelle
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Log e Debug

```sql
-- Abilita logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Verifica constraint
SELECT * FROM check-constraints.sql;
```

## 🚀 Backup e Restore

### Backup

```bash
# Backup completo
pg_dump -h localhost -U postgres -d coworkspace > backup.sql

# Backup solo schema
pg_dump -h localhost -U postgres -d coworkspace --schema-only > schema_backup.sql

# Backup solo dati
pg_dump -h localhost -U postgres -d coworkspace --data-only > data_backup.sql
```

### Restore

```bash
# Restore completo
psql -h localhost -U postgres -d coworkspace < backup.sql

# Restore schema
psql -h localhost -U postgres -d coworkspace < schema_backup.sql
```

## 📚 Documentazione Correlata

- **[Setup Database](SETUP_DATABASE.md)**
- **[Slots Schema](SLOTS_SCHEMA.md)**
- **[Fix Prenotazioni](README_FIX_PRENOTAZIONE.md)**
- **[Backend Documentation](../backend/README.md)**
- **[Frontend Documentation](../frontend/README.md)**

## 🤝 Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi `LICENSE` per dettagli.

---

**Database CoworkSpace v2.0** - Schema PostgreSQL ottimizzato con funzioni automatiche 🗄️
