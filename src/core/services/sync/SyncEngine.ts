/**
 * Guru Offline - Automatic Synchronization Engine
 * Canonical Target: Flushes pending mutations to Supabase with server confirmation,
 * updates local IndexedDB cache, and maintains global sync status.
 */

import { getSupabaseClient } from '../../supabase/client'
import { pendingMutationQueue } from './PendingMutationQueue'
import { connectivityManager } from './ConnectivityManager'
import { indexedDb } from '../../db/indexedDb'
import type { PendingMutationEntity } from '../../types/cloud'

export class SyncEngine {
  private static instance: SyncEngine
  private isProcessing = false

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine()
    }
    return SyncEngine.instance
  }

  constructor() {
    // Automatically register auto-sync handler on connectivity manager
    connectivityManager.registerAutoSyncHandler(async () => {
      await this.processQueue()
    })
  }

  /**
   * Process all pending mutations in the queue sequentially
   */
  public async processQueue(): Promise<{
    processed: number
    succeeded: number
    failed: number
    conflicts: number
  }> {
    if (this.isProcessing) {
      console.log('[SyncEngine] Sync already in progress, skipping.')
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 }
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      // Supabase is not configured or in local offline mode
      console.log('[SyncEngine] Supabase client not configured. Mutations remain safely queued.')
      connectivityManager.setSyncStatus(
        'OFFLINE_PENDING',
        'Supabase belum terkonfigurasi. Data tersimpan di antrean offline.'
      )
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 }
    }

    const pending = await pendingMutationQueue.getPending()
    if (pending.length === 0) {
      connectivityManager.setSyncStatus('ONLINE_SYNCED')
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 }
    }

    this.isProcessing = true
    connectivityManager.setSyncStatus('ONLINE_SYNCING')

    let succeeded = 0
    let failed = 0
    let conflicts = 0

    try {
      for (const mutation of pending) {
        await pendingMutationQueue.markSyncing(mutation.id)

        try {
          const result = await this.syncSingleMutation(supabase, mutation)
          if (result === 'SUCCESS') {
            await pendingMutationQueue.dequeue(mutation.id)
            succeeded++
          } else if (result === 'CONFLICT') {
            conflicts++
          } else {
            failed++
          }
        } catch (err: any) {
          console.error(`[SyncEngine] Error syncing mutation ${mutation.id}:`, err)
          await pendingMutationQueue.markFailed(mutation.id, err.message || 'Network sync error')
          failed++
        }
      }
    } finally {
      this.isProcessing = false
      await connectivityManager.refreshPendingCount()

      if (conflicts > 0) {
        connectivityManager.setSyncStatus(
          'CONFLICT',
          `${conflicts} perubahan memerlukan penyelesaian konflik.`
        )
      } else if (failed > 0) {
        connectivityManager.setSyncStatus(
          'SYNC_ERROR',
          `${failed} perubahan gagal disinkronkan, akan dicoba kembali.`
        )
      } else {
        connectivityManager.setSyncStatus('ONLINE_SYNCED')
      }
    }

    return {
      processed: pending.length,
      succeeded,
      failed,
      conflicts
    }
  }

  /**
   * Sync a single mutation to the Supabase table
   */
  private async syncSingleMutation(
    supabase: any,
    mutation: PendingMutationEntity
  ): Promise<'SUCCESS' | 'CONFLICT' | 'FAILED'> {
    const tableName = this.mapEntityToTable(mutation.entity)
    const { operation, entityId, payload } = mutation

    // Check conflict: fetch current server version if updating
    if (operation === 'UPDATE') {
      const { data: serverRecord, error: fetchErr } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', entityId)
        .single()

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        throw new Error(fetchErr.message)
      }

      if (serverRecord) {
        const serverUpdatedAt = new Date(
          serverRecord.updated_at || serverRecord.updatedAt || 0
        ).getTime()
        const localCreatedAt = new Date(mutation.createdAt).getTime()

        // If server was updated AFTER local mutation was created, we have a conflict
        if (serverUpdatedAt > localCreatedAt) {
          console.warn(`[SyncEngine] Conflict detected on ${mutation.entity} ${entityId}`)
          await pendingMutationQueue.markConflict(mutation.id, serverRecord, payload)
          return 'CONFLICT'
        }
      }
    }

    // Convert camelCase payload to snake_case for PostgreSQL if needed
    const dbPayload = this.toSnakeCase(payload)

    if (operation === 'CREATE') {
      const { error } = await supabase.from(tableName).upsert(dbPayload)
      if (error) throw new Error(error.message)
    } else if (operation === 'UPDATE') {
      const { error } = await supabase.from(tableName).update(dbPayload).eq('id', entityId)
      if (error) throw new Error(error.message)
    } else if (operation === 'DELETE') {
      const { error } = await supabase.from(tableName).delete().eq('id', entityId)
      if (error) throw new Error(error.message)
    }

    // Update local IndexedDB cache with server confirmation
    await this.updateLocalCache(mutation.entity, payload, operation)

    return 'SUCCESS'
  }

  /**
   * Keep local IndexedDB cache in sync with confirmed mutations
   */
  private async updateLocalCache(entity: string, payload: any, operation: string): Promise<void> {
    try {
      const db = await indexedDb.getDatabase()
      const storeName = this.mapEntityToStore(entity)
      if (!storeName || !db.objectStoreNames.contains(storeName)) return

      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)

      if (operation === 'DELETE') {
        if (payload?.id) store.delete(payload.id)
      } else {
        store.put(payload)
      }
    } catch (err) {
      console.warn('[SyncEngine] Local cache update failed:', err)
    }
  }

  private mapEntityToTable(entity: string): string {
    const map: Record<string, string> = {
      user: 'users',
      teacher: 'teachers',
      teacher_assignment: 'teacher_assignments',
      academic_year: 'academic_years',
      academic_period: 'academic_periods',
      major: 'majors',
      class: 'classes',
      subject: 'subjects',
      room: 'rooms',
      student: 'students',
      schedule: 'schedules',
      attendance: 'attendances',
      journal: 'journals',
      assessment: 'assessments',
      discipline: 'discipline_notes',
      announcement: 'announcements',
      agenda: 'school_agendas',
      submission: 'submissions'
    }
    return map[entity.toLowerCase()] || `${entity.toLowerCase()}s`
  }

  private mapEntityToStore(entity: string): string {
    const map: Record<string, string> = {
      user: 'users',
      teacher: 'teachers',
      teacher_assignment: 'teacher_assignments',
      academic_year: 'academic_years',
      academic_period: 'academic_periods',
      major: 'majors',
      class: 'classes',
      subject: 'subjects',
      room: 'rooms',
      student: 'students',
      schedule: 'schedules',
      attendance: 'attendances',
      journal: 'journals',
      assessment: 'assessments',
      discipline: 'discipline_notes',
      announcement: 'announcements',
      agenda: 'school_agendas',
      submission: 'submissions'
    }
    return map[entity.toLowerCase()] || `${entity.toLowerCase()}s`
  }

  private toSnakeCase(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map((v) => this.toSnakeCase(v))

    const snake: any = {}
    for (const [key, val] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      snake[snakeKey] = val
    }
    return snake
  }
}

export const syncEngine = SyncEngine.getInstance()
