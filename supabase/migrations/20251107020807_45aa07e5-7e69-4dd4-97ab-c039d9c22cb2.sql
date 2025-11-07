-- ✅ FASE 3: Tornar políticas de guest mais permissivas
-- Mantém todas as políticas existentes de USER, ADMIN e MASTER intactas

-- Permitir que guests vejam submissões dos eventos que eles têm permissão
CREATE POLICY "Guests can view submissions from their events"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM agency_guests ag
    JOIN guest_event_permissions gep ON gep.guest_id = ag.id
    JOIN posts p ON p.id = submissions.post_id
    WHERE ag.guest_user_id = auth.uid()
      AND gep.event_id = p.event_id
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);

-- Permitir que guests com permissão moderator ou manager atualizem status de submissões
CREATE POLICY "Guests can update submissions from their events"
ON public.submissions
FOR UPDATE
TO authenticated
USING (
  is_guest_with_permission(auth.uid(), (SELECT event_id FROM posts WHERE id = submissions.post_id), 'moderator'::guest_permission)
)
WITH CHECK (
  is_guest_with_permission(auth.uid(), (SELECT event_id FROM posts WHERE id = submissions.post_id), 'moderator'::guest_permission)
);

-- Permitir que guests vejam posts dos eventos que eles têm permissão
CREATE POLICY "Guests can view posts from their events"
ON public.posts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM agency_guests ag
    JOIN guest_event_permissions gep ON gep.guest_id = ag.id
    WHERE ag.guest_user_id = auth.uid()
      AND gep.event_id = posts.event_id
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);

-- Permitir que guests com permissão manager gerenciem posts
CREATE POLICY "Guests with manager permission can manage posts"
ON public.posts
FOR ALL
TO authenticated
USING (
  is_guest_with_permission(auth.uid(), event_id, 'manager'::guest_permission)
)
WITH CHECK (
  is_guest_with_permission(auth.uid(), event_id, 'manager'::guest_permission)
);

-- Permitir que guests vejam eventos que eles têm permissão
CREATE POLICY "Guests can view their assigned events"
ON public.events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM agency_guests ag
    JOIN guest_event_permissions gep ON gep.guest_id = ag.id
    WHERE ag.guest_user_id = auth.uid()
      AND gep.event_id = events.id
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);

-- Permitir que guests com permissão manager editem eventos
CREATE POLICY "Guests with manager permission can update events"
ON public.events
FOR UPDATE
TO authenticated
USING (
  is_guest_with_permission(auth.uid(), id, 'manager'::guest_permission)
)
WITH CHECK (
  is_guest_with_permission(auth.uid(), id, 'manager'::guest_permission)
);

-- Permitir que guests vejam perfis dos usuários da mesma agência
CREATE POLICY "Guests can view profiles from their agency"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM agency_guests ag
    WHERE ag.guest_user_id = auth.uid()
      AND ag.agency_id = profiles.agency_id
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);