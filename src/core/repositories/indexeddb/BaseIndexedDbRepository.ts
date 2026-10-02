/**
 * Guru Offline - Base IndexedDB Repository Implementation
 * Provides standard CRUD, transaction management, filtering, and indexed querying
 */

import { dbManager } from '../../db/indexedDb'
import type { IRepository, QueryFilter } from '../interfaces/IRepository'

export class BaseIndexedDbRepository<T extends { id: string }> implements IRepository<T> {
  protected storeName: string
  protected memoryCache: Map<string, T> = new Map()
  protected isCacheLoaded = false

  constructor(storeName: string) {
    this.storeName = storeName
  }

  protected async getStore(
    mode: IDBTransactionMode
  ): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
    const db = await dbManager.getDatabase()
    const tx = db.transaction(this.storeName, mode)
    const store = tx.objectStore(this.storeName)
    return { store, tx }
  }

  public async findById(id: string): Promise<T | null> {
    if (this.isCacheLoaded && this.memoryCache.has(id)) {
      return this.memoryCache.get(id) || null
    }

    const { store } = await this.getStore('readonly')
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => {
        const item = (request.result as T) || null
        if (item) {
          this.memoryCache.set(item.id, item)
        }
        resolve(item)
      }
      request.onerror = () => reject(request.error)
    })
  }

  public async findAll(filter?: QueryFilter<T>): Promise<T[]> {
    if (this.isCacheLoaded) {
      let results = Array.from(this.memoryCache.values())

      if (filter?.where) {
        if (typeof filter.where === 'function') {
          results = results.filter(filter.where)
        } else {
          const whereObj = filter.where as Record<string, unknown>
          results = results.filter((item) => {
            const itemObj = item as Record<string, unknown>
            return Object.entries(whereObj).every(([k, v]) => itemObj[k] === v)
          })
        }
      }

      if (filter?.orderBy) {
        const key = filter.orderBy as string
        const direction = filter.orderDirection === 'desc' ? -1 : 1
        results.sort((a, b) => {
          const valA = (a as Record<string, unknown>)[key]
          const valB = (b as Record<string, unknown>)[key]
          if (valA === valB) return 0
          if (valA === undefined || valA === null) return 1
          if (valB === undefined || valB === null) return -1
          return (valA as number) > (valB as number) ? direction : -direction
        })
      }

      if (filter?.offset || filter?.limit) {
        const offset = filter.offset || 0
        const limit = filter.limit !== undefined ? offset + filter.limit : undefined
        results = results.slice(offset, limit)
      }

      return results
    }

    const { store } = await this.getStore('readonly')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const rawResults = (request.result as T[]) || []
        this.memoryCache.clear()
        for (const item of rawResults) {
          if (item?.id) {
            this.memoryCache.set(item.id, item)
          }
        }
        this.isCacheLoaded = true

        let results = [...rawResults]

        if (filter?.where) {
          if (typeof filter.where === 'function') {
            results = results.filter(filter.where)
          } else {
            const whereObj = filter.where as Record<string, unknown>
            results = results.filter((item) => {
              const itemObj = item as Record<string, unknown>
              return Object.entries(whereObj).every(([k, v]) => itemObj[k] === v)
            })
          }
        }

        if (filter?.orderBy) {
          const key = filter.orderBy as string
          const direction = filter.orderDirection === 'desc' ? -1 : 1
          results.sort((a, b) => {
            const valA = (a as Record<string, unknown>)[key]
            const valB = (b as Record<string, unknown>)[key]
            if (valA === valB) return 0
            if (valA === undefined || valA === null) return 1
            if (valB === undefined || valB === null) return -1
            return (valA as number) > (valB as number) ? direction : -direction
          })
        }

        if (filter?.offset || filter?.limit) {
          const offset = filter.offset || 0
          const limit = filter.limit !== undefined ? offset + filter.limit : undefined
          results = results.slice(offset, limit)
        }

        resolve(results)
      }
      request.onerror = () => reject(request.error)
    })
  }

  public async findByIndex(indexName: string, value: IDBValidKey | IDBKeyRange): Promise<T[]> {
    if (this.isCacheLoaded && typeof value !== 'object') {
      const results = Array.from(this.memoryCache.values()).filter(
        (item) => (item as Record<string, unknown>)[indexName] === value
      )
      if (results.length > 0 || this.memoryCache.size > 0) {
        return results
      }
    }

    const { store } = await this.getStore('readonly')
    return new Promise((resolve, reject) => {
      if (!store.indexNames.contains(indexName)) {
        reject(new Error(`Index '${indexName}' does not exist on store '${this.storeName}'`))
        return
      }
      const index = store.index(indexName)
      const request = index.getAll(value)
      request.onsuccess = () => {
        const items = (request.result as T[]) || []
        items.forEach((item) => {
          if (item?.id) this.memoryCache.set(item.id, item)
        })
        resolve(items)
      }
      request.onerror = () => reject(request.error)
    })
  }

  public async findOneByIndex(indexName: string, value: IDBValidKey): Promise<T | null> {
    if (this.isCacheLoaded) {
      const match = Array.from(this.memoryCache.values()).find(
        (item) => (item as Record<string, unknown>)[indexName] === value
      )
      if (match) return match
    }

    const { store } = await this.getStore('readonly')
    return new Promise((resolve, reject) => {
      if (!store.indexNames.contains(indexName)) {
        reject(new Error(`Index '${indexName}' does not exist on store '${this.storeName}'`))
        return
      }
      const index = store.index(indexName)
      const request = index.get(value)
      request.onsuccess = () => {
        const item = (request.result as T) || null
        if (item) {
          this.memoryCache.set(item.id, item)
        }
        resolve(item)
      }
      request.onerror = () => reject(request.error)
    })
  }

  public async create(entity: T): Promise<T> {
    const { store } = await this.getStore('readwrite')
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString()
      const recordId =
        (entity as { id?: string }).id ||
        `${this.storeName.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      const record = {
        ...entity,
        id: recordId,
        createdAt: (entity as { createdAt?: string }).createdAt || now,
        updatedAt: now
      }
      const request = store.put(record)
      request.onsuccess = () => {
        this.memoryCache.set(record.id, record)
        resolve(record)
      }
      request.onerror = () => {
        console.error(
          `[BaseIndexedDbRepository] store.put error in ${this.storeName}:`,
          record,
          request.error
        )
        reject(request.error)
      }
    })
  }

  public async createBatch(entities: T[]): Promise<T[]> {
    if (entities.length === 0) return []
    const db = await dbManager.getDatabase()
    const tx = db.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)

    const now = new Date().toISOString()
    const savedRecords: T[] = []

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        savedRecords.forEach((r) => this.memoryCache.set(r.id, r))
        resolve(savedRecords)
      }
      tx.onerror = () => reject(tx.error)
      tx.onabort = () =>
        reject(new Error(`Transaction aborted for batch create in ${this.storeName}`))

      for (const entity of entities) {
        const record = {
          ...entity,
          createdAt: (entity as { createdAt?: string }).createdAt || now,
          updatedAt: now
        }
        try {
          const req = store.put(record)
          req.onerror = () => {
            console.error(
              `[BaseIndexedDbRepository] Failed put in ${this.storeName}:`,
              record,
              req.error
            )
          }
        } catch (err) {
          console.error(
            `[BaseIndexedDbRepository] Exception putting in ${this.storeName}:`,
            record,
            err
          )
          throw err
        }
        savedRecords.push(record)
      }
    })
  }

  public async updateBatch(updatesList: Array<{ id: string; updates: Partial<T> }>): Promise<T[]> {
    if (updatesList.length === 0) return []
    const db = await dbManager.getDatabase()
    const tx = db.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)

    const now = new Date().toISOString()
    const updatedRecords: T[] = []

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        updatedRecords.forEach((r) => this.memoryCache.set(r.id, r))
        resolve(updatedRecords)
      }
      tx.onerror = () => reject(tx.error)
      tx.onabort = () =>
        reject(new Error(`Transaction aborted for batch update in ${this.storeName}`))

      for (const item of updatesList) {
        const getReq = store.get(item.id)
        getReq.onsuccess = () => {
          const current = getReq.result as T | undefined
          if (current) {
            const updatedRecord: T = {
              ...current,
              ...item.updates,
              id: item.id,
              updatedAt: now
            }
            store.put(updatedRecord)
            updatedRecords.push(updatedRecord)
          }
        }
      }
    })
  }

  public async update(id: string, updates: Partial<T>): Promise<T> {
    const db = await dbManager.getDatabase()
    const tx = db.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)

    return new Promise((resolve, reject) => {
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        const current = getReq.result as T | undefined
        if (!current) {
          reject(new Error(`Record with id ${id} not found in ${this.storeName}`))
          return
        }
        const updated: T = {
          ...current,
          ...updates,
          id,
          updatedAt: new Date().toISOString()
        }
        const putReq = store.put(updated)
        putReq.onsuccess = () => {
          this.memoryCache.set(id, updated)
          resolve(updated)
        }
        putReq.onerror = () => reject(putReq.error)
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  public async save(entity: T): Promise<T> {
    const { store } = await this.getStore('readwrite')
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString()
      const recordId =
        (entity as { id?: string }).id ||
        `${this.storeName.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      const record = {
        ...entity,
        id: recordId,
        createdAt: (entity as { createdAt?: string }).createdAt || now,
        updatedAt: now
      } as T
      const request = store.put(record)
      request.onsuccess = () => {
        this.memoryCache.set(record.id, record)
        resolve(record)
      }
      request.onerror = () => reject(request.error)
    })
  }

  public async delete(id: string): Promise<boolean> {
    const { store } = await this.getStore('readwrite')
    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => {
        this.memoryCache.delete(id)
        resolve(true)
      }
      request.onerror = () => reject(request.error)
    })
  }

  public async count(filter?: QueryFilter<T>): Promise<number> {
    if (!filter && this.isCacheLoaded) {
      return this.memoryCache.size
    }
    if (!filter) {
      const { store } = await this.getStore('readonly')
      return new Promise((resolve, reject) => {
        const request = store.count()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    }
    const items = await this.findAll(filter)
    return items.length
  }

  public async clear(): Promise<void> {
    const { store } = await this.getStore('readwrite')
    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => {
        this.memoryCache.clear()
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }
}
