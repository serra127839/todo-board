import { Copy } from 'lucide-react'

export default function SetupRequired() {
  const lines = ['VITE_SUPABASE_URL=', 'VITE_SUPABASE_ANON_KEY=']

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_80px_-50px_rgba(0,0,0,0.55)]">
        <div className="border-b border-stone-100 bg-gradient-to-r from-amber-50 to-rose-50 px-5 py-4">
          <div className="font-display text-base font-semibold text-stone-900">Configurar Supabase</div>
          <div className="mt-1 text-xs text-stone-500">
            Faltan variables de entorno. Sin esto no se puede iniciar sesión ni guardar en la nube.
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="text-sm text-stone-800">
            Crea un fichero <span className="font-mono">.env</span> (local) o configura variables en Vercel:
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 font-mono text-xs text-stone-800">
            {lines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>

          <div className="text-xs text-stone-500">
            Los valores salen de Supabase → Project Settings → API (Project URL + anon public key).
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-100 bg-stone-50 px-5 py-4">
          <button
            onClick={() => void copy()}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm transition hover:bg-stone-50"
            type="button"
          >
            <Copy className="h-4 w-4" />
            Copiar plantilla
          </button>
        </div>
      </div>
    </div>
  )
}

