-- Corrigir função check_and_update_user_goal para contar posts corretamente
-- Posts = tudo que NÃO é venda (divulgacao, selecao_perfil, etc)
CREATE OR REPLACE FUNCTION public.check_and_update_user_goal(p_user_id uuid, p_event_id uuid)
 RETURNS TABLE(goal_just_achieved boolean, current_posts integer, current_sales integer, required_posts integer, required_sales integer, achieved_requirement_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id UUID;
  v_current_posts INTEGER;
  v_current_sales INTEGER;
  v_goal_already_achieved BOOLEAN;
  v_goal_just_achieved BOOLEAN := false;
  v_requirement RECORD;
  v_achieved_req_id UUID := NULL;
  v_first_req_posts INTEGER := 0;
  v_first_req_sales INTEGER := 0;
BEGIN
  -- Buscar agency_id do evento
  SELECT e.agency_id INTO v_agency_id
  FROM events e
  WHERE e.id = p_event_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or has no agency';
  END IF;

  -- Contar posts (tudo que NÃO é venda) e vendas aprovadas do usuário para este evento
  -- CORREÇÃO: submission_type != 'sale' ao invés de = 'post'
  SELECT 
    COUNT(*) FILTER (WHERE s.submission_type != 'sale' AND s.status = 'approved'),
    COUNT(*) FILTER (WHERE s.submission_type = 'sale' AND s.status = 'approved')
  INTO v_current_posts, v_current_sales
  FROM submissions s
  WHERE s.user_id = p_user_id
    AND s.event_id = p_event_id;

  -- Buscar TODAS as regras de event_requirements para este evento
  -- Verificar se usuário bateu QUALQUER uma delas (OR lógico)
  FOR v_requirement IN
    SELECT er.id, er.required_posts, er.required_sales
    FROM event_requirements er
    WHERE er.event_id = p_event_id
    ORDER BY er.display_order ASC
  LOOP
    -- Guardar primeira regra para retorno
    IF v_first_req_posts = 0 AND v_first_req_sales = 0 THEN
      v_first_req_posts := v_requirement.required_posts;
      v_first_req_sales := v_requirement.required_sales;
    END IF;

    -- Verificar se bateu esta regra
    IF v_current_posts >= v_requirement.required_posts 
       AND v_current_sales >= v_requirement.required_sales THEN
      v_achieved_req_id := v_requirement.id;
      v_first_req_posts := v_requirement.required_posts;
      v_first_req_sales := v_requirement.required_sales;
      EXIT; -- Encontrou uma regra atingida, sair do loop
    END IF;
  END LOOP;

  -- Se não encontrou nenhuma regra em event_requirements, usar eventos.required_posts/sales (fallback)
  IF v_first_req_posts = 0 AND v_first_req_sales = 0 THEN
    SELECT e.required_posts, e.required_sales
    INTO v_first_req_posts, v_first_req_sales
    FROM events e
    WHERE e.id = p_event_id;
  END IF;

  -- Inserir ou atualizar registro de meta
  INSERT INTO user_event_goals (
    user_id,
    event_id,
    agency_id,
    current_posts,
    current_sales,
    required_posts,
    required_sales,
    goal_achieved,
    goal_achieved_at,
    achieved_requirement_id
  )
  VALUES (
    p_user_id,
    p_event_id,
    v_agency_id,
    v_current_posts,
    v_current_sales,
    v_first_req_posts,
    v_first_req_sales,
    (v_achieved_req_id IS NOT NULL),
    CASE WHEN v_achieved_req_id IS NOT NULL THEN now() ELSE NULL END,
    v_achieved_req_id
  )
  ON CONFLICT (user_id, event_id)
  DO UPDATE SET
    current_posts = v_current_posts,
    current_sales = v_current_sales,
    required_posts = v_first_req_posts,
    required_sales = v_first_req_sales,
    goal_achieved = (v_achieved_req_id IS NOT NULL),
    goal_achieved_at = CASE 
      WHEN (v_achieved_req_id IS NOT NULL) AND user_event_goals.goal_achieved = false 
      THEN now()
      ELSE user_event_goals.goal_achieved_at
    END,
    achieved_requirement_id = v_achieved_req_id,
    updated_at = now()
  RETURNING user_event_goals.goal_achieved AND NOT user_event_goals.notified, user_event_goals.goal_achieved
  INTO v_goal_just_achieved, v_goal_already_achieved;

  -- Se a meta acabou de ser atingida, marcar para notificação
  IF v_goal_just_achieved IS NULL THEN
    SELECT 
      goal_achieved AND NOT notified,
      goal_achieved
    INTO v_goal_just_achieved, v_goal_already_achieved
    FROM user_event_goals
    WHERE user_id = p_user_id AND event_id = p_event_id;
  END IF;

  RETURN QUERY SELECT 
    COALESCE(v_goal_just_achieved, false),
    v_current_posts,
    v_current_sales,
    v_first_req_posts,
    v_first_req_sales,
    v_achieved_req_id;
END;
$function$;