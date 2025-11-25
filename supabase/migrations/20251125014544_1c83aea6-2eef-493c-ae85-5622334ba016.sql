-- Atualizar agências em trial para ter 10 dias ao invés de 7
-- Esta migração corrige agências existentes que foram criadas com 7 dias de trial

UPDATE agencies 
SET trial_end_date = trial_start_date + INTERVAL '10 days'
WHERE subscription_status = 'trial'
  AND trial_end_date IS NOT NULL
  AND trial_start_date IS NOT NULL;