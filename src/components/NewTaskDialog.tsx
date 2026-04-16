import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'

export default function NewTaskDialog(props: {
  open: boolean
  onClose: () => void
  onCreate: (input: { title: string; owner: string }) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!props.open) return
    setTitle('')
    setOwner('')
    setBusy(false)
  }, [props.open])

  const canSubmit = useMemo(() => title.trim().length > 0 && owner.trim().length > 0, [title, owner])

  const submit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    try {
      await props.onCreate({ title: title.trim(), owner: owner.trim() })
      props.onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/30 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_80px_-50px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-stone-100 bg-gradient-to-r from-amber-50 to-rose-50 px-5 py-4">
          <div className="flex flex-col">
            <div className="font-display text-base font-semibold text-stone-900">New task</div>
            <div className="text-xs text-stone-500">Create a row and start daily tracking.</div>
          </div>
          <button
            onClick={props.onClose}
            className="rounded-full p-2 text-stone-500 transition hover:bg-white/60 hover:text-stone-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <label className="block">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Task
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              placeholder="e.g. Prepare weekly report"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Tech owner
            </div>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              placeholder="e.g. Ana / Carlos"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-100 bg-stone-50 px-5 py-4">
          <button
            onClick={props.onClose}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || busy}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition enabled:hover:bg-amber-600 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
