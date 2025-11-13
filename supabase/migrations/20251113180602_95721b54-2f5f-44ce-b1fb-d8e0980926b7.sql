-- 🆕 CORREÇÃO #3: Criar RLS pública para admin_settings (permitir leitura de gtm_id)
-- Isso permite que visitantes não autenticados possam ler a configuração do GTM

CREATE POLICY "Permitir leitura pública de GTM ID"
ON public.admin_settings
FOR SELECT
TO anon, authenticated
USING (setting_key = 'gtm_id');