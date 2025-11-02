-- ========================================
-- SPRINT 1: ITEM 2 - VALIDAÇÃO DE GÊNERO
-- ========================================

-- 1. Normalizar valores existentes de inglês para português
UPDATE profiles 
SET gender = CASE 
  WHEN gender = 'male' THEN 'Masculino'
  WHEN gender = 'female' THEN 'Feminino'
  WHEN gender ILIKE '%lgbtq%' OR gender ILIKE '%lgbt%' THEN 'LGBTQ+'
  ELSE gender
END
WHERE gender IN ('male', 'female') OR gender ILIKE '%lgbtq%' OR gender ILIKE '%lgbt%';

-- 2. Forçar "Agência" para todos os agency_admins
UPDATE profiles 
SET gender = 'Agência'
WHERE id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'agency_admin'
);