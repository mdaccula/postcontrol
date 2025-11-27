-- Criar função de limpeza automática de push_notification_retries
-- Remove registros com mais de 7 dias
CREATE OR REPLACE FUNCTION public.cleanup_old_push_retries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.push_notification_retries
  WHERE created_at < now() - INTERVAL '7 days';
  
  RAISE NOTICE 'Push notification retries cleanup completed';
END;
$$;

-- Agendar execução diária às 3:00 AM via pg_cron
SELECT cron.schedule(
  'cleanup-push-retries',
  '0 3 * * *',
  'SELECT public.cleanup_old_push_retries()'
);