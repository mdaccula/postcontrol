-- RPC: Contador de vendas aprovadas por agência
CREATE OR REPLACE FUNCTION public.get_approved_sales_count(p_agency_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)
  FROM public.submissions
  WHERE agency_id = p_agency_id
    AND submission_type = 'sale'
    AND status = 'approved';
$$;