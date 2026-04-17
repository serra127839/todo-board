import { create } from 'zustand'
import type { Board, BoardSnapshot, CellRecord, TaskRow } from '../../shared/boardTypes'
import type { RealtimeEvent } from '../../shared/realtimeTypes'
import { cellKey } from '@/utils/cellKey'
import {
  createProject,
  createSnapshot,
  listProjects,
  listSnapshots,
  loadProjectState,
  loadSnapshot,
  renameProject,
  saveProjectState,
  type ProjectRow,
  type SnapshotRow,
} from '@/api/supabaseRepo'

type BoardState = {
  projectId: string | null
  projects: ProjectRow[]
  snapshots: SnapshotRow[]
  board?: Board
  tasks: TaskRow[]
  cells: Record<string, CellRecord>
  loading: boolean
  error?: string
  connected: boolean
  dirty: boolean
  saving: boolean
  saveError?: string
  lastSavedAt?: string
  load: () => Promise<void>
  refreshProjects: () => Promise<void>
  selectProject: (projectId: string) => Promise<void>
  createProject: (name: string) => Promise<void>
  refreshSnapshots: () => Promise<void>
  renameCurrentProject: (name: string) => Promise<void>
  saveSnapshot: (name: string) => Promise<void>
  restoreSnapshot: (snapshotId: string) => Promise<void>
  saveNow: () => Promise<void>
  setConnected: (connected: boolean) => void
  applySnapshot: (snapshot: BoardSnapshot) => void
  applyEvent: (event: RealtimeEvent) => void
}

const toCellMap = (cells: CellRecord[]): Record<string, CellRecord> => {
  const out: Record<string, CellRecord> = {}
  for (const c of cells) out[cellKey(c.taskId, c.date)] = c
  return out
}

const toSnapshot = (board: Board, tasks: TaskRow[], cells: Record<string, CellRecord>): BoardSnapshot => ({
  board,
  tasks,
  cells: Object.values(cells),
})

