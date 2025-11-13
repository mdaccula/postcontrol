-- Correção 1: Criar índices críticos para otimizar queries do /admin

-- Índice composto para submissions (agency_id + status + data)
-- Acelera queries filtradas por agência e status
CREATE INDEX IF NOT EXISTS idx_submissions_agency_status_date 
ON public.submissions(agency_id, status, submitted_at DESC);

-- Índice para guest_audit_log (guest_id + data)
-- Acelera queries de auditoria por convidado
CREATE INDEX IF NOT EXISTS idx_guest_audit_guest_created 
ON public.guest_audit_log(guest_id, created_at DESC);

-- Comentários explicativos
COMMENT ON INDEX idx_submissions_agency_status_date IS 'Optimizes /admin submissions filtering by agency and status';
COMMENT ON INDEX idx_guest_audit_guest_created IS 'Optimizes /admin guest audit log queries';