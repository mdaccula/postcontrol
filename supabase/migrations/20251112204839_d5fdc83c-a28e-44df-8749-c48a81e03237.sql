-- FASE 1: Remover constraint antigo
ALTER TABLE posts 
DROP CONSTRAINT IF EXISTS posts_post_type_check;

-- FASE 2: Atualizar 'venda' para 'sale'
UPDATE posts 
SET post_type = 'sale' 
WHERE post_type = 'venda';

-- FASE 3: Adicionar novo constraint com todos os tipos válidos
ALTER TABLE posts 
ADD CONSTRAINT posts_post_type_check 
CHECK (post_type IN ('divulgacao', 'selecao_perfil', 'sale'));

-- Comentário: Unificado 'venda' -> 'sale' mantendo outros tipos