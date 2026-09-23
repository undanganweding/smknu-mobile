/**
 * Guru Offline - Teacher Assignment (SK Pembagian Tugas Mengajar) Service
 * Handles teaching load allocations, subject links, code identifiers (e.g. KODE 01), and hours calculation
 */

import { repositories } from '../../repositories'
import type { TeacherAssignmentEntity, AccountStatus, SemesterType } from '../../types'
import { masterDataIntegrityService, MasterDataIntegrityError } from './MasterDataIntegrityService'

export interface CreateAssignmentDTO {
  teacherId: string
  code: string
  subjectId: string
  hours: number
  academicYearId: string
  semester: SemesterType
  status?: AccountStatus
}

export type UpdateAssignmentDTO = Partial<CreateAssignmentDTO>

export interface AssignmentWithDetails extends TeacherAssignmentEntity {
  teacherName?: string
  subjectName?: string
  subjectCode?: string
}

export class AssignmentService {
  async getAllAssignments(academicYearId?: string): Promise<TeacherAssignmentEntity[]> {
    const list = await repositories.teacherAssignments.findAll()
    if (academicYearId) {
      return list.filter((a) => a.academicYearId === academicYearId)
    }
    return list
  }

  async getAssignmentsWithDetails(academicYearId?: string): Promise<AssignmentWithDetails[]> {
    const [assignments, teachers, subjects] = await Promise.all([
      this.getAllAssignments(academicYearId),
      repositories.teachers.findAll(),
      repositories.subjects.findAll()
    ])

    const teacherMap = new Map(teachers.map((t) => [t.id, t.name]))
    const subjectMap = new Map(subjects.map((s) => [s.id, { name: s.name, code: s.code }]))

    return assignments.map((a) => {
      const subj = subjectMap.get(a.subjectId)
      return {
        ...a,
        teacherName: teacherMap.get(a.teacherId) || 'Guru Tidak Diketahui',
        subjectName: subj?.name || 'Mata Pelajaran Tidak Diketahui',
        subjectCode: subj?.code || '-'
      }
    })
  }

  async getAssignmentsByTeacher(teacherId: string): Promise<TeacherAssignmentEntity[]> {
    return await repositories.teacherAssignments.findByTeacherId(teacherId)
  }

  async getAssignmentById(id: string): Promise<TeacherAssignmentEntity | null> {
    return await repositories.teacherAssignments.findById(id)
  }

  async createAssignment(data: CreateAssignmentDTO): Promise<TeacherAssignmentEntity> {
    if (!data.teacherId) {
      throw new Error('Guru pengampu wajib dipilih.')
    }
    if (!data.subjectId) {
      throw new Error('Mata pelajaran wajib dipilih.')
    }
    if (!data.code || data.code.trim().length === 0) {
      throw new Error('Kode penugasan mengajar (misal: KODE 01) wajib diisi.')
    }
    if (data.hours === undefined || Number(data.hours) < 0) {
      throw new Error('Alokasi jam mengajar (JP) harus berupa angka positif.')
    }
    if (!data.academicYearId) {
      throw new Error('Tahun pelajaran wajib ditentukan.')
    }

    const integrity = await masterDataIntegrityService.validateTeacherAssignment({
      teacherId: data.teacherId,
      subjectId: data.subjectId,
      academicYearId: data.academicYearId
    })
    if (!integrity.valid) {
      throw new MasterDataIntegrityError(integrity.errors[0], integrity.errors)
    }

    const now = new Date().toISOString()
    const newAssignment: TeacherAssignmentEntity = {
      id: `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teacherId: data.teacherId,
      code: data.code.trim(),
      subjectId: data.subjectId,
      hours: Number(data.hours),
      academicYearId: data.academicYearId,
      semester: data.semester || 'GANJIL',
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }

    return await repositories.teacherAssignments.create(newAssignment)
  }

  async updateAssignment(
    id: string,
    updates: UpdateAssignmentDTO
  ): Promise<TeacherAssignmentEntity> {
    const existing = await repositories.teacherAssignments.findById(id)
    if (!existing) {
      throw new Error('Data penugasan mengajar tidak ditemukan.')
    }

    const cleanUpdates: Partial<TeacherAssignmentEntity> = {
      ...updates,
      hours: updates.hours !== undefined ? Number(updates.hours) : existing.hours,
      updatedAt: new Date().toISOString()
    }

    return await repositories.teacherAssignments.update(id, cleanUpdates)
  }

  async deleteAssignment(id: string): Promise<boolean> {
    // Check if there are schedules referencing this assignment
    const relatedSchedules = await repositories.schedules.findByTeacherAssignment(id)
    if (relatedSchedules.length > 0) {
      throw new Error(
        `Tidak dapat menghapus penugasan karena masih terdapat ${relatedSchedules.length} jadwal pelajaran terkait.`
      )
    }

    return await repositories.teacherAssignments.delete(id)
  }

  async getTotalTeachingHours(teacherId: string, academicYearId?: string): Promise<number> {
    let list = await this.getAssignmentsByTeacher(teacherId)
    if (academicYearId) {
      list = list.filter((a) => a.academicYearId === academicYearId)
    }
    return list.reduce((sum, item) => sum + (item.hours || 0), 0)
  }
}

export const assignmentService = new AssignmentService()
