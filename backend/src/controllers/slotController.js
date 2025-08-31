/**
 * Controller per gestione slot con Redis caching e expires_at
 * Sostituisce il sistema cron con controllo automatico su query
 */

const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const socketService = require('../services/socketService');
const redisService = require('../services/redisService');

/**
 * Ottieni stato di tutti gli slot per uno spazio e data con Redis caching
 * GET /api/slots/:idSpazio/:date
 */
async function getSlotsStatus(req, res) {
    try {
        const { idSpazio, date } = req.params;

        // Valida parametri
        if (!idSpazio || !date) {
            return res.status(400).json({
                success: false,
                error: 'Parametri idSpazio e date richiesti'
            });
        }

        // Valida formato data
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Formato data non valido. Usa YYYY-MM-DD'
            });
        }

        // Chiave cache Redis
        const cacheKey = `slots:${idSpazio}:${date}`;

        // Prova a leggere dalla cache, se manca esegui query
        const slots = await redisService.getOrSet(cacheKey, async () => {
            return await fetchSlotsFromDatabase(parseInt(idSpazio), date);
        }, 300); // Cache per 5 minuti

        res.json({
            success: true,
            data: {
                slots: slots,
                count: slots.length,
                date: date,
                idSpazio: parseInt(idSpazio),
                cached: await redisService.get(cacheKey) !== null
            }
        });

    } catch (error) {
        console.error('❌ Errore nel recuperare stato slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Funzione per recuperare slot dal database con controllo expires_at
 */
async function fetchSlotsFromDatabase(idSpazio, date) {
    try {
        console.log(`🚀 fetchSlotsFromDatabase chiamato per spazio: ${idSpazio}, data: ${date}`);

        // Prima libera slot scaduti automaticamente (se le funzioni esistono)
        try {
            await pool.query('SELECT free_expired_slots()');
            await pool.query('SELECT update_past_slots()');
        } catch (error) {
            console.log('⚠️ Funzioni database slot non disponibili, continuo senza...');
            // Fallback: libera slot scaduti manualmente
            await pool.query(`
                UPDATE Prenotazione 
                SET stato = 'disponibile', expires_at = NULL
                WHERE stato = 'in attesa' 
                AND expires_at IS NOT NULL 
                AND expires_at < CURRENT_TIMESTAMP
            `);
        }

        // Verifica che lo spazio esista
        const spazioQuery = 'SELECT id_spazio, nome FROM Spazio WHERE id_spazio = $1';
        const spazioResult = await pool.query(spazioQuery, [idSpazio]);

        if (spazioResult.rows.length === 0) {
            throw new Error('Spazio non trovato');
        }

        const spazio = spazioResult.rows[0];
        console.log(`✅ Spazio trovato: ${spazio.nome}`);

        // Ottieni orari di apertura (9:00 - 18:00)
        const orariApertura = [];
        for (let hour = 9; hour <= 17; hour++) {
            orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
        }

        console.log(`⏰ Orari apertura generati: ${orariApertura.length} slot`);

        // Query ottimizzata con controllo expires_at
        const prenotazioniQuery = `
            SELECT 
                EXTRACT(HOUR FROM data_inizio) as orario_inizio,
                EXTRACT(HOUR FROM data_fine) as orario_fine,
                stato,
                expires_at,
                id_prenotazione
            FROM Prenotazione 
            WHERE id_spazio = $1 
            AND DATE(data_inizio) = $2
            AND stato IN ('confermata', 'in attesa')
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        `;

        const prenotazioniResult = await pool.query(prenotazioniQuery, [idSpazio, date]);
        const prenotazioni = prenotazioniResult.rows;
        console.log(`📋 Prenotazioni attive trovate: ${prenotazioni.length}`);

        // Crea array con stato di ogni slot
        const slotsStatus = orariApertura.map((orario, index) => {
            const slotId = index + 1;
            const orarioHour = parseInt(orario.split(':')[0]);
            const now = new Date();
            const selectedDate = new Date(date);

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
                const prenotazioneInizio = parseInt(p.orario_inizio);
                const prenotazioneFine = parseInt(p.orario_fine);
                return orarioHour >= prenotazioneInizio && orarioHour < prenotazioneFine;
            });

            if (prenotazione) {
                if (prenotazione.stato === 'confermata') {
                    return {
                        id_slot: slotId,
                        orario: orario,
                        status: 'booked',
                        title: 'Slot prenotato',
                        prenotazione_id: prenotazione.id_prenotazione
                    };
                } else if (prenotazione.stato === 'in attesa') {
                    const expiresAt = new Date(prenotazione.expires_at);
                    const minutesLeft = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60)));

                    return {
                        id_slot: slotId,
                        orario: orario,
                        status: 'occupied',
                        title: `Slot occupato (${minutesLeft} min rimasti)`,
                        expires_at: prenotazione.expires_at,
                        minutes_remaining: minutesLeft,
                        prenotazione_id: prenotazione.id_prenotazione
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

        console.log(`✅ Stato slot calcolato: ${slotsStatus.length} slot`);
        return slotsStatus;

    } catch (error) {
        console.error('❌ Errore fetchSlotsFromDatabase:', error);
        throw error;
    }
}

/**
 * Occupa uno slot temporaneamente con expires_at
 * POST /api/slots/:id/hold
 */
async function holdSlot(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id_utente;
        const { idSpazio, sedeId, date } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'ID slot richiesto'
            });
        }

        // Converte slot ID in orario (slot 1 = 9:00, slot 2 = 10:00, etc.)
        const slotHour = parseInt(id) + 8; // slot 1 = 9:00, slot 2 = 10:00
        const startTime = new Date(`${date}T${slotHour.toString().padStart(2, '0')}:00:00Z`); // UTC
        const endTime = new Date(`${date}T${(slotHour + 1).toString().padStart(2, '0')}:00:00Z`); // UTC
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minuti da ora

        // Crea prenotazione temporanea con expires_at
        const result = await pool.query(`
            INSERT INTO Prenotazione (id_utente, id_spazio, data_inizio, data_fine, stato, expires_at)
            VALUES ($1, $2, $3, $4, 'in attesa', $5)
            RETURNING id_prenotazione, expires_at
        `, [
            userId,
            idSpazio,
            startTime,
            endTime,
            expiresAt
        ]);

        if (result.rows.length > 0) {
            const prenotazione = result.rows[0];

            // Invalida cache Redis
            await redisService.invalidateSlotsCache(sedeId, idSpazio, date);

            // Invia aggiornamento real-time via Socket.IO
            if (sedeId) {
                const slotData = {
                    id: parseInt(id),
                    status: 'occupied',
                    expires_at: prenotazione.expires_at,
                    prenotazione_id: prenotazione.id_prenotazione
                };
                socketService.broadcastSlotUpdate(idSpazio, sedeId, slotData);
            }

            res.json({
                success: true,
                message: 'Slot occupato per 15 minuti',
                data: {
                    slotId: parseInt(id),
                    prenotazione_id: prenotazione.id_prenotazione,
                    expires_at: prenotazione.expires_at
                }
            });
        } else {
            res.status(409).json({
                success: false,
                error: 'Slot non disponibile'
            });
        }

    } catch (error) {
        console.error('❌ Errore nell\'occupare slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Conferma prenotazione slot (rimuove expires_at)
 * POST /api/slots/:id/book
 */
async function bookSlot(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id_utente;
        const { idSpazio, sedeId, date } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'ID slot richiesto'
            });
        }

        // Converte slot ID in orario per la query
        const slotHour = parseInt(id) + 8; // slot 1 = 9:00, slot 2 = 10:00

        // Aggiorna prenotazione da 'in attesa' a 'confermata' e rimuovi expires_at
        const result = await pool.query(`
            UPDATE Prenotazione 
            SET stato = 'confermata', expires_at = NULL
            WHERE id_utente = $1 
            AND id_spazio = $2 
            AND stato = 'in attesa'
            AND DATE(data_inizio) = $3
            AND EXTRACT(HOUR FROM data_inizio) = $4
            RETURNING id_prenotazione
        `, [userId, idSpazio, date, slotHour]);

        if (result.rows.length > 0) {
            // Invalida cache Redis
            await redisService.invalidateSlotsCache(sedeId, idSpazio, date);

            // Invia aggiornamento real-time via Socket.IO
            if (sedeId) {
                const slotData = {
                    id: parseInt(id),
                    status: 'booked',
                    prenotazione_id: result.rows[0].id_prenotazione
                };
                socketService.broadcastSlotUpdate(idSpazio, sedeId, slotData);
            }

            res.json({
                success: true,
                message: 'Slot prenotato con successo',
                data: {
                    slotId: parseInt(id),
                    prenotazione_id: result.rows[0].id_prenotazione
                }
            });
        } else {
            res.status(409).json({
                success: false,
                error: 'Slot non disponibile per prenotazione'
            });
        }

    } catch (error) {
        console.error('❌ Errore nella prenotazione slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Libera uno slot occupato
 * POST /api/slots/:id/release
 */
async function releaseSlot(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id_utente;
        const { idSpazio, sedeId, date } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'ID slot richiesto'
            });
        }

        // Converte slot ID in orario per la query
        const slotHour = parseInt(id) + 8; // slot 1 = 9:00, slot 2 = 10:00

        // Rimuovi prenotazione temporanea
        const result = await pool.query(`
            DELETE FROM Prenotazione 
            WHERE id_utente = $1 
            AND id_spazio = $2 
            AND stato = 'in attesa'
            AND DATE(data_inizio) = $3
            AND EXTRACT(HOUR FROM data_inizio) = $4
            RETURNING id_prenotazione
        `, [userId, idSpazio, date, slotHour]);

        if (result.rows.length > 0) {
            // Invalida cache Redis
            await redisService.invalidateSlotsCache(sedeId, idSpazio, date);

            // Invia aggiornamento real-time via Socket.IO
            if (sedeId) {
                const slotData = {
                    id: parseInt(id),
                    status: 'available'
                };
                socketService.broadcastSlotUpdate(idSpazio, sedeId, slotData);
            }

            res.json({
                success: true,
                message: 'Slot liberato con successo',
                data: {
                    slotId: parseInt(id),
                    status: 'available'
                }
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Slot non trovato o non occupato da questo utente'
            });
        }

    } catch (error) {
        console.error('❌ Errore nel liberare slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Crea slot giornalieri per uno spazio
 * POST /api/slots/create-daily
 */
async function createDailySlots(req, res) {
    try {
        const { idSpazio, date } = req.body;
        const userId = req.user.id_utente;

        if (!idSpazio || !date) {
            return res.status(400).json({
                success: false,
                error: 'Parametri idSpazio e date richiesti'
            });
        }

        // Verifica che lo spazio esista
        const spazioQuery = 'SELECT id_spazio, nome FROM Spazio WHERE id_spazio = $1';
        const spazioResult = await pool.query(spazioQuery, [idSpazio]);

        if (spazioResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Spazio non trovato'
            });
        }

        // Verifica se esistono già slot per questa data
        const existingSlotsQuery = `
            SELECT COUNT(*) as count 
            FROM Prenotazione 
            WHERE id_spazio = $1 
            AND DATE(data_inizio) = $2
        `;
        const existingResult = await pool.query(existingSlotsQuery, [idSpazio, date]);

        if (parseInt(existingResult.rows[0].count) > 0) {
            return res.status(409).json({
                success: false,
                error: 'Slot per questa data già esistenti'
            });
        }

        // Crea slot per ogni ora (9:00 - 17:00)
        const slots = [];
        for (let hour = 9; hour <= 17; hour++) {
            const startTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00Z`); // UTC
            const endTime = new Date(`${date}T${(hour + 1).toString().padStart(2, '0')}:00:00Z`); // UTC

            // Inserisci slot nella tabella Prenotazione come "disponibile"
            const result = await pool.query(`
                INSERT INTO Prenotazione (id_utente, id_spazio, data_inizio, data_fine, stato)
                VALUES ($1, $2, $3, $4, 'disponibile')
                RETURNING id_prenotazione
            `, [userId, idSpazio, startTime, endTime]);

            slots.push({
                id_prenotazione: result.rows[0].id_prenotazione,
                orario: `${hour.toString().padStart(2, '0')}:00`,
                start_time: startTime,
                end_time: endTime
            });
        }

        // Invalida cache Redis
        await redisService.invalidateSlotsCache(null, idSpazio, date);

        res.json({
            success: true,
            message: 'Slot giornalieri creati con successo',
            data: {
                idSpazio: parseInt(idSpazio),
                date: date,
                slotsCreated: slots.length,
                slots: slots
            }
        });

    } catch (error) {
        console.error('❌ Errore nella creazione slot giornalieri:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
}

/**
 * Endpoint di test per il sistema slot
 * GET /api/slots/test
 */
async function testSlots(req, res) {
    try {
        const testDate = new Date().toISOString().split('T')[0];
        const testSpazio = 1; // ID spazio di test

        const slots = await fetchSlotsFromDatabase(testSpazio, testDate);

        res.json({
            success: true,
            message: 'Sistema slot funzionante',
            data: {
                testDate: testDate,
                testSpazio: testSpazio,
                slotsCount: slots.length,
                slots: slots.slice(0, 3), // Mostra solo i primi 3 per brevità
                timestamp: new Date().toISOString(),
                redis_stats: await redisService.getStats()
            }
        });

    } catch (error) {
        console.error('❌ Errore nel test slot:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel test del sistema slot'
        });
    }
}

module.exports = {
    getSlotsStatus,
    holdSlot,
    bookSlot,
    releaseSlot,
    createDailySlots,
    testSlots
};