import crypto from 'crypto'
import { db } from '../db.js'
import { all, get, run } from '../dbHelpers.js'
import type { TaskRow } from '../../shared/boardTypes.js'

type TaskDbRow = {
  id: string
  title: string
  owner: string
  sort_order: number
}

export const listTasks = async (boardId: string): Promise<TaskRow[]> => {
  const rows = await all<TaskDbRow>(
    db,
    `SELECT id, title, owner, sort_order
     FROM tasks
     WHERE board_id = ?
     ORDER BY sort_order ASC`,
    [boardId],
  )

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    owner: r.owner,
    order: r.sort_order,
  }))
}

export const createTask = async (input: {
  boardId: string
  title: string
  owner: string
}): Promise<TaskRow> => {
  const now = new Date().toISOString()
  const last = await get<{ max_order: number | null }>(
    db,
    `SELECT MAX(sort_order) as max_order FROM tasks WHERE board_id = ?`,
    [input.boardId],
  )
  const nextOrder = (last?.max_order ?? -1) + 1
  const id = crypto.randomUUID()

  await run(
    db,
    `INSERT INTO tasks (id, board_id, title, owner, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.boardId, input.title, input.owner, nextOrder, now, now],
  )

  return { id, title: input.title, owner: input.owner, order: nextOrder }
}

export const updateTask = async (input: {
  id: string
  title?: string
  owner?: string
  order?: number
}): Promise<TaskRow> => {
  const existing = await get<{
    id: string
    title: string
    owner: string
    sort_order: number
  }>(db, `SELECT id, title, owner, sort_order FROM tasks WHERE id = ?`, [
    input.id,
  ])

  if (!existing) throw new Error('Task not found')

  const now = new Date().toISOString()
  const nextTitle = input.title ?? existing.title
  const nextOwner = input.owner ?? existing.owner
  const nextOrder = input.order ?? existing.sort_order

  await run(
    db,
    `UPDATE tasks
     SET title = ?, owner = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
    [nextTitle, nextOwner, nextOrder, now, input.id],
  )

  return { id: input.id, title: nextTitle, owner: nextOwner, order: nextOrder }
}

export const deleteTask = async (taskId: string): Promise<void> => {
  await run(db, `DELETE FROM tasks WHERE id = ?`, [taskId])
}

export const duplicateTask = async (input: {
  taskId: string
  boardId: string
  copyCells: boolean
}): Promise<TaskRow> => {
  const existing = await get<{
    id: string
    title: string
    owner: string
  }>(db, `SELECT id, title, owner FROM tasks WHERE id = ?`, [input.taskId])
  if (!existing) throw new Error('Task not found')

  const created = await createTask({
    boardId: input.boardId,
    title: existing.title,
    owner: existing.owner,
  })

  if (input.copyCells) {
    const now = new Date().toISOString()
    await run(
      db,
      `INSERT INTO cells (task_id, date, percent, status, updated_at)
       SELECT ?, date, percent, status, ?
       FROM cells
       WHERE task_id = ?`,
      [created.id, now, input.taskId],
    )
  }

  return created
}

