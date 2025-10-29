-- Adicionar campo gender na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text;

-- Comentário explicando as opções
COMMENT ON COLUMN public.profiles.gender IS 'Opções: masculino, feminino, lgbtq+';