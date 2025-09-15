const pool = require('../db');

async function getDisponibilitaSlot(req, res) {
    try {

        const { id_spazio } = req.params;
        const { data } = req.params;


        // Validazione parametri
        if (!id_spazio || !data) {
            return res.status(400).json({
                success: false,
                error: 'Parametri mancanti: id_spazio e data sono richiesti'
            });
        }

        // Verifica che lo spazio esista
        const spazioQuery = 'SELECT id_spazio, nome FROM Spazio WHERE id_spazio = $1';
        const spazioResult = await pool.query(spazioQuery, [id_spazio]);

        if (spazioResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Spazio non trovato'
            });
        }

        const spazio = spazioResult.rows[0];

        // Ottieni orari di apertura (9:00 - 18:00)
        const orariApertura = [];
        for (let hour = 9; hour <= 17; hour++) {
            orariApertura.push(`${hour.toString().padStart(2, '0')}:00`);
        }


        // Ottieni prenotazioni esistenti per questa data (query semplificata)
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
                AND stato IN ('confermata', 'in_attesa_pagamento')
            `;

            const prenotazioniResult = await pool.query(prenotazioniQuery, [id_spazio, data]);
            prenotazioni = prenotazioniResult.rows;
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
                if (!p.orario_inizio || !p.orario_fine) return false;

                const prenotazioneInizio = parseInt(p.orario_inizio.split(':')[0]);
                const prenotazioneFine = parseInt(p.orario_fine.split(':')[0]);

                return orarioHour >= prenotazioneInizio && orarioHour < prenotazioneFine;
            });

            if (prenotazione) {
                if (prenotazione.stato === 'confermata') {
                    return {
                        id_slot: slotId,
                        orario: orario,
                        status: 'booked',
                        title: 'Slot prenotato'
                    };
                } else if (prenotazione.stato === 'in_attesa_pagamento') {
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


        res.json({
            success: true,
            data: {
                spazio: {
                    id: spazio.id_spazio,
                    nome: spazio.nome
                },
                data: data,
                slots: slotsStatus
            }
        });

    } catch (error) {
        console.error('❌ Errore nel calcolo disponibilità slot:', error);
        console.error('Stack trace:', error.stack);

        res.status(500).json({
            success: false,
            error: 'Errore nel calcolo disponibilità slot',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Errore interno del server'
        });
    }
}

// Endpoint di test semplice
async function testEndpoint(req, res) {
    try {
        res.json({
            success: true,
            message: 'Test endpoint funziona',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Errore test endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Errore test endpoint'
        });
    }
}

// Endpoint di test per simulare prenotazioni
async function testSimulateBookings(req, res) {
    try {

        // Simula alcune prenotazioni per test
        const testBookings = [
            {
                id_slot: 1,
                orario: '09:00',
                status: 'booked',
                title: 'Slot prenotato (TEST)'
            },
            {
                id_slot: 2,
                orario: '10:00',
                status: 'occupied',
                title: 'Slot occupato (TEST)',
                hold_time_remaining: 15
            },
            {
                id_slot: 3,
                orario: '11:00',
                status: 'past',
                title: 'Orario passato (TEST)'
            }
        ];

        res.json({
            success: true,
            message: 'Simulazione prenotazioni per test',
            data: {
                spazio: {
                    id: 1,
                    nome: 'Spazio Test'
                },
                data: new Date().toISOString().split('T')[0],
                slots: testBookings
            }
        });
    } catch (error) {
        console.error('❌ Errore test simulazione prenotazioni:', error);
        res.status(500).json({
            success: false,
            error: 'Errore test simulazione prenotazioni'
        });
    }
}



// ✅ NUOVO ENDPOINT: Ottieni giorni disponibili per un mese
async function getGiorniDisponibili(req, res) {
    try {
        const { id_spazio } = req.params;
        const { mese, anno } = req.query; // formato: mese=1-12, anno=2024

        if (!id_spazio || !mese || !anno) {
            return res.status(400).json({
                success: false,
                error: 'Parametri mancanti: id_spazio, mese e anno sono richiesti'
            });
        }

        // Verifica che lo spazio esista
        const spazioQuery = 'SELECT id_spazio, nome FROM Spazio WHERE id_spazio = $1';
        const spazioResult = await pool.query(spazioQuery, [id_spazio]);

        if (spazioResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Spazio non trovato'
            });
        }

        // Calcola il primo e ultimo giorno del mese
        const primoGiorno = new Date(anno, mese - 1, 1);
        const ultimoGiorno = new Date(anno, mese, 0); // 0 = ultimo giorno del mese precedente

        // Ottieni tutti i giorni del mese
        const giorniDelMese = [];
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        for (let giorno = 1; giorno <= ultimoGiorno.getDate(); giorno++) {
            const data = new Date(anno, mese - 1, giorno);
            
            // Salta giorni nel passato
            if (data < oggi) {
                giorniDelMese.push({
                    giorno: giorno,
                    data: data.toISOString().split('T')[0],
                    disponibile: false,
                    motivo: 'Data nel passato'
                });
                continue;
            }

            // Verifica se ci sono prenotazioni per questo giorno
            const prenotazioniQuery = `
                SELECT COUNT(*) as count
                FROM Prenotazione 
                WHERE id_spazio = $1 
                AND DATE(data_inizio) = $2
                AND stato IN ('confermata', 'in attesa')
                AND (stato != 'in attesa' OR scadenza_slot > NOW())
            `;

            const prenotazioniResult = await pool.query(prenotazioniQuery, [
                id_spazio, 
                data.toISOString().split('T')[0]
            ]);

            const prenotazioniCount = parseInt(prenotazioniResult.rows[0].count);
            
            // Considera un giorno disponibile se ha meno di 8 ore prenotate (9-17 = 8 slot)
            const disponibile = prenotazioniCount < 8;

            giorniDelMese.push({
                giorno: giorno,
                data: data.toISOString().split('T')[0],
                disponibile: disponibile,
                prenotazioni_count: prenotazioniCount,
                motivo: disponibile ? 'Disponibile' : 'Completamente prenotato'
            });
        }

        res.json({
            success: true,
            spazio_id: id_spazio,
            mese: parseInt(mese),
            anno: parseInt(anno),
            giorni: giorniDelMese
        });

    } catch (error) {
        console.error('❌ Errore getGiorniDisponibili:', error);
        res.status(500).json({
            success: false,
            error: 'Errore server: ' + error.message
        });
    }
}

module.exports = {
    getDisponibilitaSlot,
    getGiorniDisponibili,
    testEndpoint,
    testSimulateBookings
};



