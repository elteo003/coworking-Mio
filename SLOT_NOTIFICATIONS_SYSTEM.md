# 🔔 Sistema di Notifiche Real-Time per Slot

## 📋 Panoramica

Sistema completo per la gestione degli slot di prenotazione con notifiche real-time, timer automatici e aggiornamenti istantanei dell'interfaccia utente.

## 🏗️ Architettura del Sistema

### Backend Components

#### 1. **SlotTimerService** (`backend/src/services/slotTimerService.js`)
- **Scopo**: Gestisce timer automatici per slot "in attesa"
- **Funzionalità**:
  - Timer di 15 minuti per slot in attesa di pagamento
  - Notifiche automatiche quando slot scadono
  - Gestione timer attivi con cleanup automatico
  - Integrazione con sistema SSE per notifiche real-time

#### 2. **SSEController** (`backend/src/controllers/sseController.js`)
- **Scopo**: Gestisce connessioni Server-Sent Events
- **Funzionalità**:
  - Connessioni SSE persistenti
  - Broadcast di notifiche a tutti i client connessi
  - Gestione stato slot in tempo reale
  - Heartbeat per mantenere connessioni attive

#### 3. **Slot Notifications Routes** (`backend/src/routes/slotNotifications.js`)
- **Scopo**: Endpoint API per notifiche slot
- **Endpoints**:
  - `GET /api/slots/events` - Connessione SSE
  - `GET /api/slots/status/:sedeId/:spazioId/:data` - Stato corrente slot
  - `POST /api/slots/refresh/:sedeId/:spazioId/:data` - Forza aggiornamento
  - `GET /api/slots/debug/:sedeId/:spazioId/:data` - Debug prenotazioni

### Frontend Components

#### 1. **SlotNotificationManager** (`frontend/public/js/slot-notifications.js`)
- **Scopo**: Gestisce notifiche real-time lato client
- **Funzionalità**:
  - Connessione SSE automatica
  - Riconnessione automatica in caso di disconnessione
  - Aggiornamento UI in tempo reale
  - Notifiche toast per utente
  - Sistema di eventi personalizzati

## 🔄 Flusso di Funzionamento

### 1. **Creazione Prenotazione**
```
Utente prenota → Slot diventa "in attesa" → Timer 15 min avviato → Notifica SSE "slot_occupied"
```

### 2. **Pagamento Completato**
```
Pagamento OK → Slot diventa "confermato" → Timer cancellato → Notifica SSE "slot_confirmed"
```

### 3. **Timer Scaduto**
```
15 min passati → Slot torna "disponibile" → Notifica SSE "slot_available"
```

## 📡 Tipi di Notifiche SSE

### `slot_occupied`
- **Quando**: Slot diventa "in attesa"
- **Dati**: `prenotazioneId`, `idSpazio`, `minutesRemaining`
- **UI**: Bottone arancione, tooltip con countdown

### `slot_available`
- **Quando**: Slot torna disponibile (timer scaduto)
- **Dati**: `prenotazioneId`, `idSpazio`, `slotsStatus`
- **UI**: Bottone verde, abilitato per selezione

### `slot_confirmed`
- **Quando**: Pagamento completato
- **Dati**: `prenotazioneId`, `idSpazio`
- **UI**: Bottone rosso, disabilitato

### `slots_status_update`
- **Quando**: Aggiornamento stato completo
- **Dati**: `slotsStatus` (array completo)
- **UI**: Aggiornamento di tutti gli slot

## 🎨 Stati UI degli Slot

| Stato | Colore | Cliccabile | Descrizione |
|-------|--------|------------|-------------|
| `available` | Verde | ✅ Sì | Slot disponibile per prenotazione |
| `occupied` | Arancione | ❌ No | Slot in attesa di pagamento (15 min) |
| `booked` | Rosso | ❌ No | Slot prenotato e confermato |
| `past` | Grigio | ❌ No | Slot nel passato |

## 🔧 Configurazione

### Backend
```javascript
// Timer per slot in attesa (15 minuti)
const timeoutMs = 15 * 60 * 1000;

// Cleanup timer ogni 5 minuti
setInterval(() => {
    SlotTimerService.cleanupExpiredTimers();
}, 5 * 60 * 1000);
```

