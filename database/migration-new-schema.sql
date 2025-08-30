-- Migrazione per il nuovo schema CoWorkSpace con gestione sedi, spazi e foto
-- Esegui questo script per aggiornare il database esistente

-- 1. Creazione dei tipi enum
CREATE TYPE app_role AS ENUM ('user', 'gestore', 'amministratore');
CREATE TYPE photo_parent AS ENUM ('location', 'space');
CREATE TYPE reservation_kind AS ENUM ('booking', 'occupazione');
CREATE TYPE reservation_status AS ENUM ('active', 'cancelled');

-- 2. Creazione tabella profiles (sostituisce Utente con struttura migliorata)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Creazione tabella locations (sostituisce Sede con struttura migliorata)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    description TEXT,
    services TEXT[],
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON locations(admin_id);

-- 4. Creazione tabella spaces (sostituisce Spazio con struttura migliorata)
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    capacity INTEGER,
    amenities TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON spaces(location_id);

-- 5. Creazione tabelle per le foto (separate per location e space)
CREATE TABLE IF NOT EXISTS location_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS space_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Creazione tabella reservations (sostituisce Prenotazione con struttura migliorata)
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind reservation_kind NOT NULL,
    status reservation_status NOT NULL DEFAULT 'active',
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_time_valid CHECK (end_at > start_at)
);
CREATE INDEX ON reservations(space_id, start_at, end_at);
CREATE INDEX ON reservations(kind);

-- 7. Vista per la disponibilità degli spazi
CREATE OR REPLACE VIEW space_availability AS
SELECT 
    s.id as space_id,
    bool_or(r.kind='booking' AND r.status='active' AND tsrange(r.start_at,r.end_at, '[)') && tsrange(now(), now(), '[]')) as is_booked_now,
    bool_or(r.kind='occupazione' AND r.status='active' AND r.end_at > now()) as is_occupied_now
FROM spaces s
LEFT JOIN reservations r ON r.space_id = s.id
    AND r.status='active'
    AND tsrange(r.start_at, r.end_at, '[)') && tsrange(now(), now(), '[]')
GROUP BY s.id;

-- 8. Abilitazione Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_photos ENABLE ROW LEVEL SECURITY;

-- 9. Policy per profiles
CREATE POLICY "profiles_self" ON profiles
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_self_update" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- 10. Policy per locations
CREATE POLICY "locations_admin_select" ON locations
    FOR SELECT USING (admin_id = auth.uid());
CREATE POLICY "locations_admin_write" ON locations
    FOR ALL USING (admin_id = auth.uid());

-- 11. Policy per spaces
CREATE POLICY "spaces_admin" ON spaces
    FOR ALL USING (
        EXISTS (SELECT 1 FROM locations l WHERE l.id = spaces.location_id AND l.admin_id = auth.uid())
    );

-- 12. Policy per location_photos
CREATE POLICY "location_photos_admin" ON location_photos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM locations l WHERE l.id = location_photos.location_id AND l.admin_id = auth.uid())
    );

-- 13. Policy per space_photos
CREATE POLICY "space_photos_admin" ON space_photos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM spaces s JOIN locations l ON l.id=s.location_id WHERE s.id = space_photos.space_id AND l.admin_id = auth.uid())
    );

-- 14. Policy per reservations
-- Gli utenti standard possono leggere gli slot (read-only globale se serve) ma inserire solo se role='user'
CREATE POLICY "reservations_read_all" ON reservations
    FOR SELECT USING (true);

-- Blocca prenotazioni per gestori e amministratori lato RLS
CREATE POLICY "reservations_insert_user_only" ON reservations
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'user')
    );

-- Admin/gestore possono inserire occupazioni (kind='occupazione') solo per le proprie sedi
CREATE POLICY "reservations_insert_occupazioni_admin" ON reservations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('gestore','amministratore')
        )
        AND new.kind = 'occupazione'
        AND EXISTS (
            SELECT 1 FROM spaces s JOIN locations l ON l.id = s.location_id
            WHERE s.id = new.space_id AND l.admin_id = auth.uid()
        )
    );

-- Update/cancel constraints
CREATE POLICY "reservations_update_owner_admin" ON reservations
    FOR UPDATE USING (
        -- gli utenti possono modificare solo le proprie prenotazioni
        (auth.uid() = user_id AND kind='booking')
        OR
        -- admin/gestore possono aggiornare occupazioni delle proprie sedi
        (
            kind='occupazione' AND EXISTS (
                SELECT 1 FROM spaces s JOIN locations l ON l.id=s.location_id
                WHERE s.id = reservations.space_id AND l.admin_id = auth.uid()
            )
        )
    );

