/**
 * Guru Offline - Teaching Journal Service & Domain Logic
 * Handles Teaching Journal (Jurnal Mengajar) for Teachers
 *
 * Rules:
 * 1. Strict Domain Authorization: Teacher can only manage journals for their assigned schedules.
 * 2. 1 Schedule Block (e.g. period 1-4) = 1 Journal Session.
 * 3. Unique identity per session: (scheduleId + date).
 * 4. Contextual fields (Teacher, Subject, Class, Room, Academic Year, Attendance Summary) are resolved accurately.
 * 5. Academic content (Topic/Materi, Activity/Kegiatan, Notes/Catatan) are NEVER auto-invented. They must come from user input.
 * 6. Topic and Activity Summary are mandatory.
 */

import { repositories } from '../../repositories'
import { authService } from '../auth/AuthService'
import { syncService } from '../sync/SyncService'
import { academicLockGuardService } from '../academic/AcademicLockGuardService'
import type { JournalEntity, AttendanceSummary, SemesterType } from '../../types'
import { scheduleService, type TeacherResolvedScheduleItem } from '../master/ScheduleService'
import { attendanceService } from '../attendance/AttendanceService'

export interface TeacherJournalSessionData {
  schedule: TeacherResolvedScheduleItem
  date: string
  journalId: string | null
  isExisting: boolean
  academicYearId: string
  semester: SemesterType
  topic: string
  activitySummary: string
  notes: string
  studentAttendanceSummary?: AttendanceSummary
  attendanceDone: boolean
  createdAt?: string
  updatedAt?: string
}

export interface SaveJournalInput {
  scheduleId: string
  date: string
  topic: string
  activitySummary: string
  notes?: string
}

export class JournalService {
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
      throw new Error('Akses ditolak. Anda tidak memiliki hak akses ke jurnal jadwal kelas ini.')
    }

    return { schedule, teacherId: teacherId || schedule.teacherId }
  }

  /**
   * Get journal session data (schedule details + existing journal + attendance summary if present)
   */
  public async getJournalSession(
    scheduleId: string,
    targetDate?: string,
    customTeacherId?: string
  ): Promise<TeacherJournalSessionData> {
    const dateStr = targetDate || this.getLocalDateString()

    // 1. Validate schedule ownership
    const { schedule } = await this.validateTeacherOwnership(scheduleId, customTeacherId)

    // 2. Find existing journal for this schedule + date
    const existingJournal = await repositories.journals.findByScheduleAndDate(scheduleId, dateStr)

    // 3. Find attendance summary if available
    const attStatus = await attendanceService.getAttendanceStatus(scheduleId, dateStr)

    return {
      schedule,
      date: dateStr,
      journalId: existingJournal?.id || null,
      isExisting: !!existingJournal,
      academicYearId: schedule.academicYearId,
      semester: schedule.semester,
      topic: existingJournal?.topic || '',
      activitySummary: existingJournal?.activitySummary || '',
      notes: existingJournal?.notes || '',
      studentAttendanceSummary: existingJournal?.studentAttendanceSummary || attStatus.summary,
      attendanceDone: attStatus.isDone,
      createdAt: existingJournal?.createdAt,
      updatedAt: existingJournal?.updatedAt
    }
  }

  /**
   * Save or Update Teaching Journal
   */
  public async saveJournal(
    input: SaveJournalInput,
    customTeacherId?: string
  ): Promise<{
    journal: JournalEntity
    isNew: boolean
  }> {
    if (!input.scheduleId) {
      throw new Error('ID Jadwal mengajar wajib diisi.')
    }
    if (!input.date) {
      throw new Error('Tanggal jurnal wajib diisi.')
    }
    const cleanTopic = input.topic?.trim()
    if (!cleanTopic) {
      throw new Error('Materi / Topik pembelajaran wajib diisi.')
    }
    const cleanActivity = input.activitySummary?.trim()
    if (!cleanActivity) {
      throw new Error('Kegiatan pembelajaran wajib diisi.')
    }

    // 1. Validate authorization
    const { schedule, teacherId } = await this.validateTeacherOwnership(
      input.scheduleId,
      customTeacherId
    )

    await academicLockGuardService.enforceLock(schedule.academicYearId)

    // 2. Fetch attendance summary if available to link with journal
    const attStatus = await attendanceService.getAttendanceStatus(input.scheduleId, input.date)

    const timeSlotStr = `Jam ke-${schedule.periodStart}-${schedule.periodEnd} (${schedule.timeStart}-${schedule.timeEnd})`
    const now = new Date().toISOString()

    // 3. Check for existing journal (Unique per scheduleId + date)
    const existing = await repositories.journals.findByScheduleAndDate(input.scheduleId, input.date)

    if (existing) {
      // UPDATE existing journal
      const updatedEntity: JournalEntity = {
        ...existing,
        classId: schedule.classId,
        teacherAssignmentId: schedule.teacherAssignmentId,
        timeSlot: timeSlotStr,
        academicYearId: schedule.academicYearId,
        semester: schedule.semester,
        topic: cleanTopic,
        activitySummary: cleanActivity,
        notes: input.notes?.trim() || undefined,
        studentAttendanceSummary: attStatus.summary || existing.studentAttendanceSummary,
        updatedBy: teacherId,
        updatedAt: now
      }

      await repositories.journals.update(existing.id, updatedEntity)
      await syncService.enqueue('JOURNAL', existing.id, 'UPDATE', updatedEntity)
      return {
        journal: updatedEntity,
        isNew: false
      }
    } else {
      // CREATE new journal
      const newId = `jrn_${input.scheduleId}_${input.date.replace(/-/g, '')}`
      const newEntity: JournalEntity = {
        id: newId,
        scheduleId: input.scheduleId,
        classId: schedule.classId,
        teacherAssignmentId: schedule.teacherAssignmentId,
        date: input.date,
        timeSlot: timeSlotStr,
        academicYearId: schedule.academicYearId,
        semester: schedule.semester,
        topic: cleanTopic,
        activitySummary: cleanActivity,
        notes: input.notes?.trim() || undefined,
        studentAttendanceSummary: attStatus.summary,
        createdBy: teacherId,
        createdAt: now,
        updatedAt: now
      }

      await repositories.journals.create(newEntity)
      await syncService.enqueue('JOURNAL', newEntity.id, 'CREATE', newEntity)
      return {
        journal: newEntity,
        isNew: true
      }
    }
  }

  /**
   * Get journal status by scheduleId and date
   */
  public async getJournalStatus(
    scheduleId: string,
    date: string
  ): Promise<{
    isDone: boolean
    journalId: string | null
    topic?: string
  }> {
    const jrn = await repositories.journals.findByScheduleAndDate(scheduleId, date)
    if (!jrn) {
      return { isDone: false, journalId: null }
    }
    return {
      isDone: true,
      journalId: jrn.id,
      topic: jrn.topic
    }
  }
}

export const journalService = new JournalService()
