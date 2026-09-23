/**
 * Guru Offline - Student Master Service
 * Handles Student records, class associations, status transitions (ACTIVE, MUTATION, GRADUATED, INACTIVE)
 */

import { repositories } from '../../repositories'
import type { StudentEntity, StudentStatus, GenderType } from '../../types'
import { masterDataIntegrityService, MasterDataIntegrityError } from './MasterDataIntegrityService'

export interface CreateStudentDTO {
  nis: string
  nisn?: string
  name: string
  gender: GenderType
  birthPlace?: string
  birthDate?: string
  classId: string
  status?: StudentStatus
  parentPhone?: string
  address?: string
}

export type UpdateStudentDTO = Partial<CreateStudentDTO>

export class StudentService {
  async getAllStudents(status?: StudentStatus): Promise<StudentEntity[]> {
    const list = await repositories.students.findAll()
    if (status) {
      return list.filter((s) => s.status === status)
    }
    return list
  }

  async getStudentById(id: string): Promise<StudentEntity | null> {
    return await repositories.students.findById(id)
  }

  async getStudentsByClass(classId: string, status?: StudentStatus): Promise<StudentEntity[]> {
    const list = await repositories.students.findByClassId(classId)
    if (status) {
      return list.filter((s) => s.status === status)
    }
    return list
  }

  async searchStudents(
    query?: string,
    classId?: string,
    status?: StudentStatus
  ): Promise<StudentEntity[]> {
    let list = await this.getAllStudents(status)

    if (classId) {
      list = list.filter((s) => s.classId === classId)
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q)
        const nisMatch = s.nis.toLowerCase().includes(q)
        const nisnMatch = s.nisn ? s.nisn.toLowerCase().includes(q) : false
        return nameMatch || nisMatch || nisnMatch
      })
    }

    return list
  }

  async createStudent(data: CreateStudentDTO): Promise<StudentEntity> {
    if (!data.nis || data.nis.trim().length === 0) {
      throw new Error('NIS siswa wajib diisi.')
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Nama siswa wajib diisi.')
    }
    if (!data.classId) {
      throw new Error('Kelas rombel siswa wajib dipilih.')
    }

    const integrity = await masterDataIntegrityService.validateStudent(data)
    if (!integrity.valid) {
      throw new MasterDataIntegrityError(integrity.errors[0], integrity.errors)
    }

    const cleanNis = data.nis.trim()
    const existing = await repositories.students.findByNis(cleanNis)
    if (existing) {
      throw new Error(`NIS ${cleanNis} sudah terdaftar atas nama ${existing.name}.`)
    }

    const now = new Date().toISOString()
    const newStudent: StudentEntity = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nis: cleanNis,
      nisn: data.nisn?.trim() || undefined,
      name: data.name.trim(),
      gender: data.gender || 'L',
      birthPlace: data.birthPlace?.trim(),
      birthDate: data.birthDate?.trim(),
      classId: data.classId,
      status: data.status || 'ACTIVE',
      parentPhone: data.parentPhone?.trim(),
      address: data.address?.trim(),
      createdAt: now,
      updatedAt: now
    }

    return await repositories.students.create(newStudent)
  }

  async updateStudent(id: string, updates: UpdateStudentDTO): Promise<StudentEntity> {
    const existing = await repositories.students.findById(id)
    if (!existing) {
      throw new Error('Data siswa tidak ditemukan.')
    }

    if (updates.nis && updates.nis.trim() !== existing.nis) {
      const cleanNis = updates.nis.trim()
      const dup = await repositories.students.findByNis(cleanNis)
      if (dup && dup.id !== id) {
        throw new Error(`NIS ${cleanNis} sudah digunakan oleh siswa lain.`)
      }
      updates.nis = cleanNis
    }

    const cleanUpdates: Partial<StudentEntity> = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return await repositories.students.update(id, cleanUpdates)
  }

  async setStudentStatus(id: string, status: StudentStatus): Promise<StudentEntity> {
    const existing = await repositories.students.findById(id)
    if (!existing) {
      throw new Error('Data siswa tidak ditemukan.')
    }

    return await repositories.students.update(id, {
      status,
      updatedAt: new Date().toISOString()
    })
  }

  async getStudentStats(): Promise<{
    total: number
    active: number
    mutation: number
    graduated: number
    inactive: number
    male: number
    female: number
  }> {
    const all = await repositories.students.findAll()
    const active = all.filter((s) => s.status === 'ACTIVE').length
    const mutation = all.filter((s) => s.status === 'MUTATION').length
    const graduated = all.filter((s) => s.status === 'GRADUATED').length
    const inactive = all.filter((s) => s.status === 'INACTIVE').length
    const male = all.filter((s) => s.gender === 'L').length
    const female = all.filter((s) => s.gender === 'P').length

    return {
      total: all.length,
      active,
      mutation,
      graduated,
      inactive,
      male,
      female
    }
  }
}

export const studentService = new StudentService()
