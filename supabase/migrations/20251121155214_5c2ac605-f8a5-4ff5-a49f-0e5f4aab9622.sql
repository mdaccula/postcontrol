-- Corrigir policy de storage para agency-logos
-- Remover a policy antiga que usa owner_id
DROP POLICY IF EXISTS "Agency admins can manage agency logos" ON storage.objects;

-- Criar nova policy que verifica se o usuário é admin da agência usando o path
CREATE POLICY "Agency admins can manage agency logos"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'agency-logos' 
  AND (
    is_current_user_master_admin()
    OR (
      is_current_user_agency_admin()
      AND EXISTS (
        SELECT 1 FROM agencies
        WHERE agencies.id::text = split_part(name, '/', 2)
        AND agencies.id = get_current_user_agency_id()
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'agency-logos'
  AND (
    is_current_user_master_admin()
    OR (
      is_current_user_agency_admin()
      AND EXISTS (
        SELECT 1 FROM agencies
        WHERE agencies.id::text = split_part(name, '/', 2)
        AND agencies.id = get_current_user_agency_id()
      )
    )
  )
);