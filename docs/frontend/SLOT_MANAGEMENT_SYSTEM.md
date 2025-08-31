# 🎯 Sistema di Gestione Slot e Selezione - Versione 3.0

## 📋 Panoramica

Questo documento descrive il sistema completo per la gestione degli slot temporali e la selezione degli orari nel sistema di coworking. Il sistema è stato progettato per essere **fluido**, **intuitivo** e **visivamente chiaro** con gestione timer automatica e aggiornamenti real-time.

## 🏗️ Architettura del Sistema

### **Componenti Principali:**

1. **SlotManagerSocketIO** (`slot-manager-socketio.js`) - Gestione real-time con Socket.IO
2. **Sistema di Selezione** (`selezione-slot.js`) - Logica di selezione START/END con optimistic UI
3. **CSS Ottimizzato** (`selezione-slot.css`) - Stili accessibili senza !important
4. **Backend Timer** (`slotTimer.js`) - Middleware per gestione automatica slot scaduti
5. **Socket.IO Service** (`socketService.js`) - Servizio real-time per aggiornamenti
6. **Database Schema** - Tabella `slots` con campi `status` e `held_until`

---

## 🔄 Gestione Stati degli Slot

### **Stati Disponibili:**

| **Stato** | **Classe CSS** | **Colore** | **Cliccabile** | **Significato** |
|-----------|----------------|------------|----------------|-----------------|
| `available` | `slot-available` | Verde | ✅ Sì | Slot libero e prenotabile |
| `booked` | `slot-booked` | Rosso | ❌ No | Slot prenotato e pagato |
| `occupied` | `slot-occupied` | Arancione | ❌ No | Slot temporaneamente occupato (hold 15min) |
| `past` | `slot-past` | Grigio | ❌ No | Orario già passato |
| `scaduta` | `slot-available` | Verde | ✅ Sì | Slot scaduto, torna disponibile |

### **Flusso di Caricamento Stati:**

```javascript
// 1. Caricamento iniziale con stati corretti
async function createTimeSlots() {
    // PRIMA: Carica stati dal backend
    const slotsStatus = await fetchSlotsStatus();
    
    // POI: Crea bottoni con stati corretti
    for (let i = 0; i < orariApertura.length; i++) {
        const slotData = slotsStatus.find(s => s.id_slot === slotId);
        const status = slotData ? slotData.status : 'available';
        
        // Applica stato corretto direttamente
        applySlotState(slot, status);
    }
}
```

### **Aggiornamenti Real-time con Socket.IO:**

```javascript
// Socket.IO per aggiornamenti in tempo reale
this.socket = io(window.CONFIG.API_BASE, {
    auth: { token: token },
    transports: ['websocket', 'polling']
});

this.socket.on('slot_update', (data) => {
    this.handleSlotUpdate(data); // Aggiorna singolo slot
});

this.socket.on('slots_status_update', (data) => {
    this.updateSlotsFromStatus(data.slotsStatus); // Aggiorna tutti
});

this.socket.on('slots_freed', (data) => {
    this.loadInitialSlotsStatus(); // Ricarica quando slot vengono liberati
});
```

### **Gestione Timer Automatica:**

```sql
-- Schema tabella slots
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

---

## 🎯 Sistema di Selezione START/END

### **Concetto Base:**

Il sistema utilizza **due bottoni blu sempre visibili** per indicare chiaramente l'inizio e la fine della selezione:

- **🔵 START (Blu)**: Primo slot selezionato
- **🔵 END (Blu)**: Ultimo slot selezionato  
- **🟠 INTERMEDI (Arancione)**: Slot tra START e END

### **Struttura Dati:**

```javascript
let selectionState = {
    startSlot: null,    // ID del slot di inizio (blu)
    endSlot: null,      // ID del slot di fine (blu)
    allSelected: new Set() // Tutti gli slot selezionati (per calcoli)
};
```

### **Logica di Selezione:**

```javascript
function handleSlotClick(slotId, slotElement) {
    if (selectionState.startSlot === null) {
        // Nessun slot selezionato → diventa START
        setAsStart(slotId, slotElement);
    } else if (selectionState.endSlot === null) {
        // Solo START selezionato → diventa END
        setAsEnd(slotId, slotElement);
    } else {
        // Entrambi selezionati → gestisci deselezione o nuovo START
        handleFullSelection(slotId, slotElement);
    }
}
```

---

## 🔌 Nuovi Endpoint API

### **Gestione Slot:**

```javascript
// GET /api/slots/:idSpazio/:date - Ottieni stato slot
GET /api/slots/1/2024-12-20
Response: {
  "success": true,
  "data": {
    "slots": [
      {
        "id": 1,
        "id_spazio": 1,
        "start_time": "2024-12-20T09:00:00Z",
        "end_time": "2024-12-20T10:00:00Z",
        "status": "available",
        "held_until": null,
        "id_utente": null
      }
    ]
  }
}

