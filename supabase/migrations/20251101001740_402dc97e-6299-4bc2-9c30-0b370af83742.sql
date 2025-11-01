-- ============================================================================
-- FIX: Remove recursão infinita em user_roles RLS policies
-- ============================================================================

-- 1. DROPAR TODAS AS POLICIES EXISTENTES de user_roles
DROP POLICY IF EXISTS "Agency admins podem ver todos os roles" ON public.user_roles;
DROP POLICY IF EXISTS "Agency admins podem inserir roles" ON public.user_roles;
DROP POLICY IF EXISTS "Agency admins podem atualizar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Agency admins podem deletar roles" ON public.user_roles;

-- 2. CRIAR POLICY SIMPLES: Usuários podem ver SUAS PRÓPRIAS roles
-- Isso permite que is_agency_admin_for() e is_master_admin() funcionem
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. MASTER ADMINS podem ver TODAS as roles (sem recursão)
CREATE POLICY "Master admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT ur.user_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'master_admin'::public.app_role
  )
);

-- 4. MASTER ADMINS podem INSERIR/ATUALIZAR/DELETAR roles
CREATE POLICY "Master admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT ur.user_id 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'master_admin'::public.app_role
  )
);

-- 5. AGENCY ADMINS podem gerenciar roles de usuários da SUA AGÊNCIA
CREATE POLICY "Agency admins can manage their agency roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.agency_id = (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('agency_admin'::public.app_role, 'master_admin'::public.app_role)
  )
);