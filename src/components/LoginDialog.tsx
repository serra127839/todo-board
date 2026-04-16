import { useEffect, useMemo, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

type ApiOk = { success: true; data: { token: string } }
type ApiErr = { success: false; error: string }

export default function LoginDialog() {
  const setToken = useAuthStore((s) => s.setToken)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => password.trim().length > 0, [password])

  useEffect(() => {
    setError(null)
  }, [password])

  const submit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/auth/simple/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const json = (await res.json()) as ApiOk | ApiErr
      if (!json.success) {
        setError('Wrong password')
        return
      }

      setToken(json.data.token)
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
                Enter the shared password to access this URL.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <label className="block">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Password
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              type="password"
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
            disabled={!canSubmit || busy}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition enabled:hover:bg-amber-600 disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}
