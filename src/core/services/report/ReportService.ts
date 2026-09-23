/**
 * Guru Offline - Reporting, Recap & Operational Administration Service
 * Provides centralized aggregation, filtering, RBAC authorization,
 * export formatting, and print dataset generation for school administration.
 */

import { repositories } from '../../repositories'
import { authService, AuthorizationError } from '../auth'
import { completenessEngine } from '../academic/CompletenessEngine'
import { SubmissionService } from '../academic/SubmissionService'
import * as XLSX from 'xlsx'
import type { SemesterType, AssessmentType, StudentEntity, DayOfWeek } from '../../types'

export interface ReportFilterInput {
  academicYearId?: string
  semester?: SemesterType
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  classId?: string
  teacherId?: string
  subjectId?: string
  studentId?: string
  assessmentType?: AssessmentType
}

export interface DailyAttendanceRecapItem {
  id: string
  date: string
  timeSlot: string
  teacherName: string
  subjectName: string
  className: string
  totalStudents: number
  hadir: number
  izin: number
  sakit: number
  alpa: number
  terlambat: number
  dispensasi: number
}

export interface DisciplineRecapItem {
  id: string
  studentId: string
  studentNis: string
  studentName: string
  className: string
  teacherId: string
  teacherName: string
  date: string
  category: string
  severity: string
  points: number
  type: 'PRAISE' | 'VIOLATION' | 'NOTE'
  description: string
  followUp: string
  status: string
}

export interface DisciplineRecapSummary {
  totalIncidents: number
  totalPoints: number
  totalPraise: number
  totalViolations: number
  records: DisciplineRecapItem[]
}

export interface StudentAssessmentRowItem {
  assessmentId: string
  assessmentTitle: string
  type: AssessmentType
  date: string
  teacherName: string
  subjectName: string
  className: string
  studentId: string
  studentNis: string
  studentName: string
  score: number
  kkm: number
  status: 'TUNTAS' | 'BELUM TUNTAS'
}

export interface TeacherCompletenessRecapItem {
  teacherId: string
  nip: string
  name: string
  attendanceCompleteness: number
  journalCompleteness: number
  assessmentCompleteness: number
  disciplineCompleteness: number
  overallCompleteness: number
  isReadyToSubmit: boolean
  submissionStatus: string
}

export interface XlsxWorksheetData {
  name: string
  headers: string[]
  rows: (string | number)[][]
}

export interface StudentAttendanceRecapItem {
  studentId: string
  nis: string
  name: string
  className: string
  hadir: number
  izin: number
  sakit: number
  alpa: number
  terlambat: number
  dispensasi: number
  totalRecorded: number
  presencePercentage: number
}

export interface AttendanceRecapSummary {
  totalStudents: number
  totalHadir: number
  totalIzin: number
  totalSakit: number
  totalAlpa: number
  totalTerlambat: number
  totalDispensasi: number
  totalUnsubmittedSessions: number
  overallPresencePercentage: number
  students: StudentAttendanceRecapItem[]
}

export interface ClassAttendanceRecapItem {
  classId: string
  className: string
  level: string
  majorName: string
  homeroomTeacherName: string
  totalStudents: number
  totalSessionsRecorded: number
  totalPresence: number
  totalAbsence: number
  hadir: number
  izin: number
  sakit: number
  alpa: number
  terlambat: number
  dispensasi: number
  averagePresencePercentage: number
}

export interface TeacherActivityRecapItem {
  teacherId: string
  nip: string
  teacherName: string
  totalScheduledSessions: number
  totalAttendanceSubmitted: number
  totalJournalsSubmitted: number
  totalAssessmentsCreated: number
  totalTeachingHours: number
  attendanceComplianceRate: number
  journalComplianceRate: number
}

export interface TeacherActivityRecapSummary {
  totalTeachers: number
  totalScheduled: number
  totalAttendanceSubmitted: number
  totalJournalsSubmitted: number
  totalAssessments: number
  teachers: TeacherActivityRecapItem[]
}

export interface JournalRecapItem {
  id: string
  date: string
  timeSlot: string
  teacherId: string
  teacherName: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  topic: string
  learningObjectives?: string
  activitySummary: string
  notes: string
  status?: string
  createdAt: string
}

export interface AssessmentRecapItem {
  id: string
  title: string
  type: AssessmentType
  date: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  maxScore: number
  kkm: number
  totalStudentsGraded: number
  averageScore: number
  highestScore: number
  lowestScore: number
  studentsPassingKkm: number
  studentsBelowKkm: number
  passingPercentage: number
}

export interface StudentAcademicSummary {
  student: StudentEntity
  className: string
  homeroomTeacherName: string
  attendance: {
    hadir: number
    izin: number
    sakit: number
    alpa: number
    terlambat: number
    dispensasi: number
    totalRecorded: number
    presencePercentage: number
  }
  assessments: {
    totalAssessments: number
    gradedCount: number
    averageScore: number
    highestScore: number
    lowestScore: number
    passingCount: number
    failingCount: number
    details: Array<{
      assessmentId: string
      title: string
      type: AssessmentType
      subjectName: string
      date: string
      score: number
      maxScore: number
      kkm: number
      isPassing: boolean
    }>
  }
  discipline?: {
    totalIncidents: number
    totalPoints: number
    notes: Array<{
      date: string
      category: string
      type: string
      description: string
      points: number
    }>
  }
}

export interface AdminDashboardMetrics {
  activeTeachers: number
  activeStudents: number
  activeClasses: number
  todayScheduledSessions: number
  todayAttendanceSubmitted: number
  todayJournalsSubmitted: number
  pendingSyncCount: number
  totalAssessmentsCreated: number
}

export interface StudentReportCardSubjectScore {
  subjectId: string
  subjectCode: string
  subjectName: string
  subjectCategory: string
  teacherName: string
  formatifAverage: number | null
  stsScore: number | null
  sasScore: number | null
  finalScore: number | null
  kkm: number
  isPassing: boolean
  competencyDescription: string
}

export interface StudentReportCardData {
  student: {
    id: string
    name: string
    nis: string
    nisn?: string
    gender: string
    birthPlace?: string
    birthDate?: string
  }
  classInfo: {
    id: string
    name: string
    level: string
    phase: string // e.g., 'Fase E' for X, 'Fase F' for XI/XII
    majorName: string
    academicYearName: string
    semester: SemesterType
  }
  homeroomTeacher: {
    id: string
    name: string
    nip?: string
  }
  principal: {
    name: string
    nip?: string
  }
  school: {
    name: string
    npsn: string
    address: string
    contact: string
    isoDocCode?: string
  }
  subjects: StudentReportCardSubjectScore[]
  attendance: {
    sakit: number
    izin: number
    alpa: number
    hadir: number
    terlambat: number
    dispensasi: number
  }
  disciplineSummary?: {
    totalNotes: number
    praiseCount: number
    violationCount: number
    totalPoints: number
    characterNote: string
  }
  printDate: string
  printLocation: string
}

export class ReportService {
  /**
   * Helper: Get DayOfWeek string for a date (YYYY-MM-DD)
   */
  public getDayOfWeekFromDate(dateStr: string): DayOfWeek | null {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    const dayNum = d.getDay()
    switch (dayNum) {
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
        return null // Sunday
    }
  }

  /**
   * Domain Authorization Enforcer for Reporting
   * If current session is GURU, forces teacherId to match session.teacherId
   * and verifies authorized classes/subjects/students.
   */
  public async enforceReportAuthorization(filter: ReportFilterInput): Promise<ReportFilterInput> {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new AuthorizationError('Sesi pengguna tidak valid. Silakan login kembali.')
    }

    const cleanFilter: ReportFilterInput = { ...filter }

    if (session.role === 'GURU') {
      if (!session.teacherId) {
        throw new AuthorizationError(
          'Akun pengguna tidak terhubung dengan data Guru terverifikasi.'
        )
      }

      // Force teacher filter scope
      cleanFilter.teacherId = session.teacherId

      // If classId specified, check if teacher is authorized for class
      if (cleanFilter.classId) {
        const isAuthorized = await this.isTeacherAuthorizedForClass(
          session.teacherId,
          cleanFilter.classId
        )
        if (!isAuthorized) {
          throw new AuthorizationError(
            'Akses Ditolak: Anda tidak memiliki wewenang mengakses data laporan kelas ini.'
          )
        }
      }

      // If studentId specified, check if student belongs to teacher's class
      if (cleanFilter.studentId) {
        const student = await repositories.students.findById(cleanFilter.studentId)
        if (!student) {
          throw new Error('Data siswa tidak ditemukan.')
        }
        const isAuthorized = await this.isTeacherAuthorizedForClass(
          session.teacherId,
          student.classId
        )
        if (!isAuthorized) {
          throw new AuthorizationError(
            'Akses Ditolak: Anda tidak memiliki wewenang mengakses data siswa ini.'
          )
        }
      }
    }

