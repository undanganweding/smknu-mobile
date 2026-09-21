/**
 * Guru Offline - Attendance Service & Domain Logic
 * Handles Student Attendance (Presensi Siswa) for Teachers
 *
 * Rules:
 * 1. Strict Domain Authorization: Teacher can only access & manage attendance for schedules assigned to them.
 * 2. 1 Schedule Block (e.g. period 1-4) = 1 Attendance Session (not per-period).
 * 3. Unique identity per session: (scheduleId + date).
 * 4. Roster is loaded from the schedule's classId (active students).
 * 5. Default status: 'H' (Hadir).
 * 6. Allowed statuses: H, I, S, A, T, D.
 */

import { repositories } from '../../repositories'
import { authService } from '../auth/AuthService'
import { syncService } from '../sync/SyncService'
import { academicLockGuardService } from '../academic/AcademicLockGuardService'
import type {
  AttendanceEntity,
  AttendanceStatus,
  AttendanceSummary,
  StudentAttendanceRecord,
  SemesterType
} from '../../types'
import { scheduleService, type TeacherResolvedScheduleItem } from '../master/ScheduleService'

export interface StudentRosterAttendanceItem {
  studentId: string
  nis: string
  name: string
  gender: 'L' | 'P'
  status: AttendanceStatus
  note: string
}

export interface TeacherAttendanceSessionData {
  schedule: TeacherResolvedScheduleItem
  date: string
  attendanceId: string | null
  isExisting: boolean
  academicYearId: string
  semester: SemesterType
  records: StudentRosterAttendanceItem[]
  summary: AttendanceSummary
  createdAt?: string
  updatedAt?: string
}

export interface SaveAttendanceInput {
  scheduleId: string
  date: string
  records: Array<{
    studentId: string
    status: AttendanceStatus
    note?: string
  }>
}

export class AttendanceService {
  /**
   * Helper to format date to local YYYY-MM-DD
   */
  public getLocalDateString(date = new Date()): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  /**
   * Calculate summary counts from student records
   */
  public calculateSummary(records: Array<{ status: AttendanceStatus }>): AttendanceSummary {
    const summary: AttendanceSummary = {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpa: 0,
      terlambat: 0,
      dispensasi: 0
    }

    for (const rec of records) {
      switch (rec.status) {
        case 'H':
          summary.hadir++
          break
        case 'I':
          summary.izin++
          break
        case 'S':
          summary.sakit++
          break
        case 'A':
          summary.alpa++
          break
        case 'T':
          summary.terlambat++
          break
        case 'D':
          summary.dispensasi++
          break
      }
    }

    return summary
  }

  /**
   * Validate teacher authorization for a schedule.
   * Throws Error if teacher does not own the schedule.
   */
  private async validateTeacherOwnership(
    scheduleId: string,
    customTeacherId?: string
  ): Promise<{
    schedule: TeacherResolvedScheduleItem
    teacherId: string
  }> {
    let teacherId = customTeacherId

    if (!teacherId) {
      const session = authService.getCurrentSession()
      if (!session) {
        throw new Error('Sesi pengguna tidak valid. Silakan login kembali.')
      }

      if (session.role === 'GURU') {
        if (!session.teacherId) {
          throw new Error('Akun pengguna tidak terhubung dengan data Guru terverifikasi.')
        }
        teacherId = session.teacherId
      }
    }

    const schedule = await scheduleService.getScheduleByIdWithDetails(scheduleId)
    if (!schedule) {
      throw new Error('Jadwal mengajar tidak ditemukan.')
    }

    // If teacherId is present, verify ownership
    if (teacherId && schedule.teacherId !== teacherId) {
      throw new Error('Akses ditolak. Anda tidak memiliki hak akses ke jadwal kelas ini.')
    }

    return { schedule, teacherId: teacherId || schedule.teacherId }
  }

  /**
   * Get attendance session data (schedule details + student roster + existing records if any)
   */
  public async getAttendanceSession(
    scheduleId: string,
    targetDate?: string,
    customTeacherId?: string
  ): Promise<TeacherAttendanceSessionData> {
    const dateStr = targetDate || this.getLocalDateString()

    // 1. Validate schedule ownership
    const { schedule } = await this.validateTeacherOwnership(scheduleId, customTeacherId)

    // 2. Fetch Class Roster
    const allStudents = await repositories.students.findByClassId(schedule.classId)
    // Filter active students & sort alphabetically
    const activeStudents = allStudents
      .filter((s) => s.status === 'ACTIVE')
      .sort((a, b) => a.name.localeCompare(b.name, 'id-ID'))

    if (activeStudents.length === 0) {
      // Return empty roster gracefully
    }

    // 3. Find existing attendance record for this schedule + date
    const existingAttendance = await repositories.attendances.findByScheduleAndDate(
      scheduleId,
      dateStr
    )

    // 4. Map records with default 'H' or existing values
    const existingRecordsMap = new Map<string, StudentAttendanceRecord>()
    if (existingAttendance && Array.isArray(existingAttendance.records)) {
      for (const r of existingAttendance.records) {
        existingRecordsMap.set(r.studentId, r)
      }
    }

    const rosterItems: StudentRosterAttendanceItem[] = activeStudents.map((stu) => {
      const existing = existingRecordsMap.get(stu.id)
      return {
        studentId: stu.id,
        nis: stu.nis,
        name: stu.name,
        gender: stu.gender,
        status: existing ? existing.status : 'H', // Default Hadir
        note: existing?.note || ''
      }
    })

    const summary = this.calculateSummary(rosterItems)

    return {
      schedule,
      date: dateStr,
      attendanceId: existingAttendance?.id || null,
      isExisting: !!existingAttendance,
      academicYearId: schedule.academicYearId,
      semester: schedule.semester,
      records: rosterItems,
      summary,
      createdAt: existingAttendance?.createdAt,
      updatedAt: existingAttendance?.updatedAt
    }
  }

