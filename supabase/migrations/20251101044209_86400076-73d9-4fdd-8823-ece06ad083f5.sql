-- 1. Criar função security definer para retornar dados públicos de agency para signup
CREATE OR REPLACE FUNCTION public.get_agency_for_signup(agency_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, logo_url
  FROM agencies
  WHERE slug = agency_slug
  LIMIT 1;
$$;

-- 2. Remover política pública ampla existente
DROP POLICY IF EXISTS "Public can view agencies by slug" ON agencies;

-- 3. Criar políticas específicas e restritivas para agencies
CREATE POLICY "Master admins podem ver todas agências"
ON agencies FOR SELECT
USING (is_master_admin(auth.uid()));

CREATE POLICY "Agency admins podem ver sua própria agência"
ON agencies FOR SELECT
USING (
  is_current_user_agency_admin() 
  AND id = get_current_user_agency_id()
);

-- 4. Adicionar coluna agency_id em admin_settings
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE;

-- 5. Atualizar registros existentes (marcar como NULL para configurações globais)
-- Os registros sem agency_id serão considerados configurações globais/master

-- 6. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_admin_settings_agency_id ON admin_settings(agency_id);

-- 7. Recriar políticas de admin_settings com isolamento por agência
DROP POLICY IF EXISTS "Admins can view settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON admin_settings;

-- Master admins podem gerenciar todas as configurações
CREATE POLICY "Master admins podem gerenciar todas configurações"
ON admin_settings FOR ALL
USING (is_master_admin(auth.uid()))
WITH CHECK (is_master_admin(auth.uid()));

-- Agency admins podem ver configurações da sua agência ou globais
CREATE POLICY "Agency admins podem ver suas configurações"
ON admin_settings FOR SELECT
USING (
  is_current_user_agency_admin() 
  AND (
    agency_id = get_current_user_agency_id() 
    OR agency_id IS NULL
  )
);

-- Agency admins podem criar configurações apenas para sua agência
CREATE POLICY "Agency admins podem criar suas configurações"
ON admin_settings FOR INSERT
WITH CHECK (
  is_current_user_agency_admin() 
  AND agency_id = get_current_user_agency_id()
);

-- Agency admins podem atualizar apenas configurações da sua agência
CREATE POLICY "Agency admins podem atualizar suas configurações"
ON admin_settings FOR UPDATE
USING (
  is_current_user_agency_admin() 
  AND agency_id = get_current_user_agency_id()
)
WITH CHECK (
  is_current_user_agency_admin() 
  AND agency_id = get_current_user_agency_id()
);