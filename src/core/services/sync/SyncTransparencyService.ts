/**
 * Guru Offline - Sync Transparency Service
 * Service layer for monitoring, debugging, filtering and retrying local sync queue operations.
 */

import { repositories } from '../../repositories'
import { authService, AuthorizationError } from '../auth'
import { syncService } from './SyncService'
import type { SyncQueueEntity, SyncItemStatus, SyncEntityType } from '../../types'

export interface SyncTransparencySummary {
  totalPending: number
  processing: number
  successToday: number
  failed: number
  conflict: number
  lastSyncAt: string | null
}

export interface SyncTransparencyFilter {
  status?: SyncItemStatus
  entityType?: SyncEntityType
  search?: string
}

export class SyncTransparencyService {
  private static instance: SyncTransparencyService | null = null

  private constructor() {}

  public static getInstance(): SyncTransparencyService {
    if (!SyncTransparencyService.instance) {
      SyncTransparencyService.instance = new SyncTransparencyService()
    }
    return SyncTransparencyService.instance
  }

  /**
   * Helper to verify if the current session owns a specific sync queue item
   */
  public isItemOwnedBySession(item: SyncQueueEntity, session: any): boolean {
    if (!session) return false
    if (session.role === 'ADMIN') return true // Admin can access everything

    if (!session.teacherId) return false
    const teacherId = session.teacherId
    const username = session.username

    const payload = item.payload || {}
    if (payload.teacherId === teacherId) return true
    if (payload.createdBy === teacherId) return true
    if (payload.createdBy === username) return true
    if (payload.updatedBy === teacherId) return true
    if (payload.updatedBy === username) return true

    return false
  }

  /**
   * Retrieve aggregated sync statistics
   */
  public async getSummary(): Promise<SyncTransparencySummary> {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new AuthorizationError('Sesi tidak valid.')
    }

    const allItems = await repositories.syncQueue.findAll()

    // Filter by role ownership
    const visibleItems = allItems.filter((item) => this.isItemOwnedBySession(item, session))

    const totalPending = visibleItems.filter((i) => i.status === 'PENDING').length
    const processing = visibleItems.filter((i) => i.status === 'SYNCING').length
    const failed = visibleItems.filter((i) => i.status === 'FAILED').length

    // Conflict count is defined as items whose lastError indicates key collision / sync conflict
    const conflict = visibleItems.filter(
      (i) =>
        i.status === 'FAILED' &&
        i.lastError &&
        (i.lastError.toLowerCase().includes('conflict') ||
          i.lastError.toLowerCase().includes('duplicate') ||
          i.lastError.toLowerCase().includes('collision'))
    ).length

    // Today's synced count
    const todayStr = new Date().toISOString().split('T')[0]
    const successToday = visibleItems.filter(
      (i) => i.status === 'SYNCED' && i.syncedAt && i.syncedAt.startsWith(todayStr)
    ).length

    // Get last sync date
    const syncedItems = visibleItems.filter((i) => i.status === 'SYNCED' && i.syncedAt)
    let lastSyncAt: string | null = null
    if (syncedItems.length > 0) {
      syncedItems.sort((a, b) => (b.syncedAt || '').localeCompare(a.syncedAt || ''))
      lastSyncAt = syncedItems[0].syncedAt || null
    }

    return {
      totalPending,
      processing,
      successToday,
      failed,
      conflict,
      lastSyncAt
    }
  }

  /**
   * Get filtered queue list
   */
  public async getQueueItems(filter?: SyncTransparencyFilter): Promise<SyncQueueEntity[]> {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new AuthorizationError('Sesi tidak valid.')
    }

    let items = await repositories.syncQueue.findAll()

    // 1. Filter by ownership
    items = items.filter((item) => this.isItemOwnedBySession(item, session))

    // 2. Filter by status
    if (filter?.status) {
      items = items.filter((item) => item.status === filter.status)
    }

    // 3. Filter by entityType
    if (filter?.entityType) {
      items = items.filter((item) => item.entityType === filter.entityType)
    }

    // 4. Search filter (by entityId, operation, payload contents, or error message)
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      items = items.filter(
        (item) =>
          item.id.toLowerCase().includes(q) ||
          item.entityId.toLowerCase().includes(q) ||
          item.operation.toLowerCase().includes(q) ||
          (item.lastError && item.lastError.toLowerCase().includes(q)) ||
          (item.payload && JSON.stringify(item.payload).toLowerCase().includes(q))
      )
    }

    // Sort by queuedAt descending
    return items.sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))
  }

  /**
   * Retry synchronization of a single failed/pending queue item
   */
  public async retryItem(itemId: string): Promise<{ success: boolean; message: string }> {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new AuthorizationError('Sesi tidak valid.')
    }

    const item = await repositories.syncQueue.findById(itemId)
    if (!item) {
      throw new Error('Item antrean sinkronisasi tidak ditemukan.')
    }

    // Authorization guard
    if (!this.isItemOwnedBySession(item, session)) {
      throw new AuthorizationError(
        'Akses Ditolak: Anda tidak dapat mengulang antrean milik pengguna lain.'
      )
    }

    if (item.status === 'SYNCED') {
      return { success: true, message: 'Item sudah berhasil tersinkronisasi.' }
    }

    try {
      // Execute standard sync single item from syncService
      const result = await syncService.syncSingleItem(item)
      if (result.success) {
        return { success: true, message: 'Sinkronisasi ulang berhasil.' }
      } else {
        return { success: false, message: result.message || 'Gagal sinkronisasi ulang.' }
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Kesalahan jaringan atau server saat sinkronisasi ulang.'
      }
    }
  }

  /**
   * Mass retry of visible failed items
   */
  public async retryAllFailed(): Promise<{ successCount: number; failedCount: number }> {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new AuthorizationError('Sesi tidak valid.')
    }

    const items = await repositories.syncQueue.findAll()
    const visibleFailed = items.filter(
      (item) => item.status === 'FAILED' && this.isItemOwnedBySession(item, session)
    )

    let successCount = 0
    let failedCount = 0

    for (const item of visibleFailed) {
      try {
        const res = await syncService.syncSingleItem(item)
        if (res.success) {
          successCount++
        } else {
          failedCount++
        }
      } catch {
        failedCount++
      }
    }

    return { successCount, failedCount }
  }
}

export const syncTransparencyService = SyncTransparencyService.getInstance()
