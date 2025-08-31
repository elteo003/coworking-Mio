-- Tabella per gestire i codici di invito per amministratori
CREATE TABLE IF NOT EXISTS CodiciInvitoAdmin (
    id_codice SERIAL PRIMARY KEY,
    codice TEXT NOT NULL UNIQUE,
    ruolo TEXT NOT NULL CHECK (ruolo IN ('gestore', 'amministratore')),
    creato_da INTEGER NOT NULL REFERENCES Utente(id_utente),
    creato_il TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utilizzato BOOLEAN DEFAULT FALSE,
    utilizzato_il TIMESTAMP,
    utilizzato_da INTEGER REFERENCES Utente(id_utente),
    scadenza TIMESTAMP,
    note TEXT
);

-- Indici per ottimizzare le query
CREATE INDEX IF NOT EXISTS idx_codici_invito_codice ON CodiciInvitoAdmin(codice);
CREATE INDEX IF NOT EXISTS idx_codici_invito_non_utilizzati ON CodiciInvitoAdmin(utilizzato, scadenza);
CREATE INDEX IF NOT EXISTS idx_codici_invito_ruolo ON CodiciInvitoAdmin(ruolo);

-- Inserisci alcuni codici di esempio per sviluppo
INSERT INTO CodiciInvitoAdmin (codice, ruolo, creato_da, note) VALUES 
('ADMIN2024TEST001', 'amministratore', 1, 'Codice di test per sviluppo'),
('GESTORE2024TEST001', 'gestore', 1, 'Codice di test per gestori')
ON CONFLICT (codice) DO NOTHING;
