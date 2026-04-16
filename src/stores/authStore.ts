import { create } from 'zustand'

const TOKEN_KEY = 'tablero:token'

export const getStoredToken = (): string | null => {
  const t = localStorage.getItem(TOKEN_KEY)
  return t && t.length > 0 ? t : null
}

export const setStoredToken = (token: string | null): void => {
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

type AuthState = {
  token: string | null
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => {
    setStoredToken(token)
    set({ token })
  },
}))

