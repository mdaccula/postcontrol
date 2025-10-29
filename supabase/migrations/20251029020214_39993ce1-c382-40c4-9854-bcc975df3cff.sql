-- ========================================
-- ETAPA 1: ADICIONAR AGENCY_ID E VINCULAR DADOS
-- ========================================

-- 1. Adicionar agency_id em events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_agency ON events(agency_id);

-- 2. Adicionar agency_id em posts
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_posts_agency ON posts(agency_id);

-- 3. Vincular eventos existentes às agências via created_by -> owner_id
UPDATE events e 
SET agency_id = (
  SELECT a.id 
  FROM agencies a 
  WHERE a.owner_id = e.created_by
  LIMIT 1
)
WHERE agency_id IS NULL AND created_by IS NOT NULL;

-- 4. Vincular posts via eventos
UPDATE posts p 
SET agency_id = (
  SELECT e.agency_id 
  FROM events e 
  WHERE e.id = p.event_id
)
WHERE agency_id IS NULL;

-- ========================================
-- 5. RLS POLICIES PARA EVENTS
-- ========================================

-- Deletar policies antigas
DROP POLICY IF EXISTS "Admins podem criar eventos" ON events;
DROP POLICY IF EXISTS "Admins podem atualizar eventos" ON events;
DROP POLICY IF EXISTS "Admins podem deletar eventos" ON events;
DROP POLICY IF EXISTS "Todos podem ver eventos" ON events;

-- Criar novas policies com filtro de agência
CREATE POLICY "Agency admins can create their events"
ON events FOR INSERT
WITH CHECK (
  agency_id IN (
    SELECT id FROM agencies WHERE owner_id = auth.uid()
  ) 
  OR is_master_admin(auth.uid())
);

CREATE POLICY "Agency admins can update their events"
ON events FOR UPDATE
USING (
  agency_id IN (
    SELECT id FROM agencies WHERE owner_id = auth.uid()
  ) 
  OR is_master_admin(auth.uid())
);

CREATE POLICY "Agency admins can delete their events"
ON events FOR DELETE
USING (
  agency_id IN (
    SELECT id FROM agencies WHERE owner_id = auth.uid()
  ) 
  OR is_master_admin(auth.uid())
);

CREATE POLICY "Everyone can view active events"
ON events FOR SELECT
USING (
  is_active = true 
  OR EXISTS (
    SELECT 1 FROM agencies 
    WHERE id = events.agency_id 
    AND owner_id = auth.uid()
  )
  OR is_master_admin(auth.uid())
);

-- ========================================
-- 6. RLS POLICIES PARA POSTS
-- ========================================

-- Deletar policies antigas
DROP POLICY IF EXISTS "Admins podem criar postagens" ON posts;
DROP POLICY IF EXISTS "Admins podem atualizar postagens" ON posts;
DROP POLICY IF EXISTS "Admins podem deletar postagens" ON posts;
DROP POLICY IF EXISTS "Todos podem ver postagens" ON posts;

-- Criar novas policies com filtro de agência
CREATE POLICY "Agency admins can create their posts"
ON posts FOR INSERT
WITH CHECK (
  agency_id IN (
    SELECT id FROM agencies WHERE owner_id = auth.uid()
  ) 
  OR is_master_admin(auth.uid())
);

CREATE POLICY "Agency admins can update their posts"
ON posts FOR UPDATE
USING (
  agency_id IN (
    SELECT id FROM agencies WHERE owner_id = auth.uid()
  ) 
  OR is_master_admin(auth.uid())
);

CREATE POLICY "Agency admins can delete their posts"
ON posts FOR DELETE
USING (
  agency_id IN (
    SELECT id FROM agencies WHERE owner_id = auth.uid()
  ) 
  OR is_master_admin(auth.uid())
);

CREATE POLICY "Users can view posts from events"
ON posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = posts.event_id 
    AND events.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM agencies 
    WHERE id = posts.agency_id 
    AND owner_id = auth.uid()
  )
  OR is_master_admin(auth.uid())
);