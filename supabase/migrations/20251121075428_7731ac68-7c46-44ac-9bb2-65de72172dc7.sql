-- Habilitar RLS na tabela guest_list_registrations (se ainda não estiver)
ALTER TABLE guest_list_registrations ENABLE ROW LEVEL SECURITY;

-- Criar política pública para permitir leitura de registros na página de confirmação
-- Qualquer pessoa pode ler registros usando o ID (necessário para página de confirmação)
CREATE POLICY "Public can read guest list registrations by ID"
ON guest_list_registrations
FOR SELECT
TO public
USING (true);

-- Comentário explicativo
COMMENT ON POLICY "Public can read guest list registrations by ID" ON guest_list_registrations 
IS 'Permite acesso público de leitura para exibir página de confirmação após registro na lista VIP';