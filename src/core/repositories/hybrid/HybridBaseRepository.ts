/**
 * Guru Offline - Hybrid Cloud/Local Repository Implementation
 * Canonical Target: Online-First with Supabase + Offline-Capable with IndexedDB Cache & Mutation Queue
 * Implements IRepository<T> contract seamlessly.
 */

import { BaseIndexedDbRepository } from '../indexeddb/BaseIndexedDbRepository'
import { getSupabaseClient } from '../../supabase/client'
import { pendingMutationQueue } from '../../services/sync/PendingMutationQueue'
import { connectivityManager } from '../../services/sync/ConnectivityManager'

export class HybridBaseRepository<T extends { id: string }> extends BaseIndexedDbRepository<T> {
  protected entityName: string

  constructor(storeName: string, entityName: string) {
    super(storeName)
    this.entityName = entityName
  }

  /**
   * CREATE: Online writes to Supabase first; if offline/error, saves to IndexedDB & enqueues
   */
  public override async create(entity: T): Promise<T> {
    const supabase = getSupabaseClient()
    const isOnline = connectivityManager.isOnline.value

    if (isOnline && supabase) {
      try {
        const snakePayload = this.toSnakeCase(entity)
        const { error } = await supabase.from(this.storeName).insert(snakePayload)

        if (!error) {
          // Server confirmed: write to local IndexedDB cache
          await super.create(entity)
          return entity
        }
        console.warn(`[HybridRepo] Supabase insert failed for ${this.entityName}:`, error)
        if (error.message?.includes('row-level security policy') || error.code === '42501') {
          console.info(
            `[HybridRepo] RLS restricted for ${this.entityName}. Preserving in local IndexedDB without queueing.`
          )
          return await super.create(entity)
        }
      } catch (networkErr) {
        console.warn(
          `[HybridRepo] Network error on insert ${this.entityName}, queueing offline:`,
          networkErr
        )
      }
    }

    // Offline or Supabase unavailable: Save locally in IndexedDB & Enqueue
    const localSaved = await super.create(entity)
    await pendingMutationQueue.enqueue(this.entityName, entity.id, 'CREATE', entity)
    await connectivityManager.refreshPendingCount()
    return localSaved
  }

  /**
   * CREATE BATCH: Fast bulk creation with single batch enqueueing
   */
  public override async createBatch(entities: T[]): Promise<T[]> {
    if (entities.length === 0) return []
    const supabase = getSupabaseClient()
    const isOnline = connectivityManager.isOnline.value

    if (isOnline && supabase) {
      try {
        const snakePayloads = entities.map((e) => this.toSnakeCase(e))
        const { error } = await supabase.from(this.storeName).upsert(snakePayloads)
        if (!error) {
          return await super.createBatch(entities)
        }
        if (error.message?.includes('row-level security policy') || error.code === '42501') {
          return await super.createBatch(entities)
        }
      } catch (networkErr) {
        console.warn(`[HybridRepo] Network error on batch create ${this.entityName}:`, networkErr)
      }
    }

    const localSaved = await super.createBatch(entities)
    const itemsToEnqueue = entities.map((e) => ({
      entity: this.entityName,
      entityId: e.id,
      operation: 'CREATE' as const,
      payload: e
    }))
    await pendingMutationQueue.enqueueBatch(itemsToEnqueue)
    await connectivityManager.refreshPendingCount()
    return localSaved
  }

  /**
   * UPDATE BATCH: Fast bulk update with single batch enqueueing
   */
  public async updateBatch(updatesList: Array<{ id: string; updates: Partial<T> }>): Promise<T[]> {
    if (updatesList.length === 0) return []
    const localUpdated = await super.updateBatch(updatesList)
    const supabase = getSupabaseClient()
    const isOnline = connectivityManager.isOnline.value

    if (isOnline && supabase) {
      try {
        const snakePayloads = localUpdated.map((e) => this.toSnakeCase(e))
        const { error } = await supabase.from(this.storeName).upsert(snakePayloads)
        if (!error) {
          return localUpdated
        }
        if (error.message?.includes('row-level security policy') || error.code === '42501') {
          return localUpdated
        }
      } catch (networkErr) {
        console.warn(`[HybridRepo] Network error on batch update ${this.entityName}:`, networkErr)
      }
    }

    const itemsToEnqueue = localUpdated.map((e) => ({
      entity: this.entityName,
      entityId: e.id,
      operation: 'UPDATE' as const,
      payload: e
    }))
    await pendingMutationQueue.enqueueBatch(itemsToEnqueue)
    await connectivityManager.refreshPendingCount()
    return localUpdated
  }

  /**
   * UPDATE: Online writes to Supabase first; if offline/error, saves to IndexedDB & enqueues
   */
  public override async update(id: string, updates: Partial<T>): Promise<T> {
    const supabase = getSupabaseClient()
    const isOnline = connectivityManager.isOnline.value

    // Apply update to local entity
    const existing = await super.findById(id)
    if (!existing) {
      throw new Error(`Entity ${this.entityName} with id ${id} not found`)
    }
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() }

    if (isOnline && supabase) {
      try {
        const snakePayload = this.toSnakeCase(merged)
        const { error } = await supabase.from(this.storeName).update(snakePayload).eq('id', id)

        if (!error) {
          await super.update(id, updates)
          return merged
        }
        console.warn(`[HybridRepo] Supabase update failed for ${this.entityName}:`, error)
        if (error.message?.includes('row-level security policy') || error.code === '42501') {
          console.info(
            `[HybridRepo] RLS restricted for update on ${this.entityName}. Preserving in local IndexedDB.`
          )
          return await super.update(id, updates)
        }
      } catch (networkErr) {
        console.warn(
          `[HybridRepo] Network error on update ${this.entityName}, queueing offline:`,
          networkErr
        )
      }
    }

    const localUpdated = await super.update(id, updates)
    await pendingMutationQueue.enqueue(this.entityName, id, 'UPDATE', localUpdated)
    await connectivityManager.refreshPendingCount()
    return localUpdated
  }

  /**
   * SAVE (UPSERT)
   */
  public override async save(entity: T): Promise<T> {
    const existing = await super.findById(entity.id)
    if (existing) {
      return this.update(entity.id, entity)
    }
    return this.create(entity)
  }

  /**
   * DELETE
   */
  public override async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient()
    const isOnline = connectivityManager.isOnline.value

    if (isOnline && supabase) {
      try {
        const { error } = await supabase.from(this.storeName).delete().eq('id', id)
        if (!error) {
          return super.delete(id)
        }
      } catch (networkErr) {
        console.warn(
          `[HybridRepo] Network error on delete ${this.entityName}, queueing offline:`,
          networkErr
        )
      }
    }

    const localDeleted = await super.delete(id)
    await pendingMutationQueue.enqueue(this.entityName, id, 'DELETE', { id })
    await connectivityManager.refreshPendingCount()
    return localDeleted
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
