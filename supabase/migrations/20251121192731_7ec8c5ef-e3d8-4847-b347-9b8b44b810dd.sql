-- Adicionar políticas RLS para permitir deletar registros de guest_list_registrations

-- Policy: Agency admins podem deletar registros de eventos de sua agência
CREATE POLICY "Agency admins can delete their registrations"
ON guest_list_registrations FOR DELETE
USING (
  is_current_user_agency_admin() 
  AND EXISTS (
    SELECT 1 FROM guest_list_events
    WHERE guest_list_events.id = guest_list_registrations.event_id
    AND guest_list_events.agency_id = get_current_user_agency_id()
  )
);

-- Policy: Master admins podem deletar todos os registros
CREATE POLICY "Master admins can delete all registrations"
ON guest_list_registrations FOR DELETE
USING (is_current_user_master_admin());