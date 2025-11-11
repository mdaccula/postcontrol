-- Expandir tabela notification_preferences com novos campos
ALTER TABLE notification_preferences 
  ADD COLUMN IF NOT EXISTS notify_submission_approved BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_submission_rejected BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_new_events BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_event_reminders BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS event_filter_type TEXT DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS selected_event_ids UUID[] DEFAULT '{}';

-- Adicionar constraint para event_filter_type
ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_event_filter_type_check;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_event_filter_type_check 
  CHECK (event_filter_type IN ('all', 'participating', 'selected'));

-- Comentários nas colunas
COMMENT ON COLUMN notification_preferences.notify_submission_approved IS 'Receber notificações de submissões aprovadas';
COMMENT ON COLUMN notification_preferences.notify_submission_rejected IS 'Receber notificações de submissões rejeitadas';
COMMENT ON COLUMN notification_preferences.notify_new_events IS 'Receber notificações de novos eventos criados';
COMMENT ON COLUMN notification_preferences.notify_event_reminders IS 'Receber lembretes de prazos de postagens';
COMMENT ON COLUMN notification_preferences.event_filter_type IS 'Tipo de filtro de eventos: all, participating, selected';
COMMENT ON COLUMN notification_preferences.selected_event_ids IS 'IDs dos eventos selecionados (apenas se event_filter_type=selected)';