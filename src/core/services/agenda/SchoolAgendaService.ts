/**
 * Guru Offline - School Agenda Service
 * Handles School calendar agendas, academic activities, exams, holidays, and meetings.
 * Admin manages agendas; Teachers consume them in read-only mode based on targetRole.
 */

import { repositories } from '../../repositories'
import { auditLogService } from '../audit/AuditLogService'
import type { SchoolAgendaEntity, AccountStatus } from '../../types'

export interface CreateSchoolAgendaDTO {
  title: string
  description?: string
  startDate: string
  endDate: string
  location?: string
  category: 'AKADEMIK' | 'UJIAN' | 'LIBUR' | 'RAPAT' | 'KEGIATAN'
  targetRole?: 'ALL' | 'GURU' | 'ADMIN'
  isMandatory?: boolean
  status?: AccountStatus
}

export type UpdateSchoolAgendaDTO = Partial<CreateSchoolAgendaDTO>

export class SchoolAgendaService {
  private static instance: SchoolAgendaService | null = null

  public static getInstance(): SchoolAgendaService {
    if (!SchoolAgendaService.instance) {
      SchoolAgendaService.instance = new SchoolAgendaService()
    }
    return SchoolAgendaService.instance
  }

  public async getAllAgendas(): Promise<SchoolAgendaEntity[]> {
    return await repositories.schoolAgendas.findAll()
  }

  public async getAgendasForRole(role: 'GURU' | 'ADMIN'): Promise<SchoolAgendaEntity[]> {
    return await repositories.schoolAgendas.findActive(role)
  }

  public async getUpcomingAgendas(
    role?: 'GURU' | 'ADMIN',
    limit = 10
  ): Promise<SchoolAgendaEntity[]> {
    const list = role
      ? await repositories.schoolAgendas.findActive(role)
      : await repositories.schoolAgendas.findAll()

    const nowStr = new Date().toISOString().split('T')[0]
    return list
      .filter((a) => a.endDate >= nowStr && a.status === 'ACTIVE')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, limit)
  }

  public async createAgenda(
    data: CreateSchoolAgendaDTO,
    actorId = 'admin'
  ): Promise<SchoolAgendaEntity> {
    if (!data.title || !data.title.trim()) {
      throw new Error('Judul agenda kegiatan wajib diisi.')
    }
    if (!data.startDate || !data.endDate) {
      throw new Error('Tanggal mulai dan selesai agenda wajib ditentukan.')
    }
    if (data.startDate > data.endDate) {
      throw new Error('Tanggal mulai tidak boleh melebihi tanggal selesai.')
    }

    const now = new Date().toISOString()
    const newAgenda: SchoolAgendaEntity = {
      id: `agnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.title.trim(),
      description: data.description?.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      location: data.location?.trim() || 'SMK NU Ungaran',
      category: data.category || 'AKADEMIK',
      targetRole: data.targetRole || 'ALL',
      isMandatory: data.isMandatory ?? true,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }

    const created = await repositories.schoolAgendas.create(newAgenda)

    await auditLogService.recordLog({
      actor: actorId,
      role: 'ADMIN',
      action: 'CREATE_SCHOOL_AGENDA',
      entityType: 'school_agendas',
      affectedIds: [created.id],
      operation: 'CREATE',
      result: 'SUCCESS',
      source: 'LOCAL',
      details: { title: created.title, category: created.category }
    })

    return created
  }

  public async updateAgenda(
    id: string,
    updates: UpdateSchoolAgendaDTO,
    actorId = 'admin'
  ): Promise<SchoolAgendaEntity> {
    const existing = await repositories.schoolAgendas.findById(id)
    if (!existing) {
      throw new Error('Data agenda sekolah tidak ditemukan.')
    }

    const cleanUpdates: Partial<SchoolAgendaEntity> = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    const updated = await repositories.schoolAgendas.update(id, cleanUpdates)

    await auditLogService.recordLog({
      actor: actorId,
      role: 'ADMIN',
      action: 'UPDATE_SCHOOL_AGENDA',
      entityType: 'school_agendas',
      affectedIds: [id],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'LOCAL',
      details: { updates }
    })

    return updated
  }

  public async deleteAgenda(id: string, actorId = 'admin'): Promise<boolean> {
    const existing = await repositories.schoolAgendas.findById(id)
    if (!existing) {
      throw new Error('Data agenda sekolah tidak ditemukan.')
    }

    const deleted = await repositories.schoolAgendas.delete(id)

    if (deleted) {
      await auditLogService.recordLog({
        actor: actorId,
        role: 'ADMIN',
        action: 'DELETE_SCHOOL_AGENDA',
        entityType: 'school_agendas',
        affectedIds: [id],
        operation: 'DELETE',
        result: 'SUCCESS',
        source: 'LOCAL',
        details: { title: existing.title }
      })
    }

    return deleted
  }
}

export const schoolAgendaService = SchoolAgendaService.getInstance()
