/**
 * Guru Offline - Audit Log Service
 * Handles recording and querying audit trail entries for administrative operations.
 */

import { repositories } from '../../repositories'
import { authService, AuthorizationError } from '../auth'
import type { AuditLogEntity, UserRole } from '../../types'

export interface LogAuditOptions {
  action: string
  entityType: string
  affectedIds?: string[]
  operation: string
  result?: 'SUCCESS' | 'FAILED'
  source?: string
  details?: Record<string, any>
}

export class AuditLogService {
  /**
   * Record a new audit log entry
   */
  public async log(options: LogAuditOptions): Promise<AuditLogEntity> {
    const session = authService.getCurrentSession()
    const actor = session ? session.username : 'SYSTEM'
    const role: UserRole = session ? session.role : 'ADMIN'

    const now = new Date().toISOString()
    const auditEntry: AuditLogEntity = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: now,
      actor,
      role,
      action: options.action,
      entityType: options.entityType,
      affectedIds: options.affectedIds || [],
      operation: options.operation,
      result: options.result || 'SUCCESS',
      source: options.source || 'ADMIN_CONSOLE',
      details: options.details || {},
      createdAt: now,
      updatedAt: now
    }

    await repositories.auditLogs.save(auditEntry)
    return auditEntry
  }

  /**
   * Query audit logs with ADMIN authorization
   */
  public async getAuditLogs(filter?: {
    action?: string
    actor?: string
    entityType?: string
    startDate?: string
    endDate?: string
  }): Promise<AuditLogEntity[]> {
    const session = authService.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new AuthorizationError('Akses ditolak. Log audit hanya dapat diakses oleh Admin.')
    }

    let logs = await repositories.auditLogs.findAll()

    if (filter) {
      if (filter.action) {
        logs = logs.filter((l) => l.action === filter.action)
      }
      if (filter.actor) {
        logs = logs.filter((l) => l.actor === filter.actor)
      }
      if (filter.entityType) {
        logs = logs.filter((l) => l.entityType === filter.entityType)
      }
      if (filter.startDate) {
        logs = logs.filter((l) => l.timestamp >= filter.startDate!)
      }
      if (filter.endDate) {
        logs = logs.filter((l) => l.timestamp <= filter.endDate!)
      }
    }

    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }
}

export const auditLogService = new AuditLogService()
