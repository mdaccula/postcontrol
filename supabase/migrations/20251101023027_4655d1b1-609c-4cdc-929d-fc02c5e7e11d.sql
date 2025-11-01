-- Adicionar política RLS para usuários visualizarem posts apenas da própria agência
CREATE POLICY "Authenticated users can view their agency active posts"
ON public.posts
FOR SELECT
TO authenticated
USING (
  -- Verificar se o post pertence a um evento ativo da mesma agência do usuário
  EXISTS (
    SELECT 1 
    FROM public.events 
    WHERE events.id = posts.event_id 
    AND events.is_active = true
    AND events.agency_id = (
      SELECT agency_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);