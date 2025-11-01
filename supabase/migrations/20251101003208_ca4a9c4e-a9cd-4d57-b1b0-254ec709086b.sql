-- ============================================================================
-- ETAPA 2: Simplificar policies de user_roles (SEM RECURSÃO)
-- ============================================================================

-- 1. DROPAR TODAS as policies existentes de user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Agency admins can manage their agency roles" ON public.user_roles;

-- 2. POLICY SIMPLES: Usuários autenticados podem ver SUAS PRÓPRIAS roles
CREATE POLICY "authenticated_users_select_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. POLICY: Master admins podem ver TODAS as roles
-- Usa função SECURITY DEFINER para evitar recursão
CREATE POLICY "master_admins_select_all_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_current_user_master_admin());

-- 4. POLICY: Master admins podem INSERIR/ATUALIZAR/DELETAR roles
CREATE POLICY "master_admins_manage_all_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_current_user_master_admin())
WITH CHECK (public.is_current_user_master_admin());

-- 5. POLICY: Agency admins podem gerenciar roles de usuários da SUA AGÊNCIA
CREATE POLICY "agency_admins_manage_agency_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  -- Verifica se o usuário atual é agency_admin OU master_admin
  (public.is_current_user_agency_admin() OR public.is_current_user_master_admin())
  AND
  -- E se o user_id alvo pertence à mesma agência
  user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.agency_id = (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  (public.is_current_user_agency_admin() OR public.is_current_user_master_admin())
  AND
  user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.agency_id = (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);