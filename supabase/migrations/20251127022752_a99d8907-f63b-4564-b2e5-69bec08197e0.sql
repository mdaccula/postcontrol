-- Adicionar coluna para armazenar preços individuais por tipo de valor
ALTER TABLE guest_list_dates 
ADD COLUMN price_details JSONB DEFAULT '{}'::jsonb;

-- Migrar dados existentes: copiar female_price e male_price para todos os tipos em price_types
UPDATE guest_list_dates 
SET price_details = jsonb_build_object(
  'entry_only', jsonb_build_object('female', female_price, 'male', male_price),
  'consumable_only', jsonb_build_object('female', female_price, 'male', male_price),
  'entry_plus_half', jsonb_build_object('female', female_price, 'male', male_price),
  'entry_plus_full', jsonb_build_object('female', female_price, 'male', male_price)
)
WHERE price_details = '{}'::jsonb OR price_details IS NULL;

COMMENT ON COLUMN guest_list_dates.price_details IS 'Preços específicos para cada tipo de valor: {type: {female: number, male: number}}';