-- 15. Funzione per ottenere il ruolo corrente dell'utente
CREATE OR REPLACE FUNCTION current_role()
RETURNS app_role AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Funzione per verificare se un utente è admin di una sede
CREATE OR REPLACE FUNCTION is_location_admin(location_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM locations 
        WHERE id = location_uuid AND admin_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Trigger per aggiornare timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applica il trigger alle tabelle che hanno updated_at
-- (da aggiungere se necessario in futuro)

-- 18. Inserimento dati di esempio per test
INSERT INTO profiles (id, role, full_name) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'amministratore', 'Admin Test'),
    ('00000000-0000-0000-0000-000000000002', 'gestore', 'Gestore Test'),
    ('00000000-0000-0000-0000-000000000003', 'user', 'Utente Test')
ON CONFLICT (id) DO NOTHING;

-- 19. Inserimento sedi di esempio
INSERT INTO locations (id, name, address, description, services, admin_id) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'CoWork Milano Centro', 'Via Roma 1, Milano', 'Sede centrale di Milano con tutti i servizi', ARRAY['WiFi', 'Caffè', 'Parcheggio'], '00000000-0000-0000-0000-000000000001'),
    ('22222222-2222-2222-2222-222222222222', 'CoWork Roma Nord', 'Via del Corso 10, Roma', 'Sede moderna nel centro di Roma', ARRAY['WiFi', 'Caffè', 'Sala riunioni'], '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- 20. Inserimento spazi di esempio
INSERT INTO spaces (id, location_id, name, description, capacity, amenities) VALUES 
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Stanza Privata 1', 'Stanza privata con scrivania e sedia ergonomica', 1, ARRAY['WiFi', 'Scrivania', 'Sedia ergonomica']),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Open Space', 'Area coworking condivisa', 10, ARRAY['WiFi', 'Scrivanie', 'Sedie', 'Caffè']),
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Sala Meeting', 'Sala riunioni per 8 persone', 8, ARRAY['WiFi', 'Proiettore', 'Lavagna', 'Caffè'])
ON CONFLICT (id) DO NOTHING;

-- 21. Inserimento foto di esempio
INSERT INTO location_photos (location_id, url, sort_order) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 0),
    ('11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', 1),
    ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800', 0)
ON CONFLICT DO NOTHING;

INSERT INTO space_photos (space_id, url, sort_order) VALUES 
    ('33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600', 0),
    ('44444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600', 0),
    ('55555555-5555-5555-5555-555555555555', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600', 0)
ON CONFLICT DO NOTHING;

-- 22. Inserimento prenotazioni di esempio
INSERT INTO reservations (kind, status, space_id, user_id, start_at, end_at, notes) VALUES 
    ('booking', 'active', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'Prenotazione di test'),
    ('occupazione', 'active', '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000002', NOW(), NOW() + INTERVAL '2 hours', 'Manutenzione straordinaria')
ON CONFLICT DO NOTHING;

-- 23. Commenti per documentazione
COMMENT ON TABLE profiles IS 'Profili utenti con ruoli e informazioni base';
COMMENT ON TABLE locations IS 'Sedi di coworking con amministratore dedicato';
COMMENT ON TABLE spaces IS 'Spazi/stanze all''interno delle sedi';
COMMENT ON TABLE location_photos IS 'Foto delle sedi con ordinamento';
COMMENT ON TABLE space_photos IS 'Foto degli spazi con ordinamento';
COMMENT ON TABLE reservations IS 'Prenotazioni e occupazioni degli spazi';
COMMENT ON VIEW space_availability IS 'Vista per verificare disponibilità spazi in tempo reale';

COMMENT ON COLUMN reservations.kind IS 'Tipo: booking (prenotazione utente) o occupazione (blocco temporaneo)';
COMMENT ON COLUMN reservations.status IS 'Stato: active (attiva) o cancelled (cancellata)';
COMMENT ON COLUMN locations.admin_id IS 'ID dell''amministratore proprietario della sede';
COMMENT ON COLUMN spaces.amenities IS 'Array di servizi/amenities disponibili nello spazio';
COMMENT ON COLUMN locations.services IS 'Array di servizi disponibili nella sede';
