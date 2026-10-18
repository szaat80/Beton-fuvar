import type { SupabaseClient } from '@supabase/supabase-js'
import type { Adatmentes } from './storage'

export interface CloudBackupRow {
  backup: unknown
  updated_at: string
}

export interface SyncMarker {
  snapshot: string
  updatedAt: string
}

export type SyncDecision = 'unchanged' | 'upload-local' | 'download-cloud' | 'initial-choice' | 'conflict'

export function backupSnapshot(backup: Adatmentes): string {
  return JSON.stringify(backup.adatok)
}

export function syncDontes(
  local: Adatmentes,
  cloud: CloudBackupRow | null,
  marker: SyncMarker | null
): SyncDecision {
  if (!cloud) return 'upload-local'
  if (!marker) return 'initial-choice'

  const localChanged = backupSnapshot(local) !== marker.snapshot
  const cloudChanged = cloud.updated_at !== marker.updatedAt
  if (localChanged && cloudChanged) return 'conflict'
  if (localChanged) return 'upload-local'
  if (cloudChanged) return 'download-cloud'
  return 'unchanged'
}

export async function cloudBackupBetoltese(
  client: SupabaseClient,
  userId: string
): Promise<CloudBackupRow | null> {
  const { data, error } = await client
    .from('app_sync_data')
    .select('backup, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Nem sikerült lekérni a felhőmentést: ${error.message}`)
  return data as CloudBackupRow | null
}

export async function cloudBackupMentese(
  client: SupabaseClient,
  userId: string,
  backup: Adatmentes,
  expectedUpdatedAt: string | null
): Promise<CloudBackupRow | null> {
  const updatedAt = new Date(Math.max(Date.now(), expectedUpdatedAt ? Date.parse(expectedUpdatedAt) + 1 : 0)).toISOString()
  if (expectedUpdatedAt === null) {
    const { data, error } = await client
      .from('app_sync_data')
      .insert({ user_id: userId, backup, updated_at: updatedAt })
      .select('backup, updated_at')
      .maybeSingle()
    if (error) {
      if (error.code === '23505') return null
      throw new Error(`Nem sikerült feltölteni a felhőmentést: ${error.message}`)
    }
    if (!data) throw new Error('A felhőmentés feltöltése nem adott vissza mentett adatot.')
    return data as CloudBackupRow
  }

  const { data, error } = await client
    .from('app_sync_data')
    .update({ backup, updated_at: updatedAt })
    .eq('user_id', userId)
    .eq('updated_at', expectedUpdatedAt)
    .select('backup, updated_at')
    .maybeSingle()
  if (error) throw new Error(`Nem sikerült frissíteni a felhőmentést: ${error.message}`)
  return data as CloudBackupRow | null
}
