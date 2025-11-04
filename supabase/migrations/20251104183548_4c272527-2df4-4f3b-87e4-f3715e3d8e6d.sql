-- Permitir leitura pública de dados básicos das agências
-- Necessário para a página pública de eventos funcionar
CREATE POLICY "Permitir leitura pública de dados básicos da agência"
ON agencies
FOR SELECT
TO public
USING (true);