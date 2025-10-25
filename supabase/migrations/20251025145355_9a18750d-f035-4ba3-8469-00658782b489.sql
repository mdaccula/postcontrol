-- ============================================
-- PARTE 1: MELHORIAS DE ALTO VALOR - DATABASE
-- ============================================

-- 1. Adicionar coluna rejection_reason em submissions
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Criar tabela admin_settings para configurações gerais
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Inserir configuração inicial do WhatsApp
INSERT INTO public.admin_settings (setting_key, setting_value) 
VALUES ('whatsapp_number', '') 
ON CONFLICT (setting_key) DO NOTHING;

-- 3. Criar tabela submission_logs para audit log
CREATE TABLE IF NOT EXISTS public.submission_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Criar tabela event_faqs para FAQ dinâmico
CREATE TABLE IF NOT EXISTS public.event_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Criar tabela notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  deadline_24h BOOLEAN NOT NULL DEFAULT true,
  deadline_3days BOOLEAN NOT NULL DEFAULT true,
  deadline_7days BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices otimizados para queries frequentes
CREATE INDEX IF NOT EXISTS idx_submissions_user_status ON public.submissions(user_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_post_status ON public.submissions(post_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_event_deadline ON public.posts(event_id, deadline);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_instagram ON public.profiles(instagram);
CREATE INDEX IF NOT EXISTS idx_submission_logs_submission ON public.submission_logs(submission_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_faqs_event ON public.event_faqs(event_id, display_order);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings" 
ON public.admin_settings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update settings" 
ON public.admin_settings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- submission_logs
ALTER TABLE public.submission_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view submission logs" 
ON public.submission_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can insert logs" 
ON public.submission_logs FOR INSERT 
WITH CHECK (true);

-- event_faqs
ALTER TABLE public.event_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view visible FAQs" 
ON public.event_faqs FOR SELECT 
USING (is_visible = true);

CREATE POLICY "Admins can manage FAQs" 
ON public.event_faqs FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" 
ON public.notification_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.notification_preferences FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.notification_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para criar audit log quando status de submission mudar
CREATE OR REPLACE FUNCTION public.log_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas logar se o status mudou
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.submission_logs (
      submission_id, 
      changed_by, 
      old_status, 
      new_status,
      reason
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.status,
      NEW.status,
      NEW.rejection_reason
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_submission_status
AFTER UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.log_submission_status_change();

-- Trigger para atualizar updated_at em event_faqs
CREATE TRIGGER update_event_faqs_updated_at
BEFORE UPDATE ON public.event_faqs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em admin_settings
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();