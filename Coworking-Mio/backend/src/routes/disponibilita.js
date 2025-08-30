// Carica variabili d'ambiente
require('dotenv').config();

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db');

// Endpoint per ottenere la disponibilità degli spazi per i responsabili
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { tipo, sede } = req.query;
        const userId = req.user?.id_utente;

        console.log('📅 Disponibilità - Richiesta:', { tipo, sede, userId });

        // Verifica che l'utente sia gestore o amministratore
        if (tipo !== 'responsabile') {
            return res.status(403).json({ error: 'Accesso negato. Solo responsabili possono accedere.' });
        }

        let sedeFilter = '';
        let params = [];

        // Filtro per sede se specificata
        if (sede !== undefined && sede !== null && sede !== '') {
            sedeFilter = `WHERE s.id_sede = $1`;
            params = [sede];
        }

        // Query per ottenere gli spazi e le loro prenotazioni
        const spaziQuery = `
            SELECT 
                s.id_spazio,
                s.nome as nome_spazio,
                s.capienza as capacita,
                25.00 as prezzo_ora,
                s.id_sede,
                se.nome as nome_sede
            FROM Spazio s
            JOIN Sede se ON s.id_sede = se.id_sede
            ${sedeFilter}
            ORDER BY s.nome
        `;

        // Query per ottenere le prenotazioni attive
        const prenotazioniQuery = `
            SELECT 
                p.id_prenotazione,
                p.id_spazio,
                p.data_inizio,
                p.data_fine,
                p.stato,
                u.nome,
                u.cognome
            FROM Prenotazione p
            JOIN Spazio s ON p.id_spazio = s.id_spazio
            JOIN Sede se ON s.id_sede = se.id_sede
            JOIN Utente u ON p.id_utente = u.id_utente
            WHERE p.stato IN ('confermata', 'in attesa')
            AND p.data_fine >= CURRENT_DATE
            ${sedeFilter}
            ORDER BY p.data_inizio
        `;

        // Query per ottenere le regole di disponibilità (semplificata)
        const regoleQuery = `
            SELECT 
                s.id_spazio as id_regola,
                CONCAT('Regola standard per ', s.nome) as nome_regola,
                '1,2,3,4,5' as giorni_settimana,
                '09:00' as ora_inizio,
                '18:00' as ora_fine,
                25.00 as prezzo_ora,
                s.nome as nome_spazio,
                se.nome as nome_sede
            FROM Spazio s
            JOIN Sede se ON s.id_sede = se.id_sede
            ${sedeFilter}
            ORDER BY s.nome
        `;

        const [spaziResult, prenotazioniResult, regoleResult] = await Promise.all([
            pool.query(spaziQuery, params),
            pool.query(prenotazioniQuery, params),
            pool.query(regoleQuery, params)
        ]);

        // Organizza i dati per la risposta
        const spazi = spaziResult.rows.map(spazio => ({
            id: spazio.id_spazio,
            nome: spazio.nome_spazio,
            capacita: spazio.capacita,
            prezzo_ora: parseFloat(spazio.prezzo_ora),
            sede: {
                id: spazio.id_sede,
                nome: spazio.nome_sede
            }
        }));

        const prenotazioni = prenotazioniResult.rows.map(prenotazione => ({
            id: prenotazione.id_prenotazione,
            id_spazio: prenotazione.id_spazio,
            data_inizio: prenotazione.data_inizio,
            data_fine: prenotazione.data_fine,
            stato: prenotazione.stato,
            utente: {
                nome: prenotazione.nome,
                cognome: prenotazione.cognome
            }
        }));

        const regole = regoleResult.rows.map(regola => ({
            id: regola.id_regola,
            nome: regola.nome_regola,
            giorni_settimana: regola.giorni_settimana,
            ora_inizio: regola.ora_inizio,
            ora_fine: regola.ora_fine,
            prezzo_ora: parseFloat(regola.prezzo_ora),
            spazio: regola.nome_spazio,
            sede: regola.nome_sede
        }));

        const response = {
            spazi,
            prenotazioni,
            regole,
            totale_spazi: spazi.length,
            prenotazioni_attive: prenotazioni.length,
            regole_attive: regole.length
        };

        console.log('✅ Disponibilità - Dati preparati:', {
            spazi: spazi.length,
            prenotazioni: prenotazioni.length,
            regole: regole.length
        });

        res.json(response);

    } catch (error) {
        console.error('❌ Errore Disponibilità:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

module.exports = router;
