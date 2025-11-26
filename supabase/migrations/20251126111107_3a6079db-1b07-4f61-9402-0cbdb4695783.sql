-- Adicionar coluna para mensagem de convite personalizada na tabela agencies
ALTER TABLE agencies 
ADD COLUMN invite_message_template TEXT DEFAULT 'Oi, queria te indicar para ser uma divulgadora da {agencyName}, participar do evento {eventTitle} e ter sua cortesia batendo os requisitos das postagens, chamar o http://bit.ly/Contato_MD para ele te incluir no grupo de Promo';

-- Criar tabela para analytics de indicações
CREATE TABLE referral_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE referral_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem inserir seus próprios registros
CREATE POLICY "Users can insert their own referrals"
ON referral_analytics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: usuários podem ver suas próprias indicações
CREATE POLICY "Users can view their own referrals"
ON referral_analytics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: agency admins podem ver indicações da sua agência
CREATE POLICY "Agency admins can view their agency referrals"
ON referral_analytics
FOR SELECT
TO authenticated
USING (
  is_current_user_agency_admin() AND 
  agency_id = get_current_user_agency_id()
);

-- Policy: master admins podem ver todas as indicações
CREATE POLICY "Master admins can view all referrals"
ON referral_analytics
FOR SELECT
TO authenticated
USING (is_current_user_master_admin());

-- Índices para performance
CREATE INDEX idx_referral_analytics_user_id ON referral_analytics(user_id);
CREATE INDEX idx_referral_analytics_agency_id ON referral_analytics(agency_id);
CREATE INDEX idx_referral_analytics_event_id ON referral_analytics(event_id);
CREATE INDEX idx_referral_analytics_created_at ON referral_analytics(created_at DESC);