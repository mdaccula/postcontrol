-- Permitir post_id como NULL para vendas independentes
ALTER TABLE submissions 
ALTER COLUMN post_id DROP NOT NULL;

-- Adicionar comentário para documentação
COMMENT ON COLUMN submissions.post_id IS 'ID da postagem (obrigatório para tipo post, NULL para vendas independentes)';
