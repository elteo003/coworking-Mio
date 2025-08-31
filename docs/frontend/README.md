# 🎨 Frontend CoworkSpace v2.0

## 📋 Panoramica

Frontend moderno per il sistema di gestione coworking con interfaccia reattiva, comunicazione real-time e sistema optimistic UI avanzato.

## 🏗️ Architettura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTML5/CSS3    │    │   JavaScript    │    │   Socket.IO     │
│                 │    │                 │    │                 │
│ • Semantic HTML │◄──►│ • ES6+ Modules │◄──►│ • Real-time     │
│ • Responsive    │    │ • Optimistic UI │    │ • Events        │
│ • Accessibility │    │ • State Mgmt    │    │ • Rooms         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Bootstrap 5   │    │   Font Awesome  │    │   Backend API   │
│                 │    │                 │    │                 │
│ • Components    │    │ • Icons         │    │ • REST Endpoints│
│ • Grid System   │    │ • Symbols       │    │ • Authentication│
│ • Utilities     │    │ • Styling       │    │ • Data Fetching │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Stack Tecnologico

### Core
- **HTML5** - Markup semantico e accessibile
- **CSS3** - Stili moderni con variabili CSS
- **Vanilla JavaScript ES6+** - Moduli modulari e performanti
- **Socket.IO Client** - Comunicazione real-time

### UI Framework
- **Bootstrap 5** - Componenti e grid system
- **Font Awesome** - Icone e simboli
- **Custom CSS** - Stili personalizzati per slot

### Features
- **Optimistic UI** - Feedback immediato
- **Real-time Updates** - Aggiornamenti istantanei
- **Responsive Design** - Mobile-first approach
- **Accessibility** - ARIA attributes e keyboard navigation

## 📁 Struttura Progetto

```
frontend/
└── 📁 public/
    ├── 📁 css/                  # Stili personalizzati
    │   ├── style.css            # Stili principali
    │   ├── selezione-slot.css   # Stili slot selection
    │   ├── modern-design.css    # Design moderno
    │   ├── catalog.css          # Stili catalogo
    │   └── dashboard-*.css      # Stili dashboard
    ├── 📁 js/                   # JavaScript modulare
    │   ├── config.js            # Configurazione globale
    │   ├── main.js              # Entry point principale
    │   ├── auth-modal.js        # Modal autenticazione
    │   ├── selezione-slot.js    # Logica selezione slot
    │   ├── slot-manager-socketio.js # Gestione slot real-time
    │   ├── slot-manager.js      # Gestione slot base
    │   ├── slot-notifications.js # Notifiche slot
    │   ├── dashboard.js         # Dashboard utente
    │   ├── dashboard-responsabili.js # Dashboard responsabili
    │   ├── catalogo.js          # Catalogo spazi
    │   ├── pagamento.js         # Gestione pagamenti
    │   ├── analytics.js         # Analytics e tracking
    │   ├── ab-testing.js        # A/B testing
    │   ├── cache-manager.js     # Gestione cache
    │   ├── error-handler.js     # Gestione errori
    │   ├── types.js             # Definizioni tipi
    │   └── ...
    ├── 📁 images/               # Immagini e assets
    ├── index.html               # Homepage
    ├── login.html               # Pagina login
    ├── selezione-slot.html      # Selezione slot
    ├── pagamento.html           # Pagina pagamento
    ├── dashboard.html           # Dashboard utente
    ├── dashboard-gestori.html   # Dashboard gestori
    ├── dashboard-responsabili.html # Dashboard responsabili
    ├── catalogo.html            # Catalogo spazi
    └── ...
```

## 🚀 Quick Start

### Prerequisiti
- Server web (Live Server, Apache, Nginx)
- Backend CoworkSpace in esecuzione
- Browser moderno con supporto ES6+

### Setup

1. **Clona il repository**
   ```bash
   git clone <repository>
   cd Coworking/frontend
   ```

2. **Configura il backend**
   ```bash
   # Assicurati che il backend sia in esecuzione
   cd ../backend
   npm start
   ```