### Frontend
```javascript
// Auto-connessione SSE
document.addEventListener('DOMContentLoaded', () => {
    window.SlotNotificationManager.connect();
});

// Disconnessione automatica
window.addEventListener('beforeunload', () => {
    window.SlotNotificationManager.disconnect();
});
```

## 🚀 Utilizzo

### 1. **Inclusione nel Frontend**
```html
<script src="js/slot-notifications.js"></script>
```

### 2. **Eventi Personalizzati**
```javascript
// Ascolta eventi slot
window.SlotNotificationManager.on('slot_occupied', (data) => {
    console.log('Slot occupato:', data);
});

window.SlotNotificationManager.on('slot_available', (data) => {
    console.log('Slot disponibile:', data);
});
```

### 3. **Debug e Monitoraggio**
```javascript
// Stato connessione
const status = window.SlotNotificationManager.getConnectionStatus();
console.log('Connessione SSE:', status);

// Debug endpoint
fetch('/api/slots/debug/1/1/2025-09-02')
    .then(response => response.json())
    .then(data => console.log('Debug slot:', data));
```

## 🐛 Debug e Troubleshooting

### Endpoint Debug
```
GET /api/slots/debug/:sedeId/:spazioId/:data
```
Restituisce:
- Informazioni spazio
- Tutte le prenotazioni per la data
- Stato calcolato degli slot
- Timestamp

### Log Console
- `🔔` - Notifiche slot
- `⏰` - Timer e scadenze
- `✅` - Operazioni riuscite
- `❌` - Errori
- `🔄` - Riconnessioni

### Problemi Comuni

#### 1. **Slot non si aggiorna**
- Verifica connessione SSE: `window.SlotNotificationManager.getConnectionStatus()`
- Controlla endpoint debug: `/api/slots/debug/:sedeId/:spazioId/:data`
- Verifica log console per errori

#### 2. **Timer non funziona**
- Verifica che `SlotTimerService.startTimer()` sia chiamato
- Controlla che la prenotazione abbia stato "in attesa"
- Verifica log backend per errori timer

#### 3. **Notifiche non arrivano**
- Verifica connessione SSE
- Controlla CORS settings
- Verifica che `SSEController.broadcastUpdate()` sia chiamato

## 📊 Monitoraggio

### Metriche Backend
- Timer attivi: `SlotTimerService.getActiveTimers()`
- Connessioni SSE: `SSEController.getConnections()`
- Prenotazioni per stato: Query database

### Metriche Frontend
- Connessioni SSE: `SlotNotificationManager.getConnectionStatus()`
- Notifiche ricevute: Log console
- Errori di connessione: Log console

## 🔒 Sicurezza

- **CORS**: Configurato per domini specifici
- **Rate Limiting**: Implementato per endpoint SSE
- **Validazione**: Tutti i parametri validati
- **Sanitizzazione**: Input sanitizzato per prevenire XSS

## 🚀 Deployment

### Variabili d'Ambiente
```env
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3000
```

### Build e Deploy
```bash
# Install dependencies
npm install

# Start server
npm start

# O con PM2
pm2 start ecosystem.config.js
```

## 📈 Performance

- **SSE**: Connessioni persistenti, bassa latenza
- **Timer**: Gestiti in memoria, cleanup automatico
- **Cache**: Frontend cache per ridurre chiamate API
- **Debouncing**: Evita aggiornamenti eccessivi UI

## 🔮 Roadmap Future

- [ ] **WebSocket**: Sostituire SSE con WebSocket per bidirezionalità
- [ ] **Redis**: Cache distribuita per timer in cluster
- [ ] **Metrics**: Dashboard monitoraggio real-time
- [ ] **Mobile**: Notifiche push per app mobile
- [ ] **Analytics**: Tracking utilizzo slot e conversioni

---

## 📞 Supporto

Per problemi o domande:
1. Controlla i log console (frontend) e server (backend)
2. Usa endpoint debug per analizzare stato slot
3. Verifica connessione SSE e timer attivi
4. Consulta questa documentazione

**Sistema implementato da**: AI Assistant  
**Data**: Settembre 2025  
**Versione**: 1.0.0
