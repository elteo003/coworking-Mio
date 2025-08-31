# 🏗️ Architettura del Sistema Coworking

## 📋 Panoramica

Questo documento descrive l'architettura completa del sistema di coworking, includendo la struttura del frontend, backend, database e le comunicazioni tra i componenti.

---

## 🎨 Frontend (Client-Side)

### **Struttura Directory:**
```
frontend/public/
├── 📄 HTML Pages
│   ├── index.html              # Homepage principale
│   ├── catalogo.html           # Catalogo spazi
│   ├── selezione-slot.html     # Selezione orari
│   ├── pagamento.html          # Processo pagamento
│   ├── dashboard.html          # Dashboard utente
│   ├── dashboard-gestori.html  # Dashboard gestori
│   ├── dashboard-responsabili.html # Dashboard responsabili
│   └── login.html              # Autenticazione
│
├── 🎨 CSS Styles
│   ├── style.css               # Stili principali
│   ├── modern-design.css       # Design moderno
│   ├── selezione-slot.css      # Stili selezione slot
│   ├── catalog.css             # Stili catalogo
│   └── dashboard-responsabili.css # Stili dashboard
│
└── ⚡ JavaScript Modules
    ├── 🏠 Core
    │   ├── main.js             # Entry point principale
    │   ├── config.js           # Configurazione API
    │   └── error-handler.js    # Gestione errori
    │
    ├── 🔐 Authentication
    │   ├── auth-modal.js       # Modal autenticazione
    │   └── lib.supabase.js     # Integrazione Supabase
    │
    ├── 🎯 Slot Management
    │   ├── selezione-slot.js   # Logica selezione START/END
    │   ├── slot-manager.js     # Gestione real-time slot
    │   └── slot-notifications.js # Notifiche slot
    │
    ├── 🏢 Business Logic
    │   ├── catalogo.js         # Gestione catalogo
    │   ├── pagamento.js        # Processo pagamento
    │   ├── dashboard.js        # Dashboard utente
    │   └── gestione-sedi.js    # Gestione sedi
    │
    ├── 📊 Analytics & Testing
    │   ├── analytics.js        # Analytics
    │   └── ab-testing.js       # A/B testing
    │
    └── 🎨 UI Components
        ├── modern-ui.js        # Componenti UI moderni
        ├── immersive-carousel.js # Carosello immersivo
        └── cache-manager.js    # Gestione cache
```

### **Tecnologie Frontend:**
- **HTML5** - Struttura semantica
- **CSS3** - Stili moderni con custom properties
- **Vanilla JavaScript** - Logica client-side
- **Bootstrap** - Framework CSS responsive
- **Server-Sent Events** - Aggiornamenti real-time

---

## ⚙️ Backend (Server-Side)

### **Struttura Directory:**
```
backend/src/
├── 🚀 Entry Point
│   └── app.js                  # Server Express principale
│
├── 🗄️ Database
│   └── db.js                   # Connessione PostgreSQL
│
├── 🛡️ Middleware
│   ├── auth.js                 # Autenticazione JWT
│   └── sseAuth.js              # Auth per Server-Sent Events
│
├── 🎮 Controllers
│   ├── authController.js       # Gestione autenticazione
│   ├── catalogoController.js   # Logica catalogo
│   ├── prenotazioniController.js # Gestione prenotazioni
│   ├── pagamentiController.js  # Processo pagamenti
│   ├── spaziController.js      # Gestione spazi
│   ├── sseController.js        # Server-Sent Events
│   ├── dashboardController.js  # Dashboard logic
│   └── gestoreController.js    # Logica gestori
│
├── 🛣️ Routes
│   ├── auth.js                 # Endpoint autenticazione
│   ├── catalogo.js             # API catalogo
│   ├── prenotazioni.js         # API prenotazioni
│   ├── pagamenti.js            # API pagamenti
│   ├── spazi.js                # API spazi
│   ├── sse.js                  # Endpoint SSE
│   ├── webhook.js              # Webhook Stripe
│   └── dashboard.js            # API dashboard
│
├── 🔧 Services
│   ├── scadenzeService.js      # Gestione scadenze
│   └── slotTimerService.js     # Timer slot
│
└── ⏰ Cron Jobs
    └── scadenzeCron.js         # Job automatici
```

### **Tecnologie Backend:**
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Database relazionale
- **JWT** - Autenticazione token
- **Stripe** - Pagamenti online
- **Server-Sent Events** - Comunicazione real-time

---

## 🗄️ Database (PostgreSQL)

### **Tabelle Principali:**
```sql
-- 👥 Utenti e Autenticazione
users                    # Utenti del sistema
gestori                  # Gestori spazi
responsabili             # Responsabili sedi

-- 🏢 Struttura Business
sedi                     # Sedi coworking
spazi                    # Spazi per sedi
servizi                  # Servizi offerti

-- 📅 Prenotazioni e Slot
prenotazioni             # Prenotazioni utenti
slot_timer               # Timer slot occupati
scadenze                 # Scadenze pagamenti

-- 💳 Pagamenti
pagamenti                # Transazioni
stripe_customers         # Clienti Stripe
stripe_payments          # Pagamenti Stripe

-- 📊 Analytics
analytics_events         # Eventi analytics
ab_testing               # Test A/B
```

---

## 🔄 Comunicazioni e Flussi

### **1. Frontend ↔ Backend**

#### **API REST:**
```javascript
// Configurazione API
const API_BASE = 'http://localhost:3000/api';

// Esempi di chiamate
GET  /api/catalogo/sedi          # Lista sedi
GET  /api/spazi/{id}/disponibilita-slot/{data}  # Disponibilità slot
POST /api/prenotazioni           # Crea prenotazione
POST /api/pagamenti              # Processa pagamento
```