3. **Avvia il frontend**
   ```bash
   # Opzione 1: Live Server (VS Code)
   # Clicca destro su index.html → "Open with Live Server"
   
   # Opzione 2: Python
   python -m http.server 8000
   
   # Opzione 3: Node.js
   npx serve public
   ```

4. **Apri nel browser**
   ```
   http://localhost:8000
   ```

## 🔧 Configurazione

### Configurazione Globale

Il file `config.js` contiene tutte le configurazioni:

```javascript
// Configurazione API
const CONFIG = {
    API_BASE: 'https://your-backend-url.com/api',
    SUPABASE_URL: 'https://your-supabase-url.supabase.co',
    SUPABASE_ANON_KEY: 'your-supabase-anon-key'
};

// Configurazione Socket.IO
const SOCKET_BASE_URL = CONFIG.API_BASE.replace('/api', '');
```

### Variabili Ambiente

Per sviluppo locale, modifica `config.js`:

```javascript
// Sviluppo locale
const CONFIG = {
    API_BASE: 'http://localhost:3001/api',
    // ... altre configurazioni
};
```

## 🎯 Funzionalità Principali

### Sistema Selezione Slot

#### Caratteristiche
- **Selezione multi-slot** con range temporale
- **Feedback visivo immediato** (START/END/SELECTED)
- **Stati slot colorati**:
  - 🟢 **Available** - Verde, cliccabile
  - 🟠 **Occupied** - Arancione, non cliccabile
  - 🔴 **Booked** - Rosso, non cliccabile
  - ⚫ **Past** - Grigio, non cliccabile

#### Logica Selezione
```javascript
// Selezione slot con range
function setAsStart(slotId) {
    // Imposta slot come inizio selezione
    selectionState.startSlot = slotId;
    slotElement.classList.add('slot-start');
}

function setAsEnd(slotId) {
    // Imposta slot come fine selezione
    selectionState.endSlot = slotId;
    slotElement.classList.add('slot-end');
    
    // Seleziona tutti gli slot intermedi
    selectIntermediateSlots();
}
```

### Sistema Optimistic UI

#### Caratteristiche
- **Feedback immediato** (0ms latenza percepita)
- **Revert automatico** in caso di errore
- **Stati temporanei** per occupazione slot
- **Gestione errori robusta**

#### Implementazione
```javascript
// Aggiornamento ottimistico
function holdSlotOptimistic(slotId) {
    // 1. Aggiorna UI immediatamente
    updateSlotUI(slotId, 'occupied-temp');
    
    // 2. Chiama API
    fetch('/api/slots/' + slotId + '/hold', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => {
        if (!response.ok) {
            // 3. Revert in caso di errore
            revertSlotUI(slotId);
            throw new Error('Errore occupazione slot');
        }
    })
    .catch(error => {
        // 4. Gestione errore
        showError('Impossibile occupare lo slot');
    });
}
```

### Comunicazione Real-time

#### Socket.IO Events

**Client → Server:**
```javascript
// Entra in room spazio
socket.emit('join_space', {
    spazioId: 1,
    sedeId: 1,
    date: '2024-01-01'
});

// Occupa slot
socket.emit('slot_hold', {
    slotId: 1,
    spazioId: 1,
    sedeId: 1,
    date: '2024-01-01'
});
```

**Server → Client:**
```javascript
// Aggiornamento slot
socket.on('slot_update', (data) => {
    updateSlotButton(data.slotId, data.status, data.slotData);
});

// Aggiornamento completo
socket.on('slots_status_update', (data) => {
    updateAllSlots(data.slots);
});
```

## 🎨 Design System

### Colori Slot

```css
/* Slot disponibili */
.slot-available {
    background-color: #28a745; /* Verde */
    border-color: #28a745;
}

/* Slot occupati */
.slot-occupied {
    background-color: #fd7e14; /* Arancione */
    border-color: #fd7e14;
}

/* Slot prenotati */
.slot-booked {
    background-color: #dc3545; /* Rosso */
    border-color: #dc3545;
}

/* Slot passati */
.slot-past {
    background-color: #6c757d; /* Grigio */
    border-color: #6c757d;
}
```

### Componenti UI

#### Slot Button
```html
<button class="btn btn-lg slot-button slot-available" 
        data-slot-id="1" 
        data-orario="09:00"
        aria-label="Slot disponibile per le 09:00">
    09:00
</button>
```

