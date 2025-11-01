-- FASE 1: Função pública para acessar dados de signup da agência
CREATE OR REPLACE FUNCTION public.get_agency_signup_data(agency_slug_or_token text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  signup_token uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, logo_url, signup_token
  FROM agencies
  WHERE slug = agency_slug_or_token 
     OR signup_token::text = agency_slug_or_token
  LIMIT 1;
$$;

-- FASE 2: Políticas RLS para usuários sem agência

-- Permitir que usuários sem agency_id vejam posts de eventos ativos
CREATE POLICY "Users without agency can view active posts"
ON posts FOR SELECT
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND agency_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM events
    WHERE events.id = posts.event_id AND events.is_active = true
  )
);

-- Permitir que usuários sem agency_id vejam eventos ativos
CREATE POLICY "Users without agency can view all active events"
ON events FOR SELECT
TO authenticated
USING (
  is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND agency_id IS NOT NULL
  )
);

-- FASE 3: Política para usuários verem posts de suas agências via user_agencies
DROP POLICY IF EXISTS "Users can view posts from their agencies" ON posts;
CREATE POLICY "Users can view posts from their agencies"
ON posts FOR SELECT
TO authenticated
USING (
  agency_id IN (
    SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
  )
  OR is_master_admin(auth.uid())
);

-- Política para usuários verem eventos de suas agências via user_agencies
DROP POLICY IF EXISTS "Users can view events from their agencies" ON events;
CREATE POLICY "Users can view events from their agencies"
ON events FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    agency_id IN (
      SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
    )
    OR is_master_admin(auth.uid())
  )
);

-- FASE 4: Trigger para garantir agency_id em novos profiles
CREATE OR REPLACE FUNCTION public.assign_default_agency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    -- Tentar pegar da tabela user_agencies se existir entrada
    SELECT agency_id INTO NEW.agency_id
    FROM user_agencies
    WHERE user_id = NEW.id
    LIMIT 1;
    
    -- Se ainda for NULL, pegar primeira agência ativa
    IF NEW.agency_id IS NULL THEN
      SELECT id INTO NEW.agency_id
      FROM agencies 
      WHERE subscription_status = 'active' 
      ORDER BY created_at ASC 
      LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS set_default_agency_on_profile ON profiles;
CREATE TRIGGER set_default_agency_on_profile
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION assign_default_agency();

-- Migrar profiles órfãos existentes
UPDATE profiles
SET agency_id = (
  SELECT agency_id FROM user_agencies 
  WHERE user_agencies.user_id = profiles.id 
  LIMIT 1
)
WHERE agency_id IS NULL
  AND EXISTS (
    SELECT 1 FROM user_agencies 
    WHERE user_agencies.user_id = profiles.id
  );