-- ============================================================================
-- FASE 3: USER MANAGEMENT & GAMIFICATION RLS POLICIES
-- ============================================================================

-- 1. user_badges - Adicionar gerenciamento para agency_admins
CREATE POLICY "Agency admins can view their agency user badges"
ON user_badges FOR SELECT
TO authenticated
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_badges.user_id
      AND p.agency_id = get_current_user_agency_id()
  )
);

CREATE POLICY "Agency admins can update their agency user badges"
ON user_badges FOR UPDATE
TO authenticated
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_badges.user_id
      AND p.agency_id = get_current_user_agency_id()
  )
)
WITH CHECK (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_badges.user_id
      AND p.agency_id = get_current_user_agency_id()
  )
);

CREATE POLICY "Agency admins can delete their agency user badges"
ON user_badges FOR DELETE
TO authenticated
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_badges.user_id
      AND p.agency_id = get_current_user_agency_id()
  )
);

CREATE POLICY "Master admins can manage all user badges"
ON user_badges FOR ALL
TO authenticated
USING (is_current_user_master_admin())
WITH CHECK (is_current_user_master_admin());

-- 2. user_segments - Adicionar gerenciamento para agency_admins
CREATE POLICY "Agency admins can manage their segments"
ON user_segments FOR ALL
TO authenticated
USING (
  is_current_user_agency_admin()
  AND created_by IN (
    SELECT p.id FROM profiles p
    WHERE p.agency_id = get_current_user_agency_id()
  )
)
WITH CHECK (
  is_current_user_agency_admin()
);

-- 3. notification_preferences - Adicionar visualização para admins
CREATE POLICY "Agency admins can view their agency user preferences"
ON notification_preferences FOR SELECT
TO authenticated
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = notification_preferences.user_id
      AND p.agency_id = get_current_user_agency_id()
  )
);

CREATE POLICY "Master admins can view all preferences"
ON notification_preferences FOR SELECT
TO authenticated
USING (is_current_user_master_admin());

CREATE POLICY "Agency admins can update their agency user preferences"
ON notification_preferences FOR UPDATE
TO authenticated
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = notification_preferences.user_id
      AND p.agency_id = get_current_user_agency_id()
  )
)
WITH CHECK (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = notification_preferences.user_id
      AND p.agency_id = get_current_user_agency_id()
  )
);

CREATE POLICY "Master admins can update all preferences"
ON notification_preferences FOR UPDATE
TO authenticated
USING (is_current_user_master_admin())
WITH CHECK (is_current_user_master_admin());

CREATE POLICY "Master admins can delete all preferences"
ON notification_preferences FOR DELETE
TO authenticated
USING (is_current_user_master_admin());

CREATE POLICY "Agency admins can delete their agency user preferences"
ON notification_preferences FOR DELETE
TO authenticated
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = notification_preferences.user_id
      AND p.agency_id = get_current_user_agency_id()
  )
);

-- ============================================================================
-- FASE 4: ADMIN CONFIGURATION RLS POLICIES
-- ============================================================================

-- 1. rejection_templates - Adicionar gerenciamento completo
CREATE POLICY "Agency admins can manage rejection templates"
ON rejection_templates FOR ALL
TO authenticated
USING (is_current_user_agency_admin())
WITH CHECK (is_current_user_agency_admin());

CREATE POLICY "Master admins can manage all rejection templates"
ON rejection_templates FOR ALL
TO authenticated
USING (is_current_user_master_admin())
WITH CHECK (is_current_user_master_admin());

-- 2. auto_approval_rules - Adicionar filtro por agência
DROP POLICY IF EXISTS "Admins can manage auto approval rules" ON auto_approval_rules;

CREATE POLICY "Agency admins can manage their agency auto approval rules"
ON auto_approval_rules FOR ALL
TO authenticated
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = auto_approval_rules.event_id
      AND e.agency_id = get_current_user_agency_id()
  )
)
WITH CHECK (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = auto_approval_rules.event_id
      AND e.agency_id = get_current_user_agency_id()
  )
);

-- 3. event_faqs - Adicionar filtro por agência
DROP POLICY IF EXISTS "Admins can manage FAQs" ON event_faqs;

CREATE POLICY "Agency admins can manage their agency FAQs"
ON event_faqs FOR ALL
TO authenticated
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_faqs.event_id
      AND e.agency_id = get_current_user_agency_id()
  )
)
WITH CHECK (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_faqs.event_id
      AND e.agency_id = get_current_user_agency_id()
  )
);

-- 4. event_requirements - Adicionar filtro por agência
DROP POLICY IF EXISTS "Admins podem atualizar requisitos" ON event_requirements;
DROP POLICY IF EXISTS "Admins podem criar requisitos" ON event_requirements;
DROP POLICY IF EXISTS "Admins podem deletar requisitos" ON event_requirements;

CREATE POLICY "Agency admins can manage their agency event requirements"
ON event_requirements FOR ALL
TO authenticated
USING (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_requirements.event_id
      AND e.agency_id = get_current_user_agency_id()
  )
)
WITH CHECK (
  is_current_user_agency_admin()
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_requirements.event_id
      AND e.agency_id = get_current_user_agency_id()
  )
);