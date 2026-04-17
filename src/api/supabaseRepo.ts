import { supabase } from '@/supabaseClient'
import type { BoardSnapshot } from '../../shared/boardTypes'

export type ProjectRow = {
  id: string
  name: string
  created_at: string
}

export type SnapshotRow = {
  id: string
  project_id: string
  name: string
  created_at: string
}

export async function listProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id,name,created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createProject(name: string): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name })
    .select('id,name,created_at')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function renameProject(projectId: string, name: string): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', projectId)
    .select('id,name,created_at')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function loadProjectState(projectId: string): Promise<BoardSnapshot | null> {
  const { data, error } = await supabase
    .from('project_state')
    .select('data')
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.data as BoardSnapshot | null) ?? null
}

export async function saveProjectState(projectId: string, snapshot: BoardSnapshot): Promise<void> {
  const { error } = await supabase
    .from('project_state')
    .upsert({ project_id: projectId, data: snapshot }, { onConflict: 'project_id' })
  if (error) throw new Error(error.message)
}

export async function listSnapshots(projectId: string): Promise<SnapshotRow[]> {
  const { data, error } = await supabase
    .from('snapshots')
    .select('id,project_id,name,created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createSnapshot(projectId: string, name: string, snapshot: BoardSnapshot): Promise<SnapshotRow> {
  const { data, error } = await supabase
    .from('snapshots')
    .insert({ project_id: projectId, name, data: snapshot })
    .select('id,project_id,name,created_at')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function loadSnapshot(snapshotId: string): Promise<BoardSnapshot> {
  const { data, error } = await supabase
    .from('snapshots')
    .select('data')
    .eq('id', snapshotId)
    .single()
  if (error) throw new Error(error.message)
  return data.data as BoardSnapshot
}
