import { useEffect, useMemo, useRef, useState, type MouseEvent, type DragEvent, type ChangeEvent } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import type { BoardSnapshot, CellRecord, CellStatus, TaskRow } from '../../shared/boardTypes'
import { useBoardStore } from '@/stores/boardStore'
import { buildDateColumns } from '@/utils/dateRange'
import { cellKey } from '@/utils/cellKey'
import ProgressRing from '@/components/ProgressRing'
import { getSupabase } from '@/supabaseClient'

const percentSteps: (0 | 25 | 50 | 75 | 100)[] = [0, 25, 50, 75, 100]
const nextPercent = (current: 0 | 25 | 50 | 75 | 100): 0 | 25 | 50 | 75 | 100 => {
  const idx = percentSteps.indexOf(current)
  const next = percentSteps[(idx + 1) % percentSteps.length]
  return next
}

const statuses: CellStatus[] = ['red', 'yellow', 'green', 'black']
const nextStatus = (s: CellStatus): CellStatus => {
  const idx = statuses.indexOf(s)
  return statuses[(idx + 1) % statuses.length]
}

const uid = (): string =>
  globalThis.crypto && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

type LegacyTask = {
  id: string
  title?: string
  owner?: string
  order?: number
  parentId?: string | null
  cells?: Record<string, { percent?: number; status?: string }>
}

type LegacySnapshot = {
  board?: {
    projectName?: string
    startIso?: string
    endIso?: string
    startDate?: string
    endDate?: string
  }
  tasks?: LegacyTask[]
  cells?: CellRecord[]
}

const toAllowedPercent = (value: unknown): 0 | 25 | 50 | 75 | 100 => {
  const n = Number(value)
  if (n >= 100) return 100
  if (n >= 75) return 75
  if (n >= 50) return 50
  if (n >= 25) return 25
  return 0
}

const toAllowedStatus = (value: unknown): CellStatus => {
  if (value === 'red' || value === 'yellow' || value === 'green' || value === 'black') return value
  return 'green'
}

const normalizeImportedSnapshot = (raw: LegacySnapshot, currentProjectId: string | null): BoardSnapshot => {
  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : []
  const tasks: TaskRow[] = rawTasks.map((t, index) => ({
    id: String(t.id || uid()),
    title: String(t.title || ''),
    owner: String(t.owner || ''),
    order: index,
  }))

  const fromFlatCells = Array.isArray(raw.cells) ? raw.cells : []
  const fromTaskCells: CellRecord[] = rawTasks.flatMap((task) => {
    const taskId = String(task.id || '')
    const taskCells = task.cells || {}
    return Object.entries(taskCells).map(([date, value]) => ({
      taskId,
      date,
      value: {
        percent: toAllowedPercent(value?.percent),
        status: toAllowedStatus(value?.status),
      },
      updatedAt: new Date().toISOString(),
    }))
  })

  const mergedCells = fromFlatCells.length > 0 ? fromFlatCells : fromTaskCells
  const dedup = new Map<string, CellRecord>()
  for (const c of mergedCells) {
    dedup.set(cellKey(c.taskId, c.date), {
      ...c,
      value: {
        percent: toAllowedPercent(c?.value?.percent),
        status: toAllowedStatus(c?.value?.status),
      },
      updatedAt: c.updatedAt || new Date().toISOString(),
    })
  }

  const startDate = raw.board?.startDate || raw.board?.startIso || new Date().toISOString().slice(0, 10)
  const endDate = raw.board?.endDate || raw.board?.endIso || startDate

  return {
    board: {
      id: currentProjectId || uid(),
      projectName: raw.board?.projectName || 'Imported project',
      startDate,
      endDate,
    },
    tasks,
    cells: Array.from(dedup.values()),
  }
}

