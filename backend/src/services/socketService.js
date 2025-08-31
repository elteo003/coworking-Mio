/**
 * Servizio Socket.IO per aggiornamenti real-time slot
 * Sostituisce il sistema SSE esistente
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

class SocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> socketId
        this.userSockets = new Map(); // socketId -> userId
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

        console.log('🚀 Socket.IO inizializzato');
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

        this.io.to(roomName).emit('slot_update', {
            type: 'slot_update',
            slotId: slotData.id,
            status: slotData.status,
            data: slotData,
            timestamp: new Date().toISOString()
        });

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

        this.io.to(roomName).emit('slots_status_update', {
            type: 'slots_status_update',
            slotsStatus: slotsStatus,
            timestamp: new Date().toISOString()
        });

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
    }

    /**
     * Ottieni statistiche connessioni
     */
    getStats() {
        return {
            connectedUsers: this.connectedUsers.size,
            totalSockets: this.io ? this.io.sockets.sockets.size : 0,
            rooms: this.io ? Array.from(this.io.sockets.adapter.rooms.keys()) : []
        };
    }

    /**
     * Chiudi connessioni
     */
    close() {
        if (this.io) {
            this.io.close();
            this.io = null;
            this.connectedUsers.clear();
            this.userSockets.clear();
            console.log('🔌 Socket.IO: Servizio chiuso');
        }
    }
}

// Istanza singleton
const socketService = new SocketService();

module.exports = socketService;
