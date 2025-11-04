-- Remover política problemática que causa recursão
DROP POLICY IF EXISTS "Users can view their associated agencies" ON agencies;

-- Criar função SECURITY DEFINER para verificar acesso à agência
CREATE OR REPLACE FUNCTION public.user_can_view_agency(_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_agencies
    WHERE user_id = auth.uid()
      AND agency_id = _agency_id
  )
$$;

-- Adicionar nova política usando a função (sem recursão)
CREATE POLICY "Users can view their linked agencies"
ON agencies
FOR SELECT
TO authenticated
USING (public.user_can_view_agency(id));