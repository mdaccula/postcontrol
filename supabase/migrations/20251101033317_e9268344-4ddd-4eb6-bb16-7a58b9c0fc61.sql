-- Normalizar gêneros existentes no banco de dados para Title Case
UPDATE profiles 
SET gender = CASE 
  WHEN LOWER(gender) = 'masculino' THEN 'Masculino'
  WHEN LOWER(gender) = 'feminino' THEN 'Feminino'
  WHEN LOWER(gender) IN ('lgbtq+', 'lgbtqia+') THEN 'LGBTQ+'
  WHEN LOWER(gender) = 'outro' THEN 'Outro'
  WHEN LOWER(gender) IN ('prefiro-nao-informar', 'prefiro não informar') THEN 'Prefiro não informar'
  ELSE gender
END
WHERE gender IS NOT NULL;