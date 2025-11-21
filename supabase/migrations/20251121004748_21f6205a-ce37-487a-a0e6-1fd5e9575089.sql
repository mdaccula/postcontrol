-- ==========================================
-- FUNCIONALIDADE 1: SISTEMA DE METAS
-- ==========================================

-- Tabela para rastrear progresso de metas dos usuários
CREATE TABLE IF NOT EXISTS user_event_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Progresso
  current_posts INTEGER DEFAULT 0,
  current_sales INTEGER DEFAULT 0,
  required_posts INTEGER DEFAULT 0,
  required_sales INTEGER DEFAULT 0,
  
  -- Status da meta
  goal_achieved BOOLEAN DEFAULT false,
  goal_achieved_at TIMESTAMP WITH TIME ZONE,
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraint para evitar duplicatas
  UNIQUE(user_id, event_id)
);

-- Tabela para configuração de notificações de meta por agência
CREATE TABLE IF NOT EXISTS agency_goal_notifications_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Configurações de notificação
  send_push_notification BOOLEAN DEFAULT true,
  send_email_notification BOOLEAN DEFAULT false,
  custom_message TEXT DEFAULT '🎉 Parabéns! Você garantiu sua vaga no grupo do evento!',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(agency_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_event_goals_user_id ON user_event_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_goals_event_id ON user_event_goals(event_id);
CREATE INDEX IF NOT EXISTS idx_user_event_goals_agency_id ON user_event_goals(agency_id);
CREATE INDEX IF NOT EXISTS idx_user_event_goals_goal_achieved ON user_event_goals(goal_achieved);

-- Função para verificar e atualizar meta do usuário
CREATE OR REPLACE FUNCTION check_and_update_user_goal(
  p_user_id UUID,
  p_event_id UUID
)
RETURNS TABLE(
  goal_just_achieved BOOLEAN,
  current_posts INTEGER,
  current_sales INTEGER,
  required_posts INTEGER,
  required_sales INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id UUID;
  v_event_required_posts INTEGER;
  v_event_required_sales INTEGER;
  v_current_posts INTEGER;
  v_current_sales INTEGER;
  v_goal_already_achieved BOOLEAN;
  v_goal_just_achieved BOOLEAN := false;
BEGIN
  -- Buscar agency_id do evento
  SELECT e.agency_id, e.required_posts, e.required_sales
  INTO v_agency_id, v_event_required_posts, v_event_required_sales
  FROM events e
  WHERE e.id = p_event_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or has no agency';
  END IF;

  -- Contar posts e vendas aprovadas do usuário para este evento
  SELECT 
    COUNT(*) FILTER (WHERE s.submission_type = 'post' AND s.status = 'approved'),
    COUNT(*) FILTER (WHERE s.submission_type = 'sale' AND s.status = 'approved')
  INTO v_current_posts, v_current_sales
  FROM submissions s
  WHERE s.user_id = p_user_id
    AND s.event_id = p_event_id;

  -- Inserir ou atualizar registro de meta
  INSERT INTO user_event_goals (
    user_id,
    event_id,
    agency_id,
    current_posts,
    current_sales,
    required_posts,
    required_sales,
    goal_achieved,
    goal_achieved_at
  )
  VALUES (
    p_user_id,
    p_event_id,
    v_agency_id,
    v_current_posts,
    v_current_sales,
    v_event_required_posts,
    v_event_required_sales,
    (v_current_posts >= v_event_required_posts AND v_current_sales >= v_event_required_sales),
    CASE 
      WHEN (v_current_posts >= v_event_required_posts AND v_current_sales >= v_event_required_sales) 
      THEN now() 
      ELSE NULL 
    END
  )
  ON CONFLICT (user_id, event_id)
  DO UPDATE SET
    current_posts = v_current_posts,
    current_sales = v_current_sales,
    required_posts = v_event_required_posts,
    required_sales = v_event_required_sales,
    goal_achieved = (v_current_posts >= v_event_required_posts AND v_current_sales >= v_event_required_sales),
    goal_achieved_at = CASE 
      WHEN (v_current_posts >= v_event_required_posts AND v_current_sales >= v_event_required_sales) 
        AND user_event_goals.goal_achieved = false 
      THEN now()
      ELSE user_event_goals.goal_achieved_at
    END,
    updated_at = now()
  RETURNING user_event_goals.goal_achieved AND NOT user_event_goals.notified, user_event_goals.goal_achieved
  INTO v_goal_just_achieved, v_goal_already_achieved;

  -- Se a meta acabou de ser atingida, marcar para notificação
  IF v_goal_just_achieved IS NULL THEN
    SELECT 
      goal_achieved AND NOT notified,
      goal_achieved
    INTO v_goal_just_achieved, v_goal_already_achieved
    FROM user_event_goals
    WHERE user_id = p_user_id AND event_id = p_event_id;
  END IF;

  RETURN QUERY SELECT 
    COALESCE(v_goal_just_achieved, false),
    v_current_posts,
    v_current_sales,
    v_event_required_posts,
    v_event_required_sales;
END;
$$;

-- Função para buscar ranking de top divulgadoras
CREATE OR REPLACE FUNCTION get_top_promoters_ranking(
  p_event_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  current_posts INTEGER,
  current_sales INTEGER,
  required_posts INTEGER,
  required_sales INTEGER,
  completion_percentage NUMERIC,
  goal_achieved BOOLEAN,
  rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH rankings AS (
    SELECT 
      ueg.user_id,
      p.full_name,
      p.avatar_url,
      ueg.current_posts,
      ueg.current_sales,
      ueg.required_posts,
      ueg.required_sales,
      CASE 
        WHEN (ueg.required_posts + ueg.required_sales) = 0 THEN 0
        ELSE ROUND(
          ((ueg.current_posts::NUMERIC + ueg.current_sales::NUMERIC) / 
           (ueg.required_posts::NUMERIC + ueg.required_sales::NUMERIC) * 100)::NUMERIC, 
          2
        )
      END as completion_pct,
      ueg.goal_achieved,
      ROW_NUMBER() OVER (
        ORDER BY 
          ueg.goal_achieved DESC,
          (ueg.current_posts + ueg.current_sales) DESC
      ) as rank_num
    FROM user_event_goals ueg
    JOIN profiles p ON p.id = ueg.user_id
    WHERE ueg.event_id = p_event_id
  )
  SELECT * FROM rankings
  WHERE rank_num <= p_limit
  ORDER BY rank_num;
END;
$$;

-- Trigger para verificar meta quando submissão é aprovada
CREATE OR REPLACE FUNCTION trigger_check_goal_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_result RECORD;
BEGIN
  -- Só verificar quando status muda para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Verificar e atualizar meta
    SELECT * INTO v_goal_result
    FROM check_and_update_user_goal(NEW.user_id, NEW.event_id)
    LIMIT 1;
    
    -- Se meta foi atingida, chamar edge function para notificar
    IF v_goal_result.goal_just_achieved THEN
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-goal-achieved',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'userId', NEW.user_id,
          'eventId', NEW.event_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela submissions
DROP TRIGGER IF EXISTS trigger_check_goal_after_approval ON submissions;
CREATE TRIGGER trigger_check_goal_after_approval
  AFTER INSERT OR UPDATE OF status ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_goal_on_approval();

-- RLS Policies para user_event_goals
ALTER TABLE user_event_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON user_event_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agency admins can view their agency goals"
  ON user_event_goals FOR SELECT
  USING (
    is_current_user_agency_admin() 
    AND agency_id = get_current_user_agency_id()
  );

CREATE POLICY "Master admins can view all goals"
  ON user_event_goals FOR SELECT
  USING (is_current_user_master_admin());

CREATE POLICY "System can manage goals"
  ON user_event_goals FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies para agency_goal_notifications_config
ALTER TABLE agency_goal_notifications_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins can manage their config"
  ON agency_goal_notifications_config FOR ALL
  USING (
    is_current_user_agency_admin() 
    AND agency_id = get_current_user_agency_id()
  )
  WITH CHECK (
    is_current_user_agency_admin() 
    AND agency_id = get_current_user_agency_id()
  );

CREATE POLICY "Master admins can manage all configs"
  ON agency_goal_notifications_config FOR ALL
  USING (is_current_user_master_admin())
  WITH CHECK (is_current_user_master_admin());