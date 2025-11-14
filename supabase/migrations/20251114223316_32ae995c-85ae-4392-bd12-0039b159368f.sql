-- ========================================
-- OTIMIZAÇÃO DE PERFORMANCE - ÍNDICES CRÍTICOS
-- ========================================
-- Objetivo: Resolver timeouts de 8-9s nas queries de submissions
-- Impacto esperado: Redução para < 500ms

-- 1. Índice para filtro por agência (query mais comum)
CREATE INDEX IF NOT EXISTS idx_submissions_agency_id 
ON submissions(agency_id) 
WHERE agency_id IS NOT NULL;

-- 2. Índice para ordenação por data de criação (sempre usado)
CREATE INDEX IF NOT EXISTS idx_submissions_created_at 
ON submissions(created_at DESC);

-- 3. Índice para joins com tabela profiles (enriquecimento de dados)
CREATE INDEX IF NOT EXISTS idx_submissions_user_id 
ON submissions(user_id);

-- 4. Índice para joins com tabela posts (sempre necessário)
CREATE INDEX IF NOT EXISTS idx_submissions_post_id 
ON submissions(post_id);

-- 5. Índice para filtro de eventos em posts
CREATE INDEX IF NOT EXISTS idx_posts_event_id 
ON posts(event_id);

-- 6. Índice para filtro de tipo de post
CREATE INDEX IF NOT EXISTS idx_posts_post_type 
ON posts(post_type) 
WHERE post_type IS NOT NULL;

-- 7. Índice composto otimizado para query principal
-- Combina os 2 filtros mais usados: agência + ordenação por data
CREATE INDEX IF NOT EXISTS idx_submissions_agency_created 
ON submissions(agency_id, created_at DESC) 
WHERE agency_id IS NOT NULL;

-- ========================================
-- ANÁLISE DE IMPACTO
-- ========================================
-- Antes: 
--   - Query levava 8-9 segundos (timeout)
--   - Seq Scan em 1400+ linhas
--   - Erro: "canceling statement due to statement timeout"
--
-- Depois (esperado):
--   - Query em 250-500ms
--   - Index Scan em 50 linhas
--   - Sem erros de timeout
-- ========================================