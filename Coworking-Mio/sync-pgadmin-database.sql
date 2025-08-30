-- =====================================================
-- SCRIPT COMPLETO PER SINCRONIZZARE PGADMIN CON SUPABASE
-- =====================================================
-- Esegui questo script in pgAdmin per aggiornare il database locale
-- con la stessa struttura e dati di Supabase

-- =====================================================
-- 1. PULIZIA DATABASE ESISTENTE (OPZIONALE)
-- =====================================================
-- ATTENZIONE: Questo cancellerà tutti i dati esistenti!
-- Decommenta solo se vuoi un reset completo

/*
DROP TABLE IF EXISTS Pagamento CASCADE;
DROP TABLE IF EXISTS Prenotazione CASCADE;
DROP TABLE IF EXISTS Spazio_Servizio CASCADE;
DROP TABLE IF EXISTS Servizio CASCADE;
DROP TABLE IF EXISTS Spazio CASCADE;
DROP TABLE IF EXISTS Sede CASCADE;
DROP TABLE IF EXISTS Utente CASCADE;
*/

-- =====================================================
-- 2. CREAZIONE TABELLE (SCHEMA COMPLETO)
-- =====================================================

-- Tabella Utente
CREATE TABLE IF NOT EXISTS Utente (
    id_utente SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    ruolo TEXT NOT NULL CHECK (ruolo IN ('cliente', 'gestore', 'amministratore')),
    telefono TEXT,
    stripe_customer_id TEXT UNIQUE
);

-- Tabella Sede
CREATE TABLE IF NOT EXISTS Sede (
    id_sede SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    citta TEXT NOT NULL,
    indirizzo TEXT NOT NULL,
    descrizione TEXT,
    id_gestore INTEGER REFERENCES Utente(id_utente)
);

-- Tabella Spazio
CREATE TABLE IF NOT EXISTS Spazio (
    id_spazio SERIAL PRIMARY KEY,
    id_sede INTEGER NOT NULL REFERENCES Sede(id_sede),
    nome TEXT NOT NULL,
    tipologia TEXT NOT NULL CHECK (tipologia IN ('stanza privata', 'postazione', 'sala riunioni')),
    descrizione TEXT,
    capienza INTEGER
);

-- Tabella Servizio
CREATE TABLE IF NOT EXISTS Servizio (
    id_servizio SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    descrizione TEXT
);

-- Tabella Spazio_Servizio (Many-to-Many)
CREATE TABLE IF NOT EXISTS Spazio_Servizio (
    id_spazio INTEGER NOT NULL REFERENCES Spazio(id_spazio),
    id_servizio INTEGER NOT NULL REFERENCES Servizio(id_servizio),
    PRIMARY KEY (id_spazio, id_servizio)
);

-- Tabella Prenotazione
CREATE TABLE IF NOT EXISTS Prenotazione (
    id_prenotazione SERIAL PRIMARY KEY,
    id_utente INTEGER NOT NULL REFERENCES Utente(id_utente),
    id_spazio INTEGER NOT NULL REFERENCES Spazio(id_spazio),
    data_inizio TIMESTAMP NOT NULL,
    data_fine TIMESTAMP NOT NULL,
    stato TEXT NOT NULL CHECK (stato IN ('pendente', 'in attesa', 'confermata', 'annullata', 'completata', 'pagamento_fallito', 'scaduta', 'cancellata')),
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scadenza_slot TIMESTAMP,
    data_pagamento TIMESTAMP
);

