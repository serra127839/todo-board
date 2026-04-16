import { create } from 'zustand'
import type { Board, BoardSnapshot, CellRecord, TaskRow } from '../../shared/boardTypes'
import type { RealtimeEvent } from '../../shared/realtimeTypes'
import { cellKey } from '@/utils/cellKey'
import { fetchBoard } from '@/api/boardApi'

type BoardState = {
  board?: Board
  tasks: TaskRow[]
  cells: Record<string, CellRecord>
  loading: boolean
  error?: string
  connected: boolean
  load: () => Promise<void>
  setConnected: (connected: boolean) => void
  applySnapshot: (snapshot: BoardSnapshot) => void
  applyEvent: (event: RealtimeEvent) => void
}

const toCellMap = (cells: CellRecord[]): Record<string, CellRecord> => {
  const out: Record<string, CellRecord> = {}
  for (const c of cells) out[cellKey(c.taskId, c.date)] = c
  return out
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: [],
  cells: {},
  loading: false,
  connected: false,
  load: async () => {
    if (get().loading) return
    set({ loading: true, error: undefined })
    try {
      const snapshot = await fetchBoard()
      set({
        board: snapshot.board,
        tasks: [...snapshot.tasks].sort((a, b) => a.order - b.order),
        cells: toCellMap(snapshot.cells),
        loading: false,
      })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load',
      })
    }
  },
  setConnected: (connected) => set({ connected }),
  applySnapshot: (snapshot) =>
    set({
      board: snapshot.board,
      tasks: [...snapshot.tasks].sort((a, b) => a.order - b.order),
      cells: toCellMap(snapshot.cells),
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
            }
          : s,
      )
      return
    }

    if (event.type === 'cell:updated') {
      set((s) => ({
        cells: {
          ...s.cells,
          [cellKey(event.payload.taskId, event.payload.date)]: event.payload,
        },
      }))
      return
    }

    if (event.type === 'task:deleted') {
      set((s) => {
        const nextTasks = s.tasks.filter((t) => t.id !== event.payload.id)
        const nextCells: Record<string, CellRecord> = {}
        for (const [k, v] of Object.entries(s.cells)) {
          if (v.taskId !== event.payload.id) nextCells[k] = v
        }
        return { tasks: nextTasks, cells: nextCells }
      })
      return
    }

    if (event.type === 'task:created') {
      set((s) => {
        if (s.tasks.some((t) => t.id === event.payload.id)) return s
        return {
          tasks: [...s.tasks, event.payload].sort((a, b) => a.order - b.order),
        }
      })
      return
    }

    if (event.type === 'task:updated') {
      set((s) => ({
        tasks: s.tasks
          .map((t) => (t.id === event.payload.id ? event.payload : t))
          .sort((a, b) => a.order - b.order),
      }))
    }
  },
}))
