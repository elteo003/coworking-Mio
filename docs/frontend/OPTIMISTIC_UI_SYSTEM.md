# ⚡ Sistema Optimistic UI - Frontend

## 📋 Panoramica

Il sistema Optimistic UI fornisce feedback immediato all'utente durante le operazioni di prenotazione slot, migliorando significativamente l'esperienza utente. L'interfaccia si aggiorna immediatamente, poi conferma o reverte le modifiche in base alla risposta del server.

## 🏗️ Architettura

### **Componenti Principali:**

1. **SlotManagerSocketIO** - Gestione real-time con Socket.IO
2. **Optimistic Updates** - Aggiornamenti UI immediati
3. **Error Handling** - Gestione errori con revert automatico
4. **Accessibility** - Miglioramenti accessibilità (aria-label, role)

## 🔧 Implementazione

### **Aggiornamento Optimistic:**

```javascript
async holdSlot(slotId) {
    const button = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (!button || button.disabled) return false;

    try {
        // 1. AGGIORNAMENTO OTTIMISTICO UI (immediato)
        const originalStatus = button.className;
        button.classList.remove('slot-available');
        button.classList.add('slot-occupied');
        button.disabled = true;
        button.title = 'Occupato';

        // 2. CHIAMATA API
        const response = await fetch(`${window.CONFIG.API_BASE}/slots/${slotId}/hold`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                idSpazio: this.currentSpazio,
                sedeId: this.currentSede,
                date: this.currentDate
            })
        });

        if (response.ok) {
            // 3. CONFERMA SUCCESSO
            console.log('✅ Slot occupato con successo');
            return true;
        } else {
            // 4. REVERT IN CASO DI ERRORE
            button.className = originalStatus;
            button.disabled = false;
            console.error('❌ Errore nell\'occupare slot:', response.status);
            return false;
        }
    } catch (error) {
        // 5. REVERT IN CASO DI ERRORE NETWORK
        button.classList.remove('slot-occupied');
        button.classList.add('slot-available');
        button.disabled = false;
        button.title = 'Disponibile';
        console.error('❌ Errore nell\'occupare slot:', error);
        return false;
    }
}
```

## 🎯 Flusso Optimistic UI

### **1. Click Utente:**
```
Utente clicca slot disponibile
    ↓
Aggiornamento UI immediato (ottimistico)
    ↓
Slot appare come "occupato" istantaneamente
    ↓
Chiamata API in background
```

### **2. Risposta Server:**
```
Se SUCCESSO:
    ↓
Conferma UI (slot rimane occupato)
    ↓
Socket.IO notifica altri client
    ↓
Tutti vedono slot occupato

Se ERRORE:
    ↓
Revert UI (slot torna disponibile)
    ↓
Mostra alert errore
    ↓
Utente può riprovare
```

## 🔄 Integrazione con Socket.IO

### **Gestione Aggiornamenti Real-time:**

```javascript
// Riceve aggiornamenti da altri client
this.socket.on('slot_update', (data) => {
    this.handleSlotUpdate(data);
});

this.socket.on('slots_freed', (data) => {
    // Ricarica stato quando slot vengono liberati automaticamente
    this.loadInitialSlotsStatus();
});
```

### **Sincronizzazione Stato:**

```javascript
handleSlotUpdate(data) {
    const { slotId, status, data: slotData } = data;
    
    // Aggiorna stato locale
    this.slotsStatus.set(slotId, {
        status: status,
        ...slotData
    });
    
    // Aggiorna UI solo se non è l'utente corrente
    if (slotData.id_utente !== this.currentUserId) {
        this.updateSlotButton(slotId, status, slotData);
    }
}
```

## 🎨 Miglioramenti Accessibilità

### **Attributi ARIA:**

```javascript
updateSlotButton(slotId, status, slotData = {}) {
    const button = document.querySelector(`[data-slot-id="${slotId}"]`);
    
    switch (status) {
        case 'available':
            button.classList.add('slot-available');
            button.disabled = false;
            button.title = 'Disponibile';
            button.setAttribute('aria-label', 'Slot disponibile per la prenotazione');
            button.setAttribute('role', 'button');
            break;
        case 'occupied':
            button.classList.add('slot-occupied');
            button.disabled = true;
            button.title = 'Occupato';
            button.setAttribute('aria-label', 'Slot temporaneamente occupato');
            break;
    }
}
```

### **Indicatori Visivi:**

```css
/* Etichette START/END */
.slot-button.slot-start::after {
    content: "START";
    position: absolute;
    top: -8px;
    right: -8px;
    background: #0056b3;
    color: white;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 3px;
    font-weight: bold;
}

.slot-button.slot-end::after {
    content: "END";
    position: absolute;
    top: -8px;
    right: -8px;
    background: #0056b3;
    color: white;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 3px;
    font-weight: bold;
}
```

