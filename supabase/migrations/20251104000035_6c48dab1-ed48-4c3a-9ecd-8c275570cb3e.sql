
-- Adicionar constraint para garantir apenas valores permitidos
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_gender_check 
CHECK (gender IS NULL OR gender IN ('Masculino', 'Feminino', 'LGBTQ+', 'Agência'));

-- Criar índice para melhorar performance de filtros por gênero
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender) WHERE gender IS NOT NULL;
