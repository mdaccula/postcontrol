-- Função RPC para calcular vagas disponíveis em tempo real
CREATE OR REPLACE FUNCTION get_event_available_slots(p_event_id UUID)
RETURNS TABLE(
  total_slots INTEGER,
  occupied_slots INTEGER,
  available_slots INTEGER,
  occupancy_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(e.numero_de_vagas, 0) as total_slots,
    COALESCE(COUNT(DISTINCT ueg.user_id) FILTER (WHERE ueg.goal_achieved = true), 0)::INTEGER as occupied_slots,
    GREATEST(0, COALESCE(e.numero_de_vagas, 0) - COALESCE(COUNT(DISTINCT ueg.user_id) FILTER (WHERE ueg.goal_achieved = true), 0)::INTEGER) as available_slots,
    CASE 
      WHEN COALESCE(e.numero_de_vagas, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(COUNT(DISTINCT ueg.user_id) FILTER (WHERE ueg.goal_achieved = true), 0)::NUMERIC / NULLIF(e.numero_de_vagas, 0)) * 100, 2)
    END as occupancy_percentage
  FROM events e
  LEFT JOIN user_event_goals ueg ON ueg.event_id = e.id
  WHERE e.id = p_event_id
  GROUP BY e.id, e.numero_de_vagas;
END;
$$;

-- Tabela para histórico de ocupação de vagas
CREATE TABLE IF NOT EXISTS event_slots_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  total_slots INTEGER NOT NULL,
  occupied_slots INTEGER NOT NULL,
  available_slots INTEGER NOT NULL,
  occupancy_percentage NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para queries rápidas
CREATE INDEX IF NOT EXISTS idx_event_slots_history_event_id ON event_slots_history(event_id);
CREATE INDEX IF NOT EXISTS idx_event_slots_history_recorded_at ON event_slots_history(recorded_at);

-- RLS policies para event_slots_history
ALTER TABLE event_slots_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins podem ver histórico de sua agência"
  ON event_slots_history FOR SELECT
  USING (
    is_current_user_agency_admin() AND 
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_slots_history.event_id 
      AND e.agency_id = get_current_user_agency_id()
    )
  );

CREATE POLICY "Master admins podem ver todo histórico"
  ON event_slots_history FOR SELECT
  USING (is_master_admin(auth.uid()));

CREATE POLICY "Sistema pode inserir histórico"
  ON event_slots_history FOR INSERT
  WITH CHECK (true);

-- Função para registrar snapshot de vagas
CREATE OR REPLACE FUNCTION record_slots_snapshot(p_event_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slots RECORD;
BEGIN
  SELECT * INTO v_slots FROM get_event_available_slots(p_event_id);
  
  INSERT INTO event_slots_history (
    event_id,
    total_slots,
    occupied_slots,
    available_slots,
    occupancy_percentage
  ) VALUES (
    p_event_id,
    v_slots.total_slots,
    v_slots.occupied_slots,
    v_slots.available_slots,
    v_slots.occupancy_percentage
  );
END;
$$;