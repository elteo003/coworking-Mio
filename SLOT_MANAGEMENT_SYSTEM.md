# 🎯 Sistema di Gestione Slot e Selezione

## 📋 Panoramica

Questo documento descrive il sistema completo per la gestione degli slot temporali e la selezione degli orari nel sistema di coworking. Il sistema è stato progettato per essere **fluido**, **intuitivo** e **visivamente chiaro**.

## 🏗️ Architettura del Sistema

### **Componenti Principali:**

1. **SlotManager** (`slot-manager.js`) - Gestione real-time degli stati slot
2. **Sistema di Selezione** (`selezione-slot.js`) - Logica di selezione START/END
3. **CSS Personalizzato** (`selezione-slot.css`) - Stili visivi per gli stati
4. **Backend API** - Endpoint per disponibilità e aggiornamenti real-time

---

## 🔄 Gestione Stati degli Slot

### **Stati Disponibili:**

| **Stato** | **Classe CSS** | **Colore** | **Cliccabile** | **Significato** |
|-----------|----------------|------------|----------------|-----------------|
| `available` | `slot-available` | Verde | ✅ Sì | Slot libero e prenotabile |
| `booked` | `slot-booked` | Rosso | ❌ No | Slot prenotato e pagato |
| `occupied` | `slot-occupied` | Arancione | ❌ No | Slot temporaneamente occupato (hold 15min) |
| `past` | `slot-past` | Grigio | ❌ No | Orario già passato |

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

### **Aggiornamenti Real-time:**

```javascript
// Server-Sent Events per aggiornamenti in tempo reale
this.eventSource = new EventSource(`/sse/status-stream?token=${token}`);

this.eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
        case 'slot_update':
            this.handleSlotUpdate(data); // Aggiorna singolo slot
            break;
        case 'slots_status_update':
            this.updateSlotsFromStatus(data.slotsStatus); // Aggiorna tutti
            break;
    }
};
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

### **3. Aggiornamenti Real-time:**
```
SSE riceve aggiornamento
         ↓
SlotManager.handleSlotUpdate()
         ↓
updateSlotButton() aggiorna singolo slot
         ↓
UI riflette nuovo stato
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
- Feedback visivo immediato
- Controllo granulare della selezione
- Interfaccia responsive e moderna

---

## 🔧 Configurazione

### **File Coinvolti:**

- `frontend/public/js/selezione-slot.js` - Logica principale
- `frontend/public/js/slot-manager.js` - Gestione real-time
- `frontend/public/css/selezione-slot.css` - Stili visivi
- `frontend/public/selezione-slot.html` - Struttura HTML

### **Dipendenze:**

- **Bootstrap** - Framework CSS base
- **Server-Sent Events** - Aggiornamenti real-time
- **Fetch API** - Comunicazione con backend
- **CSS Custom Properties** - Stili personalizzati

---

## 📝 Note di Implementazione

### **Compatibilità:**
- ✅ Browser moderni (ES6+)
- ✅ Mobile responsive
- ✅ Accessibilità migliorata

### **Performance:**
- ⚡ Caricamento ottimizzato (no flickering)
- ⚡ Aggiornamenti real-time efficienti
- ⚡ Gestione memoria ottimizzata

### **Manutenibilità:**
- 🔧 Codice modulare e ben documentato
- 🔧 Separazione logica/presentazione
- 🔧 Facile estensione per nuove funzionalità

---

*Ultimo aggiornamento: Dicembre 2024*
*Versione: 2.0 - Sistema START/END*