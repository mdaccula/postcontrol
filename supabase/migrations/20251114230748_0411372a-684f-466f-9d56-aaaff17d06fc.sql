-- ✅ FASE 1 OPÇÃO B: Sincronizar dados existentes e criar trigger

-- 1️⃣ Remover CHECK constraint existente que impede sincronização
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_submission_type_check;

-- 2️⃣ Sincronizar submission_type dos registros existentes
UPDATE submissions s
SET submission_type = p.post_type
FROM posts p
WHERE s.post_id = p.id
  AND (s.submission_type IS NULL OR s.submission_type != p.post_type);

-- 3️⃣ Criar nova CHECK constraint com valores corretos
ALTER TABLE submissions 
ADD CONSTRAINT submissions_submission_type_check 
CHECK (submission_type IN ('post', 'sale', 'divulgacao', 'selecao_perfil'));

-- 4️⃣ Criar função para sincronização automática
CREATE OR REPLACE FUNCTION sync_submission_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se post_id foi definido, copiar o post_type do post
  IF NEW.post_id IS NOT NULL THEN
    SELECT post_type INTO NEW.submission_type
    FROM posts
    WHERE id = NEW.post_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5️⃣ Criar trigger para manter sincronização
DROP TRIGGER IF EXISTS trigger_sync_submission_type ON submissions;

CREATE TRIGGER trigger_sync_submission_type
  BEFORE INSERT OR UPDATE OF post_id ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION sync_submission_type();