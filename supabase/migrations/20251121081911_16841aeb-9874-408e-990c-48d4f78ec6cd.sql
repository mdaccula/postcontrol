-- Permitir agency admins atualizarem e visualizarem sua própria agência

-- Policy para UPDATE: Agency admins podem atualizar dados da própria agência
CREATE POLICY "Agency admins podem atualizar sua agência"
ON public.agencies
FOR UPDATE
USING (
  is_current_user_agency_admin() 
  AND id = get_current_user_agency_id()
)
WITH CHECK (
  is_current_user_agency_admin() 
  AND id = get_current_user_agency_id()
);

-- Policy para SELECT: Agency admins podem visualizar dados da própria agência
CREATE POLICY "Agency admins podem ver sua agência"
ON public.agencies
FOR SELECT
USING (
  is_current_user_agency_admin() 
  AND id = get_current_user_agency_id()
);