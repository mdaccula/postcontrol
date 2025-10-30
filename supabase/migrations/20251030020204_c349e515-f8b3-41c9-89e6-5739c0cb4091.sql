-- Adicionar campo is_approximate_total na tabela events
ALTER TABLE public.events 
ADD COLUMN is_approximate_total boolean DEFAULT false;