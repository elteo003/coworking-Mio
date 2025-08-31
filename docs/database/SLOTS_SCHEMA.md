# 🗄️ Schema Database Slots

## 📋 Panoramica

Il nuovo schema database per la gestione degli slot temporali con timer automatico e stati avanzati. Questo schema sostituisce il sistema precedente basato solo sulla tabella `Prenotazione`.

## 🏗️ Schema Principale

### **Tabella Slots:**

```sql
CREATE TABLE slots (
    id SERIAL PRIMARY KEY,
    id_spazio INTEGER NOT NULL REFERENCES Spazio(id_spazio),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('available', 'occupied', 'booked', 'past')) DEFAULT 'available',
    held_until TIMESTAMP NULL,
    id_utente INTEGER REFERENCES Utente(id_utente) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Descrizione Campi:**

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | SERIAL | Chiave primaria auto-incrementale |
| `id_spazio` | INTEGER | Riferimento allo spazio (FK) |
| `start_time` | TIMESTAMP | Orario di inizio slot |
| `end_time` | TIMESTAMP | Orario di fine slot |
| `status` | TEXT | Stato slot (available, occupied, booked, past) |
| `held_until` | TIMESTAMP | Scadenza occupazione temporanea (NULL se non occupato) |
| `id_utente` | INTEGER | Utente che ha occupato lo slot (FK, NULL se disponibile) |
| `created_at` | TIMESTAMP | Data creazione record |
| `updated_at` | TIMESTAMP | Data ultimo aggiornamento |

## 🔍 Indici per Performance

### **Indici Principali:**

```sql
-- Indice per query per spazio e tempo
CREATE INDEX idx_slots_spazio_time ON slots(id_spazio, start_time);

-- Indice per stato slot
CREATE INDEX idx_slots_status ON slots(status);

-- Indice per slot occupati con scadenza
CREATE INDEX idx_slots_held_until ON slots(held_until) WHERE held_until IS NOT NULL;

-- Indice per utente
CREATE INDEX idx_slots_utente ON slots(id_utente) WHERE id_utente IS NOT NULL;
```

## ⚡ Funzioni Database

### **Libera Slot Scaduti:**

```sql
CREATE OR REPLACE FUNCTION free_expired_slots()
RETURNS INTEGER AS $$
DECLARE
    freed_count INTEGER;
BEGIN
    UPDATE slots 
    SET status = 'available', 
        held_until = NULL, 
        id_utente = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'occupied' 
    AND held_until IS NOT NULL 
    AND held_until < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS freed_count = ROW_COUNT;
    RETURN freed_count;
END;
$$ LANGUAGE plpgsql;
```

### **Aggiorna Slot Passati:**

```sql
CREATE OR REPLACE FUNCTION update_past_slots()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE slots 
    SET status = 'past',
        updated_at = CURRENT_TIMESTAMP
    WHERE status IN ('available', 'occupied') 
    AND end_time < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
```

### **Crea Slot Giornalieri:**

```sql
CREATE OR REPLACE FUNCTION create_daily_slots(
    p_id_spazio INTEGER,
    p_date DATE,
    p_start_hour INTEGER DEFAULT 9,
    p_end_hour INTEGER DEFAULT 18
)
RETURNS INTEGER AS $$
DECLARE
    current_hour INTEGER;
    slots_created INTEGER := 0;
BEGIN
    -- Pulisci slot esistenti per questa data e spazio
    DELETE FROM slots 
    WHERE id_spazio = p_id_spazio 
    AND DATE(start_time) = p_date;
    
    -- Crea slot per ogni ora
    FOR current_hour IN p_start_hour..(p_end_hour - 1) LOOP
        INSERT INTO slots (id_spazio, start_time, end_time, status)
        VALUES (
            p_id_spazio,
            p_date + (current_hour || ' hours')::INTERVAL,
            p_date + ((current_hour + 1) || ' hours')::INTERVAL,
            CASE 
                WHEN p_date + (current_hour || ' hours')::INTERVAL < CURRENT_TIMESTAMP THEN 'past'
                ELSE 'available'
            END
        );
        slots_created := slots_created + 1;
    END LOOP;
    
    RETURN slots_created;
