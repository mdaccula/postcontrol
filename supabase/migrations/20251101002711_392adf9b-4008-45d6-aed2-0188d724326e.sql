-- ============================================================================
-- RESET COMPLETO DE RLS POLICIES - 4 ETAPAS
-- ============================================================================

-- ============================================================================
-- ETAPA 1: REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS
-- ============================================================================

-- Drop policies em user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Agency admins can manage their agency roles" ON public.user_roles;

-- Drop policies em profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários e admins podem atualizar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Agency admins can view their agency profiles" ON public.profiles;
DROP POLICY IF EXISTS "Master admins podem ver todos os perfis" ON public.profiles;

-- Drop policies em events
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
DROP POLICY IF EXISTS "Admins can create events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Agency admins can view their agency events" ON public.events;
DROP POLICY IF EXISTS "Master admins can view all events" ON public.events;
DROP POLICY IF EXISTS "Guests can view permitted events" ON public.events;

-- Drop policies em posts
DROP POLICY IF EXISTS "Admins can create posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Agency admins can view their agency posts" ON public.posts;
DROP POLICY IF EXISTS "Master admins can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Guests can view permitted posts" ON public.posts;

-- Drop policies em submissions
DROP POLICY IF EXISTS "Users can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can create own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can delete own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Agency admins can view their agency submissions" ON public.submissions;
DROP POLICY IF EXISTS "Agency admins can update their agency submissions" ON public.submissions;
DROP POLICY IF EXISTS "Agency admins can delete their agency submissions" ON public.submissions;
DROP POLICY IF EXISTS "Master admins can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Master admins can update all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Master admins can delete all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Guests can view permitted submissions" ON public.submissions;
DROP POLICY IF EXISTS "Guests can update permitted submissions" ON public.submissions;

-- Drop policies em agency_guests
DROP POLICY IF EXISTS "Convidados podem ver seu próprio convite" ON public.agency_guests;
DROP POLICY IF EXISTS "Convidados podem aceitar convite" ON public.agency_guests;
DROP POLICY IF EXISTS "Agency admins podem gerenciar convidados da sua agência" ON public.agency_guests;

-- Drop policies em guest_event_permissions
DROP POLICY IF EXISTS "Convidados podem ver suas próprias permissões" ON public.guest_event_permissions;
DROP POLICY IF EXISTS "Agency admins podem gerenciar permissões" ON public.guest_event_permissions;

-- ============================================================================
-- ETAPA 2: RECRIAR POLÍTICAS BÁSICAS (user_roles e profiles)
-- ============================================================================

-- Policies para user_roles (usando SECURITY DEFINER functions já criadas)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Master admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Master admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Agency admins can manage their agency roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.is_current_user_agency_admin() 
  AND user_id IN (
    SELECT p.id 
    FROM public.profiles p
    WHERE p.agency_id = (
      SELECT profiles.agency_id 
      FROM public.profiles 
      WHERE profiles.id = auth.uid()
    )
  )
);

