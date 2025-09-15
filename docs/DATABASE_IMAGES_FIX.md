# Fix Database Images - INTEGER vs UUID

## 🐛 Problema Risolto

**Errore**: `operator does not exist: integer = uuid`

**Causa**: Le tabelle delle immagini usavano UUID per gli ID, ma le tabelle esistenti del database usano INTEGER.

## ✅ Soluzione Implementata

### 1. Aggiornamento Schema Database

**Prima (UUID):**
```sql
CREATE TABLE sede_immagini (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ...
);
```

**Dopo (INTEGER):**
```sql
CREATE TABLE sede_immagini (
    id INTEGER PRIMARY KEY DEFAULT nextval('sede_immagini_id_seq'::regclass),
    -- ...
);

CREATE SEQUENCE IF NOT EXISTS sede_immagini_id_seq;
```

### 2. Compatibilità con Schema Esistente

Le nuove tabelle ora seguono lo stesso pattern delle tabelle esistenti:

- **ID**: INTEGER con sequenze auto-incrementali
- **Timestamp**: `TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP`
- **Foreign Keys**: INTEGER che referenziano le tabelle esistenti

### 3. File Aggiornati

- `database/supabase-images-setup.sql` - Schema corretto con INTEGER
- `test-database-images.sql` - Query per verificare la struttura

## 🔧 Configurazione Database

### Esegui le Query Aggiornate

```sql
-- 1. Crea sequenze
CREATE SEQUENCE IF NOT EXISTS sede_immagini_id_seq;
CREATE SEQUENCE IF NOT EXISTS spazio_immagini_id_seq;

-- 2. Crea tabelle con INTEGER
CREATE TABLE IF NOT EXISTS sede_immagini (
    id INTEGER PRIMARY KEY DEFAULT nextval('sede_immagini_id_seq'::regclass),
    id_sede INTEGER NOT NULL REFERENCES sede(id_sede) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spazio_immagini (
    id INTEGER PRIMARY KEY DEFAULT nextval('spazio_immagini_id_seq'::regclass),
    id_spazio INTEGER NOT NULL REFERENCES spazio(id_spazio) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Verifica la Struttura

Esegui le query in `test-database-images.sql` per verificare che tutto sia corretto.

## 🎯 Vantaggi della Soluzione

### ✅ Compatibilità
- **Schema Uniforme**: Tutte le tabelle usano INTEGER per gli ID
- **Foreign Keys**: Funzionano correttamente con le tabelle esistenti
- **Sequenze**: Stesso pattern delle altre tabelle

### ✅ Performance
- **INTEGER**: Più efficiente di UUID per indici e join
- **Sequenze**: Auto-incremento ottimizzato
- **Indici**: Funzionano correttamente con INTEGER

### ✅ Manutenibilità
- **Consistenza**: Schema uniforme in tutto il database
- **Debugging**: Più facile identificare e correggere problemi
- **Documentazione**: Schema chiaro e comprensibile

## 🧪 Test

### 1. Verifica Struttura
```sql
-- Controlla che le tabelle siano create correttamente
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('sede_immagini', 'spazio_immagini')
ORDER BY table_name, ordinal_position;
```

### 2. Test Inserimento
```sql
-- Test inserimento (sostituisci con ID reali)
INSERT INTO sede_immagini (id_sede, url, alt_text) 
VALUES (1, 'https://example.com/test.jpg', 'Test image');

INSERT INTO spazio_immagini (id_spazio, url, alt_text) 
VALUES (1, 'https://example.com/test2.jpg', 'Test image 2');
```

### 3. Test Frontend
- Apri la dashboard responsabili
- Vai su "Gestione Sedi" > "Nuova Sede"
- Verifica che l'area di upload immagini appaia
- Prova a caricare un'immagine

## 📋 Checklist

- [ ] Esegui le query aggiornate in `database/supabase-images-setup.sql`
- [ ] Verifica la struttura con `test-database-images.sql`
- [ ] Testa l'inserimento di immagini di prova
- [ ] Verifica che il frontend funzioni correttamente
- [ ] Controlla che non ci siano errori nella console

## 🚀 Prossimi Passi

1. **Esegui le query aggiornate** nel database
2. **Verifica la struttura** con le query di test
3. **Testa l'upload** nella dashboard responsabili
4. **Controlla i log** per eventuali errori
5. **Personalizza** gli stili se necessario

## 📞 Supporto

Se hai ancora problemi:
1. Controlla che le query siano state eseguite correttamente
2. Verifica che le sequenze siano state create
3. Controlla i log del backend per errori
4. Usa le query di test per diagnosticare il problema
