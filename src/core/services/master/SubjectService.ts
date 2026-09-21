/**
 * Guru Offline - Subject Master Service
 * Handles Subject domain operations, validation, and categories
 */

import { repositories } from '../../repositories'
import type { SubjectEntity, SubjectCategory, AccountStatus } from '../../types'

export interface CreateSubjectDTO {
  code: string
  name: string
  category?: SubjectCategory
  defaultKkm?: number
  status?: AccountStatus
}

export type UpdateSubjectDTO = Partial<CreateSubjectDTO>

export class SubjectService {
  async getAllSubjects(status?: AccountStatus): Promise<SubjectEntity[]> {
    const list = await repositories.subjects.findAll()
    if (status) {
      return list.filter((s) => s.status === status)
    }
    return list
  }

  async getSubjectById(id: string): Promise<SubjectEntity | null> {
    return await repositories.subjects.findById(id)
  }

  async searchSubjects(
    query: string,
    category?: SubjectCategory,
    status?: AccountStatus
  ): Promise<SubjectEntity[]> {
    const q = query.trim().toLowerCase()
    let list = await this.getAllSubjects(status)

    if (category) {
      list = list.filter((s) => s.category === category)
    }

    if (!q) return list

    return list.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q)
      const codeMatch = s.code.toLowerCase().includes(q)
      return nameMatch || codeMatch
    })
  }

  async createSubject(data: CreateSubjectDTO): Promise<SubjectEntity> {
    if (!data.code || data.code.trim().length === 0) {
      throw new Error('Kode mata pelajaran wajib diisi.')
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Nama mata pelajaran wajib diisi.')
    }

    const cleanCode = data.code.trim().toUpperCase()
    const existing = await repositories.subjects.findByCode(cleanCode)
    if (existing) {
      throw new Error(`Kode mata pelajaran "${cleanCode}" sudah digunakan oleh ${existing.name}.`)
    }

    const now = new Date().toISOString()
    const newSubject: SubjectEntity = {
      id: `sbj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      code: cleanCode,
      name: data.name.trim(),
      category: data.category || 'KEJURUAN',
      defaultKkm: data.defaultKkm !== undefined ? Number(data.defaultKkm) : 75,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }

    return await repositories.subjects.create(newSubject)
  }

  async updateSubject(id: string, updates: UpdateSubjectDTO): Promise<SubjectEntity> {
    const existing = await repositories.subjects.findById(id)
    if (!existing) {
      throw new Error('Data mata pelajaran tidak ditemukan.')
    }

    if (updates.code && updates.code.trim().toUpperCase() !== existing.code) {
      const cleanCode = updates.code.trim().toUpperCase()
      const dup = await repositories.subjects.findByCode(cleanCode)
      if (dup && dup.id !== id) {
        throw new Error(`Kode mata pelajaran "${cleanCode}" sudah digunakan oleh ${dup.name}.`)
      }
      updates.code = cleanCode
    }

    const cleanUpdates: Partial<SubjectEntity> = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return await repositories.subjects.update(id, cleanUpdates)
  }

  async toggleSubjectStatus(id: string): Promise<SubjectEntity> {
    const existing = await repositories.subjects.findById(id)
    if (!existing) {
      throw new Error('Data mata pelajaran tidak ditemukan.')
    }

    const newStatus: AccountStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    return await repositories.subjects.update(id, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })
  }
}

export const subjectService = new SubjectService()
