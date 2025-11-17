-- SPRINT 1: Criar tabela de histórico de notificações e atualizar push_subscriptions

-- 1. Atualizar tabela push_subscriptions para adicionar last_used_at (já existe, mas garantir)
-- Adicionar índice para limpeza eficiente
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_used 
ON push_subscriptions(last_used_at);

-- 2. Criar tabela notification_logs para histórico real
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text,
  data jsonb,
  sent_at timestamptz DEFAULT now() NOT NULL,
  delivered boolean DEFAULT false,
  clicked boolean DEFAULT false,
  clicked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id 
ON notification_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at 
ON notification_logs(sent_at DESC);

-- RLS Policies
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias notificações
CREATE POLICY "Users can view their own notification logs"
ON notification_logs FOR SELECT
USING (auth.uid() = user_id);

-- Sistema pode inserir logs
CREATE POLICY "System can insert notification logs"
ON notification_logs FOR INSERT
WITH CHECK (true);

-- Usuários podem atualizar (marcar como clicado)
CREATE POLICY "Users can update their own notification logs"
ON notification_logs FOR UPDATE
USING (auth.uid() = user_id);

-- Master admins podem ver todos os logs
CREATE POLICY "Master admins can view all notification logs"
ON notification_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'master_admin'
  )
);

-- Comentários
COMMENT ON TABLE notification_logs IS 'Histórico completo de notificações push enviadas e recebidas';
COMMENT ON COLUMN notification_logs.delivered IS 'True quando Service Worker confirma exibição';
COMMENT ON COLUMN notification_logs.clicked IS 'True quando usuário clica na notificação';