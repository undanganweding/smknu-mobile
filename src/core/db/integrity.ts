/**
 * Guru Offline - Data Integrity & Validation Helpers
 * Source of Truth: DATABASE_SCHEMA.md, AGENT_RULES.md
 */

import { repositories } from '../repositories'
import type {
  UserEntity,
  StudentEntity,
  TeacherAssignmentEntity,
  ScheduleEntity,
  AttendanceEntity
} from '../types'

export interface ValidationError {
  field: string
  message: string
  code: 'DUPLICATE' | 'INVALID_FOREIGN_KEY' | 'INVALID_VALUE' | 'REQUIRED'
}

export class DataIntegrityValidator {
  public static async validateUser(
    user: Partial<UserEntity>,
    isNew = true
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    if (!user.username || user.username.trim() === '') {
      errors.push({ field: 'username', message: 'Username wajib diisi', code: 'REQUIRED' })
    } else if (isNew) {
      const existing = await repositories.users.findByUsername(user.username)
      if (existing) {
        errors.push({
          field: 'username',
          message: `Username '${user.username}' sudah digunakan`,
          code: 'DUPLICATE'
        })
      }
    }

    if (user.role === 'GURU' && !user.teacherId) {
      errors.push({
        field: 'teacherId',
        message: 'Akun Guru wajib ditautkan ke Master Guru',
        code: 'REQUIRED'
      })
    }

    if (user.teacherId) {
      const teacher = await repositories.teachers.findById(user.teacherId)
      if (!teacher) {
        errors.push({
          field: 'teacherId',
          message: 'Master Guru tidak ditemukan',
          code: 'INVALID_FOREIGN_KEY'
        })
      }
    }

    return errors
  }

  public static async validateStudent(
    student: Partial<StudentEntity>,
    isNew = true
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    if (!student.nis || student.nis.trim() === '') {
      errors.push({ field: 'nis', message: 'NIS wajib diisi', code: 'REQUIRED' })
    } else if (isNew) {
      const existing = await repositories.students.findByNis(student.nis)
      if (existing) {
        errors.push({
          field: 'nis',
          message: `NIS '${student.nis}' sudah terdaftar`,
          code: 'DUPLICATE'
        })
      }
    }

    if (!student.name || student.name.trim() === '') {
      errors.push({ field: 'name', message: 'Nama siswa wajib diisi', code: 'REQUIRED' })
    }

    if (!student.gender || !['L', 'P'].includes(student.gender)) {
      errors.push({
        field: 'gender',
        message: 'Gender harus L (Laki-laki) atau P (Perempuan)',
        code: 'INVALID_VALUE'
      })
    }

    if (student.classId) {
      const classRecord = await repositories.classes.findById(student.classId)
      if (!classRecord) {
        errors.push({
          field: 'classId',
          message: 'Kelas tidak valid atau tidak ditemukan',
          code: 'INVALID_FOREIGN_KEY'
        })
      }
    }

    return errors
  }

  public static async validateTeacherAssignment(
    assignment: Partial<TeacherAssignmentEntity>
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    if (!assignment.code || assignment.code.trim() === '') {
      errors.push({ field: 'code', message: 'Kode penugasan guru wajib diisi', code: 'REQUIRED' })
    }

    if (!assignment.teacherId) {
      errors.push({ field: 'teacherId', message: 'Teacher ID wajib diisi', code: 'REQUIRED' })
    } else {
      const teacher = await repositories.teachers.findById(assignment.teacherId)
      if (!teacher) {
        errors.push({
          field: 'teacherId',
          message: 'Guru tidak ditemukan',
          code: 'INVALID_FOREIGN_KEY'
        })
      }
    }

    if (!assignment.subjectId) {
      errors.push({ field: 'subjectId', message: 'Subject ID wajib diisi', code: 'REQUIRED' })
    } else {
      const subject = await repositories.subjects.findById(assignment.subjectId)
      if (!subject) {
        errors.push({
          field: 'subjectId',
          message: 'Mata pelajaran tidak ditemukan',
          code: 'INVALID_FOREIGN_KEY'
        })
      }
    }

    if (!assignment.academicYearId) {
      errors.push({
        field: 'academicYearId',
        message: 'Tahun Ajaran ID wajib diisi',
        code: 'REQUIRED'
      })
    }

    return errors
  }

  public static async validateSchedule(
    schedule: Partial<ScheduleEntity>
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    if (!schedule.classId) {
      errors.push({ field: 'classId', message: 'Kelas wajib diisi', code: 'REQUIRED' })
    } else {
      const cls = await repositories.classes.findById(schedule.classId)
      if (!cls)
        errors.push({
          field: 'classId',
          message: 'Kelas tidak ditemukan',
          code: 'INVALID_FOREIGN_KEY'
        })
    }

    if (!schedule.teacherAssignmentId) {
      errors.push({
        field: 'teacherAssignmentId',
        message: 'Penugasan guru wajib diisi',
        code: 'REQUIRED'
      })
    } else {
      const assign = await repositories.teacherAssignments.findById(schedule.teacherAssignmentId)
      if (!assign)
        errors.push({
          field: 'teacherAssignmentId',
          message: 'Penugasan guru tidak ditemukan',
          code: 'INVALID_FOREIGN_KEY'
        })
    }

    if (schedule.roomId) {
      const room = await repositories.rooms.findById(schedule.roomId)
      if (!room)
        errors.push({
          field: 'roomId',
          message: 'Ruangan tidak ditemukan',
          code: 'INVALID_FOREIGN_KEY'
        })
    }

    return errors
  }

  public static async validateAttendance(
    attendance: Partial<AttendanceEntity>
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    if (!attendance.scheduleId) {
      errors.push({ field: 'scheduleId', message: 'Schedule ID wajib diisi', code: 'REQUIRED' })
    }
    if (!attendance.date) {
      errors.push({ field: 'date', message: 'Tanggal presensi wajib diisi', code: 'REQUIRED' })
    }

    return errors
  }
}
