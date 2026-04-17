import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

type AuthState = {
  session: Session | null
  user: User | null
  hydrated: boolean
  setSession: (session: Session | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  hydrated: false,
  setSession: (session) => set({ session, user: session?.user ?? null, hydrated: true }),
}))
