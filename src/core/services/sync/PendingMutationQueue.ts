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
   * Enqueue a new mutation to be synced to Supabase
   */
  public async enqueue(
    entity: string,
    entityId: string,
    operation: MutationOperation,
    payload: any
  ): Promise<PendingMutationEntity> {
    const db = await indexedDb.getDatabase()
    const now = new Date().toISOString()

    const mutation: PendingMutationEntity = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      entity,
      entityId,
      operation,
      payload,
      retryCount: 0,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_mutations', 'readwrite')
      const store = tx.objectStore('pending_mutations')
      const req = store.put(mutation)

      req.onsuccess = () => resolve(mutation)
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * Get all mutations currently waiting to be synced (ordered by createdAt FIFO)
   */
  public async getPending(): Promise<PendingMutationEntity[]> {
    const db = await indexedDb.getDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_mutations', 'readonly')
      const store = tx.objectStore('pending_mutations')
      const req = store.getAll()

      req.onsuccess = () => {
        const all: PendingMutationEntity[] = req.result || []
        // Filter pending or failed, sorted chronologically
        const filtered = all
          .filter((m) => m.status === 'PENDING' || m.status === 'FAILED')
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
