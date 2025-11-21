-- Adicionar coluna price_type na tabela guest_list_dates
ALTER TABLE guest_list_dates 
ADD COLUMN price_type TEXT DEFAULT 'entry_only';

-- Comentário explicativo sobre os valores possíveis
COMMENT ON COLUMN guest_list_dates.price_type IS 
'Tipo de cobrança: entry_only (entrada), consumable_only (só consumível), entry_plus_half (entrada + consome metade), entry_plus_full (entrada + consome valor integral)';