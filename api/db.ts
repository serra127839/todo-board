import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

sqlite3.verbose()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbFile = path.join(__dirname, 'board.sqlite')

export const db = new sqlite3.Database(dbFile)

export const initDb = (): void => {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        project_name TEXT NOT NULL DEFAULT ""
      )`,
    )

    db.run(`ALTER TABLE boards ADD COLUMN project_name TEXT NOT NULL DEFAULT ""`, () => {})

    db.run(
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        title TEXT NOT NULL,
        owner TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      )`,
    )

    db.run(
      `CREATE TABLE IF NOT EXISTS cells (
        task_id TEXT NOT NULL,
        date TEXT NOT NULL,
        percent INTEGER NOT NULL,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (task_id, date),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`,
    )

    db.run(
      `CREATE INDEX IF NOT EXISTS idx_tasks_board_order ON tasks(board_id, sort_order)`,
    )

    db.run(`CREATE INDEX IF NOT EXISTS idx_cells_date ON cells(date)`)

    const boardId = 'default-board'
    const start = '2026-04-13'
    const end = '2026-04-30'

    db.run(
      `INSERT OR IGNORE INTO boards (id, start_date, end_date)
       VALUES (?, ?, ?)`,
      [boardId, start, end],
    )

    db.run(
      `UPDATE boards
       SET project_name = CASE
         WHEN project_name = '' OR project_name = 'Proyecto' THEN 'Project'
         ELSE project_name
       END
       WHERE id = ?`,
      [boardId],
    )
  })
}
