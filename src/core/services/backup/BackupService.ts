/**
 * Guru Offline - Backup & Restore Service
 * Responsible for generating and restoring database backups.
 */

import { dbManager, STORE_SCHEMAS, DB_VERSION } from '../../db/indexedDb'
import { auditLogService } from '../audit/AuditLogService'
import { authService, AuthorizationError } from '../auth'

export interface BackupPayload {
  backupFormat: string
  backupVersion: number
  appVersion: string
  schemaVersion: string
  createdAt: string
  source: string
  stores: Record<string, any[]>
}

export interface BackupValidationResult {
  valid: boolean
  reason?: string
  preview?: {
    createdAt: string
    appVersion: string
    schemaVersion: string
    storesCount: Record<string, number>
  }
}

export class BackupService {
  /**
   * Create an exported backup file as a JSON payload
   */
  public async createBackup(): Promise<BackupPayload> {
    const session = authService.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new AuthorizationError(
        'Akses ditolak. Pembuatan cadangan data hanya dapat diakses oleh Admin.'
      )
    }

    const db = await dbManager.getDatabase()
    const stores: Record<string, any[]> = {}

    // Read all stores in a single transaction
    const storeNames = STORE_SCHEMAS.map((s) => s.name)
    const transaction = db.transaction(storeNames, 'readonly')

    await Promise.all(
      STORE_SCHEMAS.map((schema) => {
        return new Promise<void>((resolve, reject) => {
          const store = transaction.objectStore(schema.name)
          const request = store.getAll()

          request.onsuccess = () => {
            // For user store, we preserve password hashes (which are safe PBKDF2 hashes, not raw passwords)
            // to allow complete account restoration. Raw passwords are never stored.
            stores[schema.name] = request.result || []
            resolve()
          }

          request.onerror = () => {
            reject(request.error || new Error(`Failed to read store ${schema.name}`))
          }
        })
      })
    )

    const backupPayload: BackupPayload = {
      backupFormat: 'guru-offline-backup',
      backupVersion: 1,
      appVersion: '1.0.0',
      schemaVersion: String(DB_VERSION),
      createdAt: new Date().toISOString(),
      source: 'local-indexeddb',
      stores
    }

    await auditLogService.log({
      action: 'BACKUP_CREATED',
      entityType: 'SYSTEM',
      operation: 'BACKUP',
      result: 'SUCCESS',
      details: {
        storesCount: Object.fromEntries(
          Object.entries(stores).map(([name, list]) => [name, list.length])
        )
      }
    })

    return backupPayload
  }

  /**
   * Validate backup payload JSON structure and versions
   */
  public async validateBackup(payload: any): Promise<BackupValidationResult> {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, reason: 'Payload cadangan harus berupa objek JSON.' }
    }

    if (payload.backupFormat !== 'guru-offline-backup') {
      return { valid: false, reason: 'Format cadangan tidak dikenali atau tidak valid.' }
    }

    if (payload.backupVersion !== 1) {
      return { valid: false, reason: 'Versi cadangan tidak didukung.' }
    }

    if (!payload.stores || typeof payload.stores !== 'object') {
      return { valid: false, reason: 'Data penyimpanan (stores) cadangan tidak ditemukan.' }
    }

    // Ensure all mandatory schemas are validated
    const storesCount: Record<string, number> = {}
    for (const schema of STORE_SCHEMAS) {
      const data = payload.stores[schema.name]
      if (!data || !Array.isArray(data)) {
        return {
          valid: false,
          reason: `Penyimpanan '${schema.name}' tidak ditemukan atau datanya tidak valid.`
        }
      }

      // Check entity structure
      for (const item of data) {
        if (!item || typeof item !== 'object') {
          return { valid: false, reason: `Entitas dalam '${schema.name}' harus berupa objek.` }
        }
        if (!item[schema.keyPath]) {
          return {
            valid: false,
            reason: `Entitas dalam '${schema.name}' tidak memiliki primary key '${schema.keyPath}'.`
          }
        }
      }

      storesCount[schema.name] = data.length
    }

    return {
      valid: true,
      preview: {
        createdAt: payload.createdAt || new Date().toISOString(),
        appVersion: payload.appVersion || '1.0.0',
        schemaVersion: payload.schemaVersion || String(DB_VERSION),
        storesCount
      }
    }
  }

  /**
   * Restore database from backup payload
   */
  public async restoreBackup(payload: BackupPayload): Promise<{
    success: boolean
    stats: Record<string, number>
  }> {
    const session = authService.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new AuthorizationError(
        'Akses ditolak. Pemulihan cadangan data hanya dapat dilakukan oleh Admin.'
      )
    }

    await auditLogService.log({
      action: 'RESTORE_STARTED',
      entityType: 'SYSTEM',
      operation: 'RESTORE',
      result: 'SUCCESS'
    })

    const validation = await this.validateBackup(payload)
    if (!validation.valid) {
      await auditLogService.log({
        action: 'RESTORE_FAILED',
        entityType: 'SYSTEM',
        operation: 'RESTORE',
        result: 'FAILED',
        details: { reason: validation.reason }
      })
      throw new Error(`Cadangan tidak valid: ${validation.reason}`)
    }

    try {
      const db = await dbManager.getDatabase()
      const storeNames = STORE_SCHEMAS.map((s) => s.name)

      // Open readwrite transaction on all stores to achieve atomic-ish replacement
      const transaction = db.transaction(storeNames, 'readwrite')

      const stats: Record<string, number> = {}

      await Promise.all(
        STORE_SCHEMAS.map((schema) => {
          return new Promise<void>((resolve, reject) => {
            const store = transaction.objectStore(schema.name)
            const clearReq = store.clear()

            clearReq.onsuccess = () => {
              const data = payload.stores[schema.name]
              let count = 0

              if (data.length === 0) {
                stats[schema.name] = 0
                resolve()
                return
              }

              data.forEach((item) => {
                const addReq = store.add(item)
                addReq.onsuccess = () => {
                  count++
                  if (count === data.length) {
                    stats[schema.name] = count
                    resolve()
                  }
                }
                addReq.onerror = () => {
                  reject(addReq.error || new Error(`Gagal menulis entitas ke ${schema.name}`))
                }
              })
            }

            clearReq.onerror = () => {
              reject(clearReq.error || new Error(`Gagal membersihkan store ${schema.name}`))
            }
          })
        })
      )

      await auditLogService.log({
        action: 'RESTORE_COMPLETED',
        entityType: 'SYSTEM',
        operation: 'RESTORE',
        result: 'SUCCESS',
        details: { stats }
      })

      return { success: true, stats }
    } catch (err: any) {
      await auditLogService.log({
        action: 'RESTORE_FAILED',
        entityType: 'SYSTEM',
        operation: 'RESTORE',
        result: 'FAILED',
        details: { error: err.message || 'Unknown transaction failure' }
      })
      throw err
    }
  }
}

export const backupService = new BackupService()