#### **Server-Sent Events (SSE):**
```javascript
// Connessione real-time
const eventSource = new EventSource('/api/sse/status-stream?token=...');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Aggiorna UI in tempo reale
};
```

### **2. Backend ↔ Database**

#### **Connessione PostgreSQL:**
```javascript
// Pool di connessioni
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Query esempio
const result = await pool.query(
    'SELECT * FROM prenotazioni WHERE data = $1',
    [data]
);
```

### **3. Backend ↔ Servizi Esterni**

#### **Stripe (Pagamenti):**
```javascript
// Webhook Stripe
app.post('/webhook/stripe', (req, res) => {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    
    // Gestisci evento pagamento
    handlePaymentEvent(event);
});
```

---

## 🎯 Flusso Completo di Prenotazione

### **1. Selezione Spazio:**
```
Utente → Frontend (catalogo.html)
       ↓
Frontend → Backend (/api/catalogo/sedi)
       ↓
Backend → Database (SELECT sedi, spazi)
       ↓
Database → Backend (risultati)
       ↓
Backend → Frontend (JSON sedi/spazi)
       ↓
Frontend → Utente (UI catalogo)
```

### **2. Selezione Slot:**
```
Utente → Frontend (selezione-slot.html)
       ↓
Frontend → Backend (/api/spazi/{id}/disponibilita-slot/{data})
       ↓
Backend → Database (SELECT slot disponibili)
       ↓
Database → Backend (stati slot)
       ↓
Backend → Frontend (JSON slot con stati)
       ↓
Frontend → Utente (bottoni colorati START/END)
```

### **3. Aggiornamenti Real-time:**
```
Database → Backend (trigger/evento)
       ↓
Backend → SSE Stream (broadcast)
       ↓
Frontend → SlotManager (aggiornamento)
       ↓
Frontend → UI (aggiornamento colori)
```

### **4. Processo Pagamento:**
```
Utente → Frontend (pagamento.html)
       ↓
Frontend → Backend (/api/pagamenti)
       ↓
Backend → Stripe API (crea payment intent)
       ↓
Stripe → Frontend (redirect pagamento)
       ↓
Stripe → Backend (webhook conferma)
       ↓
Backend → Database (UPDATE prenotazione)
       ↓
Backend → SSE (notifica conferma)
       ↓
Frontend → UI (conferma prenotazione)
```

---

## 🔐 Sistema di Autenticazione

### **Flusso JWT:**
```
1. Login → Backend (/api/auth/login)
2. Verifica credenziali → Database
3. Genera JWT token → Backend
4. Invia token → Frontend
5. Salva token → localStorage
6. Invia token → Header Authorization
7. Verifica token → Middleware auth.js
8. Autorizza richiesta → Controller
```

### **Middleware di Autenticazione:**
```javascript
// auth.js
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};
```

---

## 📊 Sistema Real-time (SSE)

### **Architettura SSE:**
```
Database Event → Backend Service → SSE Stream → Frontend Client
     ↓                ↓              ↓            ↓
  Trigger/        Event Handler   Broadcast    SlotManager
  Cron Job        (sseController)  (SSE)       (updateUI)
```

### **Tipi di Eventi:**
```javascript
// Eventi SSE
{
    type: 'slot_update',           // Aggiornamento singolo slot
    data: { slotId: 1, status: 'booked' }
}

{
    type: 'slots_status_update',   // Aggiornamento tutti gli slot
    data: { slotsStatus: [...] }
}

{
    type: 'prenotazione_confirmed', // Conferma prenotazione
    data: { prenotazioneId: 123 }
}
```

---

## 🚀 Deployment e Configurazione

### **Ambiente di Sviluppo:**
```
Frontend: http://localhost:3000
Backend:  http://localhost:3000/api
Database: localhost:5432/coworkspace
```

### **Ambiente di Produzione:**
```
Frontend: https://coworking-mio-1.onrender.com
Backend:  https://coworking-mio-1-backend.onrender.com
Database: Supabase PostgreSQL (cloud)
```

### **Variabili d'Ambiente:**
```bash
# Database
DATABASE_URL=postgresql://...
PGUSER=postgres
PGPASSWORD=password

# JWT
JWT_SECRET=your-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Server
PORT=3000
NODE_ENV=production
```

---

## 🔧 Configurazione CORS

### **Origini Permessi:**
```javascript
const allowedOrigins = [
    'http://localhost:3000',      // Frontend locale
    'http://localhost:3002',      // Frontend alternativo
    'http://127.0.0.1:5500',      // Live Server
    'https://coworking-mio-1.onrender.com'  // Produzione
];
```

---

## 📈 Monitoraggio e Logging

### **Log del Sistema:**
```javascript
// Log strutturati
console.log('🚀 Server avviato su porta', PORT);
console.log('✅ CORS: Origin permesso:', origin);
console.log('📋 SlotManager - Aggiornamento slot:', slotId);
console.log('💳 Pagamento processato:', paymentId);
```

### **Analytics:**
```javascript
// Tracking eventi
analytics.track('slot_selected', {
    slotId: slotId,
    orario: orario,
    userId: userId
});
```

---

## 🛡️ Sicurezza

### **Misure Implementate:**
- **JWT Authentication** - Token sicuri
- **CORS Policy** - Origini controllate
- **Input Validation** - Sanitizzazione dati
- **SQL Injection Protection** - Query parametrizzate
- **HTTPS** - Comunicazione criptata (produzione)
- **Rate Limiting** - Protezione DDoS

---

*Ultimo aggiornamento: Dicembre 2024*
*Versione: 1.0 - Architettura Completa*
