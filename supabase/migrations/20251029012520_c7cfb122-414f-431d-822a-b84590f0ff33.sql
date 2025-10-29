-- =====================================================
-- RECRIAÇÃO COMPLETA DO SISTEMA DE ROLES
-- =====================================================

-- 1. DELETAR TABELA E ENUM ANTIGOS
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- 2. CRIAR ENUM LIMPO
CREATE TYPE public.app_role AS ENUM ('user', 'agency_admin', 'master_admin');

-- 3. CRIAR TABELA user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. HABILITAR RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. RECRIAR FUNÇÃO has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. RECRIAR FUNÇÃO is_master_admin (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'master_admin'
  )
$$;

-- 7. CRIAR RLS POLICIES PARA user_roles
CREATE POLICY "Agency admins podem ver todos os roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'agency_admin') OR has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Agency admins podem inserir roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agency_admin') OR has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Agency admins podem atualizar roles"
ON public.user_roles FOR UPDATE
USING (has_role(auth.uid(), 'agency_admin') OR has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Agency admins podem deletar roles"
ON public.user_roles FOR DELETE
USING (has_role(auth.uid(), 'agency_admin') OR has_role(auth.uid(), 'master_admin'));

-- 8. INSERIR ROLES DOS USUÁRIOS
-- teste@teste.com.br → agency_admin
INSERT INTO public.user_roles (user_id, role) 
VALUES ('42a423d6-e93a-427d-8d80-86624c658748', 'agency_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- maicoln90@hotmail.com → master_admin
INSERT INTO public.user_roles (user_id, role) 
VALUES ('d26ba95c-1863-4cc8-b087-bda5091edda9', 'master_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 9. ATUALIZAR TODAS AS RLS POLICIES QUE USAM has_role

-- Tabela: events
DROP POLICY IF EXISTS "Admins podem criar eventos" ON public.events;
DROP POLICY IF EXISTS "Admins podem atualizar eventos" ON public.events;
DROP POLICY IF EXISTS "Admins podem deletar eventos" ON public.events;
DROP POLICY IF EXISTS "Todos podem ver eventos" ON public.events;

CREATE POLICY "Todos podem ver eventos"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "Admins podem criar eventos"
ON public.events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Admins podem atualizar eventos"
ON public.events FOR UPDATE
USING (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Admins podem deletar eventos"
ON public.events FOR DELETE
USING (has_role(auth.uid(), 'agency_admin'));

-- Tabela: posts
DROP POLICY IF EXISTS "Admins podem criar postagens" ON public.posts;
DROP POLICY IF EXISTS "Admins podem atualizar postagens" ON public.posts;
DROP POLICY IF EXISTS "Admins podem deletar postagens" ON public.posts;
DROP POLICY IF EXISTS "Todos podem ver postagens" ON public.posts;

CREATE POLICY "Todos podem ver postagens"
ON public.posts FOR SELECT
USING (true);

CREATE POLICY "Admins podem criar postagens"
ON public.posts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Admins podem atualizar postagens"
ON public.posts FOR UPDATE
USING (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Admins podem deletar postagens"
ON public.posts FOR DELETE
USING (has_role(auth.uid(), 'agency_admin'));

-- Tabela: event_requirements
DROP POLICY IF EXISTS "Admins podem criar requisitos" ON public.event_requirements;
DROP POLICY IF EXISTS "Admins podem atualizar requisitos" ON public.event_requirements;
DROP POLICY IF EXISTS "Admins podem deletar requisitos" ON public.event_requirements;
DROP POLICY IF EXISTS "Todos podem ver requisitos de eventos" ON public.event_requirements;

CREATE POLICY "Todos podem ver requisitos de eventos"
ON public.event_requirements FOR SELECT
USING (true);

CREATE POLICY "Admins podem criar requisitos"
ON public.event_requirements FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Admins podem atualizar requisitos"
ON public.event_requirements FOR UPDATE
USING (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Admins podem deletar requisitos"
ON public.event_requirements FOR DELETE
USING (has_role(auth.uid(), 'agency_admin'));

-- Tabela: submissions
DROP POLICY IF EXISTS "Usuários autenticados podem criar submissões" ON public.submissions;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias submissões" ON public.submissions;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias submissões" ON public.submissions;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias submissões" ON public.submissions;
DROP POLICY IF EXISTS "Admins podem ver todas as submissões" ON public.submissions;
DROP POLICY IF EXISTS "Admins podem atualizar submissões" ON public.submissions;

CREATE POLICY "Usuários autenticados podem criar submissões"
ON public.submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver suas próprias submissões"
ON public.submissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias submissões"
ON public.submissions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias submissões"
ON public.submissions FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as submissões"
ON public.submissions FOR SELECT
USING (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Admins podem atualizar submissões"
ON public.submissions FOR UPDATE
USING (has_role(auth.uid(), 'agency_admin'));

-- Tabela: profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;

CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'agency_admin'));

-- Tabela: agencies (MASTER ADMIN)
DROP POLICY IF EXISTS "Master admins podem gerenciar agências" ON public.agencies;
DROP POLICY IF EXISTS "Master admins podem visualizar agências" ON public.agencies;

CREATE POLICY "Master admins podem visualizar agências"
ON public.agencies FOR SELECT
USING (is_master_admin(auth.uid()));

CREATE POLICY "Master admins podem gerenciar agências"
ON public.agencies FOR ALL
USING (is_master_admin(auth.uid()));

-- Tabela: subscription_plans (MASTER ADMIN)
DROP POLICY IF EXISTS "Master admins podem gerenciar planos" ON public.subscription_plans;
DROP POLICY IF EXISTS "Todos podem ver planos visíveis" ON public.subscription_plans;

CREATE POLICY "Todos podem ver planos visíveis"
ON public.subscription_plans FOR SELECT
USING (is_visible = true);

CREATE POLICY "Master admins podem gerenciar planos"
ON public.subscription_plans FOR ALL
USING (is_master_admin(auth.uid()));

-- Tabela: admin_settings
DROP POLICY IF EXISTS "Admins can view settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;

CREATE POLICY "Admins can view settings"
ON public.admin_settings FOR SELECT
USING (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Admins can update settings"
ON public.admin_settings FOR UPDATE
USING (has_role(auth.uid(), 'agency_admin'));

-- Outras tabelas com policies de admin
DROP POLICY IF EXISTS "Admins can manage auto approval rules" ON public.auto_approval_rules;
CREATE POLICY "Admins can manage auto approval rules"
ON public.auto_approval_rules FOR ALL
USING (has_role(auth.uid(), 'agency_admin'));

DROP POLICY IF EXISTS "Admins can manage FAQs" ON public.event_faqs;
DROP POLICY IF EXISTS "Everyone can view visible FAQs" ON public.event_faqs;
CREATE POLICY "Everyone can view visible FAQs"
ON public.event_faqs FOR SELECT
USING (is_visible = true);
CREATE POLICY "Admins can manage FAQs"
ON public.event_faqs FOR ALL
USING (has_role(auth.uid(), 'agency_admin'));

DROP POLICY IF EXISTS "Admins podem criar comentários" ON public.submission_comments;
DROP POLICY IF EXISTS "Admins podem ver todos os comentários" ON public.submission_comments;
DROP POLICY IF EXISTS "Usuários podem criar comentários em suas submissões" ON public.submission_comments;
DROP POLICY IF EXISTS "Usuários podem ver comentários em suas submissões" ON public.submission_comments;

CREATE POLICY "Usuários podem criar comentários em suas submissões"
ON public.submission_comments FOR INSERT
WITH CHECK (
  (is_internal = false) AND 
  EXISTS (SELECT 1 FROM submissions WHERE id = submission_id AND user_id = auth.uid())
);

CREATE POLICY "Usuários podem ver comentários em suas submissões"
ON public.submission_comments FOR SELECT
USING (
  (is_internal = false) AND 
  EXISTS (SELECT 1 FROM submissions WHERE id = submission_id AND user_id = auth.uid())
);

CREATE POLICY "Admins podem criar comentários"
ON public.submission_comments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agency_admin'));

CREATE POLICY "Admins podem ver todos os comentários"
ON public.submission_comments FOR SELECT
USING (has_role(auth.uid(), 'agency_admin'));

DROP POLICY IF EXISTS "Admins can view submission logs" ON public.submission_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.submission_logs;
CREATE POLICY "System can insert logs"
ON public.submission_logs FOR INSERT
WITH CHECK (true);
CREATE POLICY "Admins can view submission logs"
ON public.submission_logs FOR SELECT
USING (has_role(auth.uid(), 'agency_admin'));

DROP POLICY IF EXISTS "Admins can manage tags" ON public.submission_tags;
DROP POLICY IF EXISTS "Users can view tags on their submissions" ON public.submission_tags;
CREATE POLICY "Users can view tags on their submissions"
ON public.submission_tags FOR SELECT
USING (EXISTS (SELECT 1 FROM submissions WHERE id = submission_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage tags"
ON public.submission_tags FOR ALL
USING (has_role(auth.uid(), 'agency_admin'));

DROP POLICY IF EXISTS "Admins can view all badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
DROP POLICY IF EXISTS "System can insert badges" ON public.user_badges;
CREATE POLICY "System can insert badges"
ON public.user_badges FOR INSERT
WITH CHECK (true);
CREATE POLICY "Users can view their own badges"
ON public.user_badges FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all badges"
ON public.user_badges FOR SELECT
USING (has_role(auth.uid(), 'agency_admin'));

DROP POLICY IF EXISTS "Admins can manage segments" ON public.user_segments;
CREATE POLICY "Admins can manage segments"
ON public.user_segments FOR ALL
USING (has_role(auth.uid(), 'agency_admin'));

DROP POLICY IF EXISTS "Admins can view rejection templates" ON public.rejection_templates;
CREATE POLICY "Admins can view rejection templates"
ON public.rejection_templates FOR SELECT
USING (has_role(auth.uid(), 'agency_admin'));