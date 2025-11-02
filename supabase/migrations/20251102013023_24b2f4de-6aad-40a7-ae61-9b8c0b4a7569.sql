-- ============================================================================
-- CORREÇÃO DE SEGURANÇA: Sistema de Convidados
-- ============================================================================
-- Este script adiciona proteções RLS críticas e validação server-side para
-- o sistema de convites de convidados.
-- ============================================================================

-- ============================================================================
-- PARTE 1: RLS Policies para agency_guests
-- ============================================================================

-- Habilitar RLS na tabela agency_guests
ALTER TABLE public.agency_guests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Agency admins podem gerenciar convites de sua agência
CREATE POLICY "Agency admins manage their agency guests"
ON public.agency_guests
FOR ALL
USING (
  is_current_user_agency_admin() 
  AND agency_id = get_current_user_agency_id()
)
WITH CHECK (
  is_current_user_agency_admin() 
  AND agency_id = get_current_user_agency_id()
);

-- Policy 2: Usuários podem visualizar convites enviados para seu email
CREATE POLICY "Users can view invites sent to their email"
ON public.agency_guests
FOR SELECT
USING (
  guest_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Policy 3: Usuários podem aceitar convites enviados para seu email (via RPC function)
CREATE POLICY "Users can accept their own invites"
ON public.agency_guests
FOR UPDATE
USING (
  guest_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
  AND status = 'pending'
)
WITH CHECK (
  guest_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Policy 4: Master admins podem gerenciar todos os convites
CREATE POLICY "Master admins manage all guests"
ON public.agency_guests
FOR ALL
USING (is_current_user_master_admin())
WITH CHECK (is_current_user_master_admin());

-- ============================================================================
-- PARTE 2: RLS Policies para guest_event_permissions
-- ============================================================================

-- Habilitar RLS na tabela guest_event_permissions
ALTER TABLE public.guest_event_permissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Agency admins gerenciam permissões de sua agência
CREATE POLICY "Agency admins manage guest permissions"
ON public.guest_event_permissions
FOR ALL
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 
    FROM public.agency_guests ag
    WHERE ag.id = guest_event_permissions.guest_id
      AND ag.agency_id = get_current_user_agency_id()
  )
)
WITH CHECK (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 
    FROM public.agency_guests ag
    WHERE ag.id = guest_event_permissions.guest_id
      AND ag.agency_id = get_current_user_agency_id()
  )
);

-- Policy 2: Guests podem visualizar suas próprias permissões
CREATE POLICY "Guests view their own permissions"
ON public.guest_event_permissions
FOR SELECT
USING (
  guest_id IN (
    SELECT id 
    FROM public.agency_guests 
    WHERE guest_user_id = auth.uid()
      AND status = 'accepted'
      AND NOW() BETWEEN access_start_date AND access_end_date
  )
);

-- Policy 3: Master admins podem gerenciar todas as permissões
CREATE POLICY "Master admins manage all permissions"
ON public.guest_event_permissions
FOR ALL
USING (is_current_user_master_admin())
WITH CHECK (is_current_user_master_admin());

-- ============================================================================
-- PARTE 3: RLS Policies para guest_audit_log
-- ============================================================================

-- Habilitar RLS na tabela guest_audit_log
ALTER TABLE public.guest_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy 1: Agency admins visualizam logs de sua agência
CREATE POLICY "Agency admins view their agency audit logs"
ON public.guest_audit_log
FOR SELECT
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 
    FROM public.agency_guests ag
    WHERE ag.id = guest_audit_log.guest_id
      AND ag.agency_id = get_current_user_agency_id()
  )
);

-- Policy 2: Sistema pode inserir logs (necessário para triggers e edge functions)
CREATE POLICY "System can insert audit logs"
ON public.guest_audit_log
FOR INSERT
WITH CHECK (true);

-- Policy 3: Master admins visualizam todos os logs
CREATE POLICY "Master admins view all audit logs"
ON public.guest_audit_log
FOR SELECT
USING (is_current_user_master_admin());

-- ============================================================================
-- PARTE 4: Função RPC para aceitar convites com validação server-side
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_guest_invite(
  p_invite_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite agency_guests;
  v_user_email TEXT;
  v_user_id UUID;
BEGIN
  -- Obter ID e email do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT email INTO v_user_email
  FROM auth.users WHERE id = v_user_id;

  -- Buscar convite pelo token
  SELECT * INTO v_invite 
  FROM public.agency_guests
  WHERE invite_token = p_invite_token;

  -- Validações server-side
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado ou inválido';
  END IF;

  IF v_invite.status != 'pending' THEN
    RAISE EXCEPTION 'Este convite já foi processado';
  END IF;

  IF v_invite.guest_email != v_user_email THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro endereço de email';
  END IF;

  IF NOW() < v_invite.access_start_date THEN
    RAISE EXCEPTION 'Este convite ainda não está ativo';
  END IF;

  IF NOW() > v_invite.access_end_date THEN
    RAISE EXCEPTION 'Este convite expirou';
  END IF;

  -- Atualizar convite para status aceito
  UPDATE public.agency_guests
  SET 
    guest_user_id = v_user_id,
    status = 'accepted',
    accepted_at = NOW(),
    last_accessed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invite.id;

  -- Registrar no audit log
  INSERT INTO public.guest_audit_log (
    guest_id,
    action,
    action_data
  ) VALUES (
    v_invite.id,
    'invite_accepted',
    jsonb_build_object(
      'accepted_at', NOW(),
      'user_id', v_user_id
    )
  );

  -- Retornar sucesso com dados do convite
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Convite aceito com sucesso',
    'agency_id', v_invite.agency_id,
    'guest_id', v_invite.id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro sem expor detalhes sensíveis
    RAISE EXCEPTION 'Erro ao processar convite: %', SQLERRM;
END;
$$;

-- Comentário explicativo da função
COMMENT ON FUNCTION public.accept_guest_invite(UUID) IS 
'Aceita convite de guest com validação server-side completa. Verifica email, status, datas e registra no audit log.';