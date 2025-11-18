-- Adicionar constraint única para endpoint (corrige erro 42P10)
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint);

-- Criar índice para melhorar performance de queries por user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
ON public.push_subscriptions (user_id);

-- Definir default para last_used_at
ALTER TABLE public.push_subscriptions
ALTER COLUMN last_used_at SET DEFAULT now();