  /**
   * Save or Update Student Attendance
   */
  public async saveAttendance(
    input: SaveAttendanceInput,
    customTeacherId?: string
  ): Promise<{
    attendance: AttendanceEntity
    summary: AttendanceSummary
    isNew: boolean
  }> {
    if (!input.scheduleId) {
      throw new Error('ID Jadwal mengajar wajib diisi.')
    }
    if (!input.date) {
      throw new Error('Tanggal presensi wajib diisi.')
    }
    if (!Array.isArray(input.records) || input.records.length === 0) {
      throw new Error('Daftar presensi siswa tidak boleh kosong.')
    }

    // 1. Validate authorization
    const { schedule, teacherId } = await this.validateTeacherOwnership(
      input.scheduleId,
      customTeacherId
    )

    await academicLockGuardService.enforceLock(schedule.academicYearId)

    // 2. Validate students exist in the class
    const classStudents = await repositories.students.findByClassId(schedule.classId)
    const classStudentIds = new Set(classStudents.map((s) => s.id))

    const validStatuses: AttendanceStatus[] = ['H', 'I', 'S', 'A', 'T', 'D']
    const cleanRecords: StudentAttendanceRecord[] = []

    for (const rec of input.records) {
      if (!classStudentIds.has(rec.studentId)) {
        throw new Error(`Data siswa dengan ID ${rec.studentId} tidak terdaftar pada kelas ini.`)
      }
      if (!validStatuses.includes(rec.status)) {
        throw new Error(
          `Status kehadiran "${rec.status}" tidak valid. Gunakan H, I, S, A, T, atau D.`
        )
      }
      cleanRecords.push({
        studentId: rec.studentId,
        status: rec.status,
        note: rec.note?.trim() || undefined
      })
    }

    const now = new Date().toISOString()
    const summary = this.calculateSummary(cleanRecords)

    // 3. Check for existing attendance record (Unique per scheduleId + date)
    const existing = await repositories.attendances.findByScheduleAndDate(
      input.scheduleId,
      input.date
    )

    if (existing) {
      // UPDATE existing record
      const updatedEntity: AttendanceEntity = {
        ...existing,
        classId: schedule.classId,
        teacherAssignmentId: schedule.teacherAssignmentId,
        academicYearId: schedule.academicYearId,
        semester: schedule.semester,
        records: cleanRecords,
        updatedBy: teacherId,
        updatedAt: now
      }

      await repositories.attendances.update(existing.id, updatedEntity)
      await syncService.enqueue('ATTENDANCE', existing.id, 'UPDATE', updatedEntity)
      return {
        attendance: updatedEntity,
        summary,
        isNew: false
      }
    } else {
      // CREATE new record
      const newId = `att_${input.scheduleId}_${input.date.replace(/-/g, '')}`
      const newEntity: AttendanceEntity = {
        id: newId,
        scheduleId: input.scheduleId,
        classId: schedule.classId,
        teacherAssignmentId: schedule.teacherAssignmentId,
        date: input.date,
        academicYearId: schedule.academicYearId,
        semester: schedule.semester,
        records: cleanRecords,
        createdBy: teacherId,
        createdAt: now,
        updatedAt: now
      }

      await repositories.attendances.create(newEntity)
      await syncService.enqueue('ATTENDANCE', newEntity.id, 'CREATE', newEntity)
      return {
        attendance: newEntity,
        summary,
        isNew: true
      }
    }
  }

  /**
   * Get attendance status by scheduleId and date
   */
  public async getAttendanceStatus(
    scheduleId: string,
    date: string
  ): Promise<{
    isDone: boolean
    attendanceId: string | null
    summary?: AttendanceSummary
  }> {
    const att = await repositories.attendances.findByScheduleAndDate(scheduleId, date)
    if (!att) {
      return { isDone: false, attendanceId: null }
    }
    return {
      isDone: true,
      attendanceId: att.id,
      summary: this.calculateSummary(att.records || [])
    }
  }
}

export const attendanceService = new AttendanceService()
