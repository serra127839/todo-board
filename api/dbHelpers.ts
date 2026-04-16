import type sqlite3 from 'sqlite3'

export const run = (
  db: sqlite3.Database,
  sql: string,
  params: unknown[] = [],
): Promise<void> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

export const get = <T>(
  db: sqlite3.Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row as T | undefined)
    })
  })

export const all = <T>(
  db: sqlite3.Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve((rows as T[]) ?? [])
    })
  })

