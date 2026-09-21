/**
 * Guru Offline - Schedule Master Service & Conflict Detection Engine
 * Handles Class timetable schedules, day/period allocation, and detects:
 * 1. Teacher Conflict (same teacher scheduled in two classes at overlapping periods)
 * 2. Room Conflict (same room booked for two classes at overlapping periods)
 * 3. Class Conflict (same class scheduled with two subjects at overlapping periods)
 */

import { repositories } from '../../repositories'
import type {
  ScheduleEntity,
  DayOfWeek,
  AccountStatus,
  SemesterType,
  TeacherEntity,
  AcademicYearEntity
} from '../../types'

export const DAY_ORDER: Record<DayOfWeek, number> = {
  SENIN: 1,
  SELASA: 2,
  RABU: 3,
  KAMIS: 4,
  JUMAT: 5,
  SABTU: 6
}

export function getTodayDayOfWeek(date = new Date()): DayOfWeek | null {
  const day = date.getDay()
  switch (day) {
    case 1:
      return 'SENIN'
    case 2:
      return 'SELASA'
    case 3:
      return 'RABU'
    case 4:
      return 'KAMIS'
    case 5:
      return 'JUMAT'
    case 6:
      return 'SABTU'
    default:
      return null // Sunday / Minggu
  }
}

export interface TeacherResolvedScheduleItem {
  id: string
  academicYearId: string
  academicYearName: string
  semester: SemesterType

  classId: string
  className: string
  classLevel: string
  rombel: string | number
  majorId: string
  majorCode: string
  majorName: string

  teacherAssignmentId: string
  teacherAssignmentCode: string
  teacherId: string
  teacherName: string

  subjectId: string
  subjectCode: string
  subjectName: string
  subjectCategory?: string

  roomId: string
  roomCode: string
  roomName: string
  roomType: string

  dayOfWeek: DayOfWeek
  periodStart: number
  periodEnd: number
  totalPeriods: number
  timeStart: string
  timeEnd: string
  status: AccountStatus

  isToday: boolean
  timingStatus: 'ONGOING' | 'UPCOMING' | 'COMPLETED' | 'NONE'
  attendanceDone?: boolean
  attendanceId?: string | null
  journalDone?: boolean
  journalId?: string | null
}

export interface TeacherScheduleData {
  teacher: TeacherEntity | null
  academicYear: AcademicYearEntity | null
  schedules: TeacherResolvedScheduleItem[]
  todaySchedules: TeacherResolvedScheduleItem[]
  weeklySchedules: Record<DayOfWeek, TeacherResolvedScheduleItem[]>
  todaySummary: {
    totalSessions: number
    totalClasses: number
    totalHours: number
    completedAttendanceCount: number
    completedJournalCount: number
    currentSession: TeacherResolvedScheduleItem | null
    nextSession: TeacherResolvedScheduleItem | null
  }
}

export interface CreateScheduleDTO {
  academicYearId: string
  classId: string
  teacherAssignmentId: string
  dayOfWeek: DayOfWeek
  periodStart: number
  periodEnd: number
  timeStart: string
  timeEnd: string
  roomId: string
  status?: AccountStatus
}

export type UpdateScheduleDTO = Partial<CreateScheduleDTO>

export interface ScheduleConflict {
  type: 'TEACHER' | 'ROOM' | 'CLASS'
  message: string
  conflictingSchedule: ScheduleEntity
}

export interface ScheduleWithDetails extends ScheduleEntity {
  className?: string
  teacherName?: string
  subjectName?: string
  roomName?: string
  roomCode?: string
}

export class ScheduleService {
  async getAllSchedules(academicYearId?: string): Promise<ScheduleEntity[]> {
    const list = await repositories.schedules.findAll()
    if (academicYearId) {
      return list.filter((s) => s.academicYearId === academicYearId)
    }
    return list
  }

  async getSchedulesWithDetails(
    academicYearId?: string,
    classId?: string,
    dayOfWeek?: DayOfWeek
  ): Promise<ScheduleWithDetails[]> {
    let schedules = await this.getAllSchedules(academicYearId)

    if (classId) {
      schedules = schedules.filter((s) => s.classId === classId)
    }
    if (dayOfWeek) {
      schedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek)
    }