-- Policies para profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Master admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Master admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Agency admins can view their agency profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND agency_id = (
    SELECT profiles.agency_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Agency admins can update their agency profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND agency_id = (
    SELECT profiles.agency_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- ============================================================================
-- ETAPA 3: RECRIAR POLÍTICAS PARA EVENTS, POSTS E SUBMISSIONS
-- ============================================================================

-- Policies para events
CREATE POLICY "Anyone can view active events"
ON public.events
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Master admins can view all events"
ON public.events
FOR SELECT
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Agency admins can view their agency events"
ON public.events
FOR SELECT
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND agency_id = (
    SELECT profiles.agency_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Master admins can manage all events"
ON public.events
FOR ALL
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Agency admins can manage their agency events"
ON public.events
FOR ALL
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND agency_id = (
    SELECT profiles.agency_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Policies para posts
CREATE POLICY "Master admins can view all posts"
ON public.posts
FOR SELECT
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Agency admins can view their agency posts"
ON public.posts
FOR SELECT
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND agency_id = (
    SELECT profiles.agency_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Master admins can manage all posts"
ON public.posts
FOR ALL
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Agency admins can manage their agency posts"
ON public.posts
FOR ALL
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND agency_id = (
    SELECT profiles.agency_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Policies para submissions
CREATE POLICY "Users can view their own submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own submissions"
ON public.submissions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own submissions"
ON public.submissions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own submissions"
ON public.submissions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Master admins can view all submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Master admins can manage all submissions"
ON public.submissions
FOR ALL
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Agency admins can view their agency submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND agency_id = (
    SELECT profiles.agency_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Agency admins can manage their agency submissions"
ON public.submissions
FOR ALL
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND agency_id = (
    SELECT profiles.agency_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- ============================================================================
-- ETAPA 4: RECRIAR POLÍTICAS PARA SISTEMA DE GUESTS
-- ============================================================================

-- Policies para agency_guests
CREATE POLICY "Guests can view their own invites"
ON public.agency_guests
FOR SELECT
TO authenticated
USING (
  guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR guest_user_id = auth.uid()
);

CREATE POLICY "Guests can accept their invites"
ON public.agency_guests
FOR UPDATE
TO authenticated
USING (
  guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
);

CREATE POLICY "Master admins can manage all guests"
ON public.agency_guests
FOR ALL
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Agency admins can manage their agency guests"
ON public.agency_guests
FOR ALL
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND agency_id = (
    SELECT profiles.agency_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Policies para guest_event_permissions
CREATE POLICY "Guests can view their own permissions"
ON public.guest_event_permissions
FOR SELECT
TO authenticated
USING (
  guest_id IN (
    SELECT id 
    FROM public.agency_guests 
    WHERE guest_user_id = auth.uid()
  )
);

CREATE POLICY "Master admins can manage all guest permissions"
ON public.guest_event_permissions
FOR ALL
TO authenticated
USING (public.is_current_user_master_admin());

CREATE POLICY "Agency admins can manage their agency guest permissions"
ON public.guest_event_permissions
FOR ALL
TO authenticated
USING (
  public.is_current_user_agency_admin()
  AND guest_id IN (
    SELECT ag.id
    FROM public.agency_guests ag
    WHERE ag.agency_id = (
      SELECT profiles.agency_id 
      FROM public.profiles 
      WHERE profiles.id = auth.uid()
    )
  )
);

-- Adicionar policies para guests visualizarem eventos e submissions permitidos
CREATE POLICY "Guests can view permitted events"
ON public.events
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT gep.event_id
    FROM public.guest_event_permissions gep
    JOIN public.agency_guests ag ON ag.id = gep.guest_id
    WHERE ag.guest_user_id = auth.uid()
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);

CREATE POLICY "Guests can view permitted submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  post_id IN (
    SELECT p.id
    FROM public.posts p
    JOIN public.guest_event_permissions gep ON gep.event_id = p.event_id
    JOIN public.agency_guests ag ON ag.id = gep.guest_id
    WHERE ag.guest_user_id = auth.uid()
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);

CREATE POLICY "Guests with moderator+ can update permitted submissions"
ON public.submissions
FOR UPDATE
TO authenticated
USING (
  post_id IN (
    SELECT p.id
    FROM public.posts p
    JOIN public.guest_event_permissions gep ON gep.event_id = p.event_id
    JOIN public.agency_guests ag ON ag.id = gep.guest_id
    WHERE ag.guest_user_id = auth.uid()
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
      AND gep.permission_level IN ('moderator', 'manager')
  )
);

CREATE POLICY "Guests can view permitted posts"
ON public.posts
FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT gep.event_id
    FROM public.guest_event_permissions gep
    JOIN public.agency_guests ag ON ag.id = gep.guest_id
    WHERE ag.guest_user_id = auth.uid()
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);

-- ============================================================================
-- FIM DO RESET COMPLETO
-- ============================================================================