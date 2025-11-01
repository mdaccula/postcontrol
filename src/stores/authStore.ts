import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  queryClient: QueryClient | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setQueryClient: (queryClient: QueryClient) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  queryClient: null,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setQueryClient: (queryClient) => set({ queryClient }),
  signOut: async () => {
    await supabase.auth.signOut();
    
    // Limpar cache do React Query para evitar "role leakage"
    const queryClient = get().queryClient;
    if (queryClient) {
      queryClient.clear();
      console.log('✅ Cache do React Query limpo no logout');
    }
    
    set({ user: null, session: null });
  },
}));
