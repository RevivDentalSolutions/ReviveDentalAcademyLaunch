import { create } from 'zustand'
import { supabase, type Profile } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  initialize: () => Promise<void>
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null

      let profile = null
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        profile = data
      }

      set({
        user,
        profile,
        isLoading: false,
        isAuthenticated: !!user,
      })

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        const currentUser = session?.user ?? null
        let currentProfile = null

        if (currentUser) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
          currentProfile = data
        }

        set({
          user: currentUser,
          profile: currentProfile,
          isAuthenticated: !!currentUser,
        })
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ isLoading: false })
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, isAuthenticated: false })
  },
}))
