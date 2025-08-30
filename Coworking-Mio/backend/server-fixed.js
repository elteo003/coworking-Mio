const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3002;

// Configurazione database con gestione errori
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'coworking',
    password: 'postgres',
    port: 5432,
});

// Test connessione database
pool.on('connect', () => {
    console.log('✅ Database connesso');
});

pool.on('error', (err) => {
    console.error('❌ Errore database:', err);
});

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:8000',
            'http://127.0.0.1:5500',
            'https://coworking-mio-1.onrender.com',
            'https://coworking-mio-1-backend.onrender.com'
        ];

        if (!origin || origin === 'null') return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Route di test
app.get('/api/ping', (req, res) => {
    res.json({
        message: 'Server funzionante!',
        timestamp: new Date().toISOString(),
        status: 'OK'
    });
});

// API Dashboard con dati reali dal database
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const { tipo, sede } = req.query;

        if (tipo !== 'responsabile') {
            return res.status(403).json({ error: 'Accesso negato' });
        }

        // Query per statistiche
        const prenotazioniQuery = `
      SELECT 
        COUNT(*) as prenotazioni_oggi,
        COUNT(DISTINCT p.id_utente) as utenti_attivi
      FROM Prenotazione p
      JOIN Spazio s ON p.id_spazio = s.id_spazio
      WHERE DATE(p.data_inizio) = CURRENT_DATE
      ${sede ? 'AND s.id_sede = $1' : ''}
    `;

        const fatturatoQuery = `
      SELECT COALESCE(SUM(pa.importo), 0) as fatturato_giorno
      FROM Prenotazione p
      JOIN Spazio s ON p.id_spazio = s.id_spazio
      JOIN Pagamento pa ON p.id_prenotazione = pa.id_prenotazione
      WHERE DATE(p.data_inizio) = CURRENT_DATE
      AND p.stato = 'confermata'
      AND pa.stato = 'pagato'
      ${sede ? 'AND s.id_sede = $1' : ''}
    `;

        const params = sede ? [sede] : [];

        const [prenotazioniResult, fatturatoResult] = await Promise.all([
            pool.query(prenotazioniQuery, params),
            pool.query(fatturatoQuery, params)
        ]);

        const stats = {
            prenotazioni_oggi: parseInt(prenotazioniResult.rows[0].prenotazioni_oggi) || 0,
            utenti_attivi: parseInt(prenotazioniResult.rows[0].utenti_attivi) || 0,
            fatturato_giorno: parseFloat(fatturatoResult.rows[0].fatturato_giorno) || 0,
            occupazione_media: 75 // Calcolo semplificato
        };

        res.json(stats);
    } catch (error) {
        console.error('Errore API dashboard:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// API A/B Testing
app.post('/api/ab-testing/goal', (req, res) => {
    try {
        const { test_name, goal_type, user_id, variant } = req.body;

        console.log('🎯 A/B Test Goal:', test_name, goal_type);

        res.json({
            success: true,
            test_name,
            goal_type,
            user_id,
            variant,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Errore A/B Testing:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// Gestione errori globale
app.use((err, req, res, next) => {
    console.error('Errore globale:', err);
    res.status(500).json({ error: 'Errore interno del server' });
});

// Avvio server con gestione errori
const server = app.listen(PORT, () => {
    console.log(`🚀 Server avviato sulla porta ${PORT}`);
    console.log(`🔗 Test: http://localhost:${PORT}/api/ping`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard/stats?tipo=responsabile&sede=1`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${PORT} già in uso`);
    } else {
        console.error('❌ Errore avvio server:', err);
    }
    process.exit(1);
});

// Gestione chiusura graceful
process.on('SIGTERM', () => {
    console.log('🛑 Chiusura server...');
    server.close(() => {
        pool.end();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Chiusura server...');
    server.close(() => {
        pool.end();
        process.exit(0);
    });
});



