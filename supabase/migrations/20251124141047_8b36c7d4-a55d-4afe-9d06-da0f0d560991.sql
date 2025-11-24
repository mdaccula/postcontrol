-- Item 4: Adicionar campos de link alternativo em guest_list_dates
ALTER TABLE guest_list_dates
ADD COLUMN alternative_link_female TEXT,
ADD COLUMN alternative_link_male TEXT,
ADD COLUMN show_alternative_after_start BOOLEAN DEFAULT false;

-- Item 5: Adicionar campos de customização em guest_list_events
ALTER TABLE guest_list_events
ADD COLUMN no_dates_message TEXT DEFAULT 'Não há datas disponíveis no momento. Fique atento às nossas redes sociais!',
ADD COLUMN no_dates_show_social BOOLEAN DEFAULT true,
ADD COLUMN no_dates_show_tickets BOOLEAN DEFAULT true,
ADD COLUMN no_dates_show_whatsapp BOOLEAN DEFAULT true;

COMMENT ON COLUMN guest_list_dates.alternative_link_female IS 'URL para lista feminina após horário de início';
COMMENT ON COLUMN guest_list_dates.alternative_link_male IS 'URL para lista masculina após horário de início';
COMMENT ON COLUMN guest_list_dates.show_alternative_after_start IS 'Se true, mostra links alternativos em vez de esconder a data';

COMMENT ON COLUMN guest_list_events.no_dates_message IS 'Mensagem exibida quando não há datas disponíveis';
COMMENT ON COLUMN guest_list_events.no_dates_show_social IS 'Mostrar redes sociais na página sem datas';
COMMENT ON COLUMN guest_list_events.no_dates_show_tickets IS 'Mostrar botão de ingressos na página sem datas';
COMMENT ON COLUMN guest_list_events.no_dates_show_whatsapp IS 'Mostrar botão de WhatsApp na página sem datas';