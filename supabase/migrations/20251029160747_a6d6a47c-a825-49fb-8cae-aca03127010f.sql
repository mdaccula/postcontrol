-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can view settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;

-- Criar novas políticas completas com suporte para INSERT
CREATE POLICY "Admins can view settings"
ON public.admin_settings FOR SELECT
USING (
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'agency_admin'::app_role)
);

CREATE POLICY "Admins can insert settings"
ON public.admin_settings FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'agency_admin'::app_role)
);

CREATE POLICY "Admins can update settings"
ON public.admin_settings FOR UPDATE
USING (
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'agency_admin'::app_role)
);

-- Inserir valores padrão para as novas configurações
INSERT INTO public.admin_settings (setting_key, setting_value, updated_at)
VALUES 
  ('ai_insights_enabled', 'true', NOW()),
  ('badges_enabled', 'true', NOW())
ON CONFLICT (setting_key) DO NOTHING;