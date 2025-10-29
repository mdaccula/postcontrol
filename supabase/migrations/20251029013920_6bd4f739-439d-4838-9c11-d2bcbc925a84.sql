-- MIGRATION 1: Adicionar campos de trial, vencimento e admin_email
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_email TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_agencies_trial_end ON agencies(trial_end_date) WHERE subscription_status = 'trial';
CREATE INDEX IF NOT EXISTS idx_agencies_plan_expiry ON agencies(plan_expiry_date) WHERE subscription_status = 'active';

-- Atualizar agências existentes com trial de 7 dias
UPDATE agencies 
SET 
  trial_start_date = created_at,
  trial_end_date = created_at + INTERVAL '7 days'
WHERE subscription_status = 'trial' 
  AND trial_end_date IS NULL;

-- MIGRATION 2: Vincular profiles com agências
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_profiles_agency ON profiles(agency_id);

-- RLS policy para agency_admin ver apenas seus influencers
DROP POLICY IF EXISTS "Agency admins can view their agency profiles" ON profiles;
CREATE POLICY "Agency admins can view their agency profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = profiles.agency_id 
    AND agencies.owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'master_admin'::app_role)
);

-- MIGRATION 3: Função para vincular agency_admin à agência
CREATE OR REPLACE FUNCTION link_admin_to_agency(
  p_agency_id UUID,
  p_admin_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar user_id pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_admin_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Atualizar owner_id da agência
    UPDATE agencies 
    SET owner_id = v_user_id
    WHERE id = p_agency_id;
    
    -- Garantir que o usuário tem role agency_admin
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'agency_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;