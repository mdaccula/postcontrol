-- ✅ Índices para otimizar contadores de submissões
CREATE INDEX IF NOT EXISTS idx_submissions_agency_event 
ON public.submissions(agency_id, event_id) 
WHERE agency_id IS NOT NULL AND event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_agency_post 
ON public.submissions(agency_id, post_id) 
WHERE agency_id IS NOT NULL AND post_id IS NOT NULL;

-- ✅ RPC: Contador de submissões por evento (agregação direta no BD)
CREATE OR REPLACE FUNCTION public.get_submission_counts_by_event(p_agency_id uuid)
RETURNS TABLE(event_id uuid, submission_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    event_id,
    COUNT(*) as submission_count
  FROM public.submissions
  WHERE agency_id = p_agency_id
    AND event_id IS NOT NULL
  GROUP BY event_id;
$$;

-- ✅ RPC: Contador de submissões por post (agregação direta no BD)
CREATE OR REPLACE FUNCTION public.get_submission_counts_by_post(p_agency_id uuid)
RETURNS TABLE(post_id uuid, submission_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    post_id,
    COUNT(*) as submission_count
  FROM public.submissions
  WHERE agency_id = p_agency_id
    AND post_id IS NOT NULL
  GROUP BY post_id;
$$;