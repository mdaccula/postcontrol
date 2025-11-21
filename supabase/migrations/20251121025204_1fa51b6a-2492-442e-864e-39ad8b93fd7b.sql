-- Adicionar campos opcionais para datas de eventos VIP
ALTER TABLE guest_list_dates 
ADD COLUMN name TEXT,
ADD COLUMN image_url TEXT,
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;

COMMENT ON COLUMN guest_list_dates.name IS 'Nome opcional da festa/evento específico da data';
COMMENT ON COLUMN guest_list_dates.image_url IS 'URL da foto específica desta data/festa';
COMMENT ON COLUMN guest_list_dates.start_time IS 'Horário de início do evento';
COMMENT ON COLUMN guest_list_dates.end_time IS 'Horário de término do evento';