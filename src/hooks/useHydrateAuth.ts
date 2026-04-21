import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getSupabase, isSupabaseConfigured } from '@/supabaseClient'

export const useHydrateAuth = (): void => {
  const hydrated = useAuthStore((s) => s.hydrated)
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    if (hydrated) return
    let cancelled = false

    if (!isSupabaseConfigured) {
      setSession(null)
      return () => {
        cancelled = true
      }
    }

    const supabase = getSupabase()

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [hydrated, setSession])
}