export default function BoardTable() {
  const projectId = useBoardStore((s) => s.projectId)
  const projects = useBoardStore((s) => s.projects)
  const board = useBoardStore((s) => s.board)
  const tasks = useBoardStore((s) => s.tasks)
  const cells = useBoardStore((s) => s.cells)
  const load = useBoardStore((s) => s.load)
  const applySnapshot = useBoardStore((s) => s.applySnapshot)
  const applyEvent = useBoardStore((s) => s.applyEvent)
  const loading = useBoardStore((s) => s.loading)
  const error = useBoardStore((s) => s.error)
  const dirty = useBoardStore((s) => s.dirty)
  const saving = useBoardStore((s) => s.saving)
  const saveError = useBoardStore((s) => s.saveError)
  const lastSavedAt = useBoardStore((s) => s.lastSavedAt)
  const selectProject = useBoardStore((s) => s.selectProject)
  const createProject = useBoardStore((s) => s.createProject)
  const saveNow = useBoardStore((s) => s.saveNow)
  const [dragId, setDragId] = useState<string | null>(null)
  const [projectNameDraft, setProjectNameDraft] = useState('')
  const [startDateDraft, setStartDateDraft] = useState('')
  const [endDateDraft, setEndDateDraft] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [collapsedByParent, setCollapsedByParent] = useState<Record<string, boolean>>({})
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setProjectNameDraft(board?.projectName ?? '')
    setStartDateDraft(board?.startDate ?? '')
    setEndDateDraft(board?.endDate ?? '')
  }, [board?.projectName, board?.startDate, board?.endDate])

  const dateColumns = useMemo(
    () =>
      board
        ? buildDateColumns(board.startDate, board.endDate)
        : [],
    [board],
  )

  const rowMeta = useMemo(() => {
    const isSubtaskTitle = (title: string) => title.trimStart().startsWith('↳')
    let currentParentId: string | null = null
    const rows = tasks.map((task) => {
      const isSubtask = isSubtaskTitle(task.title || '')
      if (!isSubtask) currentParentId = task.id
      const parentId = isSubtask ? currentParentId : null
      return { task, isSubtask, parentId }
    })

    const childrenCount: Record<string, number> = {}
    for (const r of rows) {
      if (r.isSubtask && r.parentId) {
        childrenCount[r.parentId] = (childrenCount[r.parentId] || 0) + 1
      }
    }

    const visibleRows = rows.filter((r) => {
      if (!r.isSubtask || !r.parentId) return true
      return !collapsedByParent[r.parentId]
    })

    return { visibleRows, childrenCount }
  }, [tasks, collapsedByParent])

  const onCreateTask = async (input: { title: string; owner: string }) => {
    const order = tasks.length
    applyEvent({
      type: 'task:created',
      payload: { id: uid(), title: input.title.trim(), owner: input.owner.trim(), order },
    })
  }

  const onDeleteTask = async (id: string) => {
    if (!window.confirm('Delete this task row?')) return
    applyEvent({ type: 'task:deleted', payload: { id } })
  }

  const onDuplicateTask = async (id: string) => {
    const src = tasks.find((t) => t.id === id)
    if (!src) return
    applyEvent({
      type: 'task:created',
      payload: { ...src, id: uid(), title: `${src.title} (copy)`, order: tasks.length },
    })
  }

  const onCellLeftClick = async (taskId: string, date: string) => {
    const key = cellKey(taskId, date)
    const existing = cells[key]
    const next = nextPercent(existing?.value.percent ?? 0)
    const status: CellStatus = existing?.value.status ?? 'green'
    applyEvent({
      type: 'cell:updated',
      payload: {
        taskId,
        date,
        value: { percent: next, status },
        updatedAt: new Date().toISOString(),
      },
    })
  }

  const onCellRightClick = async (e: MouseEvent, taskId: string, date: string) => {
    e.preventDefault()
    const key = cellKey(taskId, date)
    const existing = cells[key]
    const percent: 0 | 25 | 50 | 75 | 100 = existing?.value.percent ?? 0
    const status = existing ? nextStatus(existing.value.status) : 'red'
    applyEvent({
      type: 'cell:updated',
      payload: {
        taskId,
        date,
        value: { percent, status },
        updatedAt: new Date().toISOString(),
      },
    })
  }

  const onTitleBlur = async (taskId: string, value: string) => {
    const t = tasks.find((x) => x.id === taskId)
    if (!t) return
    applyEvent({ type: 'task:updated', payload: { ...t, title: value.trim() } })
  }

  const onOwnerBlur = async (taskId: string, value: string) => {
    const t = tasks.find((x) => x.id === taskId)
    if (!t) return
    applyEvent({ type: 'task:updated', payload: { ...t, owner: value.trim() } })
  }

  const onDragStart = (id: string) => setDragId(id)
  const onDragOverRow = (e: DragEvent) => {
    e.preventDefault()
  }
  const onDropRow = async (overId: string) => {
    if (!dragId || dragId === overId) return
    const list = [...tasks]
    const from = list.findIndex((t) => t.id === dragId)
    const to = list.findIndex((t) => t.id === overId)
    if (from === -1 || to === -1) return
    const [row] = list.splice(from, 1)
    list.splice(to, 0, row)
    for (const [index, t] of list.entries()) {
      applyEvent({ type: 'task:updated', payload: { ...t, order: index } })
    }
    setDragId(null)
  }
  const onDragEnd = () => setDragId(null)

  const onExport = async () => {
    return
  }

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (importing) return
    setImporting(true)
    try {
      const text = await file.text()
      const raw: LegacySnapshot = JSON.parse(text)
      const sanitize = (name: string): string =>
        name
          .trim()
          .replace(/[.,\s:|]+/g, '_')
          .replace(/^_+/, '')
          .replace(/_+$/, '')
      const baseCandidate = sanitize(String(raw?.board?.projectName || 'Imported_project'))
      const baseName = isValidProjectName(baseCandidate) && baseCandidate ? baseCandidate : 'Imported_project'
      const existing = new Set(projects.map((p) => p.name))
      let name = baseName
      let i = 1
      while (existing.has(name)) {
        name = `${baseName}_${i}`
        i += 1
      }

      const created = await createProject(name)
      const snapshot = normalizeImportedSnapshot(raw, created.id)
      snapshot.board.projectName = name
      applySnapshot(snapshot)
      await saveNow()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const isValidProjectName = (name: string): boolean => {
    if (!name) return false
    return !/[.,\s:|]/.test(name)
  }

  const submitCreateProject = async () => {
    const n = createName.trim()
    if (!isValidProjectName(n)) {
      window.alert('Invalid project name. Not allowed: space . , : |')
      return
    }
    setCreateOpen(false)
    setCreateName('')
    await createProject(n)
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-rose-50 px-4 py-3 shadow-sm">
        <div className="flex flex-col">
          <h1 className="font-display text-base font-semibold tracking-tight text-stone-900">
            Task calendar
          </h1>
          <p className="text-xs text-stone-500">
            From 13/04/2026 to 30/04/2026, daily progress per task row.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Project
            </div>
            <select
              value={projectId ?? ''}
              onChange={(e) => {
                const next = e.target.value
                if (!next) return
                if (dirty && !window.confirm('You have unsaved changes. Switch project and discard them?')) {
                  return
                }
                void selectProject(next)
              }}
              className="w-[620px] max-w-full rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 shadow-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setCreateOpen(true)
              }}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm transition hover:bg-stone-50"
              type="button"
            >
              Create
            </button>
            <div className="ml-2 flex items-center gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                Start
              </div>
              <input
                value={startDateDraft}
                onChange={(e) => setStartDateDraft(e.target.value)}
                onBlur={async () => {
                  const next = startDateDraft.trim()
                  if (!next) {
                    setStartDateDraft(board?.startDate ?? '')
                    return
                  }
                  if (endDateDraft && new Date(next).getTime() > new Date(endDateDraft).getTime()) {
                    setStartDateDraft(board?.startDate ?? '')
                    return
                  }
                  applyEvent({ type: 'board:updated', payload: { startDate: next } })
                }}
                type="date"
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 shadow-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              />
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                End
              </div>
              <input
                value={endDateDraft}
                onChange={(e) => setEndDateDraft(e.target.value)}
                onBlur={async () => {
                  const next = endDateDraft.trim()
                  if (!next) {
                    setEndDateDraft(board?.endDate ?? '')
                    return
                  }
                  if (startDateDraft && new Date(startDateDraft).getTime() > new Date(next).getTime()) {
                    setEndDateDraft(board?.endDate ?? '')
                    return
                  }
                  applyEvent({ type: 'board:updated', payload: { endDate: next } })
                }}
                type="date"
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 shadow-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${
              saveError
                ? 'bg-rose-50 text-rose-700'
                : saving
                  ? 'bg-amber-50 text-amber-700'
                  : dirty
                    ? 'bg-stone-100 text-stone-500'
                    : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {saveError
              ? 'Save failed'
              : saving
                ? 'Saving…'
                : dirty
                  ? 'Unsaved'
                  : lastSavedAt
                    ? 'Saved'
                    : 'Ready'}
          </div>
          <button
            onClick={() => void saveNow()}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Save
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onImport(e)}
            className="hidden"
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
            type="button"
            disabled={importing || saving}
            title="Import JSON into a new project"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button
            onClick={() => void getSupabase().auth.signOut()}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm transition hover:bg-stone-50"
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>

      {createOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-xl">
            <div className="px-5 py-4">
              <div className="font-display text-base font-semibold text-stone-900">Create project</div>
              <div className="mt-1 text-xs text-stone-500">
                Not allowed: space . , : |
              </div>
            </div>
            <div className="px-5 pb-4">
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                placeholder="Project_name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitCreateProject()
                  if (e.key === 'Escape') setCreateOpen(false)
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-stone-100 bg-stone-50 px-5 py-4">
              <button
                onClick={() => {
                  setCreateOpen(false)
                  setCreateName('')
                }}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm transition hover:bg-stone-50"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitCreateProject()}
                className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-600"
                type="button"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white/60 text-xs text-stone-500">
            Loading board…
          </div>
        )}
        {error && (
          <div className="absolute inset-x-0 top-0 z-10 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
        <div className="h-full overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[11px]">
            <thead className="sticky top-0 z-10 bg-gradient-to-b from-stone-50 to-stone-100">
              <tr>
                <th className="sticky left-0 z-20 w-[240px] min-w-[240px] border-b border-r border-stone-200 bg-stone-100 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Task
                </th>
                <th className="sticky left-[240px] z-20 w-[120px] min-w-[120px] border-b border-r border-stone-200 bg-stone-100 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Tech owner
                </th>
                {dateColumns.map((c) => (
                  <th
                    key={c.iso}
                    className="min-w-[48px] border-b border-r border-stone-200 px-1 py-2 text-center align-bottom text-[10px] font-medium text-stone-500 sm:min-w-[52px] lg:min-w-[56px]"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="uppercase tracking-[0.12em]">{c.dow}</span>
                      <span className="rounded-full bg-white px-1 py-0.5 text-[10px] font-semibold text-stone-700 shadow-sm">
                        {c.label}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowMeta.visibleRows.map(({ task, isSubtask }) => (
                <tr
                  key={task.id}
                  draggable
                  onDragStart={() => onDragStart(task.id)}
                  onDragOver={onDragOverRow}
                  onDrop={() => onDropRow(task.id)}
                  onDragEnd={onDragEnd}
                  className="group border-t border-stone-100 hover:bg-amber-50/40"
                >
                  <td className="sticky left-0 z-10 w-[240px] min-w-[240px] border-r border-stone-200 bg-white px-2 py-2">
                    <div className="flex items-center gap-2">
                      {!isSubtask ? (
                        <button
                          type="button"
                          disabled={!rowMeta.childrenCount[task.id]}
                          onClick={() =>
                            setCollapsedByParent((prev) => ({
                              ...prev,
                              [task.id]: !prev[task.id],
                            }))
                          }
                          className="h-5 w-5 shrink-0 rounded-md border border-stone-300 bg-white text-[11px] font-semibold leading-none text-stone-700 shadow-sm disabled:cursor-default disabled:opacity-35"
                          title={
                            rowMeta.childrenCount[task.id]
                              ? collapsedByParent[task.id]
                                ? 'Expand subtasks'
                                : 'Collapse subtasks'
                              : 'No subtasks'
                          }
                        >
                          {collapsedByParent[task.id] ? '+' : '-'}
                        </button>
                      ) : (
                        <span className="h-5 w-5 shrink-0" />
                      )}
                      <input
                        defaultValue={task.title}
                        onBlur={(e) => onTitleBlur(task.id, e.target.value)}
                        className={`w-full border-none bg-transparent text-xs outline-none ${
                          isSubtask ? 'text-stone-700' : 'font-medium text-stone-800'
                        }`}
                      />
                      <button
                        onClick={() => onDuplicateTask(task.id)}
                        className="invisible rounded-full p-1 text-stone-400 transition hover:bg-amber-100 hover:text-stone-800 group-hover:visible"
                        title="Duplicate row"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="invisible rounded-full p-1 text-stone-400 transition hover:bg-rose-100 hover:text-rose-700 group-hover:visible"
                        title="Delete row"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="sticky left-[240px] z-10 w-[120px] min-w-[120px] border-r border-stone-200 bg-white px-2 py-2">
                    <input
                      defaultValue={task.owner}
                      onBlur={(e) => onOwnerBlur(task.id, e.target.value)}
                      className="w-full border-none bg-transparent text-xs text-stone-700 outline-none"
                    />
                  </td>
                  {dateColumns.map((c) => {
                    const key = cellKey(task.id, c.iso)
                    const cell = cells[key]
                    const percent: 0 | 25 | 50 | 75 | 100 = cell?.value.percent ?? 0
                    const status: CellStatus = cell?.value.status ?? 'green'
                    return (
                      <td
                        key={c.iso}
                        className="border-r border-stone-100 px-1 py-1 text-center align-middle"
                      >
                        <button
                          type="button"
                          aria-label={`${c.dow} ${c.label}: ${percent}% (${status})`}
                          onClick={() => onCellLeftClick(task.id, c.iso)}
                          onContextMenu={(e) => onCellRightClick(e, task.id, c.iso)}
                          className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-stone-50 transition hover:bg-amber-50 sm:h-7 sm:w-7"
                        >
                          <ProgressRing percent={percent} status={status} />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + dateColumns.length}
                    className="border-t border-stone-100 px-4 py-6 text-center text-xs text-stone-400"
                  >
                    No tasks yet. Create the first one with “New task”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
