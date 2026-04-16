import type { BoardSnapshot, CellRecord, CellStatus, TaskRow } from '../../shared/boardTypes'
import { getStoredToken } from '@/stores/authStore'

type ApiOk<T> = { success: true; data: T }
type ApiErr = { success: false; error: string }
type ApiResponse<T> = ApiOk<T> | ApiErr

const request = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> => {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(getStoredToken()
        ? { Authorization: `Bearer ${getStoredToken()}` }
        : {}),
      ...(init?.headers ?? {}),
    },
  })

  const json = (await res.json()) as ApiResponse<T>
  if (json.success !== true) throw new Error((json as ApiErr).error)
  return json.data
}

export const fetchBoard = async (): Promise<BoardSnapshot> =>
  request<BoardSnapshot>('/api/board')

export const patchBoardApi = async (input: {
  projectName?: string
  startDate?: string
  endDate?: string
}): Promise<void> => {
  await request<void>('/api/board', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export const createTaskApi = async (input: {
  title: string
  owner: string
}): Promise<TaskRow> =>
  request<TaskRow>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const patchTaskApi = async (
  id: string,
  input: { title?: string; owner?: string; order?: number },
): Promise<TaskRow> =>
  request<TaskRow>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

export const deleteTaskApi = async (id: string): Promise<void> => {
  await request<void>(`/api/tasks/${id}`, { method: 'DELETE' })
}

export const duplicateTaskApi = async (
  id: string,
  copyCells: boolean,
): Promise<TaskRow> =>
  request<TaskRow>(`/api/tasks/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ copyCells }),
  })

export const putCellApi = async (input: {
  taskId: string
  date: string
  percent: 0 | 25 | 50 | 75 | 100
  status: CellStatus
}): Promise<CellRecord> =>
  request<CellRecord>('/api/cells', {
    method: 'PUT',
    body: JSON.stringify(input),
  })

export const exportBoardApi = async (): Promise<BoardSnapshot> =>
  request<BoardSnapshot>('/api/export')

export const importBoardApi = async (snapshot: BoardSnapshot): Promise<void> => {
  await request<void>('/api/import', {
    method: 'POST',
    body: JSON.stringify({ mode: 'replace', snapshot }),
  })
}