#### Modal Autenticazione
```html
<div class="modal fade" id="authModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <!-- Contenuto modal -->
        </div>
    </div>
</div>
```

## ♿ Accessibilità

### ARIA Attributes
```html
<!-- Slot con attributi ARIA -->
<button class="slot-button" 
        aria-label="Slot disponibile per le 09:00"
        aria-pressed="false"
        role="button">
    09:00
</button>
```

### Keyboard Navigation
```javascript
// Navigazione da tastiera
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
        focusNextSlot();
    } else if (event.key === 'ArrowLeft') {
        focusPreviousSlot();
    }
});
```

### Screen Reader Support
```html
<!-- Annunci per screen reader -->
<div class="sr-only" aria-live="polite" id="slot-announcer">
    Slot 09:00 selezionato come inizio
</div>
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First */
@media (max-width: 576px) {
    .slot-button {
        width: 100%;
        margin-bottom: 0.5rem;
    }
}

/* Tablet */
@media (min-width: 768px) {
    .time-slots-container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
    }
}

/* Desktop */
@media (min-width: 992px) {
    .time-slots-container {
        grid-template-columns: repeat(4, 1fr);
    }
}
```

## 🧪 Testing

### Test Manuali

1. **Test Selezione Slot**
   - Clicca su slot disponibili
   - Verifica feedback visivo
   - Testa selezione multi-slot

2. **Test Real-time**
   - Apri due browser
   - Occupa slot in uno
   - Verifica aggiornamento nell'altro

3. **Test Responsive**
   - Ridimensiona browser
   - Verifica layout mobile
   - Testa touch su mobile

### Test Automatizzati

```javascript
// Test selezione slot
function testSlotSelection() {
    const slot = document.querySelector('.slot-available');
    slot.click();
    
    assert(slot.classList.contains('slot-start'));
    assert(selectionState.startSlot === 1);
}
```

## 🚀 Performance

### Ottimizzazioni

1. **Lazy Loading**
   ```javascript
   // Carica componenti solo quando necessario
   if (document.getElementById('selezione-slot')) {
       loadSlotManager();
   }
   ```

2. **Debouncing**
   ```javascript
   // Evita chiamate API eccessive
   const debouncedSearch = debounce(searchSpazi, 300);
   ```

3. **Caching**
   ```javascript
   // Cache dati localmente
   const cache = new Map();
   if (cache.has(key)) {
       return cache.get(key);
   }
   ```

### Bundle Size
- **JavaScript**: ~150KB (minificato)
- **CSS**: ~50KB (minificato)
- **Images**: ~100KB (ottimizzate)

## 🔧 Sviluppo

### Struttura Moduli

```javascript
// Modulo config.js
const CONFIG = {
    // Configurazioni globali
};

// Modulo slot-manager.js
class SlotManager {
    constructor() {
        // Inizializzazione
    }
    
    updateSlot(slotId, status) {
        // Logica aggiornamento
    }
}

// Modulo main.js
document.addEventListener('DOMContentLoaded', () => {
    // Inizializzazione app
    initializeApp();
});
```

### Best Practices

1. **Modularità**
   - Un file per funzionalità
   - Dipendenze esplicite
   - API chiare

2. **Error Handling**
   ```javascript
   try {
       await riskyOperation();
   } catch (error) {
       console.error('Errore:', error);
       showUserFriendlyError();
   }
   ```

3. **Performance**
   - Evita DOM queries ripetute
   - Usa event delegation
   - Minimizza reflow/repaint

## 📚 Documentazione Correlata

- **[Slot Management System](SLOT_MANAGEMENT_SYSTEM.md)** - Sistema completo gestione slot
- **[Optimistic UI System](OPTIMISTIC_UI_SYSTEM.md)** - Sistema optimistic UI
- **[Backend Documentation](../backend/README.md)** - Documentazione backend
- **[Database Documentation](../database/README.md)** - Documentazione database

## 🤝 Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi `LICENSE` per dettagli.

---

**Frontend CoworkSpace v2.0** - Interfaccia moderna con funzionalità real-time avanzate 🎨