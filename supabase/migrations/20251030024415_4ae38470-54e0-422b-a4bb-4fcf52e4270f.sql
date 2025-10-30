-- M10: Criar tabela para templates de eventos
CREATE TABLE IF NOT EXISTS public.event_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

-- Policies: Admins podem gerenciar seus templates
CREATE POLICY "Agency admins can manage their templates"
  ON public.event_templates
  FOR ALL
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE owner_id = auth.uid()
    ) OR is_master_admin(auth.uid())
  );

CREATE POLICY "Master admins can manage all templates"
  ON public.event_templates
  FOR ALL
  USING (is_master_admin(auth.uid()));

-- Index para melhor performance
CREATE INDEX idx_event_templates_agency ON public.event_templates(agency_id);
CREATE INDEX idx_event_templates_created_by ON public.event_templates(created_by);