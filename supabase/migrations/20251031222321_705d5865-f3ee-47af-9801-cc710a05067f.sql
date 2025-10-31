-- ============================================
-- 1. ENUM para tipos de permissão
-- ============================================
CREATE TYPE guest_permission AS ENUM ('viewer', 'moderator', 'manager');

-- ============================================
-- 2. TABELA: agency_guests (Principal)
-- ============================================
CREATE TABLE agency_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_email TEXT NOT NULL,
  guest_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Token único para aceitar convite
  invite_token UUID UNIQUE DEFAULT gen_random_uuid(),
  
  -- Status do convite
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  
  -- Controle de acesso
  access_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_end_date TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  accepted_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  
  -- Configurações
  notify_new_submissions BOOLEAN DEFAULT true,
  notify_before_expiry BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(agency_id, guest_email)
);

-- ============================================
-- 3. TABELA: guest_event_permissions
-- ============================================
CREATE TABLE guest_event_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  guest_id UUID NOT NULL REFERENCES agency_guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Nível de permissão para este evento
  permission_level guest_permission NOT NULL DEFAULT 'viewer',
  
  -- Limites opcionais
  daily_approval_limit INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Um convidado não pode ter permissão duplicada no mesmo evento
  UNIQUE(guest_id, event_id)
);