// POST /api/slots/:id/hold - Occupa slot per 15 minuti
POST /api/slots/1/hold
Headers: { "Authorization": "Bearer <token>" }
Body: { "idSpazio": 1, "sedeId": 1, "date": "2024-12-20" }
Response: {
  "success": true,
  "message": "Slot occupato per 15 minuti",
  "data": {
    "slotId": 1,
    "heldUntil": "2024-12-20T10:15:00Z"
  }
}

// POST /api/slots/:id/book - Conferma prenotazione
POST /api/slots/1/book
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "success": true,
  "message": "Slot prenotato con successo",
  "data": { "slotId": 1, "status": "booked" }
}

// POST /api/slots/:id/release - Libera slot occupato
POST /api/slots/1/release
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "success": true,
  "message": "Slot liberato con successo",
  "data": { "slotId": 1, "status": "available" }
}
```

### **Eventi Socket.IO:**

```javascript
// Eventi emessi dal server
'slot_update' - Aggiornamento singolo slot
'slots_status_update' - Aggiornamento completo stato slot
'slots_freed' - Notifica slot liberati automaticamente

// Eventi emessi dal client
'join_space' - Entra in room spazio specifico
'leave_space' - Esce da room spazio
```

---

## 🎨 Comportamenti di Selezione

### **1. Prima Selezione:**
```
Click 10:00 → [9:00] [10:00🔵] [11:00] [12:00] [13:00] [14:00] [15:00]
              (START)
```

### **2. Seconda Selezione:**
```
Click 14:00 → [9:00] [10:00🔵] [11:00🟠] [12:00🟠] [13:00🟠] [14:00🔵] [15:00]
              (START)          (SELECTED) (SELECTED) (SELECTED) (END)
```

### **3. Deselezione START:**
```
Click 10:00 → [9:00] [10:00] [11:00🟠] [12:00🟠] [13:00🟠] [14:00🔵] [15:00]
              (deselezionato)  (SELECTED) (SELECTED) (SELECTED) (nuovo START)
```

### **4. Deselezione END:**
```
Click 14:00 → [9:00] [10:00🔵] [11:00🟠] [12:00🟠] [13:00🟠] [14:00] [15:00]
              (START)          (SELECTED) (SELECTED) (SELECTED) (deselezionato)
```

### **5. Nuovo START:**
```
Click 12:00 → [9:00] [10:00] [11:00] [12:00🔵] [13:00🟠] [14:00🔵] [15:00]
              (nuovo START)    (SELECTED) (END)
```

---

## 🛠️ Funzioni Principali

### **Gestione Selezione:**

```javascript
// Imposta uno slot come START (blu)
function setAsStart(slotId, slotElement) {
    selectionState.startSlot = slotId;
    selectionState.allSelected.add(slotId);
    slotElement.classList.add('slot-start');
    slotElement.title = 'Inizio selezione';
}

// Imposta uno slot come END (blu)
function setAsEnd(slotId, slotElement) {
    const minId = Math.min(selectionState.startSlot, slotId);
    const maxId = Math.max(selectionState.startSlot, slotId);
    
    selectionState.startSlot = minId;
    selectionState.endSlot = maxId;
    
    // Colora slot intermedi
    for (let id = minId + 1; id < maxId; id++) {
        const element = document.querySelector(`[data-slot-id="${id}"]`);
        element.classList.add('slot-selected');
    }
}

