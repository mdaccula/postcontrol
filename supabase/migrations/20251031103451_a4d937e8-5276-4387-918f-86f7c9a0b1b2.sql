-- Adicionar coluna followers_range para estatísticas demográficas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS followers_range TEXT;

COMMENT ON COLUMN public.profiles.followers_range IS 'Faixa de seguidores do Instagram (ex: 0-1k, 1k-5k, 5k-10k, 10k-50k, 50k+)';

-- Adicionar coluna logo_url nas agencies para branding
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.agencies.logo_url IS 'URL do logo da agência para exibição no signup';