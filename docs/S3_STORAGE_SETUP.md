# Setup S3 Supabase Storage - Istruzioni Complete

## 🚀 Implementazione S3

Ho implementato l'upload delle immagini usando l'endpoint S3 di Supabase Storage invece della libreria Supabase JavaScript. Questo approccio è più efficiente e diretto.

## 📁 File Creati/Modificati

### Backend
- `backend/src/controllers/gestoreController.js` - Aggiunti endpoint per gestione immagini
- `backend/src/routes/gestore.js` - Aggiunte route per API immagini

### Frontend
- `frontend/public/js/s3-image-manager.js` - Nuovo manager per upload S3
- `frontend/public/js/gestione-sedi.js` - Aggiornato per usare S3ImageManager
- `frontend/public/js/gestione-spazi.js` - Aggiornato per usare S3ImageManager
- `frontend/public/dashboard-responsabili.html` - Aggiornato per caricare S3ImageManager

### Test
- `test-s3-upload.html` - File di test per upload S3
- `docs/S3_STORAGE_SETUP.md` - Questa documentazione

## 🔧 Configurazione

### 1. Variabili d'Ambiente (.env)

Aggiungi queste variabili al file `.env` del backend:

```env
# Supabase Storage S3 Configuration
STORAGE_ACCESS_KEY_ID=your_supabase_storage_access_key_id
STORAGE_SECRET_ACCESS_KEY=your_supabase_storage_secret_access_key
STORAGE_ENDPOINT=https://czkiuvmhijhxuqzdtnmz.storage.supabase.co/storage/v1/s3
STORAGE_BUCKET_NAME=Immagini
```

### 2. Database Setup

**IMPORTANTE**: Le tabelle ora usano INTEGER invece di UUID per compatibilità con lo schema esistente.

Esegui le query in `database/supabase-images-setup.sql`:

```sql
-- Crea sequenze per auto-incremento
CREATE SEQUENCE IF NOT EXISTS sede_immagini_id_seq;
CREATE SEQUENCE IF NOT EXISTS spazio_immagini_id_seq;

-- Crea tabelle per metadati immagini
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

**Se hai già creato le tabelle con UUID**, esegui prima `database/migrate-images-uuid-to-integer.sql` per migrare i dati.

**Per un setup più semplice**, usa `database/setup-images-simple.sql` che contiene solo le query essenziali.

### 3. Storage Setup

1. **Crea il bucket "Immagini"** in Supabase Storage
2. **Rendilo pubblico** per permettere accesso alle immagini
3. **Configura le policy di Storage**:

```sql
-- Policy per accesso pubblico alle immagini
CREATE POLICY "Public Access Images" ON storage.objects FOR SELECT USING (
    bucket_id = 'Immagini' 
    AND storage."extension"(name) = 'jpg' 
    AND LOWER((storage.foldername(name))[1]) = 'public' 
    AND auth.role() = 'anon'
);
```

**Nota**: Questa policy permette l'accesso pubblico solo a:
- File nel bucket "Immagini"
- File con estensione .jpg
- File nella cartella "public"
- Utenti anonimi (pubblico)

**Conseguenze per il Frontend**:
- Solo file JPG/JPEG sono accettati
- Tutte le immagini vengono caricate nella cartella "public/"
- File PNG/WebP vengono rifiutati
- L'interfaccia è stata aggiornata per mostrare "Solo JPG/JPEG"

## 🎯 API Endpoints

### Backend Endpoints

```javascript
// Ottieni credenziali S3
GET /api/config/storage-credentials
Headers: Authorization: Bearer <token>

// Salva metadati immagine
POST /api/gestore/images
Body: { type, parentId, url, altText, fileName }

// Elimina metadati immagine
DELETE /api/gestore/images/:id

// Ottieni immagini per sede/spazio
GET /api/gestore/images?type=sede&parentId=123
```

### Frontend Usage

```javascript
// Inizializza upload
window.s3ImageManager.createUploadElement('containerId', (imageData, fileName) => {
    console.log('Immagine caricata:', imageData);
});

