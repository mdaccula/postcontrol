-- FASE 1: Corrigir duplicate key para permitir re-convite de emails revogados
ALTER TABLE agency_guests 
DROP CONSTRAINT IF EXISTS agency_guests_agency_id_guest_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_guests_active_email 
ON agency_guests(agency_id, guest_email) 
WHERE status != 'revoked';