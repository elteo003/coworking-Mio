const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

console.log('🔧 Avvio server semplificato...');

// Middleware CORS
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
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Route di test
app.get('/api/ping', (req, res) => {
    res.json({ message: 'Server funzionante!', timestamp: new Date().toISOString() });
});

app.get('/api/dashboard/stats', (req, res) => {
    res.json({
        prenotazioni_oggi: 5,
        utenti_attivi: 12,
        fatturato_giorno: 150.00,
        occupazione_media: 75
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server semplificato in esecuzione sulla porta ${PORT}`);
    console.log(`🔗 Test: http://localhost:${PORT}/api/ping`);
}).on('error', (err) => {
    console.error('❌ Errore avvio server:', err);
});



