-- Ajustar FKs que referenciam auth.users para permitir deleção completa de usuários
-- Estratégia: usar ON DELETE CASCADE para evitar erros de "Database error deleting user"

-- events.created_by -> auth.users.id
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE public.events
ADD CONSTRAINT events_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- posts.created_by -> auth.users.id
ALTER TABLE public.posts
DROP CONSTRAINT IF EXISTS posts_created_by_fkey;
ALTER TABLE public.posts
ADD CONSTRAINT posts_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- submissions.user_id -> auth.users.id
ALTER TABLE public.submissions
DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- submissions.approved_by -> auth.users.id
ALTER TABLE public.submissions
DROP CONSTRAINT IF EXISTS submissions_approved_by_fkey;
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_approved_by_fkey
FOREIGN KEY (approved_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- admin_settings.updated_by -> auth.users.id
ALTER TABLE public.admin_settings
DROP CONSTRAINT IF EXISTS admin_settings_updated_by_fkey;
ALTER TABLE public.admin_settings
ADD CONSTRAINT admin_settings_updated_by_fkey
FOREIGN KEY (updated_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- submission_logs.changed_by -> auth.users.id
ALTER TABLE public.submission_logs
DROP CONSTRAINT IF EXISTS submission_logs_changed_by_fkey;
ALTER TABLE public.submission_logs
ADD CONSTRAINT submission_logs_changed_by_fkey
FOREIGN KEY (changed_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- submission_tags.created_by -> auth.users.id
ALTER TABLE public.submission_tags
DROP CONSTRAINT IF EXISTS submission_tags_created_by_fkey;
ALTER TABLE public.submission_tags
ADD CONSTRAINT submission_tags_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- user_segments.created_by -> auth.users.id
ALTER TABLE public.user_segments
DROP CONSTRAINT IF EXISTS user_segments_created_by_fkey;
ALTER TABLE public.user_segments
ADD CONSTRAINT user_segments_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- agencies.owner_id -> auth.users.id
ALTER TABLE public.agencies
DROP CONSTRAINT IF EXISTS agencies_owner_id_fkey;
ALTER TABLE public.agencies
ADD CONSTRAINT agencies_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- agency_guests.revoked_by -> auth.users.id
ALTER TABLE public.agency_guests
DROP CONSTRAINT IF EXISTS agency_guests_revoked_by_fkey;
ALTER TABLE public.agency_guests
ADD CONSTRAINT agency_guests_revoked_by_fkey
FOREIGN KEY (revoked_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- system_changelog.author_id -> auth.users.id
ALTER TABLE public.system_changelog
DROP CONSTRAINT IF EXISTS system_changelog_author_id_fkey;
ALTER TABLE public.system_changelog
ADD CONSTRAINT system_changelog_author_id_fkey
FOREIGN KEY (author_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- agency_requests.reviewed_by -> auth.users.id
ALTER TABLE public.agency_requests
DROP CONSTRAINT IF EXISTS agency_requests_reviewed_by_fkey;
ALTER TABLE public.agency_requests
ADD CONSTRAINT agency_requests_reviewed_by_fkey
FOREIGN KEY (reviewed_by)
REFERENCES auth.users(id)
ON DELETE CASCADE;