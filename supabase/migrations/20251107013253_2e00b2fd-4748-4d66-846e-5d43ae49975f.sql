-- ✅ FASE 2 - Item 4: Adicionar campo is_popular aos planos
ALTER TABLE public.subscription_plans
ADD COLUMN is_popular BOOLEAN DEFAULT false;

-- ✅ FASE 2 - Item 5: Criar tabela de sugestões
CREATE TABLE IF NOT EXISTS public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela suggestions
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para suggestions
-- Usuários podem ver suas próprias sugestões
CREATE POLICY "Users can view their own suggestions"
ON public.suggestions
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem criar suas próprias sugestões
CREATE POLICY "Users can create their own suggestions"
ON public.suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todas as sugestões de sua agência
CREATE POLICY "Admins can view agency suggestions"
ON public.suggestions
FOR SELECT
USING (
  is_current_user_agency_admin() AND agency_id = get_current_user_agency_id()
);

-- Master admins podem ver todas as sugestões
CREATE POLICY "Master admins can view all suggestions"
ON public.suggestions
FOR SELECT
USING (is_master_admin(auth.uid()));

-- Master admins podem atualizar status de sugestões
CREATE POLICY "Master admins can update suggestions"
ON public.suggestions
FOR UPDATE
USING (is_master_admin(auth.uid()));

-- Criar índices para performance
CREATE INDEX idx_suggestions_user_id ON public.suggestions(user_id);
CREATE INDEX idx_suggestions_agency_id ON public.suggestions(agency_id);
CREATE INDEX idx_suggestions_status ON public.suggestions(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_suggestions_updated_at
BEFORE UPDATE ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();