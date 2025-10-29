-- Criar tabela de agências (se não existir)
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  subscription_status TEXT DEFAULT 'trial',
  subscription_plan TEXT DEFAULT 'basic',
  max_influencers INTEGER DEFAULT 100,
  max_events INTEGER DEFAULT 50,
  logo_url TEXT,
  custom_domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS para agencies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins podem gerenciar agências"
ON public.agencies
FOR ALL
USING (public.is_master_admin(auth.uid()));

-- Trigger de updated_at
CREATE TRIGGER update_agencies_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de planos de assinatura
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT UNIQUE NOT NULL,
  plan_name TEXT NOT NULL,
  monthly_price DECIMAL(10, 2) NOT NULL,
  max_influencers INTEGER NOT NULL,
  max_events INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Inserir planos padrão
INSERT INTO public.subscription_plans (plan_key, plan_name, monthly_price, max_influencers, max_events, features, display_order) VALUES
('basic', 'Plano Básico', 299.00, 100, 50, 
  '["Até 100 influencers", "Até 50 eventos/ano", "Dashboard completo", "Suporte por email"]'::jsonb, 1),
('pro', 'Plano Pro', 599.00, 500, 200, 
  '["Até 500 influencers", "Até 200 eventos/ano", "Dashboard avançado", "API de integração", "Suporte prioritário"]'::jsonb, 2),
('enterprise', 'Enterprise', 1499.00, 99999, 99999, 
  '["Influencers ilimitados", "Eventos ilimitados", "White label", "API completa", "Suporte 24/7", "Gerente dedicado"]'::jsonb, 3);

-- Trigger de updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver planos visíveis"
ON public.subscription_plans
FOR SELECT
USING (is_visible = true);

CREATE POLICY "Master admins podem gerenciar planos"
ON public.subscription_plans
FOR ALL
USING (public.is_master_admin(auth.uid()));