// Carica immagini esistenti
const images = await window.s3ImageManager.getImages('sede', sedeId);

// Elimina immagine
await window.s3ImageManager.deleteImageMetadata(imageId, 'sede');
```

## 🔄 Flusso di Upload

1. **Frontend**: Utente seleziona/trascina immagine
2. **Validazione**: Controllo tipo file (JPEG, PNG, WebP) e dimensione (max 5MB)
3. **Upload S3**: Immagine caricata direttamente su Supabase Storage via S3
4. **Metadati**: Informazioni immagine salvate nel database PostgreSQL
5. **Anteprima**: Immagine mostrata nell'interfaccia

## 🧪 Test

### Test Rapido
1. Apri `test-s3-upload.html` nel browser
2. Verifica che appaia l'area di upload
3. Prova a caricare un'immagine
4. Controlla la console per i log

### Test Completo
1. Apri la dashboard responsabili
2. Vai su "Gestione Sedi"
3. Clicca "Nuova Sede"
4. Verifica l'area di upload immagini
5. Prova l'upload e la gestione

## 🔍 Troubleshooting

### ❌ "Credenziali S3 non configurate"
**Soluzione:**
- Verifica le variabili d'ambiente nel file `.env`
- Controlla che il backend sia riavviato dopo le modifiche
- Verifica che l'endpoint `/api/config/storage-credentials` risponda

### ❌ "Errore upload: 403 Forbidden"
**Soluzione:**
- Verifica che le credenziali S3 siano corrette
- Controlla che il bucket "Immagini" esista
- Verifica i permessi del bucket

### ❌ "Errore salvataggio metadati: ..."
**Soluzione:**
- Verifica che le tabelle del database siano state create
- Controlla che l'utente sia autenticato
- Verifica i permessi dell'utente sulla sede/spazio

### ❌ "operator does not exist: integer = uuid"
**Soluzione:**
- Questo errore indica che le tabelle usano UUID invece di INTEGER
- Esegui `database/migrate-images-uuid-to-integer.sql` per migrare i dati
- Oppure elimina e ricrea le tabelle con `database/supabase-images-setup.sql`

### ❌ "relation 'sede_immagini_id_seq' does not exist"
**Soluzione:**
- Questo errore indica che la sequenza non è stata creata prima della tabella
- Usa `database/setup-images-simple.sql` per un setup più semplice
- Oppure esegui le sequenze prima delle tabelle in `database/supabase-images-setup.sql`

### ❌ Area di upload non appare
**Soluzione:**
- Verifica che `s3-image-manager.js` sia caricato
- Controlla la console per errori JavaScript
- Verifica che il modal sia completamente caricato

## 📊 Vantaggi dell'Implementazione S3

### ✅ Performance
- **Upload diretto**: Immagini caricate direttamente su Storage
- **Nessun proxy**: Il backend non gestisce i file, solo i metadati
- **Scalabilità**: Supabase Storage gestisce automaticamente la scalabilità

### ✅ Sicurezza
- **Autenticazione**: Solo utenti autenticati possono caricare
- **Autorizzazione**: Controllo accessi per sede/spazio
- **Validazione**: Controllo tipo e dimensione file

### ✅ Manutenibilità
- **Separazione**: Storage separato dal database
- **API REST**: Endpoint standardizzati
- **Logging**: Tracciamento completo delle operazioni

## 🚀 Prossimi Passi

1. **Configura le variabili d'ambiente**
2. **Esegui le query del database**
3. **Crea il bucket Storage**
4. **Testa con `test-s3-upload.html`**
5. **Verifica nella dashboard responsabili**
6. **Personalizza gli stili se necessario**

## 📞 Supporto

Se hai problemi:
1. Controlla la console del browser per errori
2. Verifica la configurazione delle variabili d'ambiente
3. Controlla che tutti i file siano caricati correttamente
4. Testa con `test-s3-upload.html` per isolare il problema
5. Verifica i log del backend per errori server
