-- Funzioni per gestione automatica slot scaduti e passati
-- Queste funzioni sostituiscono il sistema cron con controllo automatico su query

-- Funzione per liberare slot scaduti (occupied con expires_at < NOW())
CREATE OR REPLACE FUNCTION free_expired_slots()
RETURNS INTEGER AS $$
DECLARE
    freed_count INTEGER;
BEGIN
    -- Aggiorna slot scaduti da 'in attesa' a 'disponibile'
    UPDATE Prenotazione 
    SET stato = 'disponibile', expires_at = NULL
    WHERE stato = 'in attesa' 
    AND expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS freed_count = ROW_COUNT;
    
    -- Log del risultato
    IF freed_count > 0 THEN
        RAISE NOTICE 'Liberati % slot scaduti', freed_count;
    END IF;
    
    RETURN freed_count;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare slot passati (orari già trascorsi)
CREATE OR REPLACE FUNCTION update_past_slots()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Aggiorna slot passati da 'disponibile' a 'passato'
    UPDATE Prenotazione 
    SET stato = 'passato'
    WHERE stato = 'disponibile' 
    AND data_inizio < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log del risultato
    IF updated_count > 0 THEN
        RAISE NOTICE 'Aggiornati % slot passati', updated_count;
    END IF;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ottenere statistiche slot
CREATE OR REPNOCE FUNCTION get_slots_stats(id_spazio_param INTEGER, date_param DATE)
RETURNS TABLE(
    total_slots INTEGER,
    available_slots INTEGER,
    occupied_slots INTEGER,
    booked_slots INTEGER,
    past_slots INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_slots,
        COUNT(*) FILTER (WHERE stato = 'disponibile')::INTEGER as available_slots,
        COUNT(*) FILTER (WHERE stato = 'in attesa')::INTEGER as occupied_slots,
        COUNT(*) FILTER (WHERE stato = 'confermata')::INTEGER as booked_slots,
        COUNT(*) FILTER (WHERE stato = 'passato')::INTEGER as past_slots
    FROM Prenotazione 
    WHERE id_spazio = id_spazio_param 
    AND DATE(data_inizio) = date_param;
END;
$$ LANGUAGE plpgsql;
