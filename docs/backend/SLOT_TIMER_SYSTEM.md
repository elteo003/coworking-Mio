# 🕐 Sistema Timer Slot - Backend

## 📋 Panoramica

Il sistema timer slot gestisce automaticamente la liberazione degli slot occupati scaduti e l'aggiornamento degli slot passati. Questo sistema garantisce che gli slot non rimangano bloccati indefinitamente e che lo stato sia sempre aggiornato.

## 🏗️ Architettura

### **Componenti Principali:**

1. **Middleware Timer** (`slotTimer.js`) - Esegue ad ogni richiesta
2. **Funzioni Database** - Liberano slot scaduti automaticamente
3. **Socket.IO Integration** - Notifica client in tempo reale
4. **Controller API** - Endpoint per gestione slot

## 🔧 Implementazione

### **Middleware Timer:**

```javascript
// Esegue ad ogni richiesta HTTP
app.use(updateExpiredSlots);

// Funzioni principali
async function freeExpiredSlots() {
    // Libera slot con held_until < now()
}

async function updatePastSlots() {
    // Marca slot passati come 'past'
}
```

### **Timer Automatico:**

```javascript
// Esegue ogni 30 secondi
setInterval(async () => {
    const [freedCount, pastCount] = await Promise.all([
        freeExpiredSlots(),
        updatePastSlots()
    ]);
    
    if (freedCount > 0) {
        socketService.broadcastToAll('slots_freed', {
            count: freedCount,
            timestamp: new Date().toISOString()
        });
    }
}, 30000);
```

## 📊 Database Schema

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

### **Funzioni Database:**

```sql
-- Libera slot scaduti
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

## 🔌 API Endpoints

### **Gestione Slot:**

- `GET /api/slots/:idSpazio/:date` - Stato slot
- `POST /api/slots/:id/hold` - Occupa slot (15 min)
- `POST /api/slots/:id/book` - Conferma prenotazione
- `POST /api/slots/:id/release` - Libera slot

### **Esempi:**

```javascript
// Occupa slot
POST /api/slots/1/hold
{
  "idSpazio": 1,
  "sedeId": 1,
  "date": "2024-12-20"
}

// Risposta
{
  "success": true,
  "message": "Slot occupato per 15 minuti",
  "data": {
    "slotId": 1,
    "heldUntil": "2024-12-20T10:15:00Z"
  }
}
```

## 🔄 Flusso Operativo

### **1. Occupazione Slot:**
```
Client clicca slot
    ↓
Aggiornamento ottimistico UI
    ↓
API POST /slots/:id/hold
    ↓
Database: status='occupied', held_until=now()+15min
    ↓
Socket.IO: broadcast slot_update
    ↓
Tutti i client aggiornano UI
```

### **2. Liberazione Automatica:**
```
Timer backend (ogni 30s)
    ↓
Query: SELECT slot WHERE held_until < now()
    ↓
UPDATE: status='available', held_until=NULL
    ↓
Socket.IO: broadcast slots_freed
    ↓
Client ricaricano stato slot
```

## 🚀 Vantaggi

### **Performance:**
- ⚡ Liberazione automatica senza intervento manuale
- ⚡ Aggiornamenti real-time via Socket.IO
- ⚡ Timer ottimizzato (30s) per bilanciare performance e responsività

### **Affidabilità:**
- 🔒 Doppio controllo: middleware + timer automatico
- 🔒 Gestione errori robusta
- 🔒 Logging dettagliato per debug

### **Scalabilità:**
- 📈 Funzioni database ottimizzate
- 📈 Indici per performance
- 📈 Socket.IO per notifiche efficienti

## 🔧 Configurazione

### **Variabili Ambiente:**

```env
# Timer interval (millisecondi)
SLOT_TIMER_INTERVAL=30000

# Hold duration (minuti)
SLOT_HOLD_DURATION=15

# Max reconnect attempts
SOCKET_MAX_RECONNECT=5
```

### **Avvio Sistema:**

```javascript
// In app.js
const { updateExpiredSlots, startSlotTimer } = require('./middleware/slotTimer');
app.use(updateExpiredSlots);
startSlotTimer();
```

## 📝 Note di Implementazione

### **Sicurezza:**
- 🔐 Autenticazione JWT per operazioni slot
- 🔐 Validazione input lato server
- 🔐 Controllo accessi per utenti

### **Monitoraggio:**
- 📊 Log dettagliati per debug
- 📊 Statistiche connessioni Socket.IO
- 📊 Metriche performance timer

### **Manutenibilità:**
- 🔧 Codice modulare e ben documentato
- 🔧 Separazione responsabilità
- 🔧 Test unitari per funzioni critiche

---

*Ultimo aggiornamento: Dicembre 2024*
*Versione: 1.0 - Sistema Timer Automatico*
