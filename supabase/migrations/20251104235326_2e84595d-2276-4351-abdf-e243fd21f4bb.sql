-- FASE 2: Atualizar RLS policy para incluir agency-logos
DROP POLICY IF EXISTS "Avatars públicos - leitura por todos" ON storage.objects;

CREATE POLICY "Avatars e logos públicos - leitura por todos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'screenshots' 
  AND (
    (storage.foldername(name))[1] = 'avatars'
    OR (storage.foldername(name))[1] = 'agency-logos'
  )
);