-- Tabella Pagamento
CREATE TABLE IF NOT EXISTS Pagamento (
    id_pagamento SERIAL PRIMARY KEY,
    id_prenotazione INTEGER NOT NULL REFERENCES Prenotazione(id_prenotazione),
    importo NUMERIC(10,2) NOT NULL,
    data_pagamento TIMESTAMP NOT NULL,
    stato TEXT NOT NULL CHECK (stato IN ('pagato', 'in attesa', 'rimborsato', 'fallito', 'in sospeso')),
    -- estensioni provider
    metodo TEXT,
    provider TEXT,
    provider_payment_id TEXT UNIQUE,
    currency TEXT,
    receipt_url TEXT,
    stripe_payment_intent_id TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. INSERIMENTO DATI DI TEST
-- =====================================================

-- Inserimento utenti (con password hash)
-- NOTA: Le password sono già hashate con bcrypt
INSERT INTO Utente (nome, cognome, email, password, ruolo, telefono) VALUES
('Francesco', 'Bro', 'frabro@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cliente', '+39 123 456 7890'),
('Ilmio', 'Bro', 'ilmiobro@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'gestore', '+39 987 654 3210')
ON CONFLICT (email) DO UPDATE SET
    nome = EXCLUDED.nome,
    cognome = EXCLUDED.cognome,
    password = EXCLUDED.password,
    ruolo = EXCLUDED.ruolo,
    telefono = EXCLUDED.telefono;

-- Inserimento sedi
INSERT INTO Sede (nome, citta, indirizzo, descrizione, id_gestore) VALUES
('Sede Centrale Milano', 'Milano', 'Via Montenapoleone 1, 20121 Milano', 'Sede principale nel cuore di Milano, perfetta per meeting e lavoro individuale', 2),
('Sede Navigli', 'Milano', 'Corso di Porta Ticinese 87, 20123 Milano', 'Ambiente creativo nella zona Navigli, ideale per startup e freelancer', 2),
('Sede Brera', 'Milano', 'Via Brera 28, 20121 Milano', 'Spazio elegante nel quartiere artistico di Brera', 2)
ON CONFLICT DO NOTHING;

-- Inserimento spazi
INSERT INTO Spazio (id_sede, nome, tipologia, descrizione, capienza) VALUES
-- Sede 1 - Sede Centrale Milano
(1, 'Sala Meeting Executive', 'sala riunioni', 'Sala elegante per meeting importanti', 12),
(1, 'Postazione Open Space A1', 'postazione', 'Postazione in open space con vista su Milano', 1),
(1, 'Postazione Open Space A2', 'postazione', 'Postazione in open space con vista su Milano', 1),
(1, 'Ufficio Privato 101', 'stanza privata', 'Ufficio privato con scrivania e armadio', 2),

-- Sede 2 - Sede Navigli
(2, 'Sala Creativa', 'sala riunioni', 'Sala colorata e creativa per brainstorming', 8),
(2, 'Postazione Startup B1', 'postazione', 'Postazione dedicata alle startup', 1),
(2, 'Postazione Startup B2', 'postazione', 'Postazione dedicata alle startup', 1),

-- Sede 3 - Sede Brera
(3, 'Sala Arte', 'sala riunioni', 'Sala ispirata all''arte con opere locali', 6),
(3, 'Postazione Artista C1', 'postazione', 'Postazione per artisti e creativi', 1),
(3, 'Atelier Privato', 'stanza privata', 'Spazio privato per lavoro creativo', 1)
ON CONFLICT DO NOTHING;

-- Inserimento servizi
INSERT INTO Servizio (nome, descrizione) VALUES
('WiFi', 'Connessione internet ad alta velocità'),
('Aria Condizionata', 'Climatizzazione controllata'),
('Proiettore', 'Proiettore per presentazioni'),
('Caffè', 'Macchina del caffè disponibile'),
('Parcheggio', 'Posti auto riservati'),
('Reception', 'Servizio di reception 24/7')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. VERIFICA SETUP
-- =====================================================

-- Conta record inseriti
SELECT 'Utenti' as tabella, COUNT(*) as count FROM Utente
UNION ALL
SELECT 'Sedi', COUNT(*) FROM Sede
UNION ALL
SELECT 'Spazi', COUNT(*) FROM Spazio
UNION ALL
SELECT 'Servizi', COUNT(*) FROM Servizio;

-- Mostra utenti creati
SELECT id_utente, nome, cognome, email, ruolo FROM Utente;

-- Mostra sedi create
SELECT id_sede, nome, citta, indirizzo FROM Sede;

-- =====================================================
-- 5. CREDENZIALI DI ACCESSO
-- =====================================================
/*
CREDENZIALI UTENTI:
- Utente Normale: frabro@email.com / frabro19
- Gestore: ilmiobro@email.com / ilmiobro19

NOTA: Le password sono hashate con bcrypt, quindi non sono leggibili.
Per testare il login, usa le credenziali sopra nel frontend.
*/

-- =====================================================
-- 6. INDICI PER PERFORMANCE (OPZIONALE)
-- =====================================================

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_prenotazione_data_inizio ON Prenotazione(data_inizio);
CREATE INDEX IF NOT EXISTS idx_prenotazione_data_fine ON Prenotazione(data_fine);
CREATE INDEX IF NOT EXISTS idx_prenotazione_stato ON Prenotazione(stato);
CREATE INDEX IF NOT EXISTS idx_prenotazione_id_utente ON Prenotazione(id_utente);
CREATE INDEX IF NOT EXISTS idx_prenotazione_id_spazio ON Prenotazione(id_spazio);
CREATE INDEX IF NOT EXISTS idx_spazio_id_sede ON Spazio(id_sede);
CREATE INDEX IF NOT EXISTS idx_utente_email ON Utente(email);

-- =====================================================
-- FINE SCRIPT
-- =====================================================
