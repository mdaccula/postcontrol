-- Função helper para converter timestamp mantendo horário fixo
-- Interpreta o timestamp como America/Sao_Paulo (UTC-3) sem conversão automática
CREATE OR REPLACE FUNCTION convert_to_fixed_timezone(input_timestamp text)
RETURNS timestamp with time zone AS $$
BEGIN
  -- Adiciona o offset -03:00 (America/Sao_Paulo) ao final e converte para timestamptz
  -- Isso força o PostgreSQL a interpretar o horário como sendo de São Paulo
  RETURN (input_timestamp || '-03:00')::timestamp with time zone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para exibir timestamp sempre no horário de São Paulo
CREATE OR REPLACE FUNCTION display_in_brazil_timezone(input_timestamp timestamp with time zone)
RETURNS timestamp AS $$
BEGIN
  -- Converte para o timezone de São Paulo e remove a informação de timezone
  RETURN (input_timestamp AT TIME ZONE 'America/Sao_Paulo')::timestamp;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION convert_to_fixed_timezone IS 'Converte string datetime para timestamptz forçando timezone -03:00';
COMMENT ON FUNCTION display_in_brazil_timezone IS 'Exibe timestamp sempre no horário de Brasília, removendo offset';