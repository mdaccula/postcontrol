-- FASE 2/4: Criar políticas de leitura pública para avatares de agências
-- Primeiro, remover política duplicada caso exista
DROP POLICY IF EXISTS "Avatars públicos - leitura por todos" ON storage.objects;

-- Criar política de leitura pública para avatares
CREATE POLICY "Avatars públicos - leitura por todos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'screenshots' 
  AND (storage.foldername(name))[1] = 'avatars'
);