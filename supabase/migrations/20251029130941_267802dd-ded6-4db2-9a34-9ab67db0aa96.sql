-- ============================================
-- OPÇÃO 2: Sistema Multi-Agência com Contexto Dinâmico
-- ============================================

-- 1. Criar tabela user_agencies (relação many-to-many)
CREATE TABLE IF NOT EXISTS public.user_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, agency_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.user_agencies ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
-- Usuários podem ver suas próprias associações
CREATE POLICY "Users can view their own agency associations"
ON public.user_agencies
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem criar suas próprias associações (via signup)
CREATE POLICY "Users can create their own agency associations"
ON public.user_agencies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar last_accessed_at de suas associações
CREATE POLICY "Users can update their own agency associations"
ON public.user_agencies
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins podem ver todas as associações de suas agências
CREATE POLICY "Agency admins can view their agency associations"
ON public.user_agencies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agencies
    WHERE agencies.id = user_agencies.agency_id
    AND agencies.owner_id = auth.uid()
  )
  OR is_master_admin(auth.uid())
);

-- Master admins podem gerenciar tudo
CREATE POLICY "Master admins can manage all associations"
ON public.user_agencies
FOR ALL
USING (is_master_admin(auth.uid()));

-- 4. Índices para performance
CREATE INDEX idx_user_agencies_user_id ON public.user_agencies(user_id);
CREATE INDEX idx_user_agencies_agency_id ON public.user_agencies(agency_id);
CREATE INDEX idx_user_agencies_last_accessed ON public.user_agencies(user_id, last_accessed_at DESC);

-- 5. Migrar dados existentes de profiles para user_agencies
INSERT INTO public.user_agencies (user_id, agency_id, joined_at)
SELECT id, agency_id, created_at
FROM public.profiles
WHERE agency_id IS NOT NULL
ON CONFLICT (user_id, agency_id) DO NOTHING;

-- 6. Comentários para documentação
COMMENT ON TABLE public.user_agencies IS 'Relação many-to-many entre usuários e agências - permite um usuário pertencer a múltiplas agências';
COMMENT ON COLUMN public.user_agencies.last_accessed_at IS 'Timestamp do último acesso para determinar contexto padrão';