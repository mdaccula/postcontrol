-- ============================================================================
-- ETAPA 1: Remover TODAS as policies relacionadas ao sistema de guests
-- ============================================================================

-- 1. Remover policies de agency_guests
DROP POLICY IF EXISTS "Agency admins can manage their agency guests" ON public.agency_guests;
DROP POLICY IF EXISTS "Guests can accept their invites" ON public.agency_guests;
DROP POLICY IF EXISTS "Guests can view their own invites" ON public.agency_guests;
DROP POLICY IF EXISTS "Master admins can manage all guests" ON public.agency_guests;

-- 2. Remover policies de guest_event_permissions
DROP POLICY IF EXISTS "Agency admins can manage their agency guest permissions" ON public.guest_event_permissions;
DROP POLICY IF EXISTS "Guests can view their own permissions" ON public.guest_event_permissions;
DROP POLICY IF EXISTS "Master admins can manage all guest permissions" ON public.guest_event_permissions;

-- 3. Remover policies de guest_audit_log
DROP POLICY IF EXISTS "Agency admins podem ver logs" ON public.guest_audit_log;
DROP POLICY IF EXISTS "System pode inserir logs" ON public.guest_audit_log;

-- 4. Remover referências a guests em events
DROP POLICY IF EXISTS "Guests can view permitted events" ON public.events;

-- 5. Remover referências a guests em posts
DROP POLICY IF EXISTS "Guests can view permitted posts" ON public.posts;

-- 6. Remover referências a guests em submissions
DROP POLICY IF EXISTS "Guests can view permitted submissions" ON public.submissions;
DROP POLICY IF EXISTS "Guests with moderator+ can update permitted submissions" ON public.submissions;