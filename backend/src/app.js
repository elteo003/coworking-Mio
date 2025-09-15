const path = require('path');

// Carica variabili d'ambiente
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const config = require('../config/config');
const { authenticateToken } = require('./middleware/auth');
// Socket.IO rimosso - sistema semplificato
const redisService = require('./services/redisService');
const app = express();
const server = http.createServer(app);
const PORT = config.server.port;

// Middleware CORS per permettere richieste dal frontend e dai test
app.use(cors({
  origin: function (origin, callback) {
    // Lista degli origin permessi
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:8000',
      'http://127.0.0.1:5500',
      'https://coworking-mio-1.onrender.com',
      'https://coworking-mio-1-backend.onrender.com'
    ];

    // Permetti richieste senza origin (es. Postman, mobile apps, test Node.js)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Gestisci le richieste OPTIONS (preflight) con headers espliciti
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-ID, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 ore
  res.sendStatus(200);
});

// Middleware per loggare le richieste CORS
app.use((req, res, next) => {
  const origin = req.headers.origin || 'No origin';
  const referer = req.headers.referer || 'No referer';


  // Log più dettagliato per debug
  if (req.method === 'POST' || req.method === 'PUT') {
  }

  next();
});

// Configurazione body parser con limiti aumentati per upload immagini
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servi file statici del frontend
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// Route per servire la homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

// Route di test per verificare i file statici
app.get('/test', (req, res) => {
  res.json({
    message: 'Server funziona!',
    staticPath: path.join(__dirname, '../../frontend/public'),
    indexExists: require('fs').existsSync(path.join(__dirname, '../../frontend/public/index.html'))
  });
});

// Connessione DB
require('./db');

// Socket.IO verrà inizializzato nella funzione initializeServices()

// Middleware per timer slot rimosso - sistema semplificato
// Timer automatico rimosso - sistema semplificato

// Rotte di autenticazione
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// Rotte di catalogo
const catalogoRoutes = require('./routes/catalogo');
app.use('/api', catalogoRoutes);

// Rotte di prenotazioni
const prenotazioniRoutes = require('./routes/prenotazioni');
app.use('/api', prenotazioniRoutes);

// Rotte di pagamenti
const pagamentiRoutes = require('./routes/pagamenti');
app.use('/api', pagamentiRoutes);

// Rotte dashboard gestore
const gestoreRoutes = require('./routes/gestore');
app.use('/api', gestoreRoutes);

// Rotte webhook Stripe
const webhookRoutes = require('./routes/webhook');
app.use('/webhook', webhookRoutes);

// Rotte per gestione scadenze
const scadenzeRoutes = require('./routes/scadenze');
app.use('/api/scadenze', scadenzeRoutes);

// Rotte per gestione concorrenza real-time
const concorrenzaRoutes = require('./routes/concorrenza');
app.use('/api/concorrenza', concorrenzaRoutes);

// Route slot rimosse - sistema semplificato

// Rotte per spazi (endpoint pubblici per disponibilità)
const spaziRoutes = require('./routes/spazi');
app.use('/api/spazi', spaziRoutes);

// Rotte dashboard responsabili
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// Rotte per sedi (endpoint pubblici per gestori)
const sediRoutes = require('./routes/sedi');
app.use('/api/sedi', sediRoutes);

// Rotte per A/B testing
// Route ab-testing rimosse - sistema semplificato

// Rotte per utenti (endpoint per gestori)
const utentiRoutes = require('./routes/utenti');
app.use('/api/utenti', utentiRoutes);

// Rotte amministrative
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Log delle route caricate

// Endpoint di test per verificare se le route scadenze sono caricate
app.get('/api/test-scadenze', (req, res) => {
  res.json({
    message: 'Route scadenze caricate correttamente',
    timestamp: new Date().toISOString(),
    routes: ['/api/scadenze/check', '/api/scadenze/status', '/api/scadenze/prenotazioni-scadute', '/api/scadenze/prenotazioni-in-scadenza']
  });
});

// Endpoint di test per verificare l'autenticazione
app.get('/api/test-auth', (req, res) => {
  res.json({
    message: 'Test autenticazione',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Endpoint di test per verificare l'autenticazione con middleware
app.get('/api/test-auth-protected', authenticateToken, (req, res) => {
  res.json({
    message: 'Test autenticazione protetta',
    user: req.user,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Endpoint di test per la concorrenza
app.get('/api/test-concorrenza', (req, res) => {
  res.json({
    message: 'Route concorrenza caricate correttamente',
    timestamp: new Date().toISOString(),
    routes: ['/api/concorrenza/spazi/:id/stato-concorrenza'],
    test: 'Testa con: GET /api/concorrenza/spazi/1/stato-concorrenza'
  });
});

// Rotte analytics
const analyticsRoutes = require('./routes/analytics');
app.use('/api', analyticsRoutes);

// Rotte servizi
const serviziRoutes = require('./routes/servizi');
app.use('/api', serviziRoutes);

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Endpoint di test CORS
app.get('/api/test-cors', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Endpoint di test CORS specifico per sedi
app.get('/api/test-sedi-cors', (req, res) => {
  res.json({
    message: 'CORS sedi test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString(),
    test: 'Questo endpoint dovrebbe funzionare come /api/sedi'
  });
});

// Endpoint di test disponibilità senza autenticazione (per debug)
app.get('/api/test-disponibilita', (req, res) => {
  const { data_inizio, data_fine } = req.query;
  res.json({
    message: 'Test disponibilità senza auth',
    data_inizio,
    data_fine,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Endpoint di debug per testare la connessione al database
app.get('/api/debug/db-test', async (req, res) => {
  try {
    const pool = require('./db');
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    res.json({
      message: 'Database connection successful',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      error: 'Database connection failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint di debug per testare le sedi
app.get('/api/debug/sedi-test', async (req, res) => {
  try {
    const pool = require('./db');
    const result = await pool.query('SELECT COUNT(*) as sede_count FROM Sede');
    res.json({
      message: 'Sedi query successful',
      sede_count: result.rows[0].sede_count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sedi test error:', error);
    res.status(500).json({
      error: 'Sedi query failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint di debug per popolare il database con dati di esempio
app.post('/api/debug/populate-db', async (req, res) => {
  try {
    const pool = require('./db');
    const fs = require('fs');
    const path = require('path');


    // Leggi il file seed.sql
    const seedPath = path.join(__dirname, '../../database/seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');

    // Esegui le query di seed
    await pool.query(seedSQL);

    // Verifica che i dati siano stati inseriti
    const sediResult = await pool.query('SELECT COUNT(*) as count FROM Sede');
    const spaziResult = await pool.query('SELECT COUNT(*) as count FROM Spazio');
    const serviziResult = await pool.query('SELECT COUNT(*) as count FROM Servizio');


    res.json({
      message: 'Database populated successfully',
      data: {
        sedi: sediResult.rows[0].count,
        spazi: spaziResult.rows[0].count,
        servizi: serviziResult.rows[0].count
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Errore popolamento database:', error);
    res.status(500).json({
      error: 'Database population failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint di test per le route spazi
app.get('/api/test-spazi', (req, res) => {
  res.json({
    message: 'Route spazi test successful',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString(),
    test: 'Questo endpoint dovrebbe funzionare come /api/spazi'
  });
});

// Endpoint di test per disponibilità slot
app.get('/api/test-disponibilita-slot', (req, res) => {
  const { id_spazio, data } = req.query;
  res.json({
    message: 'Test disponibilità slot senza auth',
    id_spazio,
    data,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Endpoint di test per verificare il token JWT inviato
app.get('/api/test-token', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Nessun header Authorization',
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Header Authorization deve iniziare con "Bearer "',
      authHeader,
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.substring(7);

  res.json({
    message: 'Token ricevuto correttamente',
    tokenLength: token ? token.length : 0,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Avvia il cron job per le scadenze (disabilitato temporaneamente per sviluppo locale)
// const scadenzeCron = require('./cron/scadenzeCron');
// scadenzeCron.start();

// Inizializza servizi
async function initializeServices() {
  try {
    // Inizializza Redis
    await redisService.initialize();

    // Socket.IO rimosso - sistema semplificato

  } catch (error) {
    console.error('❌ Errore inizializzazione servizi:', error);
  }
}

// Avvia server
server.listen(PORT, async () => {

  // Inizializza servizi
  await initializeServices();

});
