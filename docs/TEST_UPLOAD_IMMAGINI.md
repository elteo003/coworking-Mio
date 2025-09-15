# Test Upload Immagini - Istruzioni

## 🚀 Setup Rapido

### 1. Configurazione Supabase

**A. Aggiorna le credenziali:**
```javascript
// frontend/public/js/supabase-config.js
window.SUPABASE_CONFIG = {
    url: 'https://TUO-PROJECT-ID.supabase.co',        // Sostituisci con la tua URL
    anonKey: 'TUA-CHIAVE-ANONIMA',                   // Sostituisci con la tua chiave
    bucketName: 'Immagini'
};
```

**B. Esegui le query del database:**
- Apri il SQL Editor di Supabase
- Copia e incolla il contenuto di `database/supabase-images-setup.sql`
- Esegui le query

**C. Crea il bucket Storage:**
- Vai su Storage > Buckets
- Clicca "New bucket"
- Nome: `Immagini`
- ✅ Pubblico (per permettere accesso alle immagini)

### 2. Test dell'Upload

**A. Test Semplice:**
1. Apri `test-upload-semplice.html` nel browser
2. Verifica che appaia l'area di upload
3. Clicca o trascina un'immagine
4. Controlla la console per i log

**B. Test Completo:**
1. Apri `frontend/public/dashboard-responsabili.html`
2. Vai su "Gestione Sedi"
3. Clicca "Nuova Sede"
4. Verifica che appaia l'area di upload immagini
5. Prova a caricare un'immagine

## 🔧 Troubleshooting

### ❌ "Supabase non inizializzato"
**Soluzione:**
- Verifica che la libreria Supabase sia caricata
- Controlla le credenziali in `supabase-config.js`
- Apri la console del browser per errori

### ❌ "Errore upload: ..."
**Soluzione:**
- Verifica che il bucket "Immagini" esista
- Controlla che il bucket sia pubblico
- Verifica le policy di Storage

### ❌ "Errore salvataggio metadati: ..."
**Soluzione:**
- Verifica che le tabelle siano state create
- Controlla le policy RLS
- Verifica i permessi dell'utente

### ❌ Area di upload non appare
**Soluzione:**
- Verifica che `image-manager.js` sia caricato
- Controlla la console per errori JavaScript
- Verifica che il modal sia completamente caricato

## 📋 Checklist Test

### ✅ Setup Base
- [ ] Credenziali Supabase configurate
- [ ] Query database eseguite
- [ ] Bucket "Immagini" creato e pubblico
- [ ] Policy Storage configurate

### ✅ Test Upload
- [ ] Area di upload appare nei modal
- [ ] Drag & drop funziona
- [ ] Click per selezionare file funziona
- [ ] Validazione tipo file funziona
- [ ] Validazione dimensione file funziona
- [ ] Anteprima immagini funziona
- [ ] Eliminazione immagini funziona

### ✅ Test Database
- [ ] Immagini salvate in Storage
- [ ] Metadati salvati nel database
- [ ] Immagini esistenti caricate correttamente
- [ ] Eliminazione funziona sia da Storage che da DB

## 🎯 Funzionalità Implementate

### ✅ Upload Immagini
- **Drag & Drop**: Trascina immagini nell'area di upload
- **Click Upload**: Clicca per selezionare file dal computer
- **Validazione**: Controllo tipo (JPEG, PNG, WebP) e dimensione (max 5MB)
- **Anteprima**: Visualizzazione immediata delle immagini caricate
- **Eliminazione**: Rimozione con conferma

### ✅ Gestione Database
- **Storage**: Immagini salvate in Supabase Storage
- **Metadati**: Informazioni salvate in tabelle dedicate
- **Relazioni**: Collegamento con sedi e spazi
- **Sicurezza**: Policy RLS per proteggere i dati

### ✅ Interfaccia Utente
- **Card Migliorate**: Proporzioni e spaziature corrette
- **Modal Integrati**: Upload direttamente nei form di creazione/modifica
- **Responsive**: Funziona su desktop e mobile
- **Feedback**: Messaggi di successo/errore

## 🚀 Prossimi Passi

1. **Configura le credenziali Supabase**
2. **Esegui le query del database**
3. **Crea il bucket Storage**
4. **Testa l'upload con `test-upload-semplice.html`**
5. **Verifica nella dashboard responsabili**
6. **Personalizza gli stili se necessario**

## 📞 Supporto

Se hai problemi:
1. Controlla la console del browser per errori
2. Verifica la configurazione Supabase
3. Controlla che tutti i file siano caricati correttamente
4. Testa con `test-upload-semplice.html` per isolare il problema
