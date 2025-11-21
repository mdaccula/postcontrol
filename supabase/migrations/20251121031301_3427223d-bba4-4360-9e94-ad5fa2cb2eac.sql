
-- Criar políticas RLS para o bucket agency-og-images
-- Permitir que admins de agência façam upload

CREATE POLICY "Agency admins can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agency-og-images' 
  AND (
    is_current_user_agency_admin() 
    OR is_current_user_master_admin()
  )
);

CREATE POLICY "Agency admins can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agency-og-images' 
  AND (
    is_current_user_agency_admin() 
    OR is_current_user_master_admin()
  )
)
WITH CHECK (
  bucket_id = 'agency-og-images' 
  AND (
    is_current_user_agency_admin() 
    OR is_current_user_master_admin()
  )
);

CREATE POLICY "Agency admins can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agency-og-images' 
  AND (
    is_current_user_agency_admin() 
    OR is_current_user_master_admin()
  )
);

CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agency-og-images');
