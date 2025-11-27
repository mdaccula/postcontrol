-- Adicionar campos para envio automático de email de participantes
ALTER TABLE guest_list_dates 
ADD COLUMN IF NOT EXISTS send_notification_email boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;

-- Adicionar campo de email de notificação para agências
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS notification_email text;

-- Deletar função antiga para recriar com novo retorno
DROP FUNCTION IF EXISTS public.get_event_available_slots(uuid);

-- Recriar função get_event_available_slots com total_participants
CREATE FUNCTION public.get_event_available_slots(p_event_id uuid)
RETURNS TABLE(
  total_slots integer, 
  occupied_slots integer, 
  available_slots integer, 
  occupancy_percentage numeric,
  total_participants integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(e.numero_de_vagas, 0) as total_slots,
    COALESCE(COUNT(DISTINCT ueg.user_id) FILTER (WHERE ueg.goal_achieved = true), 0)::INTEGER as occupied_slots,
    GREATEST(0, COALESCE(e.numero_de_vagas, 0) - COALESCE(COUNT(DISTINCT ueg.user_id) FILTER (WHERE ueg.goal_achieved = true), 0)::INTEGER) as available_slots,
    CASE 
      WHEN COALESCE(e.numero_de_vagas, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(COUNT(DISTINCT ueg.user_id) FILTER (WHERE ueg.goal_achieved = true), 0)::NUMERIC / NULLIF(e.numero_de_vagas, 0)) * 100, 2)
    END as occupancy_percentage,
    COALESCE(COUNT(DISTINCT ueg.user_id), 0)::INTEGER as total_participants
  FROM events e
  LEFT JOIN user_event_goals ueg ON ueg.event_id = e.id
  WHERE e.id = p_event_id
  GROUP BY e.id, e.numero_de_vagas;
END;
$function$;

COMMENT ON COLUMN guest_list_dates.send_notification_email IS 'Se true, envia email com lista de participantes quando o evento inicia';
COMMENT ON COLUMN guest_list_dates.notification_sent_at IS 'Data/hora em que o email de notificação foi enviado';
COMMENT ON COLUMN agencies.notification_email IS 'Email para receber notificações automáticas de lista de participantes';