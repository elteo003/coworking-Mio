# Socket.IO Migration - CoworkSpace v2.0

## Panoramica

Questo documento descrive la migrazione da Server-Sent Events (SSE) a Socket.IO per la gestione real-time degli slot nel sistema CoworkSpace.

## Motivazione della Migrazione

### Problemi con SSE
- **Comunicazione unidirezionale**: Solo server → client
- **Limitazioni di riconnessione**: Gestione complessa delle disconnessioni
- **Mancanza di feedback**: Nessuna conferma di ricezione messaggi
- **Scalabilità limitata**: Difficile gestire multiple istanze server

### Vantaggi di Socket.IO
- **Comunicazione bidirezionale**: Server ↔ Client
- **Riconnessione automatica**: Gestione robusta delle disconnessioni
- **Conferme di ricezione**: ACK per messaggi critici
- **Scalabilità**: Supporto Redis Pub/Sub per multi-server
- **Fallback transport**: WebSocket → Polling automatico

## Architettura Implementata

### Backend - Socket.IO Server

```javascript
// backend/src/services/socketService.js
class SocketService {
    constructor() {
        this.io = null;
        this.redisSubscriber = null;
        this.redisPublisher = null;
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: { origin: "*" },
            transports: ['websocket', 'polling']
        });

        this.setupAuth();
        this.setupEventHandlers();
        this.setupRedisPubSub();
    }
}
```

### Frontend - Socket.IO Client

```javascript
// frontend/public/js/slot-manager-socketio.js
class SlotManagerSocketIO {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    connectSocketIO() {
        this.socket = io(window.CONFIG.API_BASE, {
            auth: { token: localStorage.getItem('token') },
            transports: ['websocket', 'polling']
        });
    }
}
```

## Eventi Socket.IO

### Eventi Client → Server

| Evento | Descrizione | Payload |
|--------|-------------|---------|
| `join_space` | Entra in room spazio | `{ spazioId, sedeId }` |
| `leave_space` | Esce da room spazio | `{ spazioId }` |

### Eventi Server → Client

| Evento | Descrizione | Payload |
|--------|-------------|---------|
| `connection_confirmed` | Conferma connessione | `{ userId, timestamp }` |
| `joined_space` | Conferma ingresso room | `{ room, spazioId }` |
| `slot_update` | Aggiornamento singolo slot | `{ slotId, status, data }` |
| `slots_status_update` | Aggiornamento completo slot | `{ slotsStatus: [] }` |
| `slots_freed` | Slot liberati automaticamente | `{ count, timestamp }` |

## Autenticazione JWT

### Server-side
```javascript
this.io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token mancante'));
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Token non valido'));
        socket.userId = decoded.id;
        next();
    });
});
```

### Client-side
```javascript
this.socket = io(window.CONFIG.API_BASE, {
    auth: { token: localStorage.getItem('token') }
});
```

## Gestione Riconnessione

### Strategia di Riconnessione
1. **Tentativo immediato**: Riconnessione automatica
2. **Backoff esponenziale**: Delay crescente tra tentativi
3. **Fallback polling**: Se WebSocket fallisce
4. **Limite tentativi**: Max 5 tentativi, poi polling

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

## Scalabilità Multi-Server

### Redis Pub/Sub Integration

```javascript
// Pubblicazione messaggio
async publishToRedis(event, data, target = 'all') {
    if (!this.redisPublisher) return;
    
    const message = {
        event,
        data,
        target,
        timestamp: new Date().toISOString()
    };
    
    await this.redisPublisher.publish('socketio:broadcast', JSON.stringify(message));
}

// Sottoscrizione messaggi
async setupRedisPubSub() {
    this.redisSubscriber = redisService.client.duplicate();
    await this.redisSubscriber.subscribe('socketio:broadcast');
    
    this.redisSubscriber.on('message', (channel, message) => {
        this.handleRedisMessage(JSON.parse(message));
    });
}
```

## Ottimistic UI

### Implementazione Frontend

