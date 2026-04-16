import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'
import { run } from '../dbHelpers.js'
import type {
  BoardSnapshot,
  CellStatus,
  CellValue,
  TaskRow,
} from '../../shared/boardTypes.js'
import { publish } from '../realtime/hub.js'
import { getBoard } from '../repositories/boardRepo.js'
import { listTasks, createTask, updateTask, deleteTask, duplicateTask } from '../repositories/tasksRepo.js'
import { listCells, upsertCell } from '../repositories/cellsRepo.js'

const router = Router()

const boardId = 'default-board'

const isPercent = (v: unknown): v is CellValue['percent'] =>
  v === 0 || v === 25 || v === 50 || v === 75 || v === 100

const isStatus = (v: unknown): v is CellStatus =>
  v === 'red' || v === 'yellow' || v === 'green' || v === 'black'

router.get('/board', async (req: Request, res: Response): Promise<void> => {
  try {
    const [board, tasks, cells] = await Promise.all([
      getBoard(boardId),
      listTasks(boardId),
      listCells(boardId),
    ])

    const snapshot: BoardSnapshot = { board, tasks, cells }
    res.status(200).json({ success: true, data: snapshot })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.patch('/board', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectName =
      typeof req.body?.projectName === 'string' ? req.body.projectName.trim() : undefined
    const startDate =
      typeof req.body?.startDate === 'string' ? req.body.startDate.trim() : undefined
    const endDate =
      typeof req.body?.endDate === 'string' ? req.body.endDate.trim() : undefined

    if (projectName === undefined && startDate === undefined && endDate === undefined) {
      res.status(400).json({ success: false, error: 'Invalid payload' })
      return
    }

    const isIsoDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v)

    if (startDate !== undefined && !isIsoDate(startDate)) {
      res.status(400).json({ success: false, error: 'Invalid payload' })
      return
    }
    if (endDate !== undefined && !isIsoDate(endDate)) {
      res.status(400).json({ success: false, error: 'Invalid payload' })
      return
    }

    if (startDate !== undefined && endDate !== undefined) {
      const s = new Date(startDate).getTime()
      const e = new Date(endDate).getTime()
      if (Number.isNaN(s) || Number.isNaN(e) || s > e) {
        res.status(400).json({ success: false, error: 'Invalid date range' })
        return
      }
    }

    const set: string[] = []
    const params: unknown[] = []

    if (projectName !== undefined) {
      await run(
        db,
        `ALTER TABLE boards ADD COLUMN project_name TEXT NOT NULL DEFAULT ""`,
      ).catch(() => {})
      set.push('project_name = ?')
      params.push(projectName)
    }

    if (startDate !== undefined) {
      set.push('start_date = ?')
      params.push(startDate)
    }

    if (endDate !== undefined) {
      set.push('end_date = ?')
      params.push(endDate)
    }

    params.push(boardId)

    await run(
      db,
      `UPDATE boards
       SET ${set.join(', ')}
       WHERE id = ?`,
      params,
    )

    publish({ type: 'board:updated', payload: { projectName, startDate, endDate } })
    res.status(200).json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.post('/tasks', async (req: Request, res: Response): Promise<void> => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const owner = typeof req.body?.owner === 'string' ? req.body.owner.trim() : ''

    if (!title || !owner) {
      res.status(400).json({ success: false, error: 'Invalid payload' })
      return
    }

    const task = await createTask({ boardId, title, owner })
    publish({ type: 'task:created', payload: task })
    res.status(200).json({ success: true, data: task })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.patch('/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : undefined
    const owner = typeof req.body?.owner === 'string' ? req.body.owner.trim() : undefined
    const order = typeof req.body?.order === 'number' ? req.body.order : undefined

    const next = await updateTask({
      id,
      title: title && title.length > 0 ? title : undefined,
      owner: owner && owner.length > 0 ? owner : undefined,
      order,
    })
    publish({ type: 'task:updated', payload: next })
    res.status(200).json({ success: true, data: next })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.post(
  '/tasks/:id/duplicate',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id
      const copyCells = req.body?.copyCells === true
      const task = await duplicateTask({ taskId: id, boardId, copyCells })
      publish({ type: 'task:created', payload: task })
      res.status(200).json({ success: true, data: task })
    } catch (e) {
      res.status(500).json({ success: false, error: 'Server internal error' })
    }
  },
)

router.delete('/tasks/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id
    await deleteTask(id)
    publish({ type: 'task:deleted', payload: { id } })
    res.status(200).json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.put('/cells', async (req: Request, res: Response): Promise<void> => {
  try {
    const taskId = typeof req.body?.taskId === 'string' ? req.body.taskId : ''
    const date = typeof req.body?.date === 'string' ? req.body.date : ''
    const percent = req.body?.percent
    const status = req.body?.status

    if (!taskId || !date || !isPercent(percent) || !isStatus(status)) {
      res.status(400).json({ success: false, error: 'Invalid payload' })
      return
    }

    const updated = await upsertCell({ taskId, date, percent, status })
    publish({ type: 'cell:updated', payload: updated })
    res.status(200).json({ success: true, data: updated })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.get('/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const [board, tasks, cells] = await Promise.all([
      getBoard(boardId),
      listTasks(boardId),
      listCells(boardId),
    ])
    res.status(200).json({ success: true, data: { board, tasks, cells } satisfies BoardSnapshot })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.post('/import', async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = req.body?.snapshot as BoardSnapshot | undefined
    const mode = req.body?.mode === 'merge' ? 'merge' : 'replace'

    if (!snapshot || snapshot.board?.id !== boardId) {
      res.status(400).json({ success: false, error: 'Invalid payload' })
      return
    }

    if (mode === 'replace') {
      await run(db, 'DELETE FROM cells')
      await run(db, 'DELETE FROM tasks')
    }

    const now = new Date().toISOString()
    if (snapshot.board?.projectName) {
      await run(
        db,
        `UPDATE boards
         SET project_name = ?
         WHERE id = ?`,
        [snapshot.board.projectName, boardId],
      )
    }
    const tasks: TaskRow[] = Array.isArray(snapshot.tasks) ? snapshot.tasks : []
    for (const t of tasks) {
      if (!t?.id || !t?.title || !t?.owner) continue
      await run(
        db,
        `INSERT OR REPLACE INTO tasks (id, board_id, title, owner, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [t.id, boardId, t.title, t.owner, t.order ?? 0, now, now],
      )
    }

    const cells = Array.isArray(snapshot.cells) ? snapshot.cells : []
    for (const c of cells) {
      if (!c?.taskId || !c?.date) continue
      if (!isPercent(c.value?.percent) || !isStatus(c.value?.status)) continue
      await run(
        db,
        `INSERT OR REPLACE INTO cells (task_id, date, percent, status, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [c.taskId, c.date, c.value.percent, c.value.status, c.updatedAt ?? now],
      )
    }

    res.status(200).json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

export default router
