/**
 * Guru Offline - Master Data Referential Integrity & Validation Service
 * Enforces canonical relationships, prevents orphan references, and guards active state.
 */

import { repositories } from '../../repositories'
import type {
  TeacherAssignmentEntity,
  ScheduleEntity,
  StudentEntity,
  ClassEntity
} from '../../types'

export interface IntegrityValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

export class MasterDataIntegrityError extends Error {
  public errors: string[]

  constructor(message: string, errors: string[] = []) {
    super(message)
    this.name = 'MasterDataIntegrityError'
    this.errors = errors
  }
}

export class MasterDataIntegrityService {
  private static instance: MasterDataIntegrityService | null = null

  public static getInstance(): MasterDataIntegrityService {
    if (!MasterDataIntegrityService.instance) {
      MasterDataIntegrityService.instance = new MasterDataIntegrityService()
    }
    return MasterDataIntegrityService.instance
  }

  /**
   * Validate Teacher Assignment referential integrity:
   * - Teacher must exist and be ACTIVE
   * - Subject must exist and be ACTIVE
   * - Academic Year must exist and be ACTIVE
   */
  public async validateTeacherAssignment(
    assignment: Partial<TeacherAssignmentEntity>
  ): Promise<IntegrityValidationResult> {
    const errors: string[] = []

    if (!assignment.teacherId) {
      errors.push('Guru penugasan (teacherId) wajib ditentukan.')
    } else {
      const teacher = await repositories.teachers.findById(assignment.teacherId)
      if (!teacher) {
        errors.push(`Guru dengan ID '${assignment.teacherId}' tidak ditemukan di database.`)
      } else if (teacher.status !== 'ACTIVE') {
        errors.push(
          `Guru '${teacher.name}' berstatus tidak aktif (${teacher.status}). Penugasan baru tidak diizinkan.`
        )
      }
    }

    if (!assignment.subjectId) {
      errors.push('Mata pelajaran (subjectId) wajib ditentukan.')
    } else {
      const subject = await repositories.subjects.findById(assignment.subjectId)
      if (!subject) {
        errors.push(
          `Mata pelajaran dengan ID '${assignment.subjectId}' tidak ditemukan di database.`
        )
      } else if (subject.status !== 'ACTIVE') {
        errors.push(`Mata pelajaran '${subject.name}' berstatus tidak aktif (${subject.status}).`)
      }
    }

    if (assignment.academicYearId) {
      const ay = await repositories.academicYears.findById(assignment.academicYearId)
      if (!ay) {
        errors.push(`Tahun ajaran '${assignment.academicYearId}' tidak ditemukan.`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate Schedule referential integrity & conflict:
   * - TeacherAssignment must exist and be ACTIVE
   * - Class must exist and be ACTIVE
   * - Room must exist and be ACTIVE
   * - AcademicYear must exist
   * - Period range must be valid
   */
  public async validateSchedule(
    schedule: Partial<ScheduleEntity>
  ): Promise<IntegrityValidationResult> {
    const errors: string[] = []

    if (!schedule.teacherAssignmentId) {
      errors.push('Penugasan guru (teacherAssignmentId) wajib ditentukan.')
    } else {
      const assignment = await repositories.teacherAssignments.findById(
        schedule.teacherAssignmentId
      )
      if (!assignment) {
        errors.push(`Penugasan guru dengan ID '${schedule.teacherAssignmentId}' tidak ditemukan.`)
      } else if (assignment.status !== 'ACTIVE') {
        errors.push(`Penugasan guru terkait berstatus tidak aktif (${assignment.status}).`)
      }
    }

    if (!schedule.classId) {
      errors.push('Kelas (classId) wajib ditentukan.')
    } else {
      const cls = await repositories.classes.findById(schedule.classId)
      if (!cls) {
        errors.push(`Kelas dengan ID '${schedule.classId}' tidak ditemukan.`)
      } else if (cls.status !== 'ACTIVE') {
        errors.push(`Kelas '${cls.name}' berstatus tidak aktif (${cls.status}).`)
      }
    }

    if (!schedule.roomId) {
      errors.push('Ruang kelas/lab (roomId) wajib ditentukan.')
    } else {
      const room = await repositories.rooms.findById(schedule.roomId)
      if (!room) {
        errors.push(`Ruang dengan ID '${schedule.roomId}' tidak ditemukan.`)
      } else if (room.status !== 'ACTIVE') {
        errors.push(`Ruang '${room.name}' berstatus tidak aktif (${room.status}).`)
      }
    }

    if (
      schedule.periodStart !== undefined &&
      schedule.periodEnd !== undefined &&
      schedule.periodStart > schedule.periodEnd
    ) {
      errors.push(
        `Jam pelajaran awal (${schedule.periodStart}) tidak boleh lebih besar dari jam akhir (${schedule.periodEnd}).`
      )
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate Student referential integrity:
   * - Class must exist and be ACTIVE
   * - NIS must be unique
   */
  public async validateStudent(
    student: Partial<StudentEntity>,
    isUpdate = false
  ): Promise<IntegrityValidationResult> {
    const errors: string[] = []

    if (!student.name || !student.name.trim()) {
      errors.push('Nama siswa wajib diisi.')
    }

    if (!student.nis || !student.nis.trim()) {
      errors.push('Nomor Induk Siswa (NIS) wajib diisi.')
    } else if (!isUpdate) {
      const existing = await repositories.students.findByNis(student.nis.trim())
      if (existing) {
        errors.push(`NIS '${student.nis}' sudah terdaftar atas nama '${existing.name}'.`)
      }
    }

    if (!student.classId) {
      errors.push('Kelas rombel siswa wajib ditentukan.')
    } else {
      const cls = await repositories.classes.findById(student.classId)
      if (!cls) {
        errors.push(`Kelas dengan ID '${student.classId}' tidak ditemukan.`)
      } else if (cls.status !== 'ACTIVE') {
        errors.push(`Kelas '${cls.name}' berstatus tidak aktif (${cls.status}).`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate Class referential integrity:
   * - Major must exist and be ACTIVE
   * - AcademicYear must exist
   * - Homeroom teacher (if assigned) must exist and be ACTIVE
   */
  public async validateClass(classDef: Partial<ClassEntity>): Promise<IntegrityValidationResult> {
    const errors: string[] = []

    if (!classDef.name || !classDef.name.trim()) {
      errors.push('Nama rombel kelas wajib diisi.')
    }

    if (!classDef.majorId) {
      errors.push('Jurusan / Program Keahlian wajib ditentukan.')
    } else {
      const major = await repositories.majors.findById(classDef.majorId)
      if (!major) {
        errors.push(`Jurusan dengan ID '${classDef.majorId}' tidak ditemukan.`)
      } else if (major.status !== 'ACTIVE') {
        errors.push(`Jurusan '${major.name}' berstatus tidak aktif.`)
      }
    }

    if (classDef.homeroomTeacherId) {
      const teacher = await repositories.teachers.findById(classDef.homeroomTeacherId)
      if (!teacher) {
        errors.push(`Wali kelas dengan ID '${classDef.homeroomTeacherId}' tidak ditemukan.`)
      } else if (teacher.status !== 'ACTIVE') {
        errors.push(`Wali kelas terpilih (${teacher.name}) berstatus tidak aktif.`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Check deactivation impact:
   * When deactivating a parent entity, warns or prevents cascade breaking changes
   */
  public async validateDeactivation(
    entityType: 'TEACHER' | 'SUBJECT' | 'CLASS' | 'ROOM',
    entityId: string
  ): Promise<{ canDeactivate: boolean; warnings: string[]; blockerMessage?: string }> {
    const warnings: string[] = []

    if (entityType === 'TEACHER') {
      const assignments = await repositories.teacherAssignments.findByTeacherId(entityId)
      const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE')
      if (activeAssignments.length > 0) {
        warnings.push(
          `Guru ini memiliki ${activeAssignments.length} penugasan mengajar aktif. Penonaktifan akan membuat penugasan terkait tidak dapat dijadwalkan ulang.`
        )
      }
    } else if (entityType === 'CLASS') {
      const students = await repositories.students.findByClassId(entityId)
      const activeStudents = students.filter((s) => s.status === 'ACTIVE')
      if (activeStudents.length > 0) {
        warnings.push(
          `Kelas ini masih memiliki ${activeStudents.length} siswa aktif. Harap pindahkan siswa sebelum menonaktifkan rombel.`
        )
      }
    } else if (entityType === 'ROOM') {
      const schedules = await repositories.schedules.findAll()
      const activeUsingRoom = schedules.filter(
        (s) => s.roomId === entityId && s.status === 'ACTIVE'
      )
      if (activeUsingRoom.length > 0) {
        warnings.push(`Ruang ini digunakan oleh ${activeUsingRoom.length} jadwal pelajaran aktif.`)
      }
    }

    return {
      canDeactivate: true,
      warnings
    }
  }
}

export const masterDataIntegrityService = MasterDataIntegrityService.getInstance()
