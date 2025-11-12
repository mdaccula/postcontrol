-- FASE 6: Adicionar coluna og_image_url na tabela agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS og_image_url text;

COMMENT ON COLUMN agencies.og_image_url IS 'URL da imagem de preview (Open Graph) para compartilhamento do link público da agência';

-- Criar bucket público para imagens OG (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-og-images', 'agency-og-images', true)
ON CONFLICT (id) DO NOTHING;