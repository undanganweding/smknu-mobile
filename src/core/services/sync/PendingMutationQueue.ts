/**
 * Guru Offline - Persistent Pending Mutation Queue
 * Canonical Target: Guaranteed offline persistence in IndexedDB
 * Survives page reloads, browser closes, and restarts.
 */

import { indexedDb } from '../../db/indexedDb'
import type {
  PendingMutationEntity,
  MutationOperation,
  MutationStatus,
  ConflictRecord
} from '../../types/cloud'

export class PendingMutationQueue {
  private static instance: PendingMutationQueue

  public static getInstance(): PendingMutationQueue {
    if (!PendingMutationQueue.instance) {
      PendingMutationQueue.instance = new PendingMutationQueue()
    }
    return PendingMutationQueue.instance
  }

  /**
   * Enqueue a batch of mutations in a SINGLE transaction for ultra-fast bulk operations
   */
  public async enqueueBatch(
    items: Array<{
      entity: string
      entityId: string
      operation: MutationOperation
      payload: any
    }>
  ): Promise<PendingMutationEntity[]> {
    if (items.length === 0) return []
    const db = await indexedDb.getDatabase()
    const now = new Date().toISOString()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_mutations', 'readwrite')
      const store = tx.objectStore('pending_mutations')
      const getAllReq = store.getAll()

      getAllReq.onsuccess = () => {
        const all: PendingMutationEntity[] = getAllReq.result || []
        const existingMap = new Map<string, PendingMutationEntity>()

        all.forEach((m) => {
          if (m.status === 'PENDING' || m.status === 'FAILED') {
            const key = `${m.entity.toLowerCase()}:${m.entityId}`
            existingMap.set(key, m)
          }
        })

        const results: PendingMutationEntity[] = []

        for (const item of items) {
          const key = `${item.entity.toLowerCase()}:${item.entityId}`
          const existing = existingMap.get(key)

          if (existing) {
            if (item.operation === 'DELETE' && existing.operation === 'CREATE') {
              store.delete(existing.id)
              existingMap.delete(key)
              continue
            }

            existing.payload = item.payload
            existing.updatedAt = now
            existing.status = 'PENDING'
            existing.retryCount = 0
            if (item.operation === 'DELETE') {
              existing.operation = 'DELETE'
            }
            store.put(existing)
            results.push(existing)
          } else {
            const mutation: PendingMutationEntity = {
              id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 5)}`,
              entity: item.entity,
              entityId: item.entityId,
              operation: item.operation,
              payload: item.payload,
              retryCount: 0,
              status: 'PENDING',
              createdAt: now,
              updatedAt: now
            }
            store.put(mutation)
            existingMap.set(key, mutation)
            results.push(mutation)
          }
        }

        tx.oncomplete = () => resolve(results)
        tx.onerror = () => reject(tx.error)
      }

      getAllReq.onerror = () => reject(getAllReq.error)
    })
  }

  /**
   * Enqueue a new mutation to be synced to Supabase (with automatic consolidation)
   */
  public async enqueue(
    entity: string,
    entityId: string,
    operation: MutationOperation,
    payload: any
  ): Promise<PendingMutationEntity> {
    const batchRes = await this.enqueueBatch([{ entity, entityId, operation, payload }])
    return (
      batchRes[0] || {
        id: `mut_${Date.now()}`,
        entity,
        entityId,
        operation,
        payload,
        retryCount: 0,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    )
  }

  /**
   * Automatically prune mutations that violate RLS or are invalid system seed duplicates
   */
  public async pruneRlsAndStaleMutations(): Promise<number> {
    try {
      const db = await indexedDb.getDatabase()
      return new Promise((resolve, reject) => {
        const tx = db.transaction('pending_mutations', 'readwrite')
        const store = tx.objectStore('pending_mutations')
        const getAllReq = store.getAll()

        getAllReq.onsuccess = () => {
          const all: PendingMutationEntity[] = getAllReq.result || []
          let removed = 0
          for (const m of all) {
            const errMsg = (m.error || '').toLowerCase()
            const isRls =
              errMsg.includes('row-level security') ||
              errMsg.includes('rls') ||
              errMsg.includes('42501') ||
              errMsg.includes('permission denied')
            const isAutoStudentSeed =
              m.entity?.toLowerCase() === 'student' &&
              typeof m.entityId === 'string' &&
              m.entityId.startsWith('std_')
            if (isRls || isAutoStudentSeed) {
              store.delete(m.id)
              removed++
            }
          }
          resolve(removed)
        }
        getAllReq.onerror = () => reject(getAllReq.error)
      })
    } catch {
      return 0
    }
  }

  /**
   * Get all mutations currently waiting to be synced (ordered by createdAt FIFO)
   */
  public async getPending(): Promise<PendingMutationEntity[]> {
    await this.pruneRlsAndStaleMutations()
    const db = await indexedDb.getDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_mutations', 'readonly')
      const store = tx.objectStore('pending_mutations')
      const req = store.getAll()

      req.onsuccess = () => {
        const all: PendingMutationEntity[] = req.result || []
        // Filter pending or failed with reasonable retry count (< 5)
        const filtered = all
          .filter(
            (m) =>
              (m.status === 'PENDING' || m.status === 'FAILED') &&
              (m.retryCount || 0) < 5 &&
              !m.error?.toLowerCase().includes('row-level security') &&
              !m.error?.toLowerCase().includes('rls')
          )
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        resolve(filtered)
      }
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * Get count of all unsynced mutations
   */
  public async getPendingCount(): Promise<number> {
    const pending = await this.getPending()
    return pending.length
  }

  /**
   * Mark a mutation as currently being processed
   */
  public async markSyncing(id: string): Promise<void> {
    await this.updateStatus(id, 'SYNCING')
  }

  /**
   * Mark a mutation as failed with error and increment retry count
   */
  public async markFailed(id: string, error: string): Promise<void> {
    const db = await indexedDb.getDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_mutations', 'readwrite')
      const store = tx.objectStore('pending_mutations')
      const getReq = store.get(id)

      getReq.onsuccess = () => {
        const item: PendingMutationEntity | undefined = getReq.result
        if (item) {
          item.status = 'FAILED'
          item.error = error
          item.retryCount = (item.retryCount || 0) + 1
          item.updatedAt = new Date().toISOString()
          const putReq = store.put(item)
          putReq.onsuccess = () => resolve()
          putReq.onerror = () => reject(putReq.error)
        } else {
          resolve()
        }
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  /**
   * Mark a mutation as conflicted and record the conflict detail
   */
  public async markConflict(mutationId: string, serverState: any, localState: any): Promise<void> {
    const db = await indexedDb.getDatabase()
    await this.updateStatus(mutationId, 'CONFLICT')

    const conflict: ConflictRecord = {
      id: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      mutationId,
      entity: localState?.entity || 'unknown',
      entityId: localState?.id || mutationId,
      serverState,
      localState,
      detectedAt: new Date().toISOString(),
      resolved: false
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('conflicts', 'readwrite')
      const store = tx.objectStore('conflicts')
      const req = store.put(conflict)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * Remove mutation after server confirmation (Server-Confirmed)
   */
  public async dequeue(id: string): Promise<void> {
    const db = await indexedDb.getDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_mutations', 'readwrite')
      const store = tx.objectStore('pending_mutations')
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * Helper to update mutation status
   */
  private async updateStatus(id: string, status: MutationStatus): Promise<void> {
    const db = await indexedDb.getDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_mutations', 'readwrite')
      const store = tx.objectStore('pending_mutations')
      const getReq = store.get(id)

      getReq.onsuccess = () => {
        const item: PendingMutationEntity | undefined = getReq.result
        if (item) {
          item.status = status
          item.updatedAt = new Date().toISOString()
          const putReq = store.put(item)
          putReq.onsuccess = () => resolve()
          putReq.onerror = () => reject(putReq.error)
        } else {
          resolve()
        }
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  /**
   * Clear all mutations (admin maintenance only)
   */
  public async clear(): Promise<void> {
    const db = await indexedDb.getDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_mutations', 'readwrite')
      const store = tx.objectStore('pending_mutations')
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }
}

export const pendingMutationQueue = PendingMutationQueue.getInstance()
