-- FASE 4: Adicionar coluna event_id na tabela submissions
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL;

-- Popular event_id para submissões existentes
UPDATE submissions s
SET event_id = p.event_id
FROM posts p
WHERE s.post_id = p.id
  AND s.event_id IS NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_submissions_event_id ON submissions(event_id);

-- Comentário
COMMENT ON COLUMN submissions.event_id IS 'Referência direta ao evento, mantida mesmo quando post_id é null (ex: comprovantes de venda)';

-- Atualizar trigger para popular event_id automaticamente
CREATE OR REPLACE FUNCTION public.set_submission_agency_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Buscar agency_id e event_id do post
  IF NEW.post_id IS NOT NULL THEN
    SELECT p.agency_id, p.event_id 
    INTO NEW.agency_id, NEW.event_id
    FROM posts p
    WHERE p.id = NEW.post_id;
  END IF;
  
  RETURN NEW;
END;
$function$;