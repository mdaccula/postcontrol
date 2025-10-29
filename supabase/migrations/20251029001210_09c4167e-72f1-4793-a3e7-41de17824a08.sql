-- Fix RLS policy for agencies - Add SELECT policy for master admins
CREATE POLICY "Master admins podem visualizar agências"
ON public.agencies
FOR SELECT
USING (public.is_master_admin(auth.uid()));

-- Insert default agency
INSERT INTO public.agencies (name, slug, subscription_plan, subscription_status, max_influencers, max_events)
VALUES ('Agência Padrão', 'default', 'basic', 'active', 100, 50)
ON CONFLICT (slug) DO NOTHING;