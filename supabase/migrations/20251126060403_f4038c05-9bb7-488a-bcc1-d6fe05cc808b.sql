-- Corrigir ordem das colunas na função get_top_promoters_ranking
-- O problema era que achieved_requirement_id estava antes de rank_num na query interna,
-- mas a definição do RETURNS TABLE esperava rank primeiro

CREATE OR REPLACE FUNCTION public.get_top_promoters_ranking(p_event_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, current_posts integer, current_sales integer, required_posts integer, required_sales integer, completion_percentage numeric, goal_achieved boolean, rank integer, achieved_requirement_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH rankings AS (
    SELECT 
      ueg.user_id,
      p.full_name,
      p.avatar_url,
      ueg.current_posts,
      ueg.current_sales,
      ueg.required_posts,
      ueg.required_sales,
      CASE 
        WHEN (ueg.required_posts + ueg.required_sales) = 0 THEN 0
        ELSE ROUND(
          ((ueg.current_posts::NUMERIC + ueg.current_sales::NUMERIC) / 
           (ueg.required_posts::NUMERIC + ueg.required_sales::NUMERIC) * 100)::NUMERIC, 
          2
        )
      END as completion_pct,
      ueg.goal_achieved,
      ROW_NUMBER() OVER (
        ORDER BY 
          ueg.goal_achieved DESC,
          (ueg.current_posts + ueg.current_sales) DESC
      )::INTEGER as rank_num,
      ueg.achieved_requirement_id
    FROM user_event_goals ueg
    JOIN profiles p ON p.id = ueg.user_id
    WHERE ueg.event_id = p_event_id
  )
  SELECT * FROM rankings
  WHERE rank_num <= p_limit
  ORDER BY rank_num;
END;
$function$;