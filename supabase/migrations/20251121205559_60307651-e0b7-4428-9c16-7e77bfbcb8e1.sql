-- ===================================================================
-- CORREÇÃO: Trigger de aprovação que falhava por falta de app.settings
-- ===================================================================
-- Este trigger era chamado quando uma submissão era aprovada, mas falhava
-- ao tentar buscar configurações inexistentes (app.settings.supabase_url e 
-- app.settings.service_role_key), causando rollback de toda a transação.
-- 
-- Solução: Usar current_setting com missing_ok=true e envolver chamada HTTP
-- em bloco de exceção para não impedir aprovação se notificação falhar.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.trigger_check_goal_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_goal_result RECORD;
  v_base_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Só verificar quando status muda para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Verificar e atualizar meta
    SELECT * INTO v_goal_result
    FROM check_and_update_user_goal(NEW.user_id, NEW.event_id)
    LIMIT 1;
    
    -- Se meta foi atingida, tentar chamar edge function para notificar
    IF v_goal_result.goal_just_achieved THEN
      -- Buscar configurações (com missing_ok=true para não falhar se não existir)
      v_base_url := current_setting('app.settings.supabase_url', true);
      v_service_key := current_setting('app.settings.service_role_key', true);
      
      -- Só chamar se as configurações existirem
      IF v_base_url IS NOT NULL AND v_service_key IS NOT NULL THEN
        BEGIN
          -- Tentar chamar edge function
          PERFORM net.http_post(
            url := v_base_url || '/functions/v1/notify-goal-achieved',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_service_key
            ),
            body := jsonb_build_object(
              'userId', NEW.user_id,
              'eventId', NEW.event_id
            )
          );
        EXCEPTION WHEN OTHERS THEN
          -- Se falhar a notificação, apenas logar mas NÃO impedir a aprovação
          RAISE NOTICE 'Erro ao enviar notificação de meta atingida: %', SQLERRM;
        END;
      ELSE
        -- Configurações não disponíveis, apenas logar
        RAISE NOTICE 'Configurações de notificação não disponíveis (app.settings.supabase_url ou service_role_key)';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;