/**
 * Guru Offline - Bulk Operations Service
 * Authoritative administrative service for bulk operations on teachers, students, classes, and schedules.
 */

import { repositories } from '../../repositories'
import { authService, AuthorizationError } from '../auth'
import { auditLogService } from '../audit/AuditLogService'
import type { AccountStatus, StudentStatus, SyncQueueEntity } from '../../types'

export interface BulkOperationResult {
  success: boolean
  totalCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  affectedIds: string[]
  message: string
  errors?: string[]
}

export class BulkService {
  /**
   * Enforce ADMIN role for bulk administrative operations
   */
  private enforceAdmin() {
    const session = authService.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new AuthorizationError(
        'Akses ditolak. Operasi massal hanya dapat dilakukan oleh Admin.'
      )
    }
    return session
  }

  /**
   * Helper to enqueue sync item for bulk changes
   */
  private async enqueueSync(entityType: 'MASTER', entityId: string, payload: any) {
    const now = new Date().toISOString()
    const syncItem: SyncQueueEntity = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      entityType,
      entityId,
      operation: 'UPDATE',
      payload,
      status: 'PENDING',
      attempts: 0,
      queuedAt: now,
      createdAt: now,
      updatedAt: now
    }
    await repositories.syncQueue.save(syncItem)
  }

  /**
   * Bulk Update Teacher Status (e.g., ACTIVE, INACTIVE, SUSPENDED)
   */
  public async bulkUpdateTeacherStatus(
    teacherIds: string[],
    status: AccountStatus
  ): Promise<BulkOperationResult> {
    this.enforceAdmin()
    let updatedCount = 0
    let skippedCount = 0
    const affectedIds: string[] = []
    const errors: string[] = []

    for (const id of teacherIds) {
      const teacher = await repositories.teachers.findById(id)
      if (!teacher) {
        skippedCount++
        errors.push(`Guru dengan ID "${id}" tidak ditemukan`)
        continue
      }

      teacher.status = status
      teacher.updatedAt = new Date().toISOString()
      await repositories.teachers.save(teacher)

      // Synchronize associated user account status if present
      const user = await repositories.users.findByTeacherId(id)
      if (user) {
        user.status = status
        user.updatedAt = new Date().toISOString()
        await repositories.users.save(user)
      }

      await this.enqueueSync('MASTER', teacher.id, teacher)
      affectedIds.push(teacher.id)
      updatedCount++
    }

    await auditLogService.log({
      action: 'BULK_UPDATE_TEACHER_STATUS',
      entityType: 'TEACHER',
      affectedIds,
      operation: 'UPDATE',
      result: 'SUCCESS',
      details: { status, updatedCount, skippedCount }
    })

    return {
      success: true,
      totalCount: teacherIds.length,
      updatedCount,
      skippedCount,
      failedCount: errors.length,
      affectedIds,
      message: `Status ${updatedCount} guru berhasil diperbarui menjadi ${status}.`,
      errors
    }
  }

  /**
   * Bulk Update Student Status (ACTIVE, INACTIVE, MUTATION, GRADUATED)
   */
  public async bulkUpdateStudentStatus(
    studentIds: string[],
    status: StudentStatus
  ): Promise<BulkOperationResult> {
    this.enforceAdmin()
    let updatedCount = 0
    let skippedCount = 0
    const affectedIds: string[] = []
    const errors: string[] = []

    for (const id of studentIds) {
      const student = await repositories.students.findById(id)
      if (!student) {
        skippedCount++
        errors.push(`Siswa dengan ID "${id}" tidak ditemukan`)
        continue
      }

      student.status = status
      student.updatedAt = new Date().toISOString()
      await repositories.students.save(student)

      await this.enqueueSync('MASTER', student.id, student)
      affectedIds.push(student.id)
      updatedCount++
    }

    await auditLogService.log({
      action: 'BULK_UPDATE_STUDENT_STATUS',
      entityType: 'STUDENT',
      affectedIds,
      operation: 'UPDATE',
      result: 'SUCCESS',
      details: { status, updatedCount, skippedCount }
    })

    return {
      success: true,
      totalCount: studentIds.length,
      updatedCount,
      skippedCount,
      failedCount: errors.length,
      affectedIds,
      message: `Status ${updatedCount} siswa berhasil diperbarui menjadi ${status}.`,
      errors
    }
  }

  /**
   * Bulk Assign Students to a Target Class/Rombel
   */
  public async bulkAssignStudentClass(
    studentIds: string[],
    targetClassId: string
  ): Promise<BulkOperationResult> {
    this.enforceAdmin()

    const targetClass = await repositories.classes.findById(targetClassId)
    if (!targetClass) {
      throw new Error(`Rombel/Kelas tujuan dengan ID "${targetClassId}" tidak ditemukan.`)
    }

    let updatedCount = 0
    let skippedCount = 0
    const affectedIds: string[] = []
    const errors: string[] = []

    for (const id of studentIds) {
      const student = await repositories.students.findById(id)
      if (!student) {
        skippedCount++
        errors.push(`Siswa dengan ID "${id}" tidak ditemukan`)
        continue
      }

      student.classId = targetClass.id
      student.updatedAt = new Date().toISOString()
      await repositories.students.save(student)

      await this.enqueueSync('MASTER', student.id, student)
      affectedIds.push(student.id)
      updatedCount++
    }

    await auditLogService.log({
      action: 'BULK_ASSIGN_ROMBEL',
      entityType: 'STUDENT',
      affectedIds,
      operation: 'UPDATE',
      result: 'SUCCESS',
      details: { targetClassId: targetClass.id, targetClassName: targetClass.name, updatedCount }
    })

    return {
      success: true,
      totalCount: studentIds.length,
      updatedCount,
      skippedCount,
      failedCount: errors.length,
      affectedIds,
      message: `${updatedCount} siswa berhasil dipindahkan ke rombel "${targetClass.name}".`,
      errors
    }
  }

  /**
   * Bulk Update Class Status (ACTIVE, INACTIVE)
   */
  public async bulkUpdateClassStatus(
    classIds: string[],
    status: AccountStatus
  ): Promise<BulkOperationResult> {
    this.enforceAdmin()
    let updatedCount = 0
    let skippedCount = 0
    const affectedIds: string[] = []
    const errors: string[] = []

    for (const id of classIds) {
      const cls = await repositories.classes.findById(id)
      if (!cls) {
        skippedCount++
        errors.push(`Kelas/Rombel dengan ID "${id}" tidak ditemukan`)
        continue
      }

      cls.status = status
      cls.updatedAt = new Date().toISOString()
      await repositories.classes.save(cls)

      await this.enqueueSync('MASTER', cls.id, cls)
      affectedIds.push(cls.id)
      updatedCount++
    }

    await auditLogService.log({
      action: 'BULK_UPDATE_CLASS_STATUS',
      entityType: 'CLASS',
      affectedIds,
      operation: 'UPDATE',
      result: 'SUCCESS',
      details: { status, updatedCount }
    })

    return {
      success: true,
      totalCount: classIds.length,
      updatedCount,
      skippedCount,
      failedCount: errors.length,
      affectedIds,
      message: `Status ${updatedCount} rombel berhasil diperbarui menjadi ${status}.`,
      errors
    }
  }

  /**
   * Bulk Update Schedule Status (ACTIVE, INACTIVE)
   */
  public async bulkUpdateScheduleStatus(
    scheduleIds: string[],
    status: AccountStatus
  ): Promise<BulkOperationResult> {
    this.enforceAdmin()
    let updatedCount = 0
    let skippedCount = 0
    const affectedIds: string[] = []
    const errors: string[] = []

    for (const id of scheduleIds) {
      const sch = await repositories.schedules.findById(id)
      if (!sch) {
        skippedCount++
        errors.push(`Jadwal dengan ID "${id}" tidak ditemukan`)
        continue
      }

      sch.status = status
      sch.updatedAt = new Date().toISOString()
      await repositories.schedules.save(sch)

      await this.enqueueSync('MASTER', sch.id, sch)
      affectedIds.push(sch.id)
      updatedCount++
    }

    await auditLogService.log({
      action: 'BULK_UPDATE_SCHEDULE_STATUS',
      entityType: 'SCHEDULE',
      affectedIds,
      operation: 'UPDATE',
      result: 'SUCCESS',
      details: { status, updatedCount }
    })

    return {
      success: true,
      totalCount: scheduleIds.length,
      updatedCount,
      skippedCount,
      failedCount: errors.length,
      affectedIds,
      message: `Status ${updatedCount} jadwal berhasil diperbarui menjadi ${status}.`,
      errors
    }
  }
}

export const bulkService = new BulkService()
