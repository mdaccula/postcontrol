-- Adicionar coluna support_whatsapp na tabela agencies
ALTER TABLE agencies 
ADD COLUMN support_whatsapp TEXT DEFAULT NULL;

COMMENT ON COLUMN agencies.support_whatsapp IS 
  'Número WhatsApp de suporte da agência para promotores (formato: 5511999999999)';