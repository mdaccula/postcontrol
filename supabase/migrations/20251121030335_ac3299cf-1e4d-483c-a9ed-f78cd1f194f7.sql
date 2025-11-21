-- Adicionar campo para auto-desativação de datas após início do evento
ALTER TABLE guest_list_dates 
ADD COLUMN auto_deactivate_after_start BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN guest_list_dates.auto_deactivate_after_start 
IS 'Se TRUE, a data é automaticamente desativada após event_date + start_time';