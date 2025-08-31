const pool = require('../db');

class SSEController {
    // Connessioni SSE attive
    static connections = new Set();

    // Inizializza connessione SSE
    static initConnection(req, res) {
        // Imposta headers per SSE
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Aggiungi connessione alla lista
        this.connections.add(res);

        // Invia evento di connessione
        res.write(`data: ${JSON.stringify({
            type: 'connection',
            message: 'Connessione SSE stabilita',
            timestamp: new Date().toISOString()
        })}\n\n`);

        // Gestisci chiusura connessione
        req.on('close', () => {
            this.connections.delete(res);
        });

        // Mantieni connessione attiva con heartbeat
        const heartbeat = setInterval(() => {
            if (res.destroyed) {
                clearInterval(heartbeat);
                return;
            }
            res.write(`data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
            })}\n\n`);
        }, 30000); // Heartbeat ogni 30 secondi

    }

    // Invia aggiornamento a tutti i client connessi
    static broadcastUpdate(update) {
        const message = `data: ${JSON.stringify(update)}\n\n`;

        this.connections.forEach(res => {
            if (!res.destroyed) {
                res.write(message);
            }
        });

    }

    // Invia aggiornamento stato slot specifico
    static broadcastSlotUpdate(slotId, status, data = {}) {
        const update = {
            type: 'slot_update',
            slotId: slotId,
            status: status,
            data: data,
            timestamp: new Date().toISOString()
        };

        this.broadcastUpdate(update);
    }

    // Invia aggiornamento stato slot per sede/spazio/data
    static broadcastSlotsStatusUpdate(sedeId, spazioId, data, slotsStatus) {
        const update = {
            type: 'slots_status_update',
            sedeId: sedeId,
            spazioId: spazioId,
            data: data,
            slotsStatus: slotsStatus,
            timestamp: new Date().toISOString()
        };

        this.broadcastUpdate(update);
    }

    // Ottieni stato corrente di tutti gli slot per sede/spazio/data
    static async getSlotsStatus(sedeId, spazioId, data) {
        try {

            // Verifica che lo spazio esista
            const spazioQuery = 'SELECT id_spazio, nome FROM Spazio WHERE id_spazio = $1';
            const spazioResult = await pool.query(spazioQuery, [spazioId]);

            if (spazioResult.rows.length === 0) {
                throw new Error('Spazio non trovato');
            }

            const spazio = spazioResult.rows[0];

            // Ottieni orari di apertura (9:00 - 18:00)
            const orariApertura = [];
            for (let hour = 9; hour <= 17; hour++) {
                orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
            }


            // Ottieni prenotazioni esistenti per questa data
            let prenotazioni = [];
            try {
                const prenotazioniQuery = `
                    SELECT 
                        EXTRACT(HOUR FROM data_inizio) as orario_inizio,
                        EXTRACT(HOUR FROM data_fine) as orario_fine,
                        stato
                    FROM Prenotazione 
                    WHERE id_spazio = $1 
                    AND DATE(data_inizio) = $2
                    AND stato IN ('confermata', 'in attesa')
                `;

                const prenotazioniResult = await pool.query(prenotazioniQuery, [spazioId, data]);
                prenotazioni = prenotazioniResult.rows;
                if (prenotazioni.length > 0) {
                }
            } catch (queryError) {
                console.warn('⚠️ Errore query prenotazioni, continuo senza:', queryError.message);
                prenotazioni = [];
            }

            // Crea array con stato di ogni slot
            const slotsStatus = orariApertura.map((orario, index) => {
                const slotId = index + 1;
                const orarioHour = parseInt(orario.split(':')[0]);
                const now = new Date();
                const selectedDate = new Date(data);

                // Controlla se l'orario è passato (solo per oggi)
                if (selectedDate.toDateString() === now.toDateString() && orarioHour <= now.getHours()) {
                    return {
                        id_slot: slotId,
                        orario: orario,
                        status: 'past',
                        title: 'Orario passato'
                    };
                }

                // Controlla se c'è una prenotazione per questo orario
                const prenotazione = prenotazioni.find(p => {
                    if (!p.orario_inizio || !p.orario_fine) {
                        return false;
                    }

                    const prenotazioneInizio = parseInt(p.orario_inizio);
                    const prenotazioneFine = parseInt(p.orario_fine);

                    const isOccupied = orarioHour >= prenotazioneInizio && orarioHour < prenotazioneFine;
                    if (isOccupied) {
                    }
                    return isOccupied;
                });

                if (prenotazione) {
                    if (prenotazione.stato === 'confermata') {
                        return {
                            id_slot: slotId,
                            orario: orario,
                            status: 'booked',
                            title: 'Slot prenotato'
                        };
                    } else if (prenotazione.stato === 'in attesa') {
                        return {
                            id_slot: slotId,
                            orario: orario,
                            status: 'occupied',
                            title: 'Slot occupato (in attesa pagamento)',
                            hold_time_remaining: 15
                        };
                    }
                }

                // Slot disponibile
                return {
                    id_slot: slotId,
                    orario: orario,
                    status: 'available',
                    title: 'Slot disponibile'
                };
            });

            return slotsStatus;

        } catch (error) {
            console.error('❌ SSEController - Errore nel recupero stato slot:', error);
            throw error;
        }
    }

    // Aggiorna stato slot e notifica tutti i client
    static async updateSlotStatus(slotId, status, prenotazioneId = null) {
        try {
            // Aggiorna stato nel database se necessario
            if (prenotazioneId) {
                // Logica per aggiornare prenotazione se necessario
            }

            // Notifica tutti i client
            this.broadcastSlotUpdate(slotId, status, { prenotazioneId });

            return true;
        } catch (error) {
            console.error('Errore nell\'aggiornamento stato slot:', error);
            throw error;
        }
    }

    // Pulisci connessioni SSE chiuse
    static cleanupConnections() {
        this.connections.forEach(res => {
            if (res.destroyed) {
                this.connections.delete(res);
            }
        });
    }
}

module.exports = SSEController;