## 🚀 Vantaggi Optimistic UI

### **Esperienza Utente:**
- ⚡ Feedback immediato (0ms di latenza percepita)
- ⚡ Interfaccia reattiva e fluida
- ⚡ Riduzione percezione tempi di attesa
- ⚡ Migliore engagement utente

### **Performance:**
- ⚡ UI aggiornata prima della chiamata API
- ⚡ Gestione errori con revert automatico
- ⚡ Sincronizzazione real-time via Socket.IO
- ⚡ Fallback robusto in caso di errori

### **Accessibilità:**
- ♿ Attributi ARIA per screen reader
- ♿ Indicatori visivi chiari
- ♿ Gestione focus e navigazione
- ♿ Messaggi di stato descrittivi

## 🔧 Gestione Errori

### **Tipi di Errore:**

```javascript
// 1. Errore Network
catch (error) {
    // Revert UI
    this.revertSlotState(slotId, originalState);
    this.showError('Errore di connessione. Riprova.');
}

// 2. Errore Server (409 Conflict)
if (response.status === 409) {
    // Slot già occupato da altro utente
    this.revertSlotState(slotId, originalState);
    this.showError('Slot non più disponibile. Aggiorna la pagina.');
}

// 3. Errore Autenticazione (401)
if (response.status === 401) {
    // Token scaduto
    this.revertSlotState(slotId, originalState);
    this.redirectToLogin();
}
```

### **Revert Automatico:**

```javascript
revertSlotState(slotId, originalState) {
    const button = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (button) {
        button.className = originalState.className;
        button.disabled = originalState.disabled;
        button.title = originalState.title;
        button.setAttribute('aria-label', originalState.ariaLabel);
    }
}
```

## 📱 Responsive Design

### **Mobile Optimization:**

```css
@media (max-width: 768px) {
    .slot-button {
        padding: 0.6rem 1.2rem;
        margin: 0.3rem;
        font-size: 0.9rem;
        min-width: 70px;
    }
    
    .slot-button.slot-start::after,
    .slot-button.slot-end::after {
        font-size: 8px;
        padding: 1px 3px;
    }
}
```

### **Touch Interactions:**

```javascript
// Gestione touch per mobile
button.addEventListener('touchstart', (e) => {
    e.preventDefault();
    // Feedback tattile
    button.style.transform = 'scale(0.95)';
});

button.addEventListener('touchend', (e) => {
    e.preventDefault();
    button.style.transform = '';
    // Trigger click
    button.click();
});
```

## 🔄 Sincronizzazione Stato

### **Gestione Conflitti:**

```javascript
// Quando riceve aggiornamento da server
handleServerUpdate(slotId, serverStatus) {
    const localStatus = this.getLocalSlotStatus(slotId);
    
    if (localStatus !== serverStatus) {
        // Conflitto: aggiorna con stato server
        this.updateSlotButton(slotId, serverStatus);
        this.showInfo('Stato slot aggiornato da server');
    }
}
```

### **Cache Invalidation:**

```javascript
// Invalida cache quando necessario
invalidateSlotCache() {
    this.slotsStatus.clear();
    this.loadInitialSlotsStatus();
}
```

## 📊 Metriche Performance

### **Tempi di Risposta:**

```javascript
// Misura performance
const startTime = performance.now();

await this.holdSlot(slotId);

const endTime = performance.now();
const responseTime = endTime - startTime;

console.log(`Slot hold: ${responseTime}ms`);
```

### **Tasso di Successo:**

```javascript
// Traccia successi/errori
trackSlotOperation(slotId, success) {
    const metrics = {
        timestamp: new Date().toISOString(),
        slotId: slotId,
        success: success,
        userId: this.currentUserId
    };
    
    // Invia a analytics
    this.sendAnalytics('slot_operation', metrics);
}
```

## 📝 Note di Implementazione

### **Best Practices:**
- ✅ Aggiorna UI prima della chiamata API
- ✅ Mantieni stato originale per revert
- ✅ Gestisci tutti i tipi di errore
- ✅ Fornisci feedback visivo chiaro

### **Considerazioni:**
- ⚠️ Gestisci conflitti con aggiornamenti server
- ⚠️ Implementa timeout per chiamate API
- ⚠️ Considera stato offline/disconnesso
- ⚠️ Testa scenari di errore

### **Accessibilità:**
- ♿ Usa attributi ARIA appropriati
- ♿ Fornisci alternative testuali
- ♿ Gestisci navigazione da tastiera
- ♿ Testa con screen reader

---

*Ultimo aggiornamento: Dicembre 2024*
*Versione: 1.0 - Sistema Optimistic UI*
