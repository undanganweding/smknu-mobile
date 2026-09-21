/**
 * Guru Offline - Sync Service & Offline Engine
 * Handles sync queue tracking, state transitions (PENDING -> SYNCING -> SYNCED / FAILED),
 * real Google Apps Script API dispatch via GasApiClient, idempotency, and reconnect sync.
 */

import { repositories } from '../../repositories'
import { authService } from '../auth/AuthService'
import { gasApiClient } from '../../api/gasApiClient'
import { googleWorkspaceService } from './GoogleWorkspaceService'
import { academicLockGuardService } from '../academic/AcademicLockGuardService'
import type {
  SyncQueueEntity,
  SyncEntityType,
  SyncOperation,
  GasSyncRequestPayload,
  GasSyncResponsePayload
} from '../../types'

export interface SyncStatusSummary {
  totalPending: number
  totalSynced: number
  totalFailed: number
  lastSyncedAt: string | null
  isOnline: boolean
}

export class SyncService {
  private isSyncing = false
  private listenerRegistered = false

  constructor() {
    this.registerOnlineListener()
  }

  /**
   * Auto-register listener for window 'online' event to trigger background sync when reconnected.
   */
  public registerOnlineListener(): void {
    if (this.listenerRegistered) return
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('online', () => {
        console.log('[SyncService] Network connection restored. Auto-draining sync queue...')
        this.syncAll().catch((err) =>
          console.warn('[SyncService] Auto-sync on reconnect failed:', err)
        )
      })
      this.listenerRegistered = true
    }
  }

  /**
   * Enqueue a local mutation into the sync queue.
   * If a pending/failed sync item already exists for this entityType + entityId, it updates it.
   */
  public async enqueue(
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperation,
    payload: any
  ): Promise<SyncQueueEntity> {
    const now = new Date().toISOString()

    const existingItems = await repositories.syncQueue.findByEntity(entityType, entityId)
    const activeItem = existingItems.find(
      (i) => i.status === 'PENDING' || i.status === 'FAILED' || i.status === 'SYNCING'
    )

    if (activeItem) {
      const updated: SyncQueueEntity = {
        ...activeItem,
        operation,
        payload,
        status: 'PENDING',
        queuedAt: now,
        updatedAt: now
      }
      await repositories.syncQueue.update(activeItem.id, updated)
      return updated
    } else {
      const newId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      const newItem: SyncQueueEntity = {
        id: newId,
        entityType,
        entityId,
        operation,
        payload,
        status: 'PENDING',
        attempts: 0,
        queuedAt: now,
        createdAt: now,
        updatedAt: now
      }
      await repositories.syncQueue.create(newItem)
      return newItem
    }
  }

  /**
   * Recover orphaned queue items stuck in SYNCING state from application restart or browser refresh.
   */
  public async recoverOrphanedSyncs(): Promise<number> {
    const all = await repositories.syncQueue.findAll()
    const orphaned = all.filter((i) => i.status === 'SYNCING')
    const now = new Date().toISOString()

    for (const item of orphaned) {
      await repositories.syncQueue.update(item.id, {
        status: 'PENDING',
        updatedAt: now
      })
    }
    return orphaned.length
  }

  /**
   * Get all pending queue items
   */
  public async getPendingItems(): Promise<SyncQueueEntity[]> {
    await this.recoverOrphanedSyncs()
    return repositories.syncQueue.findPending()
  }

  /**
   * Get count of pending + failed sync items needing sync
   */
  public async getPendingCount(): Promise<number> {
    const all = await repositories.syncQueue.findAll()
    return all.filter((i) => i.status === 'PENDING' || i.status === 'FAILED').length
  }

  /**
   * Get complete sync status summary
   */
  public async getSyncStatus(): Promise<SyncStatusSummary> {
    const all = await repositories.syncQueue.findAll()
    const pending = all.filter((i) => i.status === 'PENDING' || i.status === 'SYNCING').length
    const synced = all.filter((i) => i.status === 'SYNCED')
    const failed = all.filter((i) => i.status === 'FAILED').length

    let lastSyncedAt: string | null = null
    if (synced.length > 0) {
      synced.sort((a, b) => (b.syncedAt || '').localeCompare(a.syncedAt || ''))
      lastSyncedAt = synced[0].syncedAt || null
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    return {
      totalPending: pending,
      totalSynced: synced.length,
      totalFailed: failed,
      lastSyncedAt,
      isOnline
    }
  }

  /**
   * Single item processing with state transitions: PENDING -> SYNCING -> SYNCED or FAILED
   */
  public async syncSingleItem(item: SyncQueueEntity): Promise<GasSyncResponsePayload> {
    const now = new Date().toISOString()

    // Sync Queue Safety Check for Locked Semesters
    let isLocked = false
    if (item.payload) {
      if (item.payload.academicYearId) {
        isLocked = await academicLockGuardService.isSemesterLocked(item.payload.academicYearId)
      } else if (item.payload.date) {
        isLocked = await academicLockGuardService.isDateLocked(item.payload.date)
      }
    }

    if (isLocked) {
      await repositories.syncQueue.update(item.id, {
        status: 'FAILED',
        lastError: 'Gagal sinkronisasi: Semester akademik telah dikunci (Locked).',
        updatedAt: now
      })
      return {
        success: false,
        operationId: item.id,
        entityId: item.entityId,
        entityType: item.entityType,
        message: 'Gagal sinkronisasi: Semester akademik telah dikunci (Locked).',
        syncedAt: now
      }
    }

    // 1. Transition state to SYNCING
    const syncingItem: SyncQueueEntity = {
      ...item,
      status: 'SYNCING',
      attempts: item.attempts + 1,
      updatedAt: now
    }
    await repositories.syncQueue.update(item.id, syncingItem)

    // 2. Resolve teacher ID from session or payload
    const session = authService.getCurrentSession()
    const teacherId = item.payload?.teacherId || session?.teacherId || 'unknown_teacher'

    // 3. Construct API Request Payload
    const reqPayload: GasSyncRequestPayload = {
      operationId: item.id,
      operation: item.operation,
      entityType: item.entityType,
      entityId: item.entityId,
      teacherId,
      sessionToken: session?.sessionId,
      payload: item.payload,
      clientTimestamp: item.queuedAt
    }

    // 4. Send API request to Google Apps Script or Native Workspace API
    let response: GasSyncResponsePayload
    if (googleWorkspaceService.isEnabled()) {
      try {
        const nativeRes = await googleWorkspaceService.syncMutationNatively(reqPayload)
        response = {
          success: nativeRes.success,
          operationId: item.id,
          entityId: item.entityId,
          entityType: item.entityType,
          message: 'Synced successfully via native workspace API.',
          syncedAt: nativeRes.syncedAt
        }
      } catch (err: any) {
        response = {
          success: false,
          operationId: item.id,
          entityId: item.entityId,
          entityType: item.entityType,
          message: err.message || 'Gagal tersimpan ke Google Sheets melalui native integration.',
          errorCode: 'SERVER_ERROR',
          isRetryable: true,
          syncedAt: now
        }
      }
    } else {
      response = await gasApiClient.sendMutation(reqPayload)
    }

    // 5. Transition state based on API response
    if (response.success) {
      await repositories.syncQueue.update(item.id, {
        status: 'SYNCED',
        syncedAt: response.syncedAt || now,
        lastError: undefined,
        updatedAt: now
      })
    } else {
      await repositories.syncQueue.update(item.id, {
        status: 'FAILED',
        lastError: response.message || 'Gagal tersimpan ke server cloud.',
        updatedAt: now
      })
    }

    return response
  }

  /**
   * Process and sync all pending and retryable failed queue items
   */
  public async syncAll(): Promise<{
    syncedCount: number
    failedCount: number
    errors: string[]
  }> {
    if (this.isSyncing) {
      return { syncedCount: 0, failedCount: 0, errors: ['Proses sinkronisasi sedang berjalan.'] }
    }

    this.isSyncing = true
    let syncedCount = 0
    let failedCount = 0
    const errors: string[] = []

    try {
      await this.recoverOrphanedSyncs()
      const all = await repositories.syncQueue.findAll()
      const processable = all.filter((i) => i.status === 'PENDING' || i.status === 'FAILED')

      // Process items sequentially to preserve dependency ordering
      for (const item of processable) {
        try {
          const res = await this.syncSingleItem(item)
          if (res.success) {
            syncedCount++
          } else {
            failedCount++
            errors.push(`${item.entityType} (${item.entityId}): ${res.message}`)
          }
        } catch (err: any) {
          failedCount++
          const msg = err?.message || 'Kesalahan jaringan atau server.'
          errors.push(`${item.entityType} (${item.entityId}): ${msg}`)
          await repositories.syncQueue.update(item.id, {
            status: 'FAILED',
            lastError: msg,
            updatedAt: new Date().toISOString()
          })
        }
      }
    } finally {
      this.isSyncing = false
    }

    return {
      syncedCount,
      failedCount,
      errors
    }
  }
}

export const syncService = new SyncService()
