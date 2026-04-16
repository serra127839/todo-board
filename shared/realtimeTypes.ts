import type { CellRecord, TaskRow } from './boardTypes.js'

export type RealtimeEvent =
  | {
      type: 'board:updated'
      payload: { projectName?: string; startDate?: string; endDate?: string }
    }
  | { type: 'cell:updated'; payload: CellRecord }
  | { type: 'task:created'; payload: TaskRow }
  | { type: 'task:updated'; payload: TaskRow }
  | { type: 'task:deleted'; payload: { id: string } }
