/**
 * Server Express per CoWorkSpace
 * API per gestione sedi, spazi, prenotazioni e media
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// Middleware
app.use(express.static('frontend/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurazione sessione
app.use(session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 ore
}));

// Configurazione multer per upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo file immagine sono permessi'), false);
        }
    }
});

// Helper per chiamate Supabase
async function supabaseRequest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`Supabase error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

// Middleware di autenticazione
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.session.token;

    if (!token) {
        return res.status(401).json({ error: 'Token di autenticazione richiesto' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token non valido' });
    }
}

// Middleware per controlli di ruolo
function roleGuard(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Utente non autenticato' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Permessi insufficienti' });
        }

        next();
    };
}

// Middleware per verificare se l'utente è admin di una sede
async function locationAdminGuard(req, res, next) {
    try {
        const locationId = req.params.id || req.body.location_id;

        if (!locationId) {
            return res.status(400).json({ error: 'ID sede richiesto' });
        }

        // Verifica se l'utente è admin della sede
        const locations = await supabaseRequest(`locations?id=eq.${locationId}&admin_id=eq.${req.user.id}`);

        if (locations.length === 0) {
            return res.status(403).json({ error: 'Non sei amministratore di questa sede' });
        }

        req.location = locations[0];
        next();
    } catch (error) {
        console.error('Errore nel controllo admin sede:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
}

// Middleware per verificare se l'utente è admin dello spazio
async function spaceAdminGuard(req, res, next) {
    try {
        const spaceId = req.params.id || req.body.space_id;

        if (!spaceId) {
            return res.status(400).json({ error: 'ID spazio richiesto' });
        }

        // Verifica se l'utente è admin della sede dello spazio
        const spaces = await supabaseRequest(`spaces?id=eq.${spaceId}&select=*,locations!inner(admin_id)`);

        if (spaces.length === 0) {
            return res.status(404).json({ error: 'Spazio non trovato' });
        }

        if (spaces[0].locations.admin_id !== req.user.id) {
            return res.status(403).json({ error: 'Non sei amministratore di questa sede' });
        }

        req.space = spaces[0];
        next();
    } catch (error) {
        console.error('Errore nel controllo admin spazio:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
}

// Middleware per bloccare prenotazioni a gestori/amministratori
function bookingGuard(req, res, next) {
    if (req.user.role !== 'user') {
        return res.status(403).json({
            error: 'I gestori e amministratori non possono effettuare prenotazioni'
        });
    }
    next();
}

// ROUTES

// Autenticazione
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Simula autenticazione (in produzione usare Supabase Auth)
        const user = {
            id: '00000000-0000-0000-0000-000000000001',
            email: email,
            role: 'amministratore',
            full_name: 'Admin Test'
        };

        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        req.session.token = token;

        res.json({
            success: true,
            user: user,
            token: token
        });
    } catch (error) {
        console.error('Errore login:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// API Sedi
app.get('/api/locations/mine', authMiddleware, async (req, res) => {
    try {
        const locations = await supabaseRequest(
            `locations?admin_id=eq.${req.user.id}&select=*,location_photos(*)`
        );
        res.json(locations);
    } catch (error) {
        console.error('Errore nel caricamento sedi:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.post('/api/locations', authMiddleware, roleGuard(['gestore', 'amministratore']), async (req, res) => {
    try {
        const locationData = {
            ...req.body,
            admin_id: req.user.id
        };

        const location = await supabaseRequest('locations', {
            method: 'POST',
            body: JSON.stringify(locationData)
        });

        res.json(location[0]);
    } catch (error) {
        console.error('Errore nella creazione sede:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.patch('/api/locations/:id', authMiddleware, roleGuard(['gestore', 'amministratore']), locationAdminGuard, async (req, res) => {
    try {
        const location = await supabaseRequest(`locations?id=eq.${req.params.id}`, {
            method: 'PATCH',
            body: JSON.stringify(req.body)
        });

        res.json(location[0]);
    } catch (error) {
        console.error('Errore nell\'aggiornamento sede:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.delete('/api/locations/:id', authMiddleware, roleGuard(['gestore', 'amministratore']), locationAdminGuard, async (req, res) => {
    try {
        await supabaseRequest(`locations?id=eq.${req.params.id}`, {
            method: 'DELETE'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Errore nell\'eliminazione sede:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// API Spazi
app.get('/api/spaces', authMiddleware, async (req, res) => {
    try {
        const locationId = req.query.location_id;
        let query = 'spaces?select=*,space_photos(*),locations(*)';

        if (locationId) {
            query += `&location_id=eq.${locationId}`;
        } else {
            // Solo spazi delle sedi dell'utente
            query += `&locations.admin_id=eq.${req.user.id}`;
        }

        const spaces = await supabaseRequest(query);
        res.json(spaces);
    } catch (error) {
        console.error('Errore nel caricamento spazi:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.post('/api/spaces', authMiddleware, roleGuard(['gestore', 'amministratore']), async (req, res) => {
    try {
        // Verifica che l'utente sia admin della sede
        const locationId = req.body.location_id;
        const locations = await supabaseRequest(`locations?id=eq.${locationId}&admin_id=eq.${req.user.id}`);

        if (locations.length === 0) {
            return res.status(403).json({ error: 'Non sei amministratore di questa sede' });
        }

        const space = await supabaseRequest('spaces', {
            method: 'POST',
            body: JSON.stringify(req.body)
        });

        res.json(space[0]);
    } catch (error) {
        console.error('Errore nella creazione spazio:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.patch('/api/spaces/:id', authMiddleware, roleGuard(['gestore', 'amministratore']), spaceAdminGuard, async (req, res) => {
    try {
        const space = await supabaseRequest(`spaces?id=eq.${req.params.id}`, {
            method: 'PATCH',
            body: JSON.stringify(req.body)
        });

        res.json(space[0]);
    } catch (error) {
        console.error('Errore nell\'aggiornamento spazio:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.delete('/api/spaces/:id', authMiddleware, roleGuard(['gestore', 'amministratore']), spaceAdminGuard, async (req, res) => {
    try {
        await supabaseRequest(`spaces?id=eq.${req.params.id}`, {
            method: 'DELETE'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Errore nell\'eliminazione spazio:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// API Prenotazioni
app.get('/api/reservations', authMiddleware, async (req, res) => {
    try {
        const { space_id, start_date, end_date } = req.query;
        let query = 'reservations?select=*,spaces(*),profiles(*)';

        if (space_id) {
            query += `&space_id=eq.${space_id}`;
        }

        if (start_date) {
            query += `&start_at=gte.${start_date}`;
        }

        if (end_date) {
            query += `&end_at=lte.${end_date}`;
        }

        const reservations = await supabaseRequest(query);
        res.json(reservations);
    } catch (error) {
        console.error('Errore nel caricamento prenotazioni:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.post('/api/reservations', authMiddleware, async (req, res) => {
    try {
        const { kind, space_id, start_at, end_at, notes } = req.body;

        // Controllo ruolo per prenotazioni
        if (kind === 'booking') {
            if (req.user.role !== 'user') {
                return res.status(403).json({
                    error: 'I gestori e amministratori non possono effettuare prenotazioni'
                });
            }
        }

        // Controllo ruolo per occupazioni
        if (kind === 'occupazione') {
            if (!['gestore', 'amministratore'].includes(req.user.role)) {
                return res.status(403).json({
                    error: 'Solo gestori e amministratori possono creare occupazioni'
                });
            }

            // Verifica che l'utente sia admin della sede dello spazio
            const spaces = await supabaseRequest(`spaces?id=eq.${space_id}&select=*,locations!inner(admin_id)`);
            if (spaces.length === 0 || spaces[0].locations.admin_id !== req.user.id) {
                return res.status(403).json({
                    error: 'Non sei amministratore di questa sede'
                });
            }
        }

        const reservationData = {
            kind,
            space_id,
            user_id: req.user.id,
            start_at,
            end_at,
            notes
        };

        const reservation = await supabaseRequest('reservations', {
            method: 'POST',
            body: JSON.stringify(reservationData)
        });

        res.json(reservation[0]);
    } catch (error) {
        console.error('Errore nella creazione prenotazione:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.patch('/api/reservations/:id', authMiddleware, async (req, res) => {
    try {
        const reservationId = req.params.id;

        // Verifica che l'utente possa modificare questa prenotazione
        const reservations = await supabaseRequest(`reservations?id=eq.${reservationId}&select=*,spaces(*,locations(*))`);

        if (reservations.length === 0) {
            return res.status(404).json({ error: 'Prenotazione non trovata' });
        }

        const reservation = reservations[0];

        // L'utente può modificare solo le proprie prenotazioni o occupazioni delle proprie sedi
        if (reservation.user_id !== req.user.id &&
            reservation.spaces.locations.admin_id !== req.user.id) {
            return res.status(403).json({ error: 'Non puoi modificare questa prenotazione' });
        }

        const updatedReservation = await supabaseRequest(`reservations?id=eq.${reservationId}`, {
            method: 'PATCH',
            body: JSON.stringify(req.body)
        });

        res.json(updatedReservation[0]);
    } catch (error) {
        console.error('Errore nell\'aggiornamento prenotazione:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

app.delete('/api/reservations/:id', authMiddleware, async (req, res) => {
    try {
        const reservationId = req.params.id;

        // Verifica che l'utente possa eliminare questa prenotazione
        const reservations = await supabaseRequest(`reservations?id=eq.${reservationId}&select=*,spaces(*,locations(*))`);

        if (reservations.length === 0) {
            return res.status(404).json({ error: 'Prenotazione non trovata' });
        }

        const reservation = reservations[0];

        // L'utente può eliminare solo le proprie prenotazioni o occupazioni delle proprie sedi
        if (reservation.user_id !== req.user.id &&
            reservation.spaces.locations.admin_id !== req.user.id) {
            return res.status(403).json({ error: 'Non puoi eliminare questa prenotazione' });
        }

        await supabaseRequest(`reservations?id=eq.${reservationId}`, {
            method: 'DELETE'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Errore nell\'eliminazione prenotazione:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// API Upload Foto
app.post('/api/upload', authMiddleware, roleGuard(['gestore', 'amministratore']), upload.array('photos', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        const { parent_type, parent_id } = req.body;

        if (!parent_type || !parent_id) {
            return res.status(400).json({ error: 'Tipo e ID parent richiesti' });
        }

        // Verifica che l'utente sia admin del parent
        if (parent_type === 'location') {
            const locations = await supabaseRequest(`locations?id=eq.${parent_id}&admin_id=eq.${req.user.id}`);
            if (locations.length === 0) {
                return res.status(403).json({ error: 'Non sei amministratore di questa sede' });
            }
        } else if (parent_type === 'space') {
            const spaces = await supabaseRequest(`spaces?id=eq.${parent_id}&select=*,locations!inner(admin_id)`);
            if (spaces.length === 0 || spaces[0].locations.admin_id !== req.user.id) {
                return res.status(403).json({ error: 'Non sei amministratore di questa sede' });
            }
        }

        const uploadedPhotos = [];

        for (const file of req.files) {
            // In produzione, caricare su Supabase Storage
            const photoUrl = `/uploads/${file.filename}`;

            const photoData = {
                [`${parent_type}_id`]: parent_id,
                url: photoUrl,
                sort_order: 0
            };

            const photo = await supabaseRequest(`${parent_type}_photos`, {
                method: 'POST',
                body: JSON.stringify(photoData)
            });

            uploadedPhotos.push(photo[0]);
        }

        res.json(uploadedPhotos);
    } catch (error) {
        console.error('Errore nell\'upload foto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// API per gestione foto
app.delete('/api/photos/:id', authMiddleware, roleGuard(['gestore', 'amministratore']), async (req, res) => {
    try {
        const photoId = req.params.id;
        const { parent_type } = req.query;

        if (!parent_type) {
            return res.status(400).json({ error: 'Tipo parent richiesto' });
        }

        // Verifica che l'utente sia admin del parent
        const photos = await supabaseRequest(`${parent_type}_photos?id=eq.${photoId}&select=*,${parent_type}s(*,locations(*))`);

        if (photos.length === 0) {
            return res.status(404).json({ error: 'Foto non trovata' });
        }

        const photo = photos[0];
        const parent = photo[`${parent_type}s`];

        if (parent_type === 'location') {
            if (parent.admin_id !== req.user.id) {
                return res.status(403).json({ error: 'Non sei amministratore di questa sede' });
            }
        } else if (parent_type === 'space') {
            if (parent.locations.admin_id !== req.user.id) {
                return res.status(403).json({ error: 'Non sei amministratore di questa sede' });
            }
        }

        await supabaseRequest(`${parent_type}_photos?id=eq.${photoId}`, {
            method: 'DELETE'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Errore nell\'eliminazione foto:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// API per statistiche
app.get('/api/stats', authMiddleware, async (req, res) => {
    try {
        const locations = await supabaseRequest(`locations?admin_id=eq.${req.user.id}`);
        const spaces = await supabaseRequest(`spaces?select=*,locations!inner(admin_id)&locations.admin_id=eq.${req.user.id}`);

        const today = new Date().toISOString().split('T')[0];
        const reservations = await supabaseRequest(`reservations?select=*,spaces(*,locations(*))&spaces.locations.admin_id=eq.${req.user.id}&start_at=gte.${today}`);

        const stats = {
            locations: locations.length,
            spaces: spaces.length,
            reservations_today: reservations.length,
            occupancy: 0 // Calcolare occupazione
        };

        res.json(stats);
    } catch (error) {
        console.error('Errore nel caricamento statistiche:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// Gestione errori
app.use((error, req, res, next) => {
    console.error('Errore server:', error);

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File troppo grande (max 5MB)' });
        }
    }

    res.status(500).json({ error: 'Errore interno del server' });
});

// Avvia il server
app.listen(PORT, () => {
    console.log(`Server CoWorkSpace in esecuzione sulla porta ${PORT}`);
    console.log(`Frontend disponibile su http://localhost:${PORT}`);
    console.log(`API disponibili su http://localhost:${PORT}/api/`);
});

module.exports = app;
