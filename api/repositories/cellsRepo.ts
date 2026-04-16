import { db } from '../db.js'
import { all, run } from '../dbHelpers.js'
import type { CellRecord, CellStatus } from '../../shared/boardTypes.js'

type CellDbRow = {
  task_id: string
  date: string
  percent: number
  status: string
  updated_at: string
}

const isStatus = (s: string): s is CellStatus =>
  s === 'red' || s === 'yellow' || s === 'green' || s === 'black'

const toCellRecord = (r: CellDbRow): CellRecord => ({
  taskId: r.task_id,
  date: r.date,
  value: {
    percent: (r.percent as 0 | 25 | 50 | 75 | 100) ?? 0,
    status: isStatus(r.status) ? r.status : 'green',
  },
  updatedAt: r.updated_at,
})

export const listCells = async (boardId: string): Promise<CellRecord[]> => {
  const rows = await all<CellDbRow>(
    db,
    `SELECT c.task_id, c.date, c.percent, c.status, c.updated_at
     FROM cells c
     JOIN tasks t ON t.id = c.task_id
     WHERE t.board_id = ?`,
    [boardId],
  )

  return rows.map(toCellRecord)
}

export const upsertCell = async (input: {
  taskId: string
  date: string
  percent: 0 | 25 | 50 | 75 | 100
  status: CellStatus
}): Promise<CellRecord> => {
  const now = new Date().toISOString()
  await run(
    db,
    `INSERT INTO cells (task_id, date, percent, status, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(task_id, date) DO UPDATE SET
       percent = excluded.percent,
       status = excluded.status,
       updated_at = excluded.updated_at`,
    [input.taskId, input.date, input.percent, input.status, now],
  )

  return {
    taskId: input.taskId,
    date: input.date,
    value: { percent: input.percent, status: input.status },
    updatedAt: now,
  }
}

