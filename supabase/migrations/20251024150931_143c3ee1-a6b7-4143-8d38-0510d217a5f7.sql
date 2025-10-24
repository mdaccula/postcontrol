-- Make screenshots bucket private and add RLS policies
UPDATE storage.buckets
SET public = false
WHERE id = 'screenshots';

-- Create RLS policies for screenshots bucket
CREATE POLICY "Users can upload their own screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'screenshots' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'screenshots' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);