// Deseleziona START, END diventa nuovo START
function deselectStart() {
    const endId = selectionState.endSlot;
    clearAllSelections();
    selectionState.startSlot = endId;
    selectionState.endSlot = null;
    selectionState.allSelected.add(endId);
}

// Deseleziona END, START rimane
function deselectEnd() {
    const startId = selectionState.startSlot;
    clearAllSelections();
    selectionState.startSlot = startId;
    selectionState.endSlot = null;
    selectionState.allSelected.add(startId);
}
```

### **Gestione Stati:**

```javascript
// Applica stato corretto a uno slot
function applySlotState(slot, status) {
    slot.classList.remove('slot-available', 'slot-booked', 'slot-occupied', 'slot-past');
    
    switch (status) {
        case 'available':
            slot.classList.add('slot-available');
            slot.disabled = false;
            slot.title = 'Disponibile';
            break;
        case 'booked':
            slot.classList.add('slot-booked');
            slot.disabled = true;
            slot.title = 'Prenotato';
            break;
        case 'occupied':
            slot.classList.add('slot-occupied');
            slot.disabled = true;
            slot.title = 'Occupato';
            break;
        case 'past':
            slot.classList.add('slot-past');
            slot.disabled = true;
            slot.title = 'Passato';
            break;
    }
}
```

---

## 🎨 Stili CSS

### **Stati di Selezione:**

```css
/* START e END - Entrambi blu */
.slot-start, .slot-end {
    background-color: #007bff !important;
    border-color: #0056b3 !important;
    color: white !important;
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.5) !important;
}

.slot-start:hover, .slot-end:hover {
    background-color: #0056b3 !important;
    border-color: #004085 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.6) !important;
}

/* Slot intermedi - Arancione */
.slot-selected {
    background-color: #fd7e14 !important;
    border-color: #e55100 !important;
    color: white !important;
    box-shadow: 0 0 8px rgba(253, 126, 20, 0.4) !important;
}

.slot-selected:hover {
    background-color: #e55100 !important;
    border-color: #cc4400 !important;
    transform: translateY(-1px);
    box-shadow: 0 3px 12px rgba(253, 126, 20, 0.5) !important;
}
```

### **Stati di Disponibilità:**

```css
/* Disponibile - Verde */
.slot-available {
    background-color: #28a745 !important;
    border-color: #1e7e34 !important;
}

/* Prenotato - Rosso */
.slot-booked {
    background-color: #dc3545 !important;
    border-color: #c82333 !important;
}

/* Occupato - Arancione */
.slot-occupied {
    background-color: #ffc107 !important;
    border-color: #e0a800 !important;
}

/* Passato - Grigio */
.slot-past {
    background-color: #6c757d !important;
    border-color: #5a6268 !important;
}
```

---

## 🔄 Flusso Completo

### **1. Inizializzazione:**
```
Utente seleziona data/spazio
         ↓
Carica stati slot dal backend
         ↓
Crea bottoni con stati corretti
         ↓
SlotManager si connette per aggiornamenti real-time
```

### **2. Selezione:**
```
Click su slot disponibile
         ↓
handleSlotClick() determina azione
         ↓
setAsStart() o setAsEnd() o handleFullSelection()
         ↓
Aggiorna UI e stato
         ↓
updateSelectionUI() aggiorna riepilogo
```

### **3. Aggiornamenti Real-time con Optimistic UI:**
```
Click su slot disponibile
         ↓
Aggiornamento ottimistico UI (immediato)
         ↓
Chiamata API per occupare slot
         ↓
Se successo: conferma UI
Se errore: revert UI + alert
         ↓
Socket.IO aggiorna tutti i client
```

### **4. Gestione Timer Automatica:**
```
Timer backend (ogni 30s)
         ↓
Libera slot con held_until < now()
         ↓
Socket.IO notifica tutti i client
         ↓
