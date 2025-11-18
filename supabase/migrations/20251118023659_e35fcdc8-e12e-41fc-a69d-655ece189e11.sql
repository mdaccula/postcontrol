-- Limpar endpoints duplicados (manter apenas o mais recente por endpoint)
DELETE FROM public.push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (endpoint) id
  FROM public.push_subscriptions
  ORDER BY endpoint, last_used_at DESC NULLS LAST, created_at DESC
);