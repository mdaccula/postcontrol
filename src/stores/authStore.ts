import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { sb } from '@/lib/supabaseSafe';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setIsMasterAdmin: (isMasterAdmin: boolean) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<void>;
  checkMasterAdminStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAdmin: false,
  isMasterAdmin: false,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setIsMasterAdmin: (isMasterAdmin) => set({ isMasterAdmin }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAdmin: false, isMasterAdmin: false });
  },
  checkAdminStatus: async () => {
    const { user } = get();
    if (!user) {
      set({ isAdmin: false });
      return;
    }

    const { data, error } = await sb
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    set({ isAdmin: !error && !!data });
  },
  checkMasterAdminStatus: async () => {
    const { user } = get();
    if (!user) {
      set({ isMasterAdmin: false });
      return;
    }

    const { data, error } = await sb
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'master_admin')
      .maybeSingle();

    set({ isMasterAdmin: !error && !!data });
  },
}));
