
-- Adicionar políticas SELECT explícitas para agency admins verem dados relacionados

-- Política para guest_list_events (adicionar SELECT explícito para admins)
CREATE POLICY "Agency admins can select their events"
ON guest_list_events
FOR SELECT
TO authenticated
USING (
  is_current_user_agency_admin() 
  AND agency_id = get_current_user_agency_id()
);

-- Política para guest_list_dates (adicionar SELECT explícito para admins)
CREATE POLICY "Agency admins can select their dates"
ON guest_list_dates
FOR SELECT  
TO authenticated
USING (
  is_current_user_agency_admin() 
  AND EXISTS (
    SELECT 1 FROM guest_list_events
    WHERE guest_list_events.id = guest_list_dates.event_id
    AND guest_list_events.agency_id = get_current_user_agency_id()
  )
);
