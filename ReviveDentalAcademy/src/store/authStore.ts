import { create } from 'zustand'
import { supabase, type Profile } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
interface AuthState {
  user: User | null; profile: Profile | null; isLoading: boolean; isAuthenticated: boolean;
  initialize: () => Promise<void>; setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void; signOut: () => Promise<void>;
}
let initialized = false;
let authRevision = 0;
export const useAuthStore = create<AuthState>((set) => ({
  user: null, profile: null, isLoading: true, isAuthenticated: false,
  initialize: async () => {
    if (initialized) return;
    initialized = true;
    const applyUser = async (user: User | null) => {
      const revision = ++authRevision;
      set({ user, profile: null, isAuthenticated: !!user, isLoading: !!user });
      try {
        const result = user ? await supabase.from('profiles').select('*').eq('id', user.id).single() : null;
        if (revision === authRevision) set({ profile: result?.data || null, isLoading: false });
      } catch { if (revision === authRevision) set({ profile: null, isLoading: false }); }
    };
    // Never await another Supabase request inside the auth event callback.
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      ++authRevision;
      set({user, profile:null, isAuthenticated:!!user, isLoading:!!user});
      const scheduledRevision = authRevision;
      setTimeout(() => { if (scheduledRevision === authRevision) void applyUser(user); }, 0);
    });
    try {
      const revision = authRevision;
      const { data: { session } } = await supabase.auth.getSession();
      if (revision === authRevision) await applyUser(session?.user || null);
    } catch { set({ isLoading: false }); }
  },
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),
  signOut: async () => { const { error } = await supabase.auth.signOut(); if (error) throw error; ++authRevision; set({ user:null, profile:null, isAuthenticated:false, isLoading:false }); },
}));
