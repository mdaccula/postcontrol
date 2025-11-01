-- ============================================================================
-- FIX: Remover recursão das policies de profiles
-- ============================================================================

-- 1. CRIAR: Função para pegar agency_id do usuário autenticado (bypassa RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT agency_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- 2. DROPAR: Policies antigas com recursão
DROP POLICY IF EXISTS "Agency admins can view their agency profiles" ON public.profiles;
DROP POLICY IF EXISTS "Agency admins can update their agency profiles" ON public.profiles;

-- 3. RECRIAR: Policies SEM recursão usando a função
CREATE POLICY "Agency admins can view their agency profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_current_user_agency_admin() 
  AND agency_id = public.get_current_user_agency_id()
);

CREATE POLICY "Agency admins can update their agency profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_current_user_agency_admin() 
  AND agency_id = public.get_current_user_agency_id()
);