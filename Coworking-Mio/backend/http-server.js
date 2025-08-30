const http = require('http');
const url = require('url');
const { Pool } = require('pg');

const PORT = 3002;

// Configurazione database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'coworking',
    password: 'postgres',
    port: 5432,
});

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
};

// Funzione per gestire CORS
function handleCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', 'application/json');
}

// Funzione per leggere il body della richiesta
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Funzione per inviare risposta JSON
function sendJSON(res, data, statusCode = 200) {
    handleCORS(res);
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
}

// Funzione per gestire le route
async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;

    console.log(`${method} ${path}`);

    // Gestione CORS preflight
    if (method === 'OPTIONS') {
        handleCORS(res);
        res.statusCode = 200;
        res.end();
        return;
    }

    try {
        // Route: /api/ping
        if (path === '/api/ping' && method === 'GET') {
            sendJSON(res, {
                message: 'Server HTTP funzionante!',
                timestamp: new Date().toISOString(),
                status: 'OK'
            });
            return;
        }

        // Route: /api/dashboard/stats
        if (path === '/api/dashboard/stats' && method === 'GET') {
            const { tipo, sede } = parsedUrl.query;

            if (tipo !== 'responsabile') {
                sendJSON(res, { error: 'Accesso negato' }, 403);
                return;
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
                occupazione_media: 75
            };

            sendJSON(res, stats);
            return;
        }

        // Route: /api/ab-testing/goal
        if (path === '/api/ab-testing/goal' && method === 'POST') {
            const body = await readBody(req);
            const { test_name, goal_type, user_id, variant } = body;

            console.log('🎯 A/B Test Goal:', test_name, goal_type);

            sendJSON(res, {
                success: true,
                test_name,
                goal_type,
                user_id,
                variant,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Route non trovata
        sendJSON(res, { error: 'Route non trovata' }, 404);

    } catch (error) {
        console.error('Errore gestione richiesta:', error);
        sendJSON(res, { error: 'Errore interno del server' }, 500);
    }
}

// Creazione server HTTP
const server = http.createServer(handleRequest);

// Test connessione database
pool.on('connect', () => {
    console.log('✅ Database connesso');
});

pool.on('error', (err) => {
    console.error('❌ Errore database:', err);
});

// Avvio server
server.listen(PORT, () => {
    console.log(`🚀 Server HTTP avviato sulla porta ${PORT}`);
    console.log(`🔗 Test: http://localhost:${PORT}/api/ping`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard/stats?tipo=responsabile&sede=1`);
});

server.on('error', (err) => {
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



