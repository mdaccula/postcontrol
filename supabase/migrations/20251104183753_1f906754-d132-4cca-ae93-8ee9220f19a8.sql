-- Permitir leitura pública de eventos ativos
-- Necessário para a página pública de eventos funcionar
DROP POLICY IF EXISTS "Anyone can view active events" ON events;

CREATE POLICY "Leitura pública de eventos ativos"
ON events
FOR SELECT
TO anon, authenticated
USING (is_active = true);