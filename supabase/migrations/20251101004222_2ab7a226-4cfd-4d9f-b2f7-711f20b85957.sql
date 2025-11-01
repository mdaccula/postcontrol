-- ============================================================================
-- FIX: Corrigir search_path das funções SECURITY DEFINER
-- ============================================================================

-- 1. CORRIGIR: has_role (precisa acessar auth.uid e public.user_roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. CORRIGIR: is_current_user_master_admin
CREATE OR REPLACE FUNCTION public.is_current_user_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'master_admin'::app_role
  )
$$;

-- 3. CORRIGIR: is_current_user_agency_admin
CREATE OR REPLACE FUNCTION public.is_current_user_agency_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('agency_admin'::app_role, 'master_admin'::app_role)
  )
$$;