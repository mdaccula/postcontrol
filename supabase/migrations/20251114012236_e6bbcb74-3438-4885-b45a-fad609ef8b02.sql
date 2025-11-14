-- Adicionar coluna ticketer_email na tabela events
ALTER TABLE public.events 
ADD COLUMN ticketer_email text;

COMMENT ON COLUMN public.events.ticketer_email IS 'E-mail opcional da ticketeira para coleta de dados dos usuários';

-- Adicionar coluna user_ticketer_email na tabela submissions
ALTER TABLE public.submissions 
ADD COLUMN user_ticketer_email text;

COMMENT ON COLUMN public.submissions.user_ticketer_email IS 'E-mail secundário fornecido pelo usuário quando solicitado pela ticketeira';