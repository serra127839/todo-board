import { db } from '../db.js'
import { get } from '../dbHelpers.js'
import type { Board } from '../../shared/boardTypes.js'

type BoardRow = {
  id: string
  start_date: string
  end_date: string
  project_name?: string
}

export const getBoard = async (boardId: string): Promise<Board> => {
  let row: BoardRow | undefined
  try {
    row = await get<BoardRow>(
      db,
      `SELECT id, start_date, end_date, project_name FROM boards WHERE id = ?`,
      [boardId],
    )
  } catch (e) {
    row = await get<BoardRow>(
      db,
      `SELECT id, start_date, end_date FROM boards WHERE id = ?`,
      [boardId],
    )
  }

  if (!row) {
    throw new Error('Board not found')
  }

  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    projectName: row.project_name ?? undefined,
  }
}
