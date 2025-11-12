-- FASE A: Criar RLS Policy para permitir usuários comuns criarem posts virtuais de venda
CREATE POLICY "Users can create sale virtual posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (
  post_number = 0 
  AND post_type = 'venda'
  AND agency_id IN (
    SELECT agency_id 
    FROM user_agencies 
    WHERE user_id = auth.uid()
  )
);