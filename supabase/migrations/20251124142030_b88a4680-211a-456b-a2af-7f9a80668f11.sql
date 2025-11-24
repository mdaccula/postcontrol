-- Adicionar coluna event_image_url para imagem do evento de lista VIP
ALTER TABLE guest_list_events
ADD COLUMN event_image_url TEXT;