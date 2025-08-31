-- Migration per il nuovo sistema di gestione slot
-- Aggiunge la tabella slots con gestione timer e stati

-- Crea la tabella slots
CREATE TABLE IF NOT EXISTS slots (
    id SERIAL PRIMARY KEY,
    id_spazio INTEGER NOT NULL REFERENCES Spazio(id_spazio),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('available', 'occupied', 'booked', 'past')) DEFAULT 'available',
    held_until TIMESTAMP NULL,
    id_utente INTEGER REFERENCES Utente(id_utente) NULL, -- Utente che ha occupato lo slot
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_slots_spazio_time ON slots(id_spazio, start_time);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_held_until ON slots(held_until) WHERE held_until IS NOT NULL;

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_slots_updated_at
    BEFORE UPDATE ON slots
    FOR EACH ROW
    EXECUTE FUNCTION update_slots_updated_at();

-- Funzione per liberare slot scaduti
CREATE OR REPLACE FUNCTION free_expired_slots()
RETURNS INTEGER AS $$
DECLARE
    freed_count INTEGER;
BEGIN
    UPDATE slots 
    SET status = 'available', 
        held_until = NULL, 
        id_utente = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'occupied' 
    AND held_until IS NOT NULL 
    AND held_until < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS freed_count = ROW_COUNT;
    RETURN freed_count;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare slot passati
CREATE OR REPLACE FUNCTION update_past_slots()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE slots 
    SET status = 'past',
        updated_at = CURRENT_TIMESTAMP
    WHERE status IN ('available', 'occupied') 
    AND end_time < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Funzione per creare slot per un giorno specifico
CREATE OR REPLACE FUNCTION create_daily_slots(
    p_id_spazio INTEGER,
    p_date DATE,
    p_start_hour INTEGER DEFAULT 9,
    p_end_hour INTEGER DEFAULT 18
)
RETURNS INTEGER AS $$
DECLARE
    current_hour INTEGER;
    slots_created INTEGER := 0;
BEGIN
    -- Pulisci slot esistenti per questa data e spazio
    DELETE FROM slots 
    WHERE id_spazio = p_id_spazio 
    AND DATE(start_time) = p_date;
    
    -- Crea slot per ogni ora
    FOR current_hour IN p_start_hour..(p_end_hour - 1) LOOP
        INSERT INTO slots (id_spazio, start_time, end_time, status)
        VALUES (
            p_id_spazio,
            p_date + (current_hour || ' hours')::INTERVAL,
            p_date + ((current_hour + 1) || ' hours')::INTERVAL,
            CASE 
                WHEN p_date + (current_hour || ' hours')::INTERVAL < CURRENT_TIMESTAMP THEN 'past'
                ELSE 'available'
            END
        );
        slots_created := slots_created + 1;
    END LOOP;
    
    RETURN slots_created;
END;
$$ LANGUAGE plpgsql;

-- Popola slot per i prossimi 30 giorni per tutti gli spazi esistenti
DO $$
DECLARE
    spazio_record RECORD;
    current_date DATE;
    days_ahead INTEGER;
BEGIN
    FOR spazio_record IN SELECT id_spazio FROM Spazio LOOP
        FOR days_ahead IN 0..30 LOOP
            current_date := CURRENT_DATE + days_ahead;
            PERFORM create_daily_slots(spazio_record.id_spazio, current_date);
        END LOOP;
    END LOOP;
END $$;

-- Commenti per documentazione
COMMENT ON TABLE slots IS 'Tabella per gestione slot temporali con timer automatico';
COMMENT ON COLUMN slots.status IS 'Stato dello slot: available, occupied, booked, past';
COMMENT ON COLUMN slots.held_until IS 'Timestamp fino al quale lo slot è occupato (per timer automatico)';
COMMENT ON COLUMN slots.id_utente IS 'Utente che ha occupato temporaneamente lo slot';
COMMENT ON FUNCTION free_expired_slots() IS 'Libera automaticamente slot occupati scaduti';
COMMENT ON FUNCTION update_past_slots() IS 'Marca come passati gli slot con orario scaduto';
COMMENT ON FUNCTION create_daily_slots(INTEGER, DATE, INTEGER, INTEGER) IS 'Crea slot per un giorno specifico';
