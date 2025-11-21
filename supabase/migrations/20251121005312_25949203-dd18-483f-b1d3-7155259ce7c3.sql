-- Corrigir search_path das funções criadas
CREATE OR REPLACE FUNCTION get_event_available_slots(p_event_id UUID)
RETURNS TABLE(
  total_slots INTEGER,
  occupied_slots INTEGER,
  available_slots INTEGER,
  occupancy_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION record_slots_snapshot(p_event_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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