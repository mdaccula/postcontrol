import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const { setUser, setSession, setLoading, checkAdminStatus, checkMasterAdminStatus } = useAuthStore();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus();
            checkMasterAdminStatus();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        setTimeout(() => {
          checkAdminStatus();
          checkMasterAdminStatus();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading, checkAdminStatus]);

  return useAuthStore();
};
