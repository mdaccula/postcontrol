-- Corrigir search_path nas funções de timezone para melhorar segurança
DROP FUNCTION IF EXISTS convert_to_fixed_timezone(text);
DROP FUNCTION IF EXISTS display_in_brazil_timezone(timestamp with time zone);

-- Função helper para converter timestamp mantendo horário fixo
CREATE OR REPLACE FUNCTION convert_to_fixed_timezone(input_timestamp text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Adiciona o offset -03:00 (America/Sao_Paulo) ao final e converte para timestamptz
  RETURN (input_timestamp || '-03:00')::timestamp with time zone;
END;
$$;

-- Função para exibir timestamp sempre no horário de São Paulo
CREATE OR REPLACE FUNCTION display_in_brazil_timezone(input_timestamp timestamp with time zone)
RETURNS timestamp
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Converte para o timezone de São Paulo e remove a informação de timezone
  RETURN (input_timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamp;
END;
$$;

COMMENT ON FUNCTION convert_to_fixed_timezone IS 'Converte string datetime para timestamptz forçando timezone -03:00';
COMMENT ON FUNCTION display_in_brazil_timezone IS 'Exibe timestamp sempre no horário de Brasília, removendo offset';