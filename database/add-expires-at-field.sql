-- Migrazione per aggiungere campo expires_at alla gestione slot
-- Sostituisce il sistema cron con controllo automatico su query

-- Aggiungi campo expires_at alla tabella Prenotazione per slot temporanei
ALTER TABLE Prenotazione 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL;

-- Aggiungi indice per performance su expires_at
CREATE INDEX IF NOT EXISTS idx_prenotazione_expires_at 
ON Prenotazione(expires_at) 
WHERE expires_at IS NOT NULL;

-- Aggiungi commento per documentazione
COMMENT ON COLUMN Prenotazione.expires_at IS 'Timestamp di scadenza per slot temporanei (hold). NULL per prenotazioni permanenti.';

-- Funzione per liberare slot scaduti automaticamente
CREATE OR REPLACE FUNCTION free_expired_slots()
RETURNS INTEGER AS $$
DECLARE
    freed_count INTEGER;
BEGIN
    -- Libera slot con expires_at < NOW() e stato 'in attesa'
    UPDATE Prenotazione 
    SET stato = 'annullata',
        expires_at = NULL
    WHERE stato = 'in attesa' 
    AND expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS freed_count = ROW_COUNT;
    
    -- Log per debug
    IF freed_count > 0 THEN
        RAISE NOTICE 'Liberati % slot scaduti', freed_count;
    END IF;
    
    RETURN freed_count;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare slot passati
CREATE OR REPLACE FUNCTION update_past_slots()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Marca come 'completata' le prenotazioni con data_fine < NOW()
    UPDATE Prenotazione 
    SET stato = 'completata'
    WHERE stato IN ('confermata', 'in attesa') 
    AND data_fine < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log per debug
    IF updated_count > 0 THEN
        RAISE NOTICE 'Aggiornati % slot passati', updated_count;
    END IF;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Funzione per impostare expires_at su slot temporaneo
CREATE OR REPLACE FUNCTION set_slot_expiry(
    p_prenotazione_id INTEGER,
    p_minutes INTEGER DEFAULT 15
)
RETURNS TIMESTAMP AS $$
DECLARE
    expiry_time TIMESTAMP;
BEGIN
    expiry_time := CURRENT_TIMESTAMP + (p_minutes || ' minutes')::INTERVAL;
    
    UPDATE Prenotazione 
    SET expires_at = expiry_time
    WHERE id_prenotazione = p_prenotazione_id;
    
    RETURN expiry_time;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare expires_at quando stato cambia
CREATE OR REPLACE FUNCTION update_expires_at_on_state_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Se stato diventa 'in attesa', imposta expires_at
    IF NEW.stato = 'in attesa' AND OLD.stato != 'in attesa' THEN
        NEW.expires_at := CURRENT_TIMESTAMP + INTERVAL '15 minutes';
    END IF;
    
    -- Se stato diventa 'confermata', rimuovi expires_at
    IF NEW.stato = 'confermata' AND OLD.stato = 'in attesa' THEN
        NEW.expires_at := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea trigger
DROP TRIGGER IF EXISTS trigger_update_expires_at ON Prenotazione;
CREATE TRIGGER trigger_update_expires_at
    BEFORE UPDATE ON Prenotazione
    FOR EACH ROW
    EXECUTE FUNCTION update_expires_at_on_state_change();

-- Query di esempio per testare il sistema
-- SELECT free_expired_slots(); -- Libera slot scaduti
-- SELECT update_past_slots(); -- Aggiorna slot passati
-- SELECT set_slot_expiry(123, 15); -- Imposta scadenza 15 min per prenotazione 123

-- Vista per slot disponibili con controllo expires_at
CREATE OR REPLACE VIEW slot_availability AS
SELECT 
    s.id_spazio,
    s.nome as spazio_nome,
    s.id_sede,
    se.nome as sede_nome,
    p.id_prenotazione,
    p.data_inizio,
    p.data_fine,
    p.stato,
    p.expires_at,
    CASE 
        WHEN p.expires_at IS NOT NULL AND p.expires_at < CURRENT_TIMESTAMP THEN 'available'
        WHEN p.stato = 'confermata' THEN 'booked'
        WHEN p.stato = 'in attesa' AND p.expires_at IS NOT NULL THEN 'occupied'
        WHEN p.data_fine < CURRENT_TIMESTAMP THEN 'past'
        ELSE 'available'
    END as slot_status,
    EXTRACT(HOUR FROM p.data_inizio) as start_hour,
    EXTRACT(HOUR FROM p.data_fine) as end_hour
FROM Spazio s
JOIN Sede se ON s.id_sede = se.id_sede
LEFT JOIN Prenotazione p ON s.id_spazio = p.id_spazio 
    AND DATE(p.data_inizio) = CURRENT_DATE
    AND p.stato IN ('confermata', 'in attesa')
ORDER BY s.id_spazio, p.data_inizio;

-- Commenti per documentazione
COMMENT ON FUNCTION free_expired_slots() IS 'Libera automaticamente slot con expires_at < NOW()';
COMMENT ON FUNCTION update_past_slots() IS 'Marca come completati gli slot con data_fine < NOW()';
COMMENT ON FUNCTION set_slot_expiry(INTEGER, INTEGER) IS 'Imposta scadenza per slot temporaneo';
COMMENT ON VIEW slot_availability IS 'Vista per disponibilità slot con controllo automatico expires_at';