const todayIso = (): string => new Date().toISOString().slice(0, 10)
const addDaysIso = (iso: string, days: number): string => {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

let saveTimer: number | undefined

export const useBoardStore = create<BoardState>((set, get) => ({
  projectId: null,
  projects: [],
  snapshots: [],
  tasks: [],
  cells: {},
  loading: false,
  connected: false,
  dirty: false,
  saving: false,
  load: async () => {
    if (get().loading) return
    set({ loading: true, error: undefined })
    try {
      const projects = await listProjects()
      if (projects.length === 0) {
        const created = await createProject('Main project')
        const nextProjects = [created]
        set({ projects: nextProjects })
      } else {
        set({ projects })
      }

      const currentProjects = get().projects
      const chosenId = get().projectId ?? currentProjects[0]?.id ?? null
      if (!chosenId) {
        set({ loading: false })
        return
      }

      await get().selectProject(chosenId)
      set({ loading: false })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load',
      })
    }
  },
  refreshProjects: async () => {
    const projects = await listProjects()
    set({ projects })
  },
  selectProject: async (projectId) => {
    set({ loading: true, error: undefined, projectId })
    const projects = get().projects
    const project = projects.find((p) => p.id === projectId)
    const projectName = project?.name ?? 'Project'
    const existing = await loadProjectState(projectId)
    if (existing) {
      set({
        board: { ...existing.board, id: projectId, projectName },
        tasks: [...existing.tasks].sort((a, b) => a.order - b.order),
        cells: toCellMap(existing.cells),
        dirty: false,
        saveError: undefined,
      })
    } else {
      const startDate = todayIso()
      const endDate = addDaysIso(startDate, 21)
      const fresh: BoardSnapshot = {
        board: { id: projectId, startDate, endDate, projectName },
        tasks: [],
        cells: [],
      }
      set({
        board: fresh.board,
        tasks: [],
        cells: {},
        dirty: true,
      })
      await get().saveNow()
    }
    await get().refreshSnapshots()
    set({ loading: false })
  },
  createProject: async (name) => {
    const created = await createProject(name.trim())
    set((s) => ({ projects: [created, ...s.projects] }))
    await get().selectProject(created.id)
  },
  refreshSnapshots: async () => {
    const projectId = get().projectId
    if (!projectId) return
    const snapshots = await listSnapshots(projectId)
    set({ snapshots })
  },
  renameCurrentProject: async (name) => {
    const projectId = get().projectId
    if (!projectId) return
    const updated = await renameProject(projectId, name.trim())
    set((s) => ({
      projects: s.projects.map((p) => (p.id === updated.id ? updated : p)),
      board: s.board ? { ...s.board, projectName: updated.name } : s.board,
    }))
    scheduleSave(get, set)
  },
  saveSnapshot: async (name) => {
    const projectId = get().projectId
    const board = get().board
    if (!projectId || !board) return
    const snapshot = toSnapshot(board, get().tasks, get().cells)
    await createSnapshot(projectId, name.trim(), snapshot)
    await get().refreshSnapshots()
  },
  restoreSnapshot: async (snapshotId) => {
    const projectId = get().projectId
    if (!projectId) return
    const snapshot = await loadSnapshot(snapshotId)
    set({
      board: { ...snapshot.board, id: projectId },
      tasks: [...snapshot.tasks].sort((a, b) => a.order - b.order),
      cells: toCellMap(snapshot.cells),
      dirty: true,
    })
    await get().saveNow()
  },
  saveNow: async () => {
    const projectId = get().projectId
    const board = get().board
    if (!projectId || !board) return
    if (get().saving) return
    set({ saving: true, saveError: undefined })
    try {
      const snapshot = toSnapshot(board, get().tasks, get().cells)
      await saveProjectState(projectId, snapshot)
      set({
        dirty: false,
        saving: false,
        lastSavedAt: new Date().toISOString(),
      })
    } catch (e) {
      set({
        saving: false,
        saveError: e instanceof Error ? e.message : 'Save failed',
      })
    }
  },
  setConnected: (connected) => set({ connected }),
  applySnapshot: (snapshot) =>
    set({
      board: snapshot.board,
      tasks: [...snapshot.tasks].sort((a, b) => a.order - b.order),
      cells: toCellMap(snapshot.cells),
      dirty: true,
    }),
  applyEvent: (event) => {
    if (event.type === 'board:updated') {
      set((s) =>
        s.board
          ? {
              board: {
                ...s.board,
                ...(event.payload.projectName !== undefined
                  ? { projectName: event.payload.projectName }
                  : {}),
                ...(event.payload.startDate !== undefined
                  ? { startDate: event.payload.startDate }
                  : {}),
                ...(event.payload.endDate !== undefined
                  ? { endDate: event.payload.endDate }
                  : {}),
              },
              dirty: true,
            }
          : s,
      )
      scheduleSave(get, set)
      return
    }

    if (event.type === 'cell:updated') {
      set((s) => ({
        cells: {
          ...s.cells,
          [cellKey(event.payload.taskId, event.payload.date)]: event.payload,
        },
        dirty: true,
      }))
      scheduleSave(get, set)
      return
    }

    if (event.type === 'task:deleted') {
      set((s) => {
        const nextTasks = s.tasks.filter((t) => t.id !== event.payload.id)
        const nextCells: Record<string, CellRecord> = {}
        for (const [k, v] of Object.entries(s.cells)) {
          if (v.taskId !== event.payload.id) nextCells[k] = v
        }
        return { tasks: nextTasks, cells: nextCells, dirty: true }
      })
      scheduleSave(get, set)
      return
    }

    if (event.type === 'task:created') {
      set((s) => {
        if (s.tasks.some((t) => t.id === event.payload.id)) return s
        return {
          tasks: [...s.tasks, event.payload].sort((a, b) => a.order - b.order),
          dirty: true,
        }
      })
      scheduleSave(get, set)
      return
    }

    if (event.type === 'task:updated') {
      set((s) => ({
        tasks: s.tasks
          .map((t) => (t.id === event.payload.id ? event.payload : t))
          .sort((a, b) => a.order - b.order),
        dirty: true,
      }))
      scheduleSave(get, set)
    }
  },
}))

function scheduleSave(
  get: () => BoardState,
  set: (partial: Partial<BoardState> | ((s: BoardState) => Partial<BoardState>)) => void,
): void {
  set({ dirty: true })
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void get().saveNow()
  }, 600)
}
