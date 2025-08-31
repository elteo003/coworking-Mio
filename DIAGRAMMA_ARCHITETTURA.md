# 🏗️ Diagramma Architettura Sistema Coworking

## 📊 Schema Visuale Completo

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                🌐 FRONTEND (Client)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   📄 HTML       │  │   🎨 CSS        │  │   ⚡ JavaScript │                │
│  │                 │  │                 │  │                 │                │
│  │ • index.html    │  │ • style.css     │  │ • main.js       │                │
│  │ • catalogo.html │  │ • modern-design │  │ • config.js     │                │
│  │ • selezione-    │  │ • selezione-    │  │ • selezione-    │                │
│  │   slot.html     │  │   slot.css      │  │   slot.js       │                │
│  │ • pagamento.html│  │ • catalog.css   │  │ • slot-manager  │                │
│  │ • dashboard.html│  │ • dashboard.css │  │ • pagamento.js  │                │
│  │ • login.html    │  │                 │  │ • auth-modal.js │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTP/HTTPS + SSE
                                        │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ⚙️ BACKEND (Server)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   🚀 Express    │  │   🛡️ Middleware │  │   🎮 Controllers│                │
│  │                 │  │                 │  │                 │                │
│  │ • app.js        │  │ • auth.js       │  │ • authController│                │
│  │ • CORS          │  │ • sseAuth.js    │  │ • catalogoCtrl  │                │
│  │ • Static Files  │  │ • Validation    │  │ • prenotazioni  │                │
│  │ • Error Handler │  │ • Rate Limiting │  │ • pagamentiCtrl │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   🛣️ Routes     │  │   🔧 Services   │  │   ⏰ Cron Jobs  │                │
│  │                 │  │                 │  │                 │                │
│  │ • /api/auth     │  │ • scadenzeSvc   │  │ • scadenzeCron  │                │
│  │ • /api/catalogo │  │ • slotTimerSvc  │  │ • cleanupJobs   │                │
│  │ • /api/prenotaz │  │ • analyticsSvc  │  │                 │                │
│  │ • /api/pagamenti│  │ • notificationSvc│  │                 │                │
│  │ • /api/sse      │  │                 │  │                 │                │
│  │ • /webhook      │  │                 │  │                 │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ PostgreSQL Queries
                                        │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            🗄️ DATABASE (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   👥 Users      │  │   🏢 Business   │  │   📅 Bookings   │                │
│  │                 │  │                 │  │                 │                │
│  │ • users         │  │ • sedi          │  │ • prenotazioni  │                │
│  │ • gestori       │  │ • spazi         │  │ • slot_timer    │                │
│  │ • responsabili  │  │ • servizi       │  │ • scadenze      │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   💳 Payments   │  │   📊 Analytics  │  │   🔧 System     │                │
│  │                 │  │                 │  │                 │                │
│  │ • pagamenti     │  │ • analytics_    │  │ • migrations    │                │
│  │ • stripe_       │  │   events        │  │ • seeds         │                │
│  │   customers     │  │ • ab_testing    │  │ • backups       │                │
│  │ • stripe_       │  │                 │  │                 │                │
│  │   payments      │  │                 │  │                 │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ API Calls
                                        │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🌍 EXTERNAL SERVICES                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   💳 Stripe     │  │   📧 Email      │  │   📱 SMS        │                │
│  │                 │  │                 │  │                 │                │
│  │ • Payment API   │  │ • Notifications │  │ • OTP Codes     │                │
│  │ • Webhooks      │  │ • Confirmations │  │ • Alerts        │                │
│  │ • Customer Mgmt │  │ • Reminders     │  │                 │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Flussi di Comunicazione

### **1. Flusso di Prenotazione:**
```
👤 Utente
  │
  ▼
🌐 Frontend (selezione-slot.html)
  │ HTTP GET /api/spazi/{id}/disponibilita-slot/{data}
  ▼
⚙️ Backend (spaziController.js)
  │ SELECT * FROM slot_timer WHERE data = ?
  ▼
🗄️ Database (PostgreSQL)
  │ JSON response
  ▼
⚙️ Backend
  │ JSON response
  ▼
🌐 Frontend (SlotManager)
  │ updateSlotButton()
  ▼
👤 Utente (UI aggiornata)
```

### **2. Flusso Real-time (SSE):**
```
🗄️ Database (Trigger/Event)
  │
  ▼
⚙️ Backend (sseController.js)
  │ broadcast(event)
  ▼
🌐 Frontend (EventSource)
  │ onmessage
  ▼
🌐 Frontend (SlotManager)
  │ handleSlotUpdate()
  ▼
👤 Utente (UI real-time)
```

### **3. Flusso di Pagamento:**
```
👤 Utente (pagamento.html)
  │
  ▼
🌐 Frontend (pagamento.js)
  │ POST /api/pagamenti
  ▼
⚙️ Backend (pagamentiController.js)
  │ stripe.paymentIntents.create()
  ▼
💳 Stripe API
  │ Webhook /webhook/stripe
  ▼
⚙️ Backend (webhook.js)
  │ UPDATE prenotazioni SET stato = 'confermata'
  ▼
🗄️ Database
  │ SSE broadcast
  ▼
🌐 Frontend (conferma)
```

## 🎯 Architettura a Livelli

### **Livello 1: Presentazione (Frontend)**
- **Responsabilità**: UI/UX, interazione utente
- **Tecnologie**: HTML5, CSS3, JavaScript
- **Comunicazione**: HTTP/HTTPS, Server-Sent Events

### **Livello 2: Logica Business (Backend)**
- **Responsabilità**: Regole business, validazione, orchestrazione
- **Tecnologie**: Node.js, Express.js
- **Comunicazione**: REST API, WebSocket-like (SSE)

### **Livello 3: Persistenza (Database)**
- **Responsabilità**: Storage dati, transazioni, integrità
- **Tecnologie**: PostgreSQL
- **Comunicazione**: SQL queries, connection pooling

### **Livello 4: Servizi Esterni**
- **Responsabilità**: Pagamenti, notifiche, analytics
- **Tecnologie**: Stripe, Email providers, SMS services
- **Comunicazione**: REST API, Webhooks

## 🔐 Sicurezza e Autenticazione

```
👤 Utente
  │ Login credentials
  ▼
🌐 Frontend (auth-modal.js)
  │ POST /api/auth/login
  ▼
⚙️ Backend (authController.js)
  │ bcrypt.compare(password, hash)
  ▼
🗄️ Database (users table)
  │ JWT.sign(user)
  ▼
⚙️ Backend
  │ Set-Cookie: token
  ▼
🌐 Frontend (localStorage)
  │ Authorization: Bearer token
  ▼
⚙️ Backend (auth middleware)
  │ jwt.verify(token)
  ▼
🎮 Controller (authorized request)
```

## 📊 Monitoraggio e Logging

```
🌐 Frontend
  │ console.log('User action:', action)
  ▼
⚙️ Backend
  │ console.log('API call:', endpoint)
  │ analytics.track(event)
  ▼
🗄️ Database
  │ Log slow queries
  │ Monitor connections
  ▼
🌍 External Services
  │ Stripe logs
  │ Email delivery status
```

---

*Diagramma creato: Dicembre 2024*
*Versione: 1.0 - Architettura Visuale*
