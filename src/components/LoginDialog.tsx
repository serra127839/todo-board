import { useEffect, useRef, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { getSupabase, isSupabaseConfigured } from '@/supabaseClient'

export default function LoginDialog() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setError(null)
  }, [email, password, mode])

  const submit = async () => {
    if (busy) return
    if (!isSupabaseConfigured) {
      setError('Falta configurar Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
      return
    }

    const finalEmail = (email.trim() || emailRef.current?.value?.trim() || '').trim()
    const finalPassword = password || passwordRef.current?.value || ''
    if (!finalEmail || !finalPassword) {
      setError('Rellena email y contraseña.')
      return
    }

    setBusy(true)
    try {
      const supabase = getSupabase()
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: finalEmail,
          password: finalPassword,
        })
        if (error) {
          setError(error.message)
          return
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: finalEmail,
          password: finalPassword,
        })
        if (error) {
          setError(error.message)
          return
        }
        setError('Check your email to confirm your account if required.')
      }
    } catch {
      setError('Could not connect')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_80px_-50px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-stone-100 bg-gradient-to-r from-amber-50 to-rose-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm">
              <LockKeyhole className="h-4 w-4 text-stone-700" />
            </div>
            <div className="flex flex-col">
              <div className="font-display text-base font-semibold text-stone-900">
                Board access
              </div>
              <div className="text-xs text-stone-500">
                Sign in to access this URL.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('signin')}
              className={`rounded-full px-3 py-1.5 text-xs shadow-sm transition ${
                mode === 'signin'
                  ? 'bg-stone-900 text-white'
                  : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
              type="button"
            >
              Tengo cuenta
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`rounded-full px-3 py-1.5 text-xs shadow-sm transition ${
                mode === 'signup'
                  ? 'bg-stone-900 text-white'
                  : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
              type="button"
            >
              Crear cuenta
            </button>
          </div>

          <label className="block">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Email
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              ref={emailRef}
              autoFocus
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              placeholder="name@company.com"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Password
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              ref={passwordRef}
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              placeholder="••••••••"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
          </label>

          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-100 bg-stone-50 px-5 py-4">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition enabled:hover:bg-amber-600 disabled:opacity-50"
            type="button"
          >
            {busy ? (mode === 'signin' ? 'Entrando…' : 'Creando…') : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}
