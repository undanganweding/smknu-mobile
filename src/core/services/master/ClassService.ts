/**
 * Guru Offline - Class (Rombel) Master Service
 * Handles Classes, Homeroom teachers, Levels, and Majors
 */

import { repositories } from '../../repositories'
import type { ClassEntity, ClassLevel, AccountStatus, MajorEntity } from '../../types'

export interface CreateClassDTO {
  name: string
  level: ClassLevel
  rombel: number | string
  academicYearId: string
  majorId: string
  homeroomTeacherId?: string
  status?: AccountStatus
}

export type UpdateClassDTO = Partial<CreateClassDTO>

export class ClassService {
  async getAllClasses(status?: AccountStatus): Promise<ClassEntity[]> {
    const list = await repositories.classes.findAll()
    if (status) {
      return list.filter((c) => c.status === status)
    }
    return list
  }

  async getAllMajors(): Promise<MajorEntity[]> {
    return await repositories.majors.findAll()
  }

  async getClassById(id: string): Promise<ClassEntity | null> {
    return await repositories.classes.findById(id)
  }

  async getClassesByAcademicYear(academicYearId: string): Promise<ClassEntity[]> {
    return await repositories.classes.findByAcademicYear(academicYearId)
  }

  async searchClasses(
    query?: string,
    level?: ClassLevel,
    majorId?: string
  ): Promise<ClassEntity[]> {
    let list = await this.getAllClasses()

    if (level) {
      list = list.filter((c) => c.level === level)
    }
    if (majorId) {
      list = list.filter((c) => c.majorId === majorId)
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q))
    }

    return list
  }

  async createClass(data: CreateClassDTO): Promise<ClassEntity> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Nama rombel / kelas wajib diisi.')
    }
    if (!data.level) {
      throw new Error('Tingkat kelas (X, XI, XII) wajib dipilih.')
    }
    if (!data.majorId) {
      throw new Error('Konsentrasi keahlian / jurusan wajib dipilih.')
    }
    if (!data.academicYearId) {
      throw new Error('Tahun pelajaran wajib ditentukan.')
    }

    const now = new Date().toISOString()
    const newClass: ClassEntity = {
      id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      level: data.level,
      rombel: data.rombel || 1,
      academicYearId: data.academicYearId,
      majorId: data.majorId,
      homeroomTeacherId: data.homeroomTeacherId || undefined,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }

    return await repositories.classes.create(newClass)
  }

  async updateClass(id: string, updates: UpdateClassDTO): Promise<ClassEntity> {
    const existing = await repositories.classes.findById(id)
    if (!existing) {
      throw new Error('Data rombel / kelas tidak ditemukan.')
    }

    const cleanUpdates: Partial<ClassEntity> = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return await repositories.classes.update(id, cleanUpdates)
  }

  async toggleClassStatus(id: string): Promise<ClassEntity> {
    const existing = await repositories.classes.findById(id)
    if (!existing) {
      throw new Error('Data rombel / kelas tidak ditemukan.')
    }

    const newStatus: AccountStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    return await repositories.classes.update(id, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })
  }
}

export const classService = new ClassService()
