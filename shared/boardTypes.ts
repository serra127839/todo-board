export type CellStatus = 'red' | 'yellow' | 'green' | 'black'

export type CellValue = {
  percent: 0 | 25 | 50 | 75 | 100
  status: CellStatus
}

export type Board = {
  id: string
  startDate: string
  endDate: string
  projectName?: string
}

export type TaskRow = {
  id: string
  title: string
  owner: string
  order: number
}

export type CellRecord = {
  taskId: string
  date: string
  value: CellValue
  updatedAt: string
}

export type BoardSnapshot = {
  board: Board
  tasks: TaskRow[]
  cells: CellRecord[]
}
