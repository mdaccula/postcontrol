-- Remover políticas antigas do bucket agency-logos se existirem
DROP POLICY IF EXISTS "Agency admins can manage agency logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view agency logos" ON storage.objects;

-- Política para visualização pública dos logos
CREATE POLICY "Anyone can view agency logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agency-logos');

-- Política para agency admins fazerem upload de logos
CREATE POLICY "Agency admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agency-logos'
  AND auth.uid() IN (
    SELECT p.id 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role IN ('agency_admin', 'master_admin')
  )
);

-- Política para agency admins atualizarem logos
CREATE POLICY "Agency admins can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agency-logos'
  AND auth.uid() IN (
    SELECT p.id 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role IN ('agency_admin', 'master_admin')
  )
);

-- Política para agency admins deletarem logos
CREATE POLICY "Agency admins can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agency-logos'
  AND auth.uid() IN (
    SELECT p.id 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role IN ('agency_admin', 'master_admin')
  )
);