-- ============================================
-- 4. TABELA: guest_audit_log (Auditoria)
-- ============================================
CREATE TABLE guest_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  guest_id UUID NOT NULL REFERENCES agency_guests(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  
  -- Ação realizada
  action TEXT NOT NULL,
  
  -- Dados da ação
  action_data JSONB,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. ÍNDICES para Performance
-- ============================================
CREATE INDEX idx_agency_guests_agency ON agency_guests(agency_id);
CREATE INDEX idx_agency_guests_email ON agency_guests(guest_email);
CREATE INDEX idx_agency_guests_token ON agency_guests(invite_token);
CREATE INDEX idx_agency_guests_user ON agency_guests(guest_user_id);
CREATE INDEX idx_agency_guests_status ON agency_guests(status);

CREATE INDEX idx_guest_permissions_guest ON guest_event_permissions(guest_id);
CREATE INDEX idx_guest_permissions_event ON guest_event_permissions(event_id);

CREATE INDEX idx_guest_audit_guest ON guest_audit_log(guest_id);
CREATE INDEX idx_guest_audit_created ON guest_audit_log(created_at DESC);

-- ============================================
-- 6. TRIGGER: Atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_guest_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agency_guests
BEFORE UPDATE ON agency_guests
FOR EACH ROW EXECUTE FUNCTION update_guest_updated_at();

CREATE TRIGGER trigger_update_guest_permissions
BEFORE UPDATE ON guest_event_permissions
FOR EACH ROW EXECUTE FUNCTION update_guest_updated_at();

-- ============================================
-- 7. FUNÇÃO: Verificar se é convidado com permissão
-- ============================================
CREATE OR REPLACE FUNCTION is_guest_with_permission(
  _user_id UUID,
  _event_id UUID,
  _required_permission guest_permission
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guest_permission_level guest_permission;
BEGIN
  -- Buscar permissão do convidado para este evento
  SELECT gep.permission_level INTO guest_permission_level
  FROM agency_guests ag
  JOIN guest_event_permissions gep ON gep.guest_id = ag.id
  WHERE ag.guest_user_id = _user_id
    AND gep.event_id = _event_id
    AND ag.status = 'accepted'
    AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date;
  
  -- Verificar hierarquia de permissões
  IF guest_permission_level IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Manager pode tudo
  IF guest_permission_level = 'manager' THEN
    RETURN TRUE;
  END IF;
  
  -- Moderator pode aprovar/reprovar
  IF guest_permission_level = 'moderator' AND _required_permission IN ('viewer', 'moderator') THEN
    RETURN TRUE;
  END IF;
  
  -- Viewer só pode visualizar
  IF guest_permission_level = 'viewer' AND _required_permission = 'viewer' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ============================================
-- 8. FUNÇÃO: Expirar convites automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION expire_old_guest_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE agency_guests
  SET status = 'expired'
  WHERE status IN ('pending', 'accepted')
    AND access_end_date < NOW()
    AND status != 'expired';
END;
$$;

-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE agency_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_event_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_audit_log ENABLE ROW LEVEL SECURITY;

-- POLICIES: agency_guests
CREATE POLICY "Agency admins podem gerenciar convidados da sua agência"
ON agency_guests FOR ALL
USING (
  agency_id IN (
    SELECT id FROM agencies WHERE owner_id = auth.uid()
  ) OR is_master_admin(auth.uid())
);

CREATE POLICY "Convidados podem ver seu próprio convite"
ON agency_guests FOR SELECT
USING (
  guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR guest_user_id = auth.uid()
);

CREATE POLICY "Convidados podem aceitar convite"
ON agency_guests FOR UPDATE
USING (
  guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
);

-- POLICIES: guest_event_permissions
CREATE POLICY "Agency admins podem gerenciar permissões"
ON guest_event_permissions FOR ALL
USING (
  guest_id IN (
    SELECT id FROM agency_guests 
    WHERE agency_id IN (
      SELECT id FROM agencies WHERE owner_id = auth.uid()
    )
  ) OR is_master_admin(auth.uid())
);

CREATE POLICY "Convidados podem ver suas próprias permissões"
ON guest_event_permissions FOR SELECT
USING (
  guest_id IN (
    SELECT id FROM agency_guests WHERE guest_user_id = auth.uid()
  )
);

-- POLICIES: guest_audit_log
CREATE POLICY "System pode inserir logs"
ON guest_audit_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "Agency admins podem ver logs"
ON guest_audit_log FOR SELECT
USING (
  guest_id IN (
    SELECT id FROM agency_guests 
    WHERE agency_id IN (
      SELECT id FROM agencies WHERE owner_id = auth.uid()
    )
  ) OR is_master_admin(auth.uid())
);

-- ============================================
-- 10. ATUALIZAR RLS de submissions para convidados
-- ============================================

-- Permitir convidados verem submissões dos eventos que têm acesso
CREATE POLICY "Convidados podem ver submissões dos eventos permitidos"
ON submissions FOR SELECT
USING (
  post_id IN (
    SELECT p.id FROM posts p
    JOIN guest_event_permissions gep ON gep.event_id = p.event_id
    JOIN agency_guests ag ON ag.id = gep.guest_id
    WHERE ag.guest_user_id = auth.uid()
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);

-- Permitir convidados moderadores aprovarem/reprovarem
CREATE POLICY "Convidados moderadores podem atualizar submissões"
ON submissions FOR UPDATE
USING (
  post_id IN (
    SELECT p.id FROM posts p
    WHERE is_guest_with_permission(auth.uid(), p.event_id, 'moderator'::guest_permission)
  )
);

-- ============================================
-- 11. ATUALIZAR RLS de events para convidados
-- ============================================

CREATE POLICY "Convidados podem ver eventos permitidos"
ON events FOR SELECT
USING (
  id IN (
    SELECT gep.event_id
    FROM guest_event_permissions gep
    JOIN agency_guests ag ON ag.id = gep.guest_id
    WHERE ag.guest_user_id = auth.uid()
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);

CREATE POLICY "Convidados managers podem atualizar eventos"
ON events FOR UPDATE
USING (
  is_guest_with_permission(auth.uid(), id, 'manager'::guest_permission)
);

-- ============================================
-- 12. ATUALIZAR RLS de posts para convidados
-- ============================================

CREATE POLICY "Convidados podem ver posts dos eventos permitidos"
ON posts FOR SELECT
USING (
  event_id IN (
    SELECT gep.event_id
    FROM guest_event_permissions gep
    JOIN agency_guests ag ON ag.id = gep.guest_id
    WHERE ag.guest_user_id = auth.uid()
      AND ag.status = 'accepted'
      AND NOW() BETWEEN ag.access_start_date AND ag.access_end_date
  )
);

CREATE POLICY "Convidados managers podem gerenciar posts"
ON posts FOR ALL
USING (
  is_guest_with_permission(auth.uid(), event_id, 'manager'::guest_permission)
);