    const [classes, assignments, teachers, subjects, rooms] = await Promise.all([
      repositories.classes.findAll(),
      repositories.teacherAssignments.findAll(),
      repositories.teachers.findAll(),
      repositories.subjects.findAll(),
      repositories.rooms.findAll()
    ])

    const classMap = new Map(classes.map((c) => [c.id, c.name]))
    const teacherMap = new Map(teachers.map((t) => [t.id, t.name]))
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]))
    const roomMap = new Map(rooms.map((r) => [r.id, { name: r.name, code: r.code }]))
    const assignmentMap = new Map(assignments.map((a) => [a.id, a]))

    return schedules.map((s) => {
      const asg = assignmentMap.get(s.teacherAssignmentId)
      const room = roomMap.get(s.roomId)

      return {
        ...s,
        className: classMap.get(s.classId) || 'Kelas Tidak Diketahui',
        teacherName: asg ? teacherMap.get(asg.teacherId) || 'Guru' : 'Guru',
        subjectName: asg ? subjectMap.get(asg.subjectId) || 'Mata Pelajaran' : 'Mata Pelajaran',
        roomName: room?.name || 'Ruang',
        roomCode: room?.code || '-'
      }
    })
  }

  async getSchedulesByClass(classId: string, academicYearId?: string): Promise<ScheduleEntity[]> {
    return await repositories.schedules.findByClass(classId, academicYearId)
  }

  async getSchedulesByTeacher(
    teacherId: string,
    academicYearId?: string
  ): Promise<ScheduleEntity[]> {
    const teacherAssignments = await repositories.teacherAssignments.findByTeacherId(teacherId)
    const assignmentIds = new Set(teacherAssignments.map((a) => a.id))

    const allSchedules = await this.getAllSchedules(academicYearId)
    return allSchedules.filter((s) => assignmentIds.has(s.teacherAssignmentId))
  }

  /**
   * Checks if two period ranges overlap (e.g. 1-3 overlaps with 2-4 or 1-2)
   */
  private checkPeriodOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
    return Math.max(startA, startB) <= Math.min(endA, endB)
  }

  /**
   * Conflict Detection Engine
   */
  async detectConflicts(
    schedule: CreateScheduleDTO,
    excludeScheduleId?: string
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = []

    // Fetch existing schedules on the same academic year and day
    const allSchedules = await repositories.schedules.findAll()
    const sameDaySchedules = allSchedules.filter(
      (s) =>
        s.id !== excludeScheduleId &&
        s.academicYearId === schedule.academicYearId &&
        s.dayOfWeek === schedule.dayOfWeek &&
        s.status === 'ACTIVE'
    )

    // Retrieve target assignment info
    const targetAssignment = await repositories.teacherAssignments.findById(
      schedule.teacherAssignmentId
    )
    if (!targetAssignment) {
      throw new Error('Penugasan guru tidak ditemukan.')
    }

    const allAssignments = await repositories.teacherAssignments.findAll()
    const assignmentMap = new Map(allAssignments.map((a) => [a.id, a]))

    for (const existing of sameDaySchedules) {
      const isPeriodOverlap = this.checkPeriodOverlap(
        schedule.periodStart,
        schedule.periodEnd,
        existing.periodStart,
        existing.periodEnd
      )

      if (!isPeriodOverlap) continue

      // 1. Class Conflict: same class cannot have two simultaneous lessons
      if (existing.classId === schedule.classId) {
        conflicts.push({
          type: 'CLASS',
          message: `Kelas ini sudah memiliki jadwal pelajaran lain pada hari ${schedule.dayOfWeek} jam ke-${existing.periodStart} s/d ${existing.periodEnd}.`,
          conflictingSchedule: existing
        })
      }

      // 2. Room Conflict: same room cannot be occupied by two classes simultaneously
      if (existing.roomId === schedule.roomId) {
        conflicts.push({
          type: 'ROOM',
          message: `Ruang ini sudah digunakan oleh kelas lain pada hari ${schedule.dayOfWeek} jam ke-${existing.periodStart} s/d ${existing.periodEnd}.`,
          conflictingSchedule: existing
        })
      }

      // 3. Teacher Conflict: same teacher cannot teach in two classes simultaneously
      const existingAssignment = assignmentMap.get(existing.teacherAssignmentId)
      if (existingAssignment && existingAssignment.teacherId === targetAssignment.teacherId) {
        conflicts.push({
          type: 'TEACHER',
          message: `Guru bersangkutan sudah dijadwalkan mengajar di kelas lain pada hari ${schedule.dayOfWeek} jam ke-${existing.periodStart} s/d ${existing.periodEnd}.`,
          conflictingSchedule: existing
        })
      }
    }

    return conflicts
  }

  async createSchedule(data: CreateScheduleDTO): Promise<ScheduleEntity> {
    if (!data.academicYearId) throw new Error('Tahun pelajaran wajib diisi.')
    if (!data.classId) throw new Error('Kelas rombel wajib diisi.')
    if (!data.teacherAssignmentId) throw new Error('Penugasan guru & mapel wajib diisi.')
    if (!data.dayOfWeek) throw new Error('Hari wajib dipilih.')
    if (!data.roomId) throw new Error('Ruangan wajib dipilih.')
    if (data.periodStart === undefined || data.periodEnd === undefined) {
      throw new Error('Jam ke (mulai dan selesai) wajib diisi.')
    }
    if (data.periodStart > data.periodEnd) {
      throw new Error('Jam mulai tidak boleh lebih besar dari jam selesai.')
    }

    // Run conflict detection
    const conflicts = await this.detectConflicts(data)
    if (conflicts.length > 0) {
      throw new Error(`Jadwal bentrok: ${conflicts.map((c) => c.message).join(' ')}`)
    }

    const now = new Date().toISOString()
    const newSchedule: ScheduleEntity = {
      id: `schd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      academicYearId: data.academicYearId,
      classId: data.classId,
      teacherAssignmentId: data.teacherAssignmentId,
      dayOfWeek: data.dayOfWeek,
      periodStart: Number(data.periodStart),
      periodEnd: Number(data.periodEnd),
      timeStart: data.timeStart || '07:00',
      timeEnd: data.timeEnd || '08:30',
      roomId: data.roomId,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }

    return await repositories.schedules.create(newSchedule)
  }

  async updateSchedule(id: string, updates: UpdateScheduleDTO): Promise<ScheduleEntity> {
    const existing = await repositories.schedules.findById(id)
    if (!existing) {
      throw new Error('Data jadwal pelajaran tidak ditemukan.')
    }

    const merged: CreateScheduleDTO = {
      academicYearId: updates.academicYearId || existing.academicYearId,
      classId: updates.classId || existing.classId,
      teacherAssignmentId: updates.teacherAssignmentId || existing.teacherAssignmentId,
      dayOfWeek: updates.dayOfWeek || existing.dayOfWeek,
      periodStart:
        updates.periodStart !== undefined ? Number(updates.periodStart) : existing.periodStart,
      periodEnd: updates.periodEnd !== undefined ? Number(updates.periodEnd) : existing.periodEnd,
      timeStart: updates.timeStart || existing.timeStart,
      timeEnd: updates.timeEnd || existing.timeEnd,
      roomId: updates.roomId || existing.roomId,
      status: updates.status || existing.status
    }

    if (merged.periodStart > merged.periodEnd) {
      throw new Error('Jam mulai tidak boleh lebih besar dari jam selesai.')
    }

    // Check conflicts excluding this schedule
    const conflicts = await this.detectConflicts(merged, id)
    if (conflicts.length > 0) {
      throw new Error(`Jadwal bentrok: ${conflicts.map((c) => c.message).join(' ')}`)
    }

    const cleanUpdates: Partial<ScheduleEntity> = {
      ...updates,
      periodStart: merged.periodStart,
      periodEnd: merged.periodEnd,
      updatedAt: new Date().toISOString()
    }

    return await repositories.schedules.update(id, cleanUpdates)
  }

  async deleteSchedule(id: string): Promise<boolean> {
    return await repositories.schedules.delete(id)
  }

  /**
   * Resolves complete teacher teaching schedule, block teaching periods, weekly breakdown and today's summary.
   * Strictly filters by teacherId and active academic year.
   */
  async getTeacherSchedule(
    teacherId: string,
    academicYearId?: string,
    referenceDate = new Date()
  ): Promise<TeacherScheduleData> {
    const emptyResult: TeacherScheduleData = {
      teacher: null,
      academicYear: null,
      schedules: [],
      todaySchedules: [],
      weeklySchedules: {
        SENIN: [],
        SELASA: [],
        RABU: [],
        KAMIS: [],
        JUMAT: [],
        SABTU: []
      },
      todaySummary: {
        totalSessions: 0,
        totalClasses: 0,
        totalHours: 0,
        completedAttendanceCount: 0,
        completedJournalCount: 0,
        currentSession: null,
        nextSession: null
      }
    }

    if (!teacherId) {
      return emptyResult
    }

    // 1. Resolve Active Academic Year
    let targetAcademicYear: AcademicYearEntity | null = null
    if (academicYearId) {
      targetAcademicYear = await repositories.academicYears.findById(academicYearId)
    } else {
      targetAcademicYear = await repositories.academicYears.findActive()
    }

    if (!targetAcademicYear) {
      return emptyResult
    }

    // 2. Resolve Teacher
    const teacher = await repositories.teachers.findById(teacherId)
    if (!teacher) {
      return {
        ...emptyResult,
        academicYear: targetAcademicYear
      }
    }

    // 3. Resolve Teacher Assignments for this teacher
    const allTeacherAssignments = await repositories.teacherAssignments.findByTeacherId(teacherId)
    const validAssignments = allTeacherAssignments.filter(
      (a) => a.academicYearId === targetAcademicYear!.id && a.status === 'ACTIVE'
    )
    const assignmentMap = new Map(validAssignments.map((a) => [a.id, a]))
    const assignmentIds = new Set(validAssignments.map((a) => a.id))

    if (assignmentIds.size === 0) {
      return {
        ...emptyResult,
        teacher,
        academicYear: targetAcademicYear
      }
    }

    // 4. Fetch all active schedules matching these assignments
    const allSchedules = await repositories.schedules.findAll()
    const teacherSchedules = allSchedules.filter(
      (s) =>
        s.academicYearId === targetAcademicYear!.id &&
        assignmentIds.has(s.teacherAssignmentId) &&
        s.status === 'ACTIVE'
    )

    // 5. Batch load related entities
    const [classes, majors, subjects, rooms] = await Promise.all([
      repositories.classes.findAll(),
      repositories.majors.findAll(),
      repositories.subjects.findAll(),
      repositories.rooms.findAll()
    ])

    const classMap = new Map(classes.map((c) => [c.id, c]))
    const majorMap = new Map(majors.map((m) => [m.id, m]))
    const subjectMap = new Map(subjects.map((s) => [s.id, s]))
    const roomMap = new Map(rooms.map((r) => [r.id, r]))

    // 6. Timing & current session resolution
    const todayDay = getTodayDayOfWeek(referenceDate)
    const currentHours = referenceDate.getHours().toString().padStart(2, '0')
    const currentMinutes = referenceDate.getMinutes().toString().padStart(2, '0')
    const currentTimeStr = `${currentHours}:${currentMinutes}`

    // 7. Map & enrich schedules
    const resolvedSchedules: TeacherResolvedScheduleItem[] = teacherSchedules.map((s) => {
      const asg = assignmentMap.get(s.teacherAssignmentId)
      const cls = classMap.get(s.classId)
      const major = cls ? majorMap.get(cls.majorId) : undefined
      const sbj = asg ? subjectMap.get(asg.subjectId) : undefined
      const room = roomMap.get(s.roomId)

      const totalPeriods = Math.max(1, s.periodEnd - s.periodStart + 1)
      const isToday = todayDay === s.dayOfWeek

      let timingStatus: 'ONGOING' | 'UPCOMING' | 'COMPLETED' | 'NONE' = 'NONE'
      if (isToday) {
        if (currentTimeStr >= s.timeStart && currentTimeStr <= s.timeEnd) {
          timingStatus = 'ONGOING'
        } else if (currentTimeStr < s.timeStart) {
          timingStatus = 'UPCOMING'
        } else {
          timingStatus = 'COMPLETED'
        }
      }

      return {
        id: s.id,
        academicYearId: s.academicYearId,
        academicYearName: targetAcademicYear!.name,
        semester: targetAcademicYear!.semester,

        classId: s.classId,
        className: cls?.name || 'Kelas Tidak Diketahui',
        classLevel: cls?.level || '-',
        rombel: cls?.rombel || 1,
        majorId: cls?.majorId || '',
        majorCode: major?.code || '-',
        majorName: major?.name || 'Program Keahlian',

        teacherAssignmentId: s.teacherAssignmentId,
        teacherAssignmentCode: asg?.code || '-',
        teacherId: teacher.id,
        teacherName: teacher.name,

        subjectId: asg?.subjectId || '',
        subjectCode: sbj?.code || '-',
        subjectName: sbj?.name || 'Mata Pelajaran',
        subjectCategory: sbj?.category,

        roomId: s.roomId,
        roomCode: room?.code || '-',
        roomName: room?.name || 'Ruang Kelas',
        roomType: room?.type || 'THEORY',

        dayOfWeek: s.dayOfWeek,
        periodStart: s.periodStart,
        periodEnd: s.periodEnd,
        totalPeriods,
        timeStart: s.timeStart,
        timeEnd: s.timeEnd,
        status: s.status,

        isToday,
        timingStatus
      }
    })

    // 8. Sort chronologically: dayOfWeek ASC, periodStart ASC, periodEnd ASC
    resolvedSchedules.sort((a, b) => {
      const dayDiff = (DAY_ORDER[a.dayOfWeek] || 99) - (DAY_ORDER[b.dayOfWeek] || 99)
      if (dayDiff !== 0) return dayDiff
      if (a.periodStart !== b.periodStart) return a.periodStart - b.periodStart
      return a.periodEnd - b.periodEnd
    })

    // 9. Group weekly
    const weeklySchedules: Record<DayOfWeek, TeacherResolvedScheduleItem[]> = {
      SENIN: [],
      SELASA: [],
      RABU: [],
      KAMIS: [],
      JUMAT: [],
      SABTU: []
    }

    resolvedSchedules.forEach((s) => {
      if (weeklySchedules[s.dayOfWeek]) {
        weeklySchedules[s.dayOfWeek].push(s)
      }
    })

    // 10. Filter today's schedules & query today's attendance and journal statuses
    const y = referenceDate.getFullYear()
    const m = String(referenceDate.getMonth() + 1).padStart(2, '0')
    const d = String(referenceDate.getDate()).padStart(2, '0')
    const todayDateStr = `${y}-${m}-${d}`

    const todaySchedules = todayDay ? [...weeklySchedules[todayDay]] : []
    todaySchedules.sort((a, b) => a.periodStart - b.periodStart)

    let completedAttendanceCount = 0
    let completedJournalCount = 0

    // Enrich today's schedules with attendance and journal status
    for (const item of todaySchedules) {
      const [att, jrn] = await Promise.all([
        repositories.attendances.findByScheduleAndDate(item.id, todayDateStr),
        repositories.journals.findByScheduleAndDate(item.id, todayDateStr)
      ])

      item.attendanceDone = !!att
      item.attendanceId = att?.id || null
      if (item.attendanceDone) completedAttendanceCount++

      item.journalDone = !!jrn
      item.journalId = jrn?.id || null
      if (item.journalDone) completedJournalCount++
    }

    // 11. Calculate today's summary
    const uniqueClassIds = new Set(todaySchedules.map((s) => s.classId))
    const totalTodayHours = todaySchedules.reduce((sum, s) => sum + s.totalPeriods, 0)
    const currentSession = todaySchedules.find((s) => s.timingStatus === 'ONGOING') || null
    const nextSession = todaySchedules.find((s) => s.timingStatus === 'UPCOMING') || null

    return {
      teacher,
      academicYear: targetAcademicYear,
      schedules: resolvedSchedules,
      todaySchedules,
      weeklySchedules,
      todaySummary: {
        totalSessions: todaySchedules.length,
        totalClasses: uniqueClassIds.size,
        totalHours: totalTodayHours,
        completedAttendanceCount,
        completedJournalCount,
        currentSession,
        nextSession
      }
    }
  }

  /**
   * Get single schedule with rich resolved details by schedule ID
   */
  async getScheduleByIdWithDetails(
    scheduleId: string,
    targetDate?: string
  ): Promise<TeacherResolvedScheduleItem | null> {
    const s = await repositories.schedules.findById(scheduleId)
    if (!s) return null

    const [ay, asg, cls, room] = await Promise.all([
      repositories.academicYears.findById(s.academicYearId),
      repositories.teacherAssignments.findById(s.teacherAssignmentId),
      repositories.classes.findById(s.classId),
      repositories.rooms.findById(s.roomId)
    ])

    const [teacher, subject, major] = await Promise.all([
      asg ? repositories.teachers.findById(asg.teacherId) : null,
      asg ? repositories.subjects.findById(asg.subjectId) : null,
      cls ? repositories.majors.findById(cls.majorId) : null
    ])

    const now = new Date()
    const todayDay = getTodayDayOfWeek(now)
    const currentHours = now.getHours().toString().padStart(2, '0')
    const currentMinutes = now.getMinutes().toString().padStart(2, '0')
    const currentTimeStr = `${currentHours}:${currentMinutes}`
    const isToday = todayDay === s.dayOfWeek

    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const effectiveDateStr = targetDate || `${y}-${m}-${d}`

    const [att, jrn] = await Promise.all([
      repositories.attendances.findByScheduleAndDate(s.id, effectiveDateStr),
      repositories.journals.findByScheduleAndDate(s.id, effectiveDateStr)
    ])

    let timingStatus: 'ONGOING' | 'UPCOMING' | 'COMPLETED' | 'NONE' = 'NONE'
    if (isToday) {
      if (currentTimeStr >= s.timeStart && currentTimeStr <= s.timeEnd) {
        timingStatus = 'ONGOING'
      } else if (currentTimeStr < s.timeStart) {
        timingStatus = 'UPCOMING'
      } else {
        timingStatus = 'COMPLETED'
      }
    }

    return {
      id: s.id,
      academicYearId: s.academicYearId,
      academicYearName: ay?.name || '-',
      semester: ay?.semester || 'GANJIL',

      classId: s.classId,
      className: cls?.name || 'Kelas Tidak Diketahui',
      classLevel: cls?.level || '-',
      rombel: cls?.rombel || 1,
      majorId: cls?.majorId || '',
      majorCode: major?.code || '-',
      majorName: major?.name || 'Program Keahlian',

      teacherAssignmentId: s.teacherAssignmentId,
      teacherAssignmentCode: asg?.code || '-',
      teacherId: teacher?.id || '',
      teacherName: teacher?.name || 'Guru',

      subjectId: asg?.subjectId || '',
      subjectCode: subject?.code || '-',
      subjectName: subject?.name || 'Mata Pelajaran',
      subjectCategory: subject?.category,

      roomId: s.roomId,
      roomCode: room?.code || '-',
      roomName: room?.name || 'Ruang Kelas',
      roomType: room?.type || 'THEORY',

      dayOfWeek: s.dayOfWeek,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      totalPeriods: Math.max(1, s.periodEnd - s.periodStart + 1),
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      status: s.status,

      isToday,
      timingStatus,
      attendanceDone: !!att,
      attendanceId: att?.id || null,
      journalDone: !!jrn,
      journalId: jrn?.id || null
    }
  }
}

export const scheduleService = new ScheduleService()