```javascript
async holdSlot(slotId) {
    // 1. Aggiornamento ottimistico UI
    button.classList.add('slot-occupied');
    button.disabled = true;
    
    try {
        // 2. Chiamata API
        const response = await fetch(`/api/slots/${slotId}/hold`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            // 3. Revert UI in caso di errore
            button.classList.remove('slot-occupied');
            button.disabled = false;
        }
    } catch (error) {
        // 3. Revert UI in caso di errore
        button.classList.remove('slot-occupied');
        button.disabled = false;
    }
}
```

## Performance e Caching

### Redis Caching Layer

```javascript
// Controller con cache
async getSlotsStatus(req, res) {
    const cacheKey = `slots:${spazioId}:${date}`;
    
    // 1. Controlla cache
    let slots = await redisService.get(cacheKey);
    
    if (!slots) {
        // 2. Cache miss - query database
        slots = await slotTimer.getSlotsStatus(spazioId, date);
        
        // 3. Salva in cache (5 minuti)
        await redisService.set(cacheKey, slots, 300);
    }
    
    res.json({ data: { slots } });
}
```

## Configurazione

### Variabili Ambiente

```bash
# Socket.IO
SOCKET_IO_ENABLED=true
SOCKET_IO_TRANSPORTS=websocket,polling

# Redis (per scalabilità)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
```

### Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    
  backend:
    environment:
      REDIS_ENABLED: "true"
      REDIS_URL: "redis://redis:6379"
      SOCKET_IO_ENABLED: "true"
```

## Testing

### Test Connessione

```javascript
// Test connessione Socket.IO
socket.on('connect', () => {
    console.log('✅ Socket.IO connesso');
});

socket.on('connection_confirmed', (data) => {
    console.log('✅ Connessione confermata:', data);
});
```

### Test Eventi

```javascript
// Test aggiornamento slot
socket.on('slot_update', (data) => {
    console.log('🔄 Slot aggiornato:', data);
});

// Test liberazione slot
socket.on('slots_freed', (data) => {
    console.log('🆓 Slot liberati:', data);
});
```

## Monitoraggio

### Metriche Importanti

- **Connessioni attive**: `io.engine.clientsCount`
- **Room occupate**: `io.sockets.adapter.rooms.size`
- **Messaggi Redis**: Monitoraggio Pub/Sub
- **Errori connessione**: Log riconnessioni fallite

### Logging

```javascript
// Log connessioni
this.io.on('connection', (socket) => {
    console.log(`🔗 Utente ${socket.userId} connesso`);
    
    socket.on('disconnect', () => {
        console.log(`🔌 Utente ${socket.userId} disconnesso`);
    });
});
```

## Migrazione Graduale

### Fase 1: Implementazione Parallela
- Socket.IO attivo insieme a SSE
- Test con utenti limitati
- Monitoraggio performance

### Fase 2: Switch Graduale
- Redirect utenti autenticati a Socket.IO
- Mantenimento SSE per utenti non autenticati
- Rollback disponibile

### Fase 3: Completamento
- Rimozione codice SSE
- Pulizia dipendenze
- Documentazione finale

## Troubleshooting

### Problemi Comuni

1. **Connessione fallisce**
   - Verificare CORS settings
   - Controllare token JWT
   - Testare trasporti disponibili

2. **Messaggi non ricevuti**
   - Verificare room membership
   - Controllare Redis Pub/Sub
   - Monitorare log server

3. **Performance degradate**
   - Ottimizzare query database
   - Aumentare TTL cache Redis
   - Monitorare connessioni attive

## Conclusioni

La migrazione a Socket.IO fornisce:

- ✅ **Comunicazione bidirezionale** robusta
- ✅ **Scalabilità** multi-server con Redis
- ✅ **Riconnessione automatica** intelligente
- ✅ **Performance** migliorate con caching
- ✅ **UX** ottimizzata con optimistic UI

Il sistema è ora pronto per gestire carichi elevati e garantire un'esperienza utente fluida e real-time.