Frontend ricarica stato slot
```

---

## 📊 Mappatura Slot

### **Conversione Orario ↔ Slot ID:**

```javascript
// Orari: 9:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
// Slot ID: 1,   2,   3,   4,   5,   6,   7,   8,   9

// Conversione: slotId = hour - 8
// 9:00 → slotId = 1
// 10:00 → slotId = 2
// 11:00 → slotId = 3
// etc.
```

### **Calcolo Range:**

```javascript
// Per un intervallo 10:00 - 14:00
const startSlotId = 10 - 8; // = 2
const endSlotId = 14 - 8;   // = 6

// Slot selezionati: 2, 3, 4, 5, 6
// START: 2 (10:00)
// END: 6 (14:00)  
// INTERMEDI: 3, 4, 5 (11:00, 12:00, 13:00)
```

---

## 🚀 Vantaggi del Sistema

### **1. Visibilità Chiara:**
- START e END sempre visibili in blu
- Slot intermedi chiaramente identificati in arancione
- Stati di disponibilità immediatamente riconoscibili

### **2. Logica Intuitiva:**
- Comportamento prevedibile e coerente
- Deselezione intelligente che mantiene la logica
- Transizioni fluide tra stati

### **3. Performance Ottimizzata:**
- Caricamento diretto con stati corretti (no flickering)
- Aggiornamenti real-time efficienti
- Gestione stato semplificata

### **4. UX Migliorata:**
- Feedback visivo immediato con optimistic UI
- Controllo granulare della selezione
- Interfaccia responsive e moderna
- Accessibilità migliorata (aria-label, role="button")
- Indicatori visivi START/END con etichette

### **5. Performance Ottimizzate:**
- Socket.IO invece di SSE per migliore performance
- Timer automatico backend per liberare slot scaduti
- CSS ottimizzato senza !important
- Gestione connessioni con riconnessione automatica

---

## 🔧 Configurazione

### **File Coinvolti:**

- `frontend/public/js/selezione-slot.js` - Logica principale con optimistic UI
- `frontend/public/js/slot-manager-socketio.js` - Gestione real-time con Socket.IO
- `frontend/public/css/selezione-slot.css` - Stili accessibili ottimizzati
- `frontend/public/selezione-slot.html` - Struttura HTML
- `backend/src/middleware/slotTimer.js` - Middleware timer automatico
- `backend/src/services/socketService.js` - Servizio Socket.IO
- `backend/src/controllers/slotController.js` - Controller gestione slot
- `backend/src/routes/slots.js` - Route API slot
- `database/migration-slots-system.sql` - Schema database

### **Dipendenze:**

- **Bootstrap** - Framework CSS base
- **Socket.IO** - Aggiornamenti real-time bidirezionali
- **Fetch API** - Comunicazione con backend
- **CSS Custom Properties** - Stili personalizzati
- **PostgreSQL** - Database con funzioni per timer automatico

---

## 📝 Note di Implementazione

### **Compatibilità:**
- ✅ Browser moderni (ES6+)
- ✅ Mobile responsive
- ✅ Accessibilità migliorata (aria-label, role="button")
- ✅ Socket.IO con fallback polling

### **Performance:**
- ⚡ Caricamento ottimizzato (no flickering)
- ⚡ Aggiornamenti real-time efficienti con Socket.IO
- ⚡ Gestione memoria ottimizzata
- ⚡ Timer automatico backend per slot scaduti
- ⚡ Optimistic UI per feedback immediato

### **Manutenibilità:**
- 🔧 Codice modulare e ben documentato
- 🔧 Separazione logica/presentazione
- 🔧 Facile estensione per nuove funzionalità
- 🔧 CSS ottimizzato senza !important
- 🔧 Gestione errori robusta con retry automatico

### **Sicurezza:**
- 🔐 Autenticazione JWT per Socket.IO
- 🔐 Validazione input lato server
- 🔐 Controllo accessi per operazioni slot
- 🔐 Sanitizzazione dati database

---

*Ultimo aggiornamento: Dicembre 2024*
*Versione: 3.0 - Sistema Timer + Socket.IO + Optimistic UI*