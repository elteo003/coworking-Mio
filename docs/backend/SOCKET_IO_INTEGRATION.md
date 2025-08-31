# 🔌 Integrazione Socket.IO - Backend

## 📋 Panoramica

Il sistema Socket.IO sostituisce Server-Sent Events (SSE) per fornire comunicazione real-time bidirezionale tra client e server. Questo migliora le performance e la gestione delle connessioni per gli aggiornamenti slot.

## 🏗️ Architettura

### **Componenti Principali:**

1. **SocketService** (`socketService.js`) - Servizio singleton per gestione Socket.IO
2. **Middleware Autenticazione** - JWT per connessioni Socket.IO
3. **Room Management** - Gestione room per spazi specifici
4. **Event Broadcasting** - Notifiche real-time agli utenti

## 🔧 Implementazione

### **Inizializzazione Socket.IO:**

```javascript
// In app.js
const http = require('http');
const socketService = require('./services/socketService');

const server = http.createServer(app);
socketService.initialize(server);

server.listen(PORT, () => {
    console.log('🚀 Socket.IO server inizializzato');
});
```

### **Servizio Socket.IO:**

```javascript
class SocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> socketId
        this.userSockets = new Map(); // socketId -> userId
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: ['http://localhost:3000', 'https://coworking-mio-1.onrender.com'],
                methods: ['GET', 'POST'],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.setupMiddleware();
        this.setupEventHandlers();
    }
}
```

## 🔐 Autenticazione

### **Middleware JWT:**

```javascript
setupMiddleware() {
    this.io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            
            if (!token) {
                return next(new Error('Token di autenticazione richiesto'));
            }

            const decoded = jwt.verify(token, config.jwt.secret);
            socket.userId = decoded.id_utente;
            socket.user = decoded;
            
            next();
        } catch (error) {
            next(new Error('Token non valido'));
        }
    });
}
```

## 🏢 Gestione Room

### **Join/Leave Room:**

```javascript
// Client si connette a room spazio
socket.on('join_space', (data) => {
    const { spazioId, sedeId } = data;
    const roomName = `spazio_${spazioId}_sede_${sedeId}`;
    
    socket.join(roomName);
    console.log(`Utente ${socket.userId} entrato in room ${roomName}`);
});

// Client esce da room
socket.on('leave_space', (data) => {
    const { spazioId, sedeId } = data;
    const roomName = `spazio_${spazioId}_sede_${sedeId}`;
    
    socket.leave(roomName);
});
```

## 📡 Broadcasting Eventi

### **Aggiornamento Singolo Slot:**

```javascript
broadcastSlotUpdate(spazioId, sedeId, slotData) {
    const roomName = `spazio_${spazioId}_sede_${sedeId}`;
    
    this.io.to(roomName).emit('slot_update', {
        type: 'slot_update',
        slotId: slotData.id,
        status: slotData.status,
        data: slotData,
        timestamp: new Date().toISOString()
    });
}
```

### **Aggiornamento Completo Stato:**

```javascript
broadcastSlotsStatusUpdate(spazioId, sedeId, slotsStatus) {
    const roomName = `spazio_${spazioId}_sede_${sedeId}`;
    
    this.io.to(roomName).emit('slots_status_update', {
        type: 'slots_status_update',
        slotsStatus: slotsStatus,
        timestamp: new Date().toISOString()
    });
}
```

### **Notifica Slot Liberati:**

```javascript
broadcastToAll(event, data) {
    this.io.emit(event, data);
    console.log(`📢 Broadcast ${event} a tutti gli utenti`);
}
```

## 🔄 Integrazione con Timer

### **Notifica Slot Liberati:**

```javascript
// In slotTimer.js
if (freedCount > 0) {
    socketService.broadcastToAll('slots_freed', {
        type: 'slots_freed',
        count: freedCount,
        timestamp: new Date().toISOString()
    });
}
```

### **Notifica Aggiornamenti Slot:**

```javascript
// In slotController.js
if (updatedSlot && req.body.idSpazio && req.body.sedeId) {
    socketService.broadcastSlotUpdate(req.body.idSpazio, req.body.sedeId, updatedSlot);
}
```

## 📊 Eventi Socket.IO

### **Eventi Server → Client:**

```javascript
'connection_confirmed' - Conferma connessione
'joined_space' - Conferma join room
'slot_update' - Aggiornamento singolo slot
'slots_status_update' - Aggiornamento completo stato
'slots_freed' - Notifica slot liberati automaticamente
```

### **Eventi Client → Server:**

```javascript
'join_space' - Entra in room spazio
'leave_space' - Esce da room spazio
'disconnect' - Disconnessione client
```

## 🚀 Vantaggi vs SSE

### **Performance:**
- ⚡ Comunicazione bidirezionale
- ⚡ Gestione connessioni più efficiente
- ⚡ Fallback automatico (websocket → polling)
- ⚡ Room management per targeting specifico

### **Affidabilità:**
- 🔒 Riconnessione automatica
- 🔒 Gestione errori migliorata
- 🔒 Heartbeat automatico
- 🔒 Buffer messaggi offline

### **Funzionalità:**
- 📡 Broadcasting selettivo per room
- 📡 Notifiche personalizzate per utente
- 📡 Gestione stato connessione
- 📡 Statistiche connessioni in tempo reale

## 🔧 Configurazione

### **CORS e Origins:**

```javascript
cors: {
    origin: [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:8000',
        'http://127.0.0.1:5500',
        'https://coworking-mio-1.onrender.com',
        'https://coworking-mio-1-backend.onrender.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
}
```

### **Transports:**

```javascript
transports: ['websocket', 'polling']
```

## 📈 Monitoraggio

### **Statistiche Connessioni:**

```javascript
getStats() {
    return {
        connectedUsers: this.connectedUsers.size,
        totalSockets: this.io ? this.io.sockets.sockets.size : 0,
        rooms: this.io ? Array.from(this.io.sockets.adapter.rooms.keys()) : []
    };
}
```

### **Logging:**

```javascript
// Connessioni
console.log(`🔗 Socket.IO: Connessione da utente ${socket.userId}`);
console.log(`🔌 Socket.IO: Disconnessione utente ${socket.userId}, motivo: ${reason}`);

// Broadcasting
console.log(`📡 Socket.IO: Broadcast slot_update a room ${roomName}`);
console.log(`📢 Socket.IO: Broadcast ${event} a tutti gli utenti`);
```

## 🔧 Gestione Errori

### **Error Handling:**

```javascript
socket.on('error', (error) => {
    console.error(`❌ Socket.IO: Errore socket utente ${socket.userId}:`, error);
});

socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO: Errore connessione:', error);
    this.handleSocketError(error);
});
```

### **Riconnessione:**

```javascript
handleSocketDisconnect(reason) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
            this.connectSocketIO();
        }, this.reconnectDelay * this.reconnectAttempts);
    } else {
        this.fallbackToPolling();
    }
}
```

## 📝 Note di Implementazione

### **Sicurezza:**
- 🔐 Autenticazione JWT obbligatoria
- 🔐 Validazione token ad ogni connessione
- 🔐 Controllo accessi per room

### **Performance:**
- ⚡ Room management per targeting specifico
- ⚡ Broadcasting selettivo
- ⚡ Gestione memoria ottimizzata

### **Manutenibilità:**
- 🔧 Codice modulare e ben documentato
- 🔧 Separazione responsabilità
- 🔧 Gestione errori robusta

---

*Ultimo aggiornamento: Dicembre 2024*
*Versione: 1.0 - Integrazione Socket.IO*
