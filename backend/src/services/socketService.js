/**
 * Servizio Socket.IO per aggiornamenti real-time slot
 * Sostituisce il sistema SSE esistente con supporto Redis Pub/Sub
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const redisService = require('./redisService');

class SocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> socketId
        this.userSockets = new Map(); // socketId -> userId
        this.redisSubscriber = null;
        this.redisPublisher = null;
    }

    /**
     * Inizializza Socket.IO
     * @param {http.Server} server - Server HTTP
     */
    initialize(server) {
        this.io = new Server(server, {
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
            },
            transports: ['websocket', 'polling']
        });

        this.setupMiddleware();
        this.setupEventHandlers();
        this.setupRedisPubSub();

        console.log('🚀 Socket.IO inizializzato con supporto Redis Pub/Sub');
    }

    /**
     * Configura Redis Pub/Sub per multi-server
     */
    async setupRedisPubSub() {
        if (!redisService.isEnabled) {
            console.log('📦 Redis Pub/Sub disabilitato - modalità single server');
            return;
        }

        try {
            // Subscriber per ricevere messaggi da altri server
            this.redisSubscriber = redisService.client.duplicate();
            await this.redisSubscriber.connect();

            // Publisher per inviare messaggi ad altri server
            this.redisPublisher = redisService.client.duplicate();
            await this.redisPublisher.connect();

            // Ascolta messaggi Redis
            await this.redisSubscriber.subscribe('socketio:broadcast', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleRedisMessage(data);
                } catch (error) {
                    console.error('❌ Errore parsing messaggio Redis:', error);
                }
            });

            console.log('✅ Redis Pub/Sub configurato per multi-server');
        } catch (error) {
            console.warn('⚠️ Redis Pub/Sub non disponibile:', error.message);
        }
    }

    /**
     * Gestisce messaggi ricevuti da Redis
     */
    handleRedisMessage(data) {
        const { type, room, event, payload } = data;

        switch (type) {
            case 'room_broadcast':
                if (this.io) {
                    this.io.to(room).emit(event, payload);
                    console.log(`📡 Redis → Socket.IO: ${event} a room ${room}`);
                }
                break;
            case 'user_message':
                this.sendToUser(data.userId, event, payload);
                break;
            case 'global_broadcast':
                this.broadcastToAll(event, payload);
                break;
        }
    }

    /**
     * Configura middleware per autenticazione
     */
    setupMiddleware() {
        // Middleware per autenticazione JWT
        this.io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.query.token;

                if (!token) {
                    console.log('❌ Socket.IO: Token mancante');
                    return next(new Error('Token di autenticazione richiesto'));
                }

                const decoded = jwt.verify(token, config.jwt.secret);
                socket.userId = decoded.id_utente;
                socket.user = decoded;

                console.log(`✅ Socket.IO: Utente autenticato ${socket.userId}`);
                next();
            } catch (error) {
                console.log('❌ Socket.IO: Token non valido:', error.message);
                next(new Error('Token non valido'));
            }
        });
    }

    /**
     * Configura gestori eventi
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 Socket.IO: Connessione da utente ${socket.userId}`);

            // Registra utente connesso
            this.connectedUsers.set(socket.userId, socket.id);
            this.userSockets.set(socket.id, socket.userId);

            // Invia conferma connessione
            socket.emit('connection_confirmed', {
                message: 'Connesso al sistema real-time',
                userId: socket.userId,
                timestamp: new Date().toISOString()
            });

            // Gestisci join room per spazio specifico
            socket.on('join_space', (data) => {
                const { spazioId, sedeId } = data;
                const roomName = `spazio_${spazioId}_sede_${sedeId}`;

                socket.join(roomName);
                console.log(`🏢 Socket.IO: Utente ${socket.userId} entrato in room ${roomName}`);

                socket.emit('joined_space', {
                    room: roomName,
                    spazioId,
                    sedeId,
                    timestamp: new Date().toISOString()
                });
            });

            // Gestisci leave room
            socket.on('leave_space', (data) => {
                const { spazioId, sedeId } = data;
                const roomName = `spazio_${spazioId}_sede_${sedeId}`;

                socket.leave(roomName);
                console.log(`🚪 Socket.IO: Utente ${socket.userId} uscito da room ${roomName}`);
            });

            // Gestisci disconnessione
            socket.on('disconnect', (reason) => {
                console.log(`🔌 Socket.IO: Disconnessione utente ${socket.userId}, motivo: ${reason}`);

                // Rimuovi utente dalle mappe
                this.connectedUsers.delete(socket.userId);
                this.userSockets.delete(socket.id);
            });

            // Gestisci errori
            socket.on('error', (error) => {
                console.error(`❌ Socket.IO: Errore socket utente ${socket.userId}:`, error);
            });
        });
    }

    /**
     * Invia aggiornamento slot a tutti gli utenti in una room
     * @param {number} spazioId - ID dello spazio
     * @param {number} sedeId - ID della sede
     * @param {Object} slotData - Dati dello slot aggiornato
     */
    broadcastSlotUpdate(spazioId, sedeId, slotData) {
        if (!this.io) return;

        const roomName = `spazio_${spazioId}_sede_${sedeId}`;
        const payload = {
            type: 'slot_update',
            slotId: slotData.id,
            status: slotData.status,
            data: slotData,
            timestamp: new Date().toISOString()
        };

        // Invia localmente
        this.io.to(roomName).emit('slot_update', payload);

        // Invia via Redis per multi-server
        this.publishToRedis('room_broadcast', roomName, 'slot_update', payload);

        console.log(`📡 Socket.IO: Broadcast slot_update a room ${roomName}`);
    }

    /**
     * Invia aggiornamento completo stato slot
     * @param {number} spazioId - ID dello spazio
     * @param {number} sedeId - ID della sede
     * @param {Array} slotsStatus - Array di tutti gli slot
     */
    broadcastSlotsStatusUpdate(spazioId, sedeId, slotsStatus) {
        if (!this.io) return;

        const roomName = `spazio_${spazioId}_sede_${sedeId}`;
        const payload = {
            type: 'slots_status_update',
            slotsStatus: slotsStatus,
            timestamp: new Date().toISOString()
        };

        // Invia localmente
        this.io.to(roomName).emit('slots_status_update', payload);

        // Invia via Redis per multi-server
        this.publishToRedis('room_broadcast', roomName, 'slots_status_update', payload);

        console.log(`📡 Socket.IO: Broadcast slots_status_update a room ${roomName}`);
    }

    /**
     * Invia notifica a un utente specifico
     * @param {number} userId - ID dell'utente
     * @param {string} event - Nome dell'evento
     * @param {Object} data - Dati da inviare
     */
    sendToUser(userId, event, data) {
        if (!this.io) return;

        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
            console.log(`📤 Socket.IO: Inviato ${event} a utente ${userId}`);
        } else {
            console.log(`⚠️ Socket.IO: Utente ${userId} non connesso`);
        }

        // Invia via Redis per multi-server
        this.publishToRedis('user_message', null, event, { userId, data });
    }

    /**
     * Invia notifica a tutti gli utenti connessi
     * @param {string} event - Nome dell'evento
     * @param {Object} data - Dati da inviare
     */
    broadcastToAll(event, data) {
        if (!this.io) return;

        this.io.emit(event, data);
        console.log(`📢 Socket.IO: Broadcast ${event} a tutti gli utenti`);

        // Invia via Redis per multi-server
        this.publishToRedis('global_broadcast', null, event, data);
    }

    /**
     * Pubblica messaggio su Redis per multi-server
     */
    async publishToRedis(type, room, event, payload) {
        if (!this.redisPublisher) return;

        try {
            const message = JSON.stringify({
                type,
                room,
                event,
                payload,
                timestamp: new Date().toISOString()
            });

            await this.redisPublisher.publish('socketio:broadcast', message);
        } catch (error) {
            console.warn('⚠️ Errore pubblicazione Redis:', error.message);
        }
    }

    /**
     * Ottieni statistiche connessioni
     */
    getStats() {
        return {
            connectedUsers: this.connectedUsers.size,
            totalSockets: this.io ? this.io.sockets.sockets.size : 0,
            rooms: this.io ? Array.from(this.io.sockets.adapter.rooms.keys()) : [],
            redisEnabled: redisService.isEnabled,
            redisConnected: redisService.isConnected
        };
    }

    /**
     * Chiudi connessioni
     */
    async close() {
        if (this.io) {
            this.io.close();
            this.io = null;
        }

        if (this.redisSubscriber) {
            await this.redisSubscriber.quit();
            this.redisSubscriber = null;
        }

        if (this.redisPublisher) {
            await this.redisPublisher.quit();
            this.redisPublisher = null;
        }

        this.connectedUsers.clear();
        this.userSockets.clear();
        console.log('🔌 Socket.IO: Servizio chiuso');
    }
}

// Istanza singleton
const socketService = new SocketService();

module.exports = socketService;
