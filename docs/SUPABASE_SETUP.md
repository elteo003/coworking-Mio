# Setup Supabase per Gestione Immagini

## 1. Configurazione Database

Esegui le query nel file `database/supabase-images-setup.sql` nel SQL Editor di Supabase:

```sql
-- Le query creano:
-- - Tabella sede_immagini
-- - Tabella spazio_immagini  
-- - Indici per ottimizzazione
-- - Policy RLS per sicurezza
-- - Trigger per updated_at
```

## 2. Configurazione Storage

1. **Crea il bucket "Immagini"**:
   - Vai su Storage > Buckets
   - Clicca "New bucket"
   - Nome: `Immagini`
   - Pubblico: ✅ (per permettere accesso alle immagini)

2. **Configura le policy del bucket**:
   ```sql
   -- Policy per lettura pubblica
   CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'Immagini');
   
   -- Policy per upload (solo utenti autenticati)
   CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT 
   WITH CHECK (bucket_id = 'Immagini' AND auth.role() = 'authenticated');
   
   -- Policy per eliminazione (solo proprietari)
   CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE 
   USING (bucket_id = 'Immagini' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

## 3. Configurazione Frontend

1. **Aggiorna `frontend/public/js/supabase-config.js`**:
   ```javascript
   window.SUPABASE_CONFIG = {
       url: 'https://TUO-PROJECT-ID.supabase.co',
       anonKey: 'TUA-CHIAVE-ANONIMA',
       bucketName: 'Immagini'
   };
   ```

2. **Ottieni le credenziali**:
   - URL: Settings > API > Project URL
   - Anon Key: Settings > API > Project API keys > anon public

## 4. Test della Configurazione

1. **Apri la dashboard responsabili**
2. **Vai su Gestione Sedi**
3. **Clicca "Nuova Sede"**
4. **Verifica che appaia l'area di upload immagini**
5. **Prova a caricare un'immagine**

## 5. Struttura File

```
frontend/public/
├── css/
│   └── card-fixes.css          # Stili per card e immagini
├── js/
│   ├── image-manager.js        # Gestione upload/eliminazione
│   ├── supabase-config.js      # Configurazione Supabase
│   ├── gestione-sedi.js        # Form con supporto immagini
│   └── gestione-spazi.js      # Form con supporto immagini
└── dashboard-responsabili.html # Include tutti gli script
```

## 6. Funzionalità Implementate

### ✅ Card Migliorate
- Proporzioni corrette
- Spaziature uniformi
- Hover effects
- Responsive design

### ✅ Upload Immagini
- Drag & drop
- Validazione file (JPEG, PNG, WebP)
- Limite 5MB
- Anteprima immagini
- Eliminazione con conferma

### ✅ Database
- Tabelle per metadati immagini
- Relazioni con sedi/spazi
- Policy di sicurezza
- Indici per performance

### ✅ Storage
- Bucket Supabase
- URL pubblici
- Gestione file
- Policy di accesso

## 7. Troubleshooting

### Errore "Supabase non inizializzato"
- Verifica che la libreria Supabase sia caricata
- Controlla le credenziali in `supabase-config.js`

### Errore upload immagini
- Verifica le policy del bucket
- Controlla i permessi RLS
- Verifica la connessione internet

### Immagini non si caricano
- Controlla che il bucket sia pubblico
- Verifica gli URL generati
- Controlla la console per errori

## 8. Prossimi Passi

1. **Configurare le credenziali Supabase**
2. **Eseguire le query del database**
3. **Testare l'upload delle immagini**
4. **Personalizzare gli stili se necessario**
5. **Implementare la gestione immagini negli spazi**
