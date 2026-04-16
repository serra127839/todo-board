import { useEffect } from 'react'
import { getStoredToken, useAuthStore } from '@/stores/authStore'

export const useHydrateAuth = (): void => {
  const token = useAuthStore((s) => s.token)
  const setToken = useAuthStore((s) => s.setToken)

  useEffect(() => {
    if (token !== null) return
    const stored = getStoredToken()
    if (stored) setToken(stored)
  }, [setToken, token])
}