    return cleanFilter
  }

  /**
   * Helper: Check if teacher is assigned to a class via assignments, schedules, or homeroom
   */
  private async isTeacherAuthorizedForClass(teacherId: string, classId: string): Promise<boolean> {
    // 1. Check homeroom
    const classEntity = await repositories.classes.findById(classId)
    if (classEntity && classEntity.homeroomTeacherId === teacherId) {
      return true
    }

    // 2. Check schedules
    const schedules = await repositories.schedules.findAll()
    const assignments = await repositories.teacherAssignments.findByTeacherId(teacherId)
    const asgIds = new Set(assignments.map((a) => a.id))

    const isScheduled = schedules.some(
      (s) => s.classId === classId && asgIds.has(s.teacherAssignmentId)
    )
    return isScheduled
  }

  /**
   * 1. Attendance Recap (Student-level)
   */
  public async getStudentAttendanceRecap(
    inputFilter: ReportFilterInput = {}
  ): Promise<AttendanceRecapSummary> {
    const filter = await this.enforceReportAuthorization(inputFilter)

    // Load base datasets
    let students = await repositories.students.findAll()
    if (filter.classId) {
      students = students.filter((s) => s.classId === filter.classId)
    }
    if (filter.studentId) {
      students = students.filter((s) => s.id === filter.studentId)
    }
    students = students.filter((s) => s.status === 'ACTIVE')

    let attendances = await repositories.attendances.findAll()

    // Apply date & period filters
    if (filter.academicYearId) {
      attendances = attendances.filter((a) => a.academicYearId === filter.academicYearId)
    }
    if (filter.semester) {
      attendances = attendances.filter((a) => a.semester === filter.semester)
    }
    if (filter.startDate) {
      attendances = attendances.filter((a) => a.date >= filter.startDate!)
    }
    if (filter.endDate) {
      attendances = attendances.filter((a) => a.date <= filter.endDate!)
    }
    if (filter.classId) {
      attendances = attendances.filter((a) => a.classId === filter.classId)
    }

    // Filter by teacherId or subjectId via teacherAssignments
    if (filter.teacherId || filter.subjectId) {
      const assignments = await repositories.teacherAssignments.findAll()
      const matchingAsgIds = new Set(
        assignments
          .filter((a) => {
            if (filter.teacherId && a.teacherId !== filter.teacherId) return false
            if (filter.subjectId && a.subjectId !== filter.subjectId) return false
            return true
          })
          .map((a) => a.id)
      )
      attendances = attendances.filter((a) => matchingAsgIds.has(a.teacherAssignmentId))
    }

    // Load classes map for names
    const classes = await repositories.classes.findAll()
    const classMap = new Map<string, string>()
    classes.forEach((c) => classMap.set(c.id, c.name))

    // Aggregate stats per student using stable student.id
    const studentStatsMap = new Map<
      string,
      {
        hadir: number
        izin: number
        sakit: number
        alpa: number
        terlambat: number
        dispensasi: number
      }
    >()

    students.forEach((s) => {
      studentStatsMap.set(s.id, {
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        terlambat: 0,
        dispensasi: 0
      })
    })

    let totalHadir = 0
    let totalIzin = 0
    let totalSakit = 0
    let totalAlpa = 0
    let totalTerlambat = 0
    let totalDispensasi = 0

    for (const att of attendances) {
      if (Array.isArray(att.records)) {
        for (const rec of att.records) {
          const stats = studentStatsMap.get(rec.studentId)
          if (stats) {
            switch (rec.status) {
              case 'H':
                stats.hadir++
                totalHadir++
                break
              case 'I':
                stats.izin++
                totalIzin++
                break
              case 'S':
                stats.sakit++
                totalSakit++
                break
              case 'A':
                stats.alpa++
                totalAlpa++
                break
              case 'T':
                stats.terlambat++
                totalTerlambat++
                break
              case 'D':
                stats.dispensasi++
                totalDispensasi++
                break
            }
          }
        }
      }
    }

    const items: StudentAttendanceRecapItem[] = students.map((s) => {
      const st = studentStatsMap.get(s.id) || {
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        terlambat: 0,
        dispensasi: 0
      }
      const totalRecorded = st.hadir + st.izin + st.sakit + st.alpa + st.terlambat + st.dispensasi
      const totalPresence = st.hadir + st.terlambat + st.dispensasi
      // Calculate presence percentage safely avoiding division by zero
      const presencePercentage =
        totalRecorded > 0 ? Number(((totalPresence / totalRecorded) * 100).toFixed(1)) : 0

      return {
        studentId: s.id,
        nis: s.nis,
        name: s.name,
        className: classMap.get(s.classId) || 'Kelas Tidak Diketahui',
        hadir: st.hadir,
        izin: st.izin,
        sakit: st.sakit,
        alpa: st.alpa,
        terlambat: st.terlambat,
        dispensasi: st.dispensasi,
        totalRecorded,
        presencePercentage
      }
    })

    // Sort by class name then student name
    items.sort((a, b) => {
      const c = a.className.localeCompare(b.className, 'id-ID')
      if (c !== 0) return c
      return a.name.localeCompare(b.name, 'id-ID')
    })

    const totalOverallRecorded =
      totalHadir + totalIzin + totalSakit + totalAlpa + totalTerlambat + totalDispensasi
    const totalOverallPresence = totalHadir + totalTerlambat + totalDispensasi
    const overallPresencePercentage =
      totalOverallRecorded > 0
        ? Number(((totalOverallPresence / totalOverallRecorded) * 100).toFixed(1))
        : 0

    return {
      totalStudents: students.length,
      totalHadir,
      totalIzin,
      totalSakit,
      totalAlpa,
      totalTerlambat,
      totalDispensasi,
      totalUnsubmittedSessions: 0, // Explicit distinction
      overallPresencePercentage,
      students: items
    }
  }

  /**
   * 2. Class Attendance Recap
   */
  public async getClassAttendanceRecap(
    inputFilter: ReportFilterInput = {}
  ): Promise<ClassAttendanceRecapItem[]> {
    const filter = await this.enforceReportAuthorization(inputFilter)

    let classes = await repositories.classes.findAll()
    if (filter.classId) {
      classes = classes.filter((c) => c.id === filter.classId)
    }

    const majors = await repositories.majors.findAll()
    const majorMap = new Map<string, string>()
    majors.forEach((m) => majorMap.set(m.id, m.name))

    const teachers = await repositories.teachers.findAll()
    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t.id, t.name))

    const studentRecap = await this.getStudentAttendanceRecap(filter)

    const classItems: ClassAttendanceRecapItem[] = []

    for (const c of classes) {
      const classStudents = studentRecap.students.filter((s) => s.className === c.name)

      let totalHadir = 0
      let totalIzin = 0
      let totalSakit = 0
      let totalAlpa = 0
      let totalTerlambat = 0
      let totalDispensasi = 0
      let sumPercentages = 0

      for (const s of classStudents) {
        totalHadir += s.hadir
        totalIzin += s.izin
        totalSakit += s.sakit
        totalAlpa += s.alpa
        totalTerlambat += s.terlambat
        totalDispensasi += s.dispensasi
        sumPercentages += s.presencePercentage
      }

      const totalPresence = totalHadir + totalTerlambat + totalDispensasi
      const totalAbsence = totalIzin + totalSakit + totalAlpa
      const averagePresencePercentage =
        classStudents.length > 0 ? Number((sumPercentages / classStudents.length).toFixed(1)) : 0

      // Count attendance sessions for this class
      let attendances = (await repositories.attendances.findAll()).filter((a) => a.classId === c.id)
      if (filter.startDate) attendances = attendances.filter((a) => a.date >= filter.startDate!)
      if (filter.endDate) attendances = attendances.filter((a) => a.date <= filter.endDate!)

      classItems.push({
        classId: c.id,
        className: c.name,
        level: c.level,
        majorName: majorMap.get(c.majorId) || 'Umum',
        homeroomTeacherName: c.homeroomTeacherId ? teacherMap.get(c.homeroomTeacherId) || '-' : '-',
        totalStudents: classStudents.length,
        totalSessionsRecorded: attendances.length,
        totalPresence,
        totalAbsence,
        hadir: totalHadir,
        izin: totalIzin,
        sakit: totalSakit,
        alpa: totalAlpa,
        terlambat: totalTerlambat,
        dispensasi: totalDispensasi,
        averagePresencePercentage
      })
    }

    return classItems.sort((a, b) => a.className.localeCompare(b.className, 'id-ID'))
  }

  /**
   * 3. Teacher Teaching Activity Recap
   */
  public async getTeacherActivityRecap(
    inputFilter: ReportFilterInput = {}
  ): Promise<TeacherActivityRecapSummary> {
    const filter = await this.enforceReportAuthorization(inputFilter)

    let teachers = await repositories.teachers.findAll()
    if (filter.teacherId) {
      teachers = teachers.filter((t) => t.id === filter.teacherId)
    }
    teachers = teachers.filter((t) => t.status === 'ACTIVE')

    const schedules = await repositories.schedules.findAll()
    const teacherAssignments = await repositories.teacherAssignments.findAll()
    const attendances = await repositories.attendances.findAll()
    const journals = await repositories.journals.findAll()
    const assessments = await repositories.assessments.findAll()

    let totalScheduled = 0
    let totalAttSubmitted = 0
    let totalJrnSubmitted = 0
    let totalAsmCreated = 0

    const items: TeacherActivityRecapItem[] = teachers.map((t) => {
      // 1. Get teacher's assignments
      const tAsgs = teacherAssignments.filter((a) => a.teacherId === t.id)
      const tAsgIds = new Set(tAsgs.map((a) => a.id))
      const totalTeachingHours = tAsgs.reduce((sum, a) => sum + (a.hours || 0), 0)

      // 2. Count schedules
      const tSchedules = schedules.filter((s) => tAsgIds.has(s.teacherAssignmentId))
      const totalScheduledSessions = tSchedules.length

      // 3. Count attendances submitted by this teacher
      let tAtts = attendances.filter((a) => a.createdBy === t.id)
      if (filter.startDate) tAtts = tAtts.filter((a) => a.date >= filter.startDate!)
      if (filter.endDate) tAtts = tAtts.filter((a) => a.date <= filter.endDate!)

      // 4. Count journals submitted by this teacher
      let tJournals = journals.filter((j) => j.createdBy === t.id)
      if (filter.startDate) tJournals = tJournals.filter((j) => j.date >= filter.startDate!)
      if (filter.endDate) tJournals = tJournals.filter((j) => j.date <= filter.endDate!)

      // 5. Count assessments created by this teacher
      let tAssessments = assessments.filter((asm) => asm.createdBy === t.id)
      if (filter.startDate)
        tAssessments = tAssessments.filter((asm) => (asm.date || '') >= filter.startDate!)
      if (filter.endDate)
        tAssessments = tAssessments.filter((asm) => (asm.date || '') <= filter.endDate!)

      const attComplianceRate =
        totalScheduledSessions > 0
          ? Number(((tAtts.length / totalScheduledSessions) * 100).toFixed(1))
          : 100

      const jrnComplianceRate =
        totalScheduledSessions > 0
          ? Number(((tJournals.length / totalScheduledSessions) * 100).toFixed(1))
          : 100

      totalScheduled += totalScheduledSessions
      totalAttSubmitted += tAtts.length
      totalJrnSubmitted += tJournals.length
      totalAsmCreated += tAssessments.length

      return {
        teacherId: t.id,
        nip: t.nip || '-',
        teacherName: t.name,
        totalScheduledSessions,
        totalAttendanceSubmitted: tAtts.length,
        totalJournalsSubmitted: tJournals.length,
        totalAssessmentsCreated: tAssessments.length,
        totalTeachingHours,
        attendanceComplianceRate: attComplianceRate,
        journalComplianceRate: jrnComplianceRate
      }
    })

    items.sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'id-ID'))

    return {
      totalTeachers: teachers.length,
      totalScheduled,
      totalAttendanceSubmitted: totalAttSubmitted,
      totalJournalsSubmitted: totalJrnSubmitted,
      totalAssessments: totalAsmCreated,
      teachers: items
    }
  }

  /**
   * 4. Journal Recap
   */
  public async getJournalRecap(inputFilter: ReportFilterInput = {}): Promise<JournalRecapItem[]> {
    const filter = await this.enforceReportAuthorization(inputFilter)

    let journals = await repositories.journals.findAll()

    if (filter.academicYearId) {
      journals = journals.filter((j) => j.academicYearId === filter.academicYearId)
    }
    if (filter.semester) {
      journals = journals.filter((j) => j.semester === filter.semester)
    }
    if (filter.startDate) {
      journals = journals.filter((j) => j.date >= filter.startDate!)
    }
    if (filter.endDate) {
      journals = journals.filter((j) => j.date <= filter.endDate!)
    }
    if (filter.classId) {
      journals = journals.filter((j) => j.classId === filter.classId)
    }
    if (filter.teacherId) {
      journals = journals.filter((j) => j.createdBy === filter.teacherId)
    }

    const teachers = await repositories.teachers.findAll()
    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t.id, t.name))

    const classes = await repositories.classes.findAll()
    const classMap = new Map<string, string>()
    classes.forEach((c) => classMap.set(c.id, c.name))

    const assignments = await repositories.teacherAssignments.findAll()
    const subjects = await repositories.subjects.findAll()
    const subjectMap = new Map<string, string>()
    subjects.forEach((s) => subjectMap.set(s.id, s.name))

    const asgSubjectMap = new Map<string, string>()
    assignments.forEach((a) => {
      const sName = subjectMap.get(a.subjectId) || 'Mata Pelajaran'
      asgSubjectMap.set(a.id, sName)
    })

    const items: JournalRecapItem[] = journals.map((j) => ({
      id: j.id,
      date: j.date,
      timeSlot: j.timeSlot || 'Jam Ke-1',
      teacherId: j.createdBy,
      teacherName: teacherMap.get(j.createdBy) || 'Guru',
      classId: j.classId,
      className: classMap.get(j.classId) || 'Kelas',
      subjectId: j.teacherAssignmentId,
      subjectName: asgSubjectMap.get(j.teacherAssignmentId) || 'Mata Pelajaran',
      topic: j.topic,
      learningObjectives: (j as any).learningObjectives || (j as any).curriculumPhase || '-',
      activitySummary: j.activitySummary,
      notes: j.notes || '-',
      status: (j as any).isLocked ? 'LOCKED' : 'COMPLETED',
      createdAt: j.createdAt
    }))

    // Sort chronologically DESC
    return items.sort((a, b) => b.date.localeCompare(a.date))
  }

  /**
   * 5. Assessment Recap
   */
  public async getAssessmentRecap(
    inputFilter: ReportFilterInput = {}
  ): Promise<AssessmentRecapItem[]> {
    const filter = await this.enforceReportAuthorization(inputFilter)

    let assessments = await repositories.assessments.findAll()

    if (filter.academicYearId) {
      assessments = assessments.filter((asm) => asm.academicYearId === filter.academicYearId)
    }
    if (filter.semester) {
      assessments = assessments.filter((asm) => asm.semester === filter.semester)
    }
    if (filter.startDate) {
      assessments = assessments.filter((asm) => (asm.date || '') >= filter.startDate!)
    }
    if (filter.endDate) {
      assessments = assessments.filter((asm) => (asm.date || '') <= filter.endDate!)
    }
    if (filter.classId) {
      assessments = assessments.filter((asm) => asm.classId === filter.classId)
    }
    if (filter.teacherId) {
      assessments = assessments.filter((asm) => asm.createdBy === filter.teacherId)
    }
    if (filter.assessmentType) {
      assessments = assessments.filter((asm) => asm.type === filter.assessmentType)
    }

    const teachers = await repositories.teachers.findAll()
    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t.id, t.name))

    const classes = await repositories.classes.findAll()
    const classMap = new Map<string, string>()
    classes.forEach((c) => classMap.set(c.id, c.name))

    const subjects = await repositories.subjects.findAll()
    const subjectMap = new Map<string, string>()
    subjects.forEach((s) => subjectMap.set(s.id, s.name))

    const items: AssessmentRecapItem[] = []

    for (const asm of assessments) {
      const subjectName = subjectMap.get(asm.subjectId) || 'Mata Pelajaran'
      const kkm = 75 // Default KKM or custom

      const validScores = (asm.scores || []).filter(
        (s) => s.score !== undefined && s.score !== null && !isNaN(Number(s.score))
      )

      let averageScore = 0
      let highestScore = 0
      let lowestScore = 0
      let passingCount = 0
      let failingCount = 0

      if (validScores.length > 0) {
        let sum = 0
        highestScore = Number(validScores[0].score)
        lowestScore = Number(validScores[0].score)

        for (const sc of validScores) {
          const scoreVal = Number(sc.score)
          sum += scoreVal
          if (scoreVal > highestScore) highestScore = scoreVal
          if (scoreVal < lowestScore) lowestScore = scoreVal
          if (scoreVal >= kkm) {
            passingCount++
          } else {
            failingCount++
          }
        }
        averageScore = Number((sum / validScores.length).toFixed(2))
      }

      const passingPercentage =
        validScores.length > 0 ? Number(((passingCount / validScores.length) * 100).toFixed(1)) : 0

      items.push({
        id: asm.id,
        title: asm.title,
        type: asm.type,
        date: asm.date || '-',
        classId: asm.classId,
        className: classMap.get(asm.classId) || 'Kelas',
        subjectId: asm.subjectId,
        subjectName,
        teacherId: asm.createdBy,
        teacherName: teacherMap.get(asm.createdBy) || 'Guru',
        maxScore: asm.maxScore || 100,
        kkm,
        totalStudentsGraded: validScores.length,
        averageScore,
        highestScore,
        lowestScore,
        studentsPassingKkm: passingCount,
        studentsBelowKkm: failingCount,
        passingPercentage
      })
    }

    return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }

  /**
   * 6. Student Academic Summary
   */
  public async getStudentSummary(
    studentId: string,
    filter: ReportFilterInput = {}
  ): Promise<StudentAcademicSummary> {
    const authorizedFilter = await this.enforceReportAuthorization({ ...filter, studentId })

    const student = await repositories.students.findById(studentId)
    if (!student) {
      throw new Error('Data siswa tidak ditemukan.')
    }

    const classEntity = await repositories.classes.findById(student.classId)
    const className = classEntity?.name || 'Kelas Tidak Diketahui'

    let homeroomTeacherName = '-'
    if (classEntity?.homeroomTeacherId) {
      const hr = await repositories.teachers.findById(classEntity.homeroomTeacherId)
      if (hr) homeroomTeacherName = hr.name
    }

    // Attendance stats
    const studentRecap = await this.getStudentAttendanceRecap({
      ...authorizedFilter,
      studentId: student.id,
      classId: student.classId
    })

    const attItem = studentRecap.students.find((s) => s.studentId === student.id) || {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpa: 0,
      terlambat: 0,
      dispensasi: 0,
      totalRecorded: 0,
      presencePercentage: 0
    }

    // Assessment stats
    const allAssessments = (await repositories.assessments.findAll()).filter(
      (a) => a.classId === student.classId
    )
    const subjects = await repositories.subjects.findAll()
    const subjectMap = new Map<string, string>()
    subjects.forEach((s) => subjectMap.set(s.id, s.name))

    const scoreDetails: StudentAcademicSummary['assessments']['details'] = []
    let totalScoreSum = 0
    let gradedCount = 0
    let highestScore = 0
    let lowestScore = 0
    let passingCount = 0
    let failingCount = 0

    for (const asm of allAssessments) {
      const studentScore = (asm.scores || []).find((s) => s.studentId === student.id)
      if (
        studentScore &&
        studentScore.score !== undefined &&
        studentScore.score !== null &&
        !isNaN(Number(studentScore.score))
      ) {
        const scoreVal = Number(studentScore.score)
        const kkm = 75
        const isPassing = scoreVal >= kkm

        gradedCount++
        totalScoreSum += scoreVal

        if (gradedCount === 1) {
          highestScore = scoreVal
          lowestScore = scoreVal
        } else {
          if (scoreVal > highestScore) highestScore = scoreVal
          if (scoreVal < lowestScore) lowestScore = scoreVal
        }

        if (isPassing) passingCount++
        else failingCount++

        scoreDetails.push({
          assessmentId: asm.id,
          title: asm.title,
          type: asm.type,
          subjectName: subjectMap.get(asm.subjectId) || 'Mata Pelajaran',
          date: asm.date || '-',
          score: scoreVal,
          maxScore: asm.maxScore || 100,
          kkm,
          isPassing
        })
      }
    }

    const averageScore = gradedCount > 0 ? Number((totalScoreSum / gradedCount).toFixed(2)) : 0

    // Discipline records for student
    const allDiscipline = await repositories.disciplineNotes.findAll()
    const studentDiscipline = allDiscipline.filter((d) => d.studentId === student.id)
    const totalDisciplinePoints = studentDiscipline.reduce((sum, d) => sum + (d.point || 0), 0)
    const disciplineNotes = studentDiscipline.map((d) => ({
      date: d.date,
      category: d.type || 'Disiplin',
      type: d.type || 'VIOLATION',
      description: d.description,
      points: d.point || 0
    }))

    return {
      student,
      className,
      homeroomTeacherName,
      attendance: {
        hadir: attItem.hadir,
        izin: attItem.izin,
        sakit: attItem.sakit,
        alpa: attItem.alpa,
        terlambat: attItem.terlambat,
        dispensasi: attItem.dispensasi,
        totalRecorded: attItem.totalRecorded,
        presencePercentage: attItem.presencePercentage
      },
      assessments: {
        totalAssessments: allAssessments.length,
        gradedCount,
        averageScore,
        highestScore,
        lowestScore,
        passingCount,
        failingCount,
        details: scoreDetails
      },
      discipline: {
        totalIncidents: studentDiscipline.length,
        totalPoints: totalDisciplinePoints,
        notes: disciplineNotes
      }
    }
  }

  /**
   * 7. Real Admin Dashboard Operational Metrics
   */
  public async getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const teachers = await repositories.teachers.findAll()
    const activeTeachers = teachers.filter((t) => t.status === 'ACTIVE').length

    const students = await repositories.students.findAll()
    const activeStudents = students.filter((s) => s.status === 'ACTIVE').length

    const classes = await repositories.classes.findAll()
    const activeClasses = classes.filter((c) => c.status === 'ACTIVE').length

    // Today scheduled sessions
    const todayStr = new Date().toISOString().split('T')[0]
    const todayDayOfWeek = this.getDayOfWeekFromDate(todayStr)

    const schedules = await repositories.schedules.findAll()
    const todayScheduledSessions = todayDayOfWeek
      ? schedules.filter((s) => s.dayOfWeek === todayDayOfWeek && s.status === 'ACTIVE').length
      : 0

    // Today attendance & journals submitted
    const attendances = await repositories.attendances.findAll()
    const todayAttendanceSubmitted = attendances.filter((a) => a.date === todayStr).length

    const journals = await repositories.journals.findAll()
    const todayJournalsSubmitted = journals.filter((j) => j.date === todayStr).length

    // Pending sync items
    const syncItems = await repositories.syncQueue.findAll()
    const pendingSyncCount = syncItems.filter(
      (i) => i.status === 'PENDING' || i.status === 'FAILED'
    ).length

    // Total assessments created
    const assessments = await repositories.assessments.findAll()
    const totalAssessmentsCreated = assessments.length

    return {
      activeTeachers,
      activeStudents,
      activeClasses,
      todayScheduledSessions,
      todayAttendanceSubmitted,
      todayJournalsSubmitted,
      pendingSyncCount,
      totalAssessmentsCreated
    }
  }

  /**
   * 8. Daily Attendance Recap (Tangal, Jam, Guru, Mapel, Kelas, Jumlah Siswa, Hadir, Izin, Sakit, Alpa, Terlambat, Dispensasi)
   */
  public async getDailyAttendanceRecap(
    inputFilter: ReportFilterInput = {}
  ): Promise<DailyAttendanceRecapItem[]> {
    const filter = await this.enforceReportAuthorization(inputFilter)

    let attendances = await repositories.attendances.findAll()
    if (filter.academicYearId) {
      attendances = attendances.filter((a) => a.academicYearId === filter.academicYearId)
    }
    if (filter.semester) {
      attendances = attendances.filter((a) => a.semester === filter.semester)
    }
    if (filter.startDate) {
      attendances = attendances.filter((a) => a.date >= filter.startDate!)
    }
    if (filter.endDate) {
      attendances = attendances.filter((a) => a.date <= filter.endDate!)
    }
    if (filter.classId) {
      attendances = attendances.filter((a) => a.classId === filter.classId)
    }
    if (filter.teacherId) {
      attendances = attendances.filter((a) => a.createdBy === filter.teacherId)
    }

    const teachers = await repositories.teachers.findAll()
    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t.id, t.name))

    const classes = await repositories.classes.findAll()
    const classMap = new Map<string, string>()
    classes.forEach((c) => classMap.set(c.id, c.name))

    const assignments = await repositories.teacherAssignments.findAll()
    const subjects = await repositories.subjects.findAll()
    const subjectMap = new Map<string, string>()
    subjects.forEach((s) => subjectMap.set(s.id, s.name))

    const asgSubjectMap = new Map<string, string>()
    assignments.forEach((a) => {
      const sName = subjectMap.get(a.subjectId) || 'Mata Pelajaran'
      asgSubjectMap.set(a.id, sName)
    })

    const results: DailyAttendanceRecapItem[] = attendances.map((att) => {
      let h = 0,
        i = 0,
        s = 0,
        a = 0,
        t = 0,
        d = 0
      for (const rec of att.records || []) {
        switch (rec.status) {
          case 'H':
            h++
            break
          case 'I':
            i++
            break
          case 'S':
            s++
            break
          case 'A':
            a++
            break
          case 'T':
            t++
            break
          case 'D':
            d++
            break
        }
      }
      const total = h + i + s + a + t + d
      return {
        id: att.id,
        date: att.date,
        timeSlot: 'Jam Reguler',
        teacherName: teacherMap.get(att.createdBy) || 'Guru Pengampu',
        subjectName: asgSubjectMap.get(att.teacherAssignmentId) || 'Mata Pelajaran',
        className: classMap.get(att.classId) || 'Kelas',
        totalStudents: total,
        hadir: h,
        izin: i,
        sakit: s,
        alpa: a,
        terlambat: t,
        dispensasi: d
      }
    })

    return results.sort((x, y) => y.date.localeCompare(x.date))
  }

  /**
   * 9. Discipline & Character Recap (Student, Class, Teacher, Date, Category, Severity, Points, Description, Follow-up)
   */
  public async getDisciplineRecap(
    inputFilter: ReportFilterInput = {}
  ): Promise<DisciplineRecapSummary> {
    const filter = await this.enforceReportAuthorization(inputFilter)

    let notes = await repositories.disciplineNotes.findAll()
    if (filter.startDate) {
      notes = notes.filter((n) => n.date >= filter.startDate!)
    }
    if (filter.endDate) {
      notes = notes.filter((n) => n.date <= filter.endDate!)
    }
    if (filter.classId) {
      notes = notes.filter((n) => n.classId === filter.classId)
    }
    if (filter.studentId) {
      notes = notes.filter((n) => n.studentId === filter.studentId)
    }
    if (filter.teacherId) {
      notes = notes.filter((n) => n.teacherId === filter.teacherId)
    }

    const students = await repositories.students.findAll()
    const studentMap = new Map<string, { nis: string; name: string }>()
    students.forEach((s) => studentMap.set(s.id, { nis: s.nis, name: s.name }))

    const classes = await repositories.classes.findAll()
    const classMap = new Map<string, string>()
    classes.forEach((c) => classMap.set(c.id, c.name))

    const teachers = await repositories.teachers.findAll()
    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t.id, t.name))

    let totalPoints = 0
    let totalPraise = 0
    let totalViolations = 0

    const items: DisciplineRecapItem[] = notes.map((n) => {
      const st = studentMap.get(n.studentId) || { nis: '-', name: 'Siswa' }
      const points = n.point || 0
      totalPoints += points
      if (n.type === 'PRAISE') {
        totalPraise++
      } else {
        totalViolations++
      }

      return {
        id: n.id,
        studentId: n.studentId,
        studentNis: st.nis,
        studentName: st.name,
        className: classMap.get(n.classId) || 'Kelas',
        teacherId: n.teacherId,
        teacherName: teacherMap.get(n.teacherId) || 'Guru',
        date: n.date,
        category: n.type || 'Disiplin',
        severity: 'NORMAL',
        points,
        type: n.type || 'VIOLATION',
        description: n.description,
        followUp: n.followup || '-',
        status: 'RESOLVED'
      }
    })

    items.sort((a, b) => b.date.localeCompare(a.date))

    return {
      totalIncidents: items.length,
      totalPoints,
      totalPraise,
      totalViolations,
      records: items
    }
  }

  /**
   * 10. Detailed Student Assessment Report (Preserving exact decimals, KKM status)
   */
  public async getDetailedAssessmentReport(
    inputFilter: ReportFilterInput = {}
  ): Promise<StudentAssessmentRowItem[]> {
    const filter = await this.enforceReportAuthorization(inputFilter)

    let assessments = await repositories.assessments.findAll()

    if (filter.academicYearId) {
      assessments = assessments.filter((asm) => asm.academicYearId === filter.academicYearId)
    }
    if (filter.semester) {
      assessments = assessments.filter((asm) => asm.semester === filter.semester)
    }
    if (filter.startDate) {
      assessments = assessments.filter((asm) => (asm.date || '') >= filter.startDate!)
    }
    if (filter.endDate) {
      assessments = assessments.filter((asm) => (asm.date || '') <= filter.endDate!)
    }
    if (filter.classId) {
      assessments = assessments.filter((asm) => asm.classId === filter.classId)
    }
    if (filter.teacherId) {
      assessments = assessments.filter((asm) => asm.createdBy === filter.teacherId)
    }
    if (filter.assessmentType) {
      assessments = assessments.filter((asm) => asm.type === filter.assessmentType)
    }
    if (filter.subjectId) {
      assessments = assessments.filter((asm) => asm.subjectId === filter.subjectId)
    }

    const teachers = await repositories.teachers.findAll()
    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t.id, t.name))

    const classes = await repositories.classes.findAll()
    const classMap = new Map<string, string>()
    classes.forEach((c) => classMap.set(c.id, c.name))

    const subjects = await repositories.subjects.findAll()
    const subjectMap = new Map<string, string>()
    subjects.forEach((s) => subjectMap.set(s.id, s.name))

    const students = await repositories.students.findAll()
    const studentMap = new Map<string, { nis: string; name: string }>()
    students.forEach((s) => studentMap.set(s.id, { nis: s.nis, name: s.name }))

    const rows: StudentAssessmentRowItem[] = []

    for (const asm of assessments) {
      const kkm = 75
      const teacherName = teacherMap.get(asm.createdBy) || 'Guru Pengampu'
      const subjectName = subjectMap.get(asm.subjectId) || 'Mata Pelajaran'
      const className = classMap.get(asm.classId) || 'Kelas'

      for (const sc of asm.scores || []) {
        if (filter.studentId && sc.studentId !== filter.studentId) continue

        const scoreNum = Number(sc.score)
        const st = studentMap.get(sc.studentId) || { nis: '-', name: 'Siswa' }
        rows.push({
          assessmentId: asm.id,
          assessmentTitle: asm.title,
          type: asm.type,
          date: asm.date || '',
          teacherName,
          subjectName,
          className,
          studentId: sc.studentId,
          studentNis: st.nis,
          studentName: st.name,
          score: scoreNum,
          kkm,
          status: scoreNum >= kkm ? 'TUNTAS' : 'BELUM TUNTAS'
        })
      }
    }

    return rows.sort((a, b) => a.studentName.localeCompare(b.studentName, 'id-ID'))
  }

  /**
   * 11. Teacher Completeness Recap
   */
  public async getTeacherCompletenessRecap(
    academicPeriodId?: string
  ): Promise<TeacherCompletenessRecapItem[]> {
    const teachers = await repositories.teachers.findAll()
    const activeTeachers = teachers.filter((t) => t.status === 'ACTIVE')

    const subService = SubmissionService.getInstance()
    const allSubmissions = await subService.findAll()

    const list: TeacherCompletenessRecapItem[] = []
    for (const t of activeTeachers) {
      const report = await completenessEngine.evaluateTeacherCompleteness(t.id, academicPeriodId)
      const matchingSub = allSubmissions.find(
        (s) =>
          s.teacherId === t.id && (!academicPeriodId || s.academicPeriodId === academicPeriodId)
      )

      const attItem =
        report.items.find(
          (i) => i.key === 'ATTENDANCE' || i.label.toLowerCase().includes('presensi')
        )?.percentage || 0
      const jrnItem =
        report.items.find((i) => i.key === 'JOURNAL' || i.label.toLowerCase().includes('jurnal'))
          ?.percentage || 0
      const asmItem =
        report.items.find((i) => i.key === 'ASSESSMENT' || i.label.toLowerCase().includes('nilai'))
          ?.percentage || 0
      const dscItem =
        report.items.find((i) => i.key === 'DISCIPLINE' || i.label.toLowerCase().includes('sikap'))
          ?.percentage || 0

      list.push({
        teacherId: t.id,
        nip: t.nip || '-',
        name: t.name,
        attendanceCompleteness: attItem,
        journalCompleteness: jrnItem,
        assessmentCompleteness: asmItem,
        disciplineCompleteness: dscItem,
        overallCompleteness: report.overallPercentage,
        isReadyToSubmit: report.isReadyToSubmit,
        submissionStatus:
          matchingSub?.status || (report.isReadyToSubmit ? 'READY_TO_SUBMIT' : 'DRAFT')
      })
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, 'id-ID'))
  }

  /**
   * 12. Real Structured XLSX Export Utility
   */
  public exportToXlsx(filename: string, sheets: XlsxWorksheetData[]): ArrayBuffer {
    const workbook = XLSX.utils.book_new()
    for (const sheet of sheets) {
      const wsData = [sheet.headers, ...sheet.rows]
      const worksheet = XLSX.utils.aoa_to_sheet(wsData)
      const safeSheetName = sheet.name.replace(/[:\\/?*[\]]/g, '').substring(0, 31) || 'Sheet'
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName)
    }
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${filename}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    }
    return buffer
  }

  /**
   * 13. Dedicated Browser Print Helper via clean iframe (No window.alert/window.open)
   */
  public printHtmlDocument(html: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    let iframe = document.getElementById('report-print-frame') as HTMLIFrameElement
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'report-print-frame'
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
    }
    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      iframe.contentWindow?.focus()
      setTimeout(() => {
        iframe.contentWindow?.print()
      }, 300)
    }
  }

  /**
   * 14. Export CSV Utility
   */
  public exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    if (typeof window !== 'undefined' && document) {
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `${filename}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  /**
   * 15. Generate Print HTML Document
   */
  public async generatePrintHtml(
    reportTitle: string,
    filterInfo: string,
    headers: string[],
    rows: (string | number)[][]
  ): Promise<string> {
    const school = await repositories.schoolIdentity.getIdentity()
    const nowStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const headerHtml = `
      <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase;">${
          school?.name || 'SMK NU UNGARAN'
        }</h2>
        <p style="margin: 4px 0; font-size: 12px; color: #333;">${
          school?.address || 'Jl. Kaligarang No. 9 Ungaran, Kab. Semarang'
        } | Telp: ${school?.contact || '-'}</p>
        <p style="margin: 0; font-size: 11px; font-style: italic;">NPSN: ${
          school?.npsn || '20320420'
        } | Kode Dokumen: ${school?.isoDocCode || 'FM.02.03.76.KUR.01.05'}</p>
      </div>
      <div style="text-align: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 16px; text-transform: uppercase; text-decoration: underline;">${reportTitle}</h3>
        <p style="margin: 4px 0; font-size: 12px; color: #555;">${filterInfo}</p>
      </div>
    `

    const tableHeadersHtml = headers
      .map(
        (h) =>
          `<th style="border: 1px solid #333; padding: 6px 8px; background: #f0f0f0; font-size: 11px;">${h}</th>`
      )
      .join('')
    const tableRowsHtml = rows
      .map(
        (r) =>
          `<tr>${r
            .map(
              (c) =>
                `<td style="border: 1px solid #333; padding: 6px 8px; font-size: 11px;">${c}</td>`
            )
            .join('')}</tr>`
      )
      .join('')

    const signatureHtml = `
      <div style="margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid;">
        <div style="text-align: center; width: 200px;">
          <p style="margin: 0; font-size: 12px;">Mengetahui,</p>
          <p style="margin: 0; font-size: 12px; font-weight: bold;">Kepala Sekolah</p>
          <div style="height: 60px;"></div>
          <p style="margin: 0; font-size: 12px; font-weight: bold; text-decoration: underline;">${
            school?.principalName || 'Dr. H. Ahmad Hanik, M.Pd.'
          }</p>
          <p style="margin: 0; font-size: 11px;">NIP: ${school?.principalNip || '-'}</p>
        </div>
        <div style="text-align: center; width: 220px;">
          <p style="margin: 0; font-size: 12px;">Ungaran, ${nowStr}</p>
          <p style="margin: 0; font-size: 12px; font-weight: bold;">WKS 1 Bidang Kurikulum</p>
          <div style="height: 60px;"></div>
          <p style="margin: 0; font-size: 12px; font-weight: bold; text-decoration: underline;">${
            school?.wks1Name || 'Siti Nur Asiyah, S.Pd.I.'
          }</p>
          <p style="margin: 0; font-size: 11px;">NIP: ${school?.wks1Nip || '-'}</p>
        </div>
      </div>
    `

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @media print {
              body { margin: 15mm; font-family: Arial, sans-serif; font-size: 12px; color: #000; }
              .no-print { display: none !important; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          ${headerHtml}
          <table>
            <thead><tr>${tableHeadersHtml}</tr></thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
          ${signatureHtml}
        </body>
      </html>
    `
  }

  /**
   * 10. Individual Student Report Card Aggregation (Kurikulum Merdeka)
   */
  public async getStudentReportCardData(params: {
    studentId: string
    classId: string
    academicYearId: string
    semester: SemesterType
  }): Promise<StudentReportCardData> {
    const { studentId, classId, academicYearId, semester } = params

    // RBAC Authorization check
    await this.enforceReportAuthorization({
      classId,
      studentId,
      academicYearId,
      semester
    })

    // 1. Fetch Student & Class
    const student = await repositories.students.findById(studentId)
    if (!student) {
      throw new Error('Data siswa tidak ditemukan.')
    }
    if (student.classId !== classId) {
      throw new Error('Data siswa tidak sesuai dengan rombel kelas yang dipilih.')
    }

    const classEntity = await repositories.classes.findById(classId)
    if (!classEntity) {
      throw new Error('Data kelas tidak ditemukan.')
    }

    // 2. Resolve Class Level & Merdeka Phase
    let phase = 'Fase E'
    if (classEntity.level === 'XI' || classEntity.level === 'XII') {
      phase = 'Fase F'
    }

    // 3. Resolve Major & Academic Year
    let majorName = 'Umum'
    if (classEntity.majorId) {
      const major = await repositories.majors.findById(classEntity.majorId)
      if (major) majorName = major.name
    }

    let academicYearName = 'Tahun Ajaran Aktif'
    if (academicYearId) {
      const ay = await repositories.academicYears.findById(academicYearId)
      if (ay) academicYearName = ay.name
    }

    // 4. Resolve Homeroom Teacher
    let homeroomTeacher = {
      id: '',
      name: '-',
      nip: '-'
    }
    if (classEntity.homeroomTeacherId) {
      const hr = await repositories.teachers.findById(classEntity.homeroomTeacherId)
      if (hr) {
        homeroomTeacher = {
          id: hr.id,
          name: hr.name,
          nip: hr.nip || '-'
        }
      }
    }

    // 5. Resolve School Identity & Principal
    const school = await repositories.schoolIdentity.getIdentity()
    const principal = {
      name: school?.principalName || 'Dr. H. Ahmad Hanik, M.Pd.',
      nip: school?.principalNip || '-'
    }

    // 6. Aggregate Attendance (Sakit, Izin, Alpa)
    const attendances = await repositories.attendances.findAll()
    let filteredAtts = attendances.filter(
      (a) => a.classId === classId && a.academicYearId === academicYearId && a.semester === semester
    )

    // Fallback: If no attendances match academicYearId/semester directly, match by classId
    if (filteredAtts.length === 0) {
      filteredAtts = attendances.filter((a) => a.classId === classId)
    }

    let hadir = 0
    let sakit = 0
    let izin = 0
    let alpa = 0
    let terlambat = 0
    let dispensasi = 0

    for (const att of filteredAtts) {
      const rec = (att.records || []).find((r) => r.studentId === studentId)
      if (rec) {
        if (rec.status === 'H') hadir++
        else if (rec.status === 'S') sakit++
        else if (rec.status === 'I') izin++
        else if (rec.status === 'A') alpa++
        else if (rec.status === 'T') terlambat++
        else if (rec.status === 'D') dispensasi++
      }
    }

    // 7. Aggregate Subject Assessments & Compute Final Scores
    const allAssessments = await repositories.assessments.findAll()
    const classAssessments = allAssessments.filter(
      (asm) =>
        asm.classId === classId &&
        asm.academicYearId === academicYearId &&
        asm.semester === semester
    )

    const subjects = await repositories.subjects.findAll()
    const subjectMap = new Map<string, (typeof subjects)[0]>()
    subjects.forEach((s) => subjectMap.set(s.id, s))

    const teachers = await repositories.teachers.findAll()
    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t.id, t.name))

    const assignments = await repositories.teacherAssignments.findAll()
    const schedules = await repositories.schedules.findAll()
    const classSchedules = schedules.filter(
      (s) => s.classId === classId && s.academicYearId === academicYearId && s.status === 'ACTIVE'
    )
    const classAssignmentIds = new Set(classSchedules.map((s) => s.teacherAssignmentId))
    const classAssignments = assignments.filter(
      (a) => classAssignmentIds.has(a.id) || (a as any).classId === classId
    )
    const asgTeacherMap = new Map<string, string>()
    classAssignments.forEach((a) => {
      const tName = teacherMap.get(a.teacherId) || 'Guru Pengampu'
      asgTeacherMap.set(a.subjectId, tName)
    })

    // Group assessments by subjectId
    const subjectAsmMap = new Map<string, typeof allAssessments>()
    for (const asm of classAssessments) {
      if (!subjectAsmMap.has(asm.subjectId)) {
        subjectAsmMap.set(asm.subjectId, [])
      }
      subjectAsmMap.get(asm.subjectId)!.push(asm)
    }

    // Identify all active subjects for this class from assignments and assessments
    const relevantSubjectIds = new Set<string>()
    classAssignments.forEach((a) => relevantSubjectIds.add(a.subjectId))
    classAssessments.forEach((asm) => relevantSubjectIds.add(asm.subjectId))

    // If still empty, include all active subjects
    if (relevantSubjectIds.size === 0) {
      subjects.filter((s) => s.status === 'ACTIVE').forEach((s) => relevantSubjectIds.add(s.id))
    }

    const reportSubjects: StudentReportCardSubjectScore[] = []

    for (const subjId of relevantSubjectIds) {
      const subjEntity = subjectMap.get(subjId)
      const subjName = subjEntity?.name || 'Mata Pelajaran'
      const subjCode = subjEntity?.code || 'MP'
      const subjCategory = subjEntity?.category || 'UMUM'
      const kkm = subjEntity?.defaultKkm || 75
      const tName = asgTeacherMap.get(subjId) || 'Guru Pengampu'

      const subjAssessments = subjectAsmMap.get(subjId) || []

      // Separate Formatif (HARIAN, TUGAS, KUIS, KETERAMPILAN, SIKAP), STS, SAS
      const formatifScores: Array<{ score: number; title: string }> = []
      let stsScore: number | null = null
      let sasScore: number | null = null
      let stsTitle = ''
      let sasTitle = ''

      for (const asm of subjAssessments) {
        const studentScoreObj = (asm.scores || []).find((s) => s.studentId === studentId)
        if (
          studentScoreObj &&
          studentScoreObj.score !== undefined &&
          studentScoreObj.score !== null &&
          !isNaN(Number(studentScoreObj.score))
        ) {
          const val = Number(studentScoreObj.score)
          if (asm.type === 'STS') {
            stsScore = val
            stsTitle = asm.title
          } else if (asm.type === 'SAS') {
            sasScore = val
            sasTitle = asm.title
          } else {
            // Formatif
            formatifScores.push({ score: val, title: asm.title })
          }
        }
      }

      // Calculate Formatif Average
      let formatifAverage: number | null = null
      if (formatifScores.length > 0) {
        const fSum = formatifScores.reduce((sum, item) => sum + item.score, 0)
        formatifAverage = Number((fSum / formatifScores.length).toFixed(2))
      }

      // Calculate Final Score (NA) according to deterministic formula
      let finalScore: number | null = null
      if (formatifAverage !== null && stsScore !== null && sasScore !== null) {
        // Formatif + STS + SAS: 50% Formatif + 25% STS + 25% SAS
        finalScore = Number((formatifAverage * 0.5 + stsScore * 0.25 + sasScore * 0.25).toFixed(2))
      } else if (formatifAverage !== null && stsScore !== null && sasScore === null) {
        // Formatif + STS: 60% Formatif + 40% STS
        finalScore = Number((formatifAverage * 0.6 + stsScore * 0.4).toFixed(2))
      } else if (formatifAverage !== null && stsScore === null && sasScore !== null) {
        // Formatif + SAS: 60% Formatif + 40% SAS
        finalScore = Number((formatifAverage * 0.6 + sasScore * 0.4).toFixed(2))
      } else if (formatifAverage === null && stsScore !== null && sasScore !== null) {
        // STS + SAS only: 50% STS + 50% SAS
        finalScore = Number(((stsScore + sasScore) / 2).toFixed(2))
      } else if (formatifAverage !== null && stsScore === null && sasScore === null) {
        // Formatif only
        finalScore = formatifAverage
      } else if (formatifAverage === null && stsScore !== null && sasScore === null) {
        finalScore = stsScore
      } else if (formatifAverage === null && stsScore === null && sasScore !== null) {
        finalScore = sasScore
      }

      const isPassing = finalScore !== null ? finalScore >= kkm : false

      // Generate Descriptive Competency / Capaian
      let competencyDescription = ''
      if (finalScore === null) {
        competencyDescription = 'Belum ada catatan penilaian pada semester ini.'
      } else {
        // Find best and lowest performing topics if available
        let bestTopic = ''
        let lowestTopic = ''
        if (formatifScores.length > 0) {
          const sorted = [...formatifScores].sort((a, b) => b.score - a.score)
          if (sorted[0].title) bestTopic = sorted[0].title
          if (sorted[sorted.length - 1].title) lowestTopic = sorted[sorted.length - 1].title
        } else if (stsTitle || sasTitle) {
          bestTopic = stsTitle || sasTitle
        }

        if (finalScore >= 85) {
          if (bestTopic) {
            competencyDescription = `Menunjukkan penguasaan materi yang sangat baik terutama dalam mencapai tujuan pembelajaran pada materi ${bestTopic}.`
          } else {
            competencyDescription = `Menunjukkan penguasaan materi yang sangat baik dan melampaui seluruh kriteria ketercapaian tujuan pembelajaran.`
          }
        } else if (finalScore >= kkm) {
          if (bestTopic) {
            competencyDescription = `Menunjukkan pemahaman yang baik dan telah tuntas pada materi ${bestTopic}. Perlu mempertahankan konsistensi belajar.`
          } else {
            competencyDescription = `Menunjukkan pemahaman yang baik dalam mencapai kriteria ketuntasan tujuan pembelajaran.`
          }
        } else {
          if (lowestTopic) {
            competencyDescription = `Menunjukkan pemahaman yang cukup, perlu pendampingan dan latihan intensif lebih lanjut terutama pada materi ${lowestTopic}.`
          } else {
            competencyDescription = `Menunjukkan pemahaman yang cukup, memerlukan bimbingan tambahan dan remidiasi untuk mencapai kriteria ketuntasan minimal.`
          }
        }
      }

      reportSubjects.push({
        subjectId: subjId,
        subjectCode: subjCode,
        subjectName: subjName,
        subjectCategory: subjCategory,
        teacherName: tName,
        formatifAverage,
        stsScore,
        sasScore,
        finalScore,
        kkm,
        isPassing,
        competencyDescription
      })
    }

    // Sort subjects: Category UMUM first, then KEJURUAN, then others, alphabetically by name
    const categoryOrder: Record<string, number> = {
      UMUM: 1,
      KEJURUAN: 2,
      MUATAN_LOKAL: 3,
      PILIHAN: 4
    }
    reportSubjects.sort((a, b) => {
      const orderA = categoryOrder[a.subjectCategory] || 99
      const orderB = categoryOrder[b.subjectCategory] || 99
      if (orderA !== orderB) return orderA - orderB
      return a.subjectName.localeCompare(b.subjectName, 'id-ID')
    })

    // 8. Optional Discipline / Character Recap (Phase A integration)
    let disciplineSummary: StudentReportCardData['disciplineSummary'] = undefined
    try {
      const allNotes = await repositories.disciplineNotes.findAll()
      const studentNotes = allNotes.filter((n) => n.studentId === studentId)
      if (studentNotes.length > 0) {
        let praiseCount = 0
        let violationCount = 0
        let totalPoints = 0
        const praiseNotes: string[] = []
        const violationNotes: string[] = []

        for (const n of studentNotes) {
          if (n.type === 'PRAISE') {
            praiseCount++
            totalPoints += n.point || 0
            if (n.description) praiseNotes.push(n.description)
          } else if (n.type === 'VIOLATION') {
            violationCount++
            totalPoints -= n.point || 0
            if (n.description) violationNotes.push(n.description)
          }
        }

        let characterNote = 'Menunjukkan sikap dan perilaku yang baik selama masa pembelajaran.'
        if (praiseCount > 0 && violationCount === 0) {
          characterNote = `Sangat aktif berpartisipasi dan menunjukkan keteladanan positif di lingkungan sekolah (${praiseNotes[0] || 'Prestasi baik'}).`
        } else if (violationCount > 0 && praiseCount > 0) {
          characterNote = `Memiliki potensi dan prestasi baik, namun perlu terus meningkatkan kedisiplinan dan tata tertib sekolah.`
        } else if (violationCount > 0) {
          characterNote = `Memerlukan pendampingan dan pembinaan berkala terkait kedisiplinan dan kepatuhan terhadap tata tertib sekolah.`
        }

        disciplineSummary = {
          totalNotes: studentNotes.length,
          praiseCount,
          violationCount,
          totalPoints,
          characterNote
        }
      }
    } catch {
      // Non-blocking if discipline is unavailable
    }

    const nowStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    return {
      student: {
        id: student.id,
        name: student.name,
        nis: student.nis || '-',
        nisn: student.nisn,
        gender: student.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        birthPlace: student.birthPlace,
        birthDate: student.birthDate
      },
      classInfo: {
        id: classEntity.id,
        name: classEntity.name,
        level: classEntity.level,
        phase,
        majorName,
        academicYearName,
        semester
      },
      homeroomTeacher,
      principal,
      school: {
        name: school?.name || 'SMK NU UNGARAN',
        npsn: school?.npsn || '20320420',
        address: school?.address || 'Jl. Kaligarang No. 9 Ungaran, Kab. Semarang',
        contact: school?.contact || '-',
        isoDocCode: school?.isoDocCode || 'FM.02.03.76.KUR.01.05'
      },
      subjects: reportSubjects,
      attendance: {
        sakit,
        izin,
        alpa,
        hadir,
        terlambat,
        dispensasi
      },
      disciplineSummary,
      printDate: nowStr,
      printLocation: 'Ungaran'
    }
  }

  /**
   * 11. Generate Printable Kurikulum Merdeka Student Report Card HTML (A4 Portrait)
   */
  public generateStudentReportCardHtml(
    reportData: StudentReportCardData | StudentReportCardData[]
  ): string {
    const dataList = Array.isArray(reportData) ? reportData : [reportData]

    const pagesHtml = dataList
      .map((data, index) => {
        const isLast = index === dataList.length - 1
        const pageBreakClass = isLast ? '' : 'page-break'

        // Group subjects table rows by category
        let currentCategory = ''
        let subjectIndex = 1

        const tableRowsHtml = data.subjects
          .map((subj) => {
            let categoryHeaderRow = ''
            if (subj.subjectCategory !== currentCategory) {
              currentCategory = subj.subjectCategory
              const categoryTitle =
                currentCategory === 'KEJURUAN'
                  ? 'B. KELOMPOK MATA PELAJARAN KEJURUAN'
                  : currentCategory === 'MUATAN_LOKAL'
                    ? 'C. MUATAN LOKAL'
                    : currentCategory === 'PILIHAN'
                      ? 'D. MATA PELAJARAN PILIHAN'
                      : 'A. KELOMPOK MATA PELAJARAN UMUM'

              categoryHeaderRow = `
                <tr style="background: #f8fafc;">
                  <td colspan="4" style="border: 1px solid #1e293b; padding: 6px 10px; font-weight: bold; font-size: 11px; text-transform: uppercase;">
                    ${categoryTitle}
                  </td>
                </tr>
              `
            }

            const finalScoreDisplay = subj.finalScore !== null ? Math.round(subj.finalScore) : '-'

            return `
              ${categoryHeaderRow}
              <tr>
                <td style="border: 1px solid #1e293b; padding: 6px 8px; text-align: center; font-size: 11px; vertical-align: top;">
                  ${subjectIndex++}
                </td>
                <td style="border: 1px solid #1e293b; padding: 6px 10px; font-size: 11px; vertical-align: top;">
                  <div style="font-weight: 600;">${subj.subjectName}</div>
                  <div style="font-size: 10px; color: #475569;">Pengampu: ${subj.teacherName}</div>
                </td>
                <td style="border: 1px solid #1e293b; padding: 6px 8px; text-align: center; font-size: 12px; font-weight: bold; vertical-align: top;">
                  ${finalScoreDisplay}
                </td>
                <td style="border: 1px solid #1e293b; padding: 6px 10px; font-size: 10.5px; line-height: 1.4; vertical-align: top;">
                  ${subj.competencyDescription}
                </td>
              </tr>
            `
          })
          .join('')

        const disciplineHtml = data.disciplineSummary
          ? `
            <div style="margin-top: 14px; border: 1px solid #1e293b; padding: 8px 12px; font-size: 11px; background: #fafafa;">
              <div style="font-weight: bold; margin-bottom: 3px; text-transform: uppercase; font-size: 10.5px;">
                Catatan Perkembangan Karakter & Kedisiplinan:
              </div>
              <div style="line-height: 1.4;">
                ${data.disciplineSummary.characterNote}
                <span style="font-size: 10px; color: #64748b; margin-left: 6px;">
                  (Total Poin: ${data.disciplineSummary.totalPoints > 0 ? '+' : ''}${data.disciplineSummary.totalPoints} &bull; ${data.disciplineSummary.praiseCount} Prestasi &bull; ${data.disciplineSummary.violationCount} Pelanggaran)
                </span>
              </div>
            </div>
          `
          : ''

        return `
          <div class="report-page ${pageBreakClass}">
            <!-- School Kop / Header -->
            <div style="text-align: center; border-bottom: 2.5px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
              <h2 style="margin: 0; font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${data.school.name}</h2>
              <p style="margin: 3px 0; font-size: 10.5px; color: #1e293b;">${data.school.address} &bull; Telp: ${data.school.contact}</p>
              <p style="margin: 0; font-size: 10px; font-style: italic; color: #475569;">NPSN: ${data.school.npsn} &bull; Dokumen Rapor Kurikulum Merdeka &bull; ${data.school.isoDocCode || ''}</p>
            </div>

            <!-- Title -->
            <div style="text-align: center; margin-bottom: 12px;">
              <h3 style="margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase; text-decoration: underline;">
                LAPORAN HASIL BELAJAR (RAPOR)
              </h3>
            </div>

            <!-- Identity Grid -->
            <table style="width: 100%; border: none; margin-bottom: 12px; font-size: 11px;">
              <tr>
                <td style="width: 16%; padding: 2px 0;"><strong>Nama Siswa</strong></td>
                <td style="width: 2%; padding: 2px 0;">:</td>
                <td style="width: 42%; padding: 2px 0; font-weight: bold;">${data.student.name}</td>
                <td style="width: 18%; padding: 2px 0;"><strong>Kelas / Fase</strong></td>
                <td style="width: 2%; padding: 2px 0;">:</td>
                <td style="width: 20%; padding: 2px 0;">${data.classInfo.name} / ${data.classInfo.phase}</td>
              </tr>
              <tr>
                <td style="padding: 2px 0;"><strong>NIS / NISN</strong></td>
                <td style="padding: 2px 0;">:</td>
                <td style="padding: 2px 0;">${data.student.nis} / ${data.student.nisn || '-'}</td>
                <td style="padding: 2px 0;"><strong>Semester</strong></td>
                <td style="padding: 2px 0;">:</td>
                <td style="padding: 2px 0;">${data.classInfo.semester === 'GANJIL' ? '1 (Ganjil)' : '2 (Genap)'}</td>
              </tr>
              <tr>
                <td style="padding: 2px 0;"><strong>Program Keahlian</strong></td>
                <td style="padding: 2px 0;">:</td>
                <td style="padding: 2px 0;">${data.classInfo.majorName}</td>
                <td style="padding: 2px 0;"><strong>Tahun Ajaran</strong></td>
                <td style="padding: 2px 0;">:</td>
                <td style="padding: 2px 0;">${data.classInfo.academicYearName}</td>
              </tr>
            </table>

            <!-- Main Scores Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
              <thead>
                <tr style="background: #e2e8f0;">
                  <th style="border: 1px solid #1e293b; padding: 6px 4px; width: 35px; font-size: 11px; text-align: center;">No</th>
                  <th style="border: 1px solid #1e293b; padding: 6px 10px; width: 220px; font-size: 11px; text-align: left;">Mata Pelajaran</th>
                  <th style="border: 1px solid #1e293b; padding: 6px 6px; width: 65px; font-size: 11px; text-align: center;">Nilai Akhir</th>
                  <th style="border: 1px solid #1e293b; padding: 6px 10px; font-size: 11px; text-align: left;">Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <!-- Lower Section: Attendance & Character -->
            <div style="display: flex; gap: 16px; margin-top: 8px; page-break-inside: avoid;">
              <!-- Attendance Box -->
              <div style="flex: 1; border: 1px solid #1e293b; padding: 8px 12px; font-size: 11px;">
                <div style="font-weight: bold; margin-bottom: 6px; text-transform: uppercase; font-size: 10.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">
                  Ketidakhadiran
                </div>
                <table style="width: 100%; font-size: 11px;">
                  <tr>
                    <td style="width: 70%; padding: 2px 0;">1. Sakit</td>
                    <td style="width: 10%;">:</td>
                    <td style="width: 20%; font-weight: bold;">${data.attendance.sakit} hari</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0;">2. Izin</td>
                    <td>:</td>
                    <td style="font-weight: bold;">${data.attendance.izin} hari</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0;">3. Tanpa Keterangan</td>
                    <td>:</td>
                    <td style="font-weight: bold;">${data.attendance.alpa} hari</td>
                  </tr>
                </table>
              </div>

              <!-- Extra Note / Decision Area -->
              <div style="flex: 1.5; border: 1px solid #1e293b; padding: 8px 12px; font-size: 11px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-weight: bold; margin-bottom: 4px; text-transform: uppercase; font-size: 10.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">
                    Catatan Wali Kelas
                  </div>
                  <p style="margin: 4px 0; font-size: 10.5px; line-height: 1.4; color: #1e293b;">
                    Tingkatkan terus prestasi akademik dan kedisiplinan belajar untuk menyongsong kompetensi kejuruan yang unggul.
                  </p>
                </div>
                <div style="font-size: 10px; color: #64748b; text-align: right;">
                  Dokumen dicetak otomatis oleh Sistem Guru Offline
                </div>
              </div>
            </div>

            ${disciplineHtml}

            <!-- 3-Column Signatures -->
            <div style="margin-top: 25px; display: flex; justify-content: space-between; page-break-inside: avoid; font-size: 11px;">
              <div style="text-align: center; width: 180px;">
                <p style="margin: 0;">Mengetahui,</p>
                <p style="margin: 2px 0 0 0; font-weight: bold;">Orang Tua / Wali Siswa</p>
                <div style="height: 55px;"></div>
                <p style="margin: 0; border-bottom: 1px dotted #000; width: 140px; margin: 0 auto;"></p>
              </div>

              <div style="text-align: center; width: 220px;">
                <p style="margin: 0;">${data.printLocation}, ${data.printDate}</p>
                <p style="margin: 2px 0 0 0; font-weight: bold;">Wali Kelas</p>
                <div style="height: 55px;"></div>
                <p style="margin: 0; font-weight: bold; text-decoration: underline;">${data.homeroomTeacher.name}</p>
                <p style="margin: 2px 0 0 0; font-size: 10px;">NIP: ${data.homeroomTeacher.nip || '-'}</p>
              </div>
            </div>

            <!-- Principal Signature Centered Underneath -->
            <div style="margin-top: 15px; text-align: center; page-break-inside: avoid; font-size: 11px;">
              <p style="margin: 0;">Mengetahui,</p>
              <p style="margin: 2px 0 0 0; font-weight: bold;">Kepala SMK NU Ungaran</p>
              <div style="height: 55px;"></div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline;">${data.principal.name}</p>
              <p style="margin: 2px 0 0 0; font-size: 10px;">NIP: ${data.principal.nip || '-'}</p>
            </div>
          </div>
        `
      })
      .join('')

    return `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Laporan Hasil Belajar Siswa - Kurikulum Merdeka</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 12mm 15mm 12mm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #0f172a;
              background: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-page {
              width: 100%;
              box-sizing: border-box;
              margin-bottom: 20px;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
              .report-page { margin-bottom: 0; }
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `
  }
}

export const reportService = new ReportService()