END;
$$ LANGUAGE plpgsql;
```

## 🔄 Trigger per Aggiornamenti

### **Trigger Updated At:**

```sql
CREATE OR REPLACE FUNCTION update_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_slots_updated_at
    BEFORE UPDATE ON slots
    FOR EACH ROW
    EXECUTE FUNCTION update_slots_updated_at();
```

## 📊 Stati Slot

### **Stati Disponibili:**

| Stato | Descrizione | Condizioni |
|-------|-------------|------------|
| `available` | Slot disponibile per prenotazione | `held_until IS NULL` |
| `occupied` | Slot temporaneamente occupato | `held_until > CURRENT_TIMESTAMP` |
| `booked` | Slot prenotato e confermato | Prenotazione confermata |
| `past` | Slot con orario già passato | `end_time < CURRENT_TIMESTAMP` |

### **Transizioni di Stato:**

```
available → occupied (hold slot)
occupied → available (scadenza timer o release)
occupied → booked (conferma prenotazione)
available → past (scadenza orario)
occupied → past (scadenza orario)
```

## 🔧 Query di Esempio

### **Ottieni Slot per Spazio e Data:**

```sql
SELECT 
    id,
    id_spazio,
    start_time,
    end_time,
    status,
    held_until,
    id_utente,
    EXTRACT(HOUR FROM start_time) as hour,
    CASE 
        WHEN held_until IS NOT NULL AND held_until > CURRENT_TIMESTAMP 
        THEN EXTRACT(EPOCH FROM (held_until - CURRENT_TIMESTAMP))::INTEGER
        ELSE NULL 
    END as seconds_until_expiry
FROM slots 
WHERE id_spazio = $1 
AND DATE(start_time) = $2
ORDER BY start_time;
```

### **Statistiche Slot:**

```sql
SELECT 
    status,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM slots 
WHERE DATE(start_time) = CURRENT_DATE
GROUP BY status
ORDER BY count DESC;
```

### **Slot Occupati in Scadenza:**

```sql
SELECT 
    s.id,
    s.id_spazio,
    s.start_time,
    s.held_until,
    u.nome,
    u.email
FROM slots s
JOIN Utente u ON s.id_utente = u.id_utente
WHERE s.status = 'occupied'
AND s.held_until < CURRENT_TIMESTAMP + INTERVAL '5 minutes'
ORDER BY s.held_until;
```

## 🚀 Popolamento Iniziale

### **Crea Slot per Prossimi 30 Giorni:**

```sql
DO $$
DECLARE
    spazio_record RECORD;
    current_date DATE;
    days_ahead INTEGER;
BEGIN
    FOR spazio_record IN SELECT id_spazio FROM Spazio LOOP
        FOR days_ahead IN 0..30 LOOP
            current_date := CURRENT_DATE + days_ahead;
            PERFORM create_daily_slots(spazio_record.id_spazio, current_date);
        END LOOP;
    END LOOP;
END $$;
```

## 🔍 Monitoraggio e Manutenzione

### **Query di Manutenzione:**

```sql
-- Slot orfani (senza spazio valido)
SELECT s.* FROM slots s
LEFT JOIN Spazio sp ON s.id_spazio = sp.id_spazio
WHERE sp.id_spazio IS NULL;

-- Slot con date inconsistenti
SELECT * FROM slots 
WHERE start_time >= end_time;

-- Slot occupati da molto tempo
SELECT * FROM slots 
WHERE status = 'occupied' 
AND held_until < CURRENT_TIMESTAMP - INTERVAL '1 hour';
```

### **Pulizia Periodica:**

```sql
-- Rimuovi slot molto vecchi (opzionale)
DELETE FROM slots 
WHERE end_time < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Aggiorna statistiche
ANALYZE slots;
```

## 📝 Note di Implementazione

### **Performance:**
- ⚡ Indici ottimizzati per query frequenti
- ⚡ Funzioni database per operazioni batch
- ⚡ Trigger per aggiornamenti automatici

### **Sicurezza:**
- 🔒 Constraint per validazione dati
- 🔒 Foreign key per integrità referenziale
- 🔒 Check constraint per stati validi

### **Manutenibilità:**
- 🔧 Funzioni modulari e riutilizzabili
- 🔧 Commenti per documentazione
- 🔧 Naming convention consistente

---

*Ultimo aggiornamento: Dicembre 2024*
*Versione: 1.0 - Schema Slots con Timer*
