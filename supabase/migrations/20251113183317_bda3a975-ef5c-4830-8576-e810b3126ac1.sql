-- ✅ CORREÇÃO #2: Criar índice para otimizar query de contadores
-- Melhora performance de queries que filtram por agency_id e post_id
CREATE INDEX IF NOT EXISTS idx_submissions_agency_post 
ON public.submissions (agency_id, post_id);

-- Adicionar comentário explicativo
COMMENT ON INDEX public.idx_submissions_agency_post IS 
'Otimiza queries de contadores de submissões por post e agência - reduz full table scan';