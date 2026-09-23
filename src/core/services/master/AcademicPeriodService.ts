/**
 * Guru Offline - Academic Period Service
 * Controls academic period lifecycle, submission deadlines, locking, and active period rule.
 * Rule: Maximum one active academic period. Historical periods are preserved and immutable when locked.
 */

import { repositories } from '../../repositories'
import { auditLogService } from '../audit/AuditLogService'
import type { AcademicPeriodEntity, PeriodType, SemesterType } from '../../types'

export interface CreateAcademicPeriodDTO {
  academicYearId: string
  name: string
  periodType: PeriodType
  semester: SemesterType
  month?: number
  year: number
  startDate: string
  endDate: string
  submissionDeadline: string
  isLocked?: boolean
}

export type UpdateAcademicPeriodDTO = Partial<CreateAcademicPeriodDTO>

export class AcademicPeriodService {
  private static instance: AcademicPeriodService | null = null

  public static getInstance(): AcademicPeriodService {
    if (!AcademicPeriodService.instance) {
      AcademicPeriodService.instance = new AcademicPeriodService()
    }
    return AcademicPeriodService.instance
  }

  public async getAllPeriods(academicYearId?: string): Promise<AcademicPeriodEntity[]> {
    const list = await repositories.academicPeriods.findAll()
    if (academicYearId) {
      return list.filter((p) => p.academicYearId === academicYearId)
    }
    return list
  }

  public async getActivePeriod(): Promise<AcademicPeriodEntity | null> {
    return await repositories.academicPeriods.findActive()
  }

  public async getPeriodById(id: string): Promise<AcademicPeriodEntity | null> {
    return await repositories.academicPeriods.findById(id)
  }

  public async createPeriod(
    data: CreateAcademicPeriodDTO,
    actorId = 'admin'
  ): Promise<AcademicPeriodEntity> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Nama periode akademik wajib diisi.')
    }
    if (!data.academicYearId) {
      throw new Error('Tahun ajaran wajib ditentukan.')
    }
    if (!data.startDate || !data.endDate) {
      throw new Error('Tanggal mulai dan selesai periode wajib diisi.')
    }
    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new Error('Tanggal mulai tidak boleh melebihi tanggal selesai.')
    }

    const now = new Date().toISOString()
    const newPeriod: AcademicPeriodEntity = {
      id: `prd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      academicYearId: data.academicYearId,
      name: data.name.trim(),
      periodType: data.periodType || 'SEMESTER',
      semester: data.semester || 'GANJIL',
      month: data.month,
      year: data.year || new Date().getFullYear(),
      startDate: data.startDate,
      endDate: data.endDate,
      submissionDeadline: data.submissionDeadline || data.endDate,
      isLocked: data.isLocked || false,
      createdAt: now,
      updatedAt: now
    }

    const created = await repositories.academicPeriods.create(newPeriod)

    await auditLogService.recordLog({
      actor: actorId,
      role: 'ADMIN',
      action: 'CREATE_ACADEMIC_PERIOD',
      entityType: 'academic_periods',
      affectedIds: [created.id],
      operation: 'CREATE',
      result: 'SUCCESS',
      source: 'LOCAL',
      details: { name: created.name, periodType: created.periodType }
    })

    return created
  }

  public async updatePeriod(
    id: string,
    updates: UpdateAcademicPeriodDTO,
    actorId = 'admin'
  ): Promise<AcademicPeriodEntity> {
    const existing = await repositories.academicPeriods.findById(id)
    if (!existing) {
      throw new Error('Data periode akademik tidak ditemukan.')
    }

    if (existing.isLocked && updates.isLocked !== false) {
      throw new Error(
        'Periode ini telah ditutup/dikunci dan berstatus arsip historis. Buka kunci terlebih dahulu untuk mengedit.'
      )
    }

    const cleanUpdates: Partial<AcademicPeriodEntity> = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    const updated = await repositories.academicPeriods.update(id, cleanUpdates)

    await auditLogService.recordLog({
      actor: actorId,
      role: 'ADMIN',
      action: 'UPDATE_ACADEMIC_PERIOD',
      entityType: 'academic_periods',
      affectedIds: [id],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'LOCAL',
      details: { updates }
    })

    return updated
  }

  public async lockPeriod(id: string, actorId = 'admin'): Promise<AcademicPeriodEntity> {
    const existing = await repositories.academicPeriods.findById(id)
    if (!existing) {
      throw new Error('Data periode akademik tidak ditemukan.')
    }

    const now = new Date().toISOString()
    const updated = await repositories.academicPeriods.update(id, {
      isLocked: true,
      lockedAt: now,
      lockedBy: actorId,
      updatedAt: now
    })

    await auditLogService.recordLog({
      actor: actorId,
      role: 'ADMIN',
      action: 'LOCK_ACADEMIC_PERIOD',
      entityType: 'academic_periods',
      affectedIds: [id],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'LOCAL',
      details: { periodName: existing.name, lockedAt: now }
    })

    return updated
  }

  public async unlockPeriod(id: string, actorId = 'admin'): Promise<AcademicPeriodEntity> {
    const existing = await repositories.academicPeriods.findById(id)
    if (!existing) {
      throw new Error('Data periode akademik tidak ditemukan.')
    }

    const now = new Date().toISOString()
    const updated = await repositories.academicPeriods.update(id, {
      isLocked: false,
      lockedAt: undefined,
      lockedBy: undefined,
      updatedAt: now
    })

    await auditLogService.recordLog({
      actor: actorId,
      role: 'ADMIN',
      action: 'UNLOCK_ACADEMIC_PERIOD',
      entityType: 'academic_periods',
      affectedIds: [id],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'LOCAL',
      details: { periodName: existing.name }
    })

    return updated
  }
}

export const academicPeriodService = AcademicPeriodService.getInstance()
