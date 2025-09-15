-- Test per verificare che le tabelle delle immagini siano create correttamente
-- Esegui queste query per verificare la struttura

-- 1. Verifica struttura tabella sede_immagini
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sede_immagini' 
ORDER BY ordinal_position;

-- 2. Verifica struttura tabella spazio_immagini
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'spazio_immagini' 
ORDER BY ordinal_position;

-- 3. Verifica foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('sede_immagini', 'spazio_immagini');

-- 4. Verifica sequenze
SELECT sequence_name, data_type, start_value, increment
FROM information_schema.sequences 
WHERE sequence_name IN ('sede_immagini_id_seq', 'spazio_immagini_id_seq');

-- 5. Test inserimento (opzionale - solo per test)
-- INSERT INTO sede_immagini (id_sede, url, alt_text) 
-- VALUES (1, 'https://example.com/test.jpg', 'Test image');
-- 
-- INSERT INTO spazio_immagini (id_spazio, url, alt_text) 
-- VALUES (1, 'https://example.com/test2.jpg', 'Test image 2');

-- 6. Verifica dati inseriti (se hai eseguito i test)
-- SELECT * FROM sede_immagini;
-- SELECT * FROM spazio_immagini;
