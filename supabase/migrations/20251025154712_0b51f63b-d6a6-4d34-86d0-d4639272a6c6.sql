-- ============================================
-- PARTE 2: MELHORIAS SECUNDÁRIAS - MIGRATION
-- ============================================

-- 2.3 Sistema Gamificado (Badges)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_type ON public.user_badges(badge_type);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all badges"
  ON public.user_badges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "System can insert badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (true);

-- 2.4 Tags/Categorias em Submissões
CREATE TABLE IF NOT EXISTS public.submission_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_submission_tags_submission ON public.submission_tags(submission_id);
CREATE INDEX idx_submission_tags_name ON public.submission_tags(tag_name);

ALTER TABLE public.submission_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tags"
  ON public.submission_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can view tags on their submissions"
  ON public.submission_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.submissions
    WHERE submissions.id = submission_id AND submissions.user_id = auth.uid()
  ));

-- 2.5 Agendamento de Ativação/Desativação de Eventos
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS auto_activate_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS auto_deactivate_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_events_auto_activate ON public.events(auto_activate_at) WHERE auto_activate_at IS NOT NULL;
CREATE INDEX idx_events_auto_deactivate ON public.events(auto_deactivate_at) WHERE auto_deactivate_at IS NOT NULL;

-- 2.7 Segmentação de Usuários
CREATE TABLE IF NOT EXISTS public.user_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_name TEXT NOT NULL UNIQUE,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage segments"
  ON public.user_segments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- 2.10 Rate Limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action_type, window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
  ON public.rate_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits"
  ON public.rate_limits FOR ALL
  USING (true);

-- Função para verificar rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_max_count INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start > v_window_start;
  
  IF v_count >= p_max_count THEN
    RETURN FALSE;
  END IF;
  
  -- Incrementar contador
  INSERT INTO public.rate_limits (user_id, action_type, count, window_start)
  VALUES (p_user_id, p_action_type, 1, now())
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar unique constraint para evitar duplicatas
ALTER TABLE public.rate_limits 
  DROP CONSTRAINT IF EXISTS rate_limits_user_action_window_key;
  
ALTER TABLE public.rate_limits 
  ADD CONSTRAINT rate_limits_user_action_window_key 
  UNIQUE (user_id, action_type, window_start);

-- Trigger para limpar rate limits antigos (mantém últimas 24h)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_rate_limits
  AFTER INSERT ON public.rate_limits
  EXECUTE FUNCTION cleanup_old_rate_limits();

-- Adicionar campo para tutorial completado no profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system';