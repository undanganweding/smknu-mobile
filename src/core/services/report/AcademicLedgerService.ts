import { repositories } from '../../repositories'
import { authService, AuthorizationError } from '../auth'
import type { SemesterType } from '../../types'
import * as XLSX from 'xlsx'

export interface LedgerPreview {
  headers: string[]
  rows: any[]
}

export class AcademicLedgerService {
  /**
   * Enforces ADMIN role authorization
   */
  private enforceAdmin(): void {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new AuthorizationError('Sesi pengguna tidak ditemukan. Silakan login kembali.')
    }
    if (session.role !== 'ADMIN') {
      throw new AuthorizationError(
        'Akses Ditolak: Hanya administrator yang dapat mengakses Ledger Akademik.'
      )
    }
  }

  /**
   * Generate Grade Ledger data for Preview and Excel
   */
  public async getGradeLedgerData(
    academicYearId: string,
    semester: SemesterType,
    classId?: string
  ) {
    this.enforceAdmin()

    // 1. Fetch academic year details
    const academicYear = await repositories.academicYears.findById(academicYearId)
    if (!academicYear) {
      throw new Error('Tahun akademik tidak ditemukan.')
    }

    // 2. Fetch basic data
    const allStudents = await repositories.students.findAll()
    const allClasses = await repositories.classes.findAll()
    const allSubjects = await repositories.subjects.findAll()
    const allAssessments = await repositories.assessments.findAll()

    // Create lookup maps for fast access
    const classMap = new Map(allClasses.map((c) => [c.id, c]))
    const subjectMap = new Map(allSubjects.map((s) => [s.id, s]))

    // Filter classes
    const targetClasses = classId
      ? allClasses.filter((c) => c.id === classId)
      : allClasses.filter((c) => c.academicYearId === academicYearId)

    const targetClassIds = new Set(targetClasses.map((c) => c.id))

    // Filter students belonging to target classes
    const students = allStudents.filter(
      (s) => targetClassIds.has(s.classId) && s.status === 'ACTIVE'
    )

    // Sort students by class and name
    students.sort((a, b) => {
      const classA = classMap.get(a.classId)?.name || ''
      const classB = classMap.get(b.classId)?.name || ''
      if (classA !== classB) return classA.localeCompare(classB)
      return a.name.localeCompare(b.name)
    })

    // Filter assessments matching year & semester
    const assessments = allAssessments.filter(
      (asm) => asm.academicYearId === academicYearId && asm.semester === semester
    )

    // Group assessments by student's classId & subjectId
    // key: classId_subjectId
    const assessmentsGrouped = new Map<string, typeof assessments>()
    for (const asm of assessments) {
      const key = `${asm.classId}_${asm.subjectId}`
      if (!assessmentsGrouped.has(key)) {
        assessmentsGrouped.set(key, [])
      }
      assessmentsGrouped.get(key)!.push(asm)
    }

    // Identify unique subjects active in the filtered scope
    const activeSubjectIds = new Set<string>()
    for (const asm of assessments) {
      if (classId) {
        if (asm.classId === classId) {
          activeSubjectIds.add(asm.subjectId)
        }
      } else {
        if (targetClassIds.has(asm.classId)) {
          activeSubjectIds.add(asm.subjectId)
        }
      }
    }

    // Sort active subjects alphabetically by name
    const activeSubjects = Array.from(activeSubjectIds)
      .map((sid) => subjectMap.get(sid))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .sort((a, b) => a.name.localeCompare(b.name))

    // Build ledger rows
    const rows = students.map((student, idx) => {
      const className = classMap.get(student.classId)?.name || 'N/A'
      const grades: Record<string, number | null> = {}
      let totalSum = 0
      let gradedSubjectsCount = 0
      let belowKkmCount = 0

      for (const subject of activeSubjects) {
        const key = `${student.classId}_${subject.id}`
        const subjAssessments = assessmentsGrouped.get(key) || []

        // Separate Formatif, STS, SAS
        const formatifScores: number[] = []
        let stsScore: number | null = null
        let sasScore: number | null = null

        for (const asm of subjAssessments) {
          const studentScoreObj = (asm.scores || []).find((s) => s.studentId === student.id)
          if (
            studentScoreObj &&
            studentScoreObj.score !== undefined &&
            studentScoreObj.score !== null &&
            !isNaN(Number(studentScoreObj.score))
          ) {
            const val = Number(studentScoreObj.score)
            if (asm.type === 'STS') {
              stsScore = val
            } else if (asm.type === 'SAS') {
              sasScore = val
            } else {
              formatifScores.push(val)
            }
          }
        }

        // Formatif average
        let formatifAverage: number | null = null
        if (formatifScores.length > 0) {
          const fSum = formatifScores.reduce((sum, s) => sum + s, 0)
          formatifAverage = Number((fSum / formatifScores.length).toFixed(2))
        }

        // Calculate Final Score (NA) according to the precise formula
        let finalScore: number | null = null
        if (formatifAverage !== null && stsScore !== null && sasScore !== null) {
          finalScore = Number(
            (formatifAverage * 0.5 + stsScore * 0.25 + sasScore * 0.25).toFixed(2)
          )
        } else if (formatifAverage !== null && stsScore !== null && sasScore === null) {
          finalScore = Number((formatifAverage * 0.6 + stsScore * 0.4).toFixed(2))
        } else if (formatifAverage !== null && stsScore === null && sasScore !== null) {
          finalScore = Number((formatifAverage * 0.6 + sasScore * 0.4).toFixed(2))
        } else if (formatifAverage === null && stsScore !== null && sasScore !== null) {
          finalScore = Number(((stsScore + sasScore) / 2).toFixed(2))
        } else if (formatifAverage !== null && stsScore === null && sasScore === null) {
          finalScore = formatifAverage
        } else if (formatifAverage === null && stsScore !== null && sasScore === null) {
          finalScore = stsScore
        } else if (formatifAverage === null && stsScore === null && sasScore !== null) {
          finalScore = sasScore
        }

        grades[subject.code] = finalScore

        if (finalScore !== null) {
          totalSum += finalScore
          gradedSubjectsCount++
          const kkm = subject.defaultKkm ?? 75
          if (finalScore < kkm) {
            belowKkmCount++
          }
        }
      }

      const averageScore =
        gradedSubjectsCount > 0 ? Number((totalSum / gradedSubjectsCount).toFixed(2)) : null
      const status =
        belowKkmCount === 0 && gradedSubjectsCount > 0
          ? 'TUNTAS'
          : gradedSubjectsCount > 0
            ? 'PERLU REMEDIAL'
            : 'BELUM ADA NILAI'

      return {
        no: idx + 1,
        nis: student.nis,
        name: student.name,
        className,
        grades,
        averageScore,
        belowKkmCount,
        status
      }
    })

    return {
      subjects: activeSubjects,
      students,
      rows,
      classMap
    }
  }

  /**
   * Aggregates Attendance Ledger data
   */
  public async getAttendanceLedgerData(
    academicYearId: string,
    semester: SemesterType,
    classId?: string
  ) {
    this.enforceAdmin()

    const allStudents = await repositories.students.findAll()
    const allClasses = await repositories.classes.findAll()
    const allAttendances = await repositories.attendances.findAll()

    const classMap = new Map(allClasses.map((c) => [c.id, c]))
    const targetClasses = classId
      ? allClasses.filter((c) => c.id === classId)
      : allClasses.filter((c) => c.academicYearId === academicYearId)

    const targetClassIds = new Set(targetClasses.map((c) => c.id))

    // Filter students
    const students = allStudents.filter(
      (s) => targetClassIds.has(s.classId) && s.status === 'ACTIVE'
    )

    students.sort((a, b) => {
      const classA = classMap.get(a.classId)?.name || ''
      const classB = classMap.get(b.classId)?.name || ''
      if (classA !== classB) return classA.localeCompare(classB)
      return a.name.localeCompare(b.name)
    })

    // Filter attendances
    const attendances = allAttendances.filter(
      (att) =>
        att.academicYearId === academicYearId &&
        att.semester === semester &&
        targetClassIds.has(att.classId)
    )

    // Tally attendance per student
    const studentTally = new Map<
      string,
      { H: number; I: number; S: number; A: number; T: number; D: number; total: number }
    >()

    for (const student of students) {
      studentTally.set(student.id, { H: 0, I: 0, S: 0, A: 0, T: 0, D: 0, total: 0 })
    }

    for (const att of attendances) {
      for (const rec of att.records) {
        const tally = studentTally.get(rec.studentId)
        if (tally) {
          tally.total++
          if (rec.status === 'H') tally.H++
          else if (rec.status === 'I') tally.I++
          else if (rec.status === 'S') tally.S++
          else if (rec.status === 'A') tally.A++
          else if (rec.status === 'T') tally.T++
          else if (rec.status === 'D') tally.D++
        }
      }
    }

    return students.map((student, idx) => {
      const className = classMap.get(student.classId)?.name || 'N/A'
      const tally = studentTally.get(student.id) || { H: 0, I: 0, S: 0, A: 0, T: 0, D: 0, total: 0 }
      const totalPresence = tally.H + tally.T + tally.D
      const presencePercentage =
        tally.total > 0 ? Number(((totalPresence / tally.total) * 100).toFixed(1)) : 0

      return {
        no: idx + 1,
        nis: student.nis,
        name: student.name,
        className,
        hadir: tally.H,
        izin: tally.I,
        sakit: tally.S,
        alpa: tally.A,
        terlambat: tally.T,
        dispensasi: tally.D,
        total: tally.total,
        percentage: presencePercentage
      }
    })
  }

  /**
   * Aggregates Discipline Ledger data
   */
  public async getDisciplineLedgerData(academicYearId: string, classId?: string) {
    this.enforceAdmin()

    // Retrieve academic year boundary dates
    const academicYear = await repositories.academicYears.findById(academicYearId)
    if (!academicYear) {
      throw new Error('Tahun akademik tidak ditemukan.')
    }

    const allStudents = await repositories.students.findAll()
    const allClasses = await repositories.classes.findAll()
    const allNotes = await repositories.disciplineNotes.findAll()
    const teachers = await repositories.teachers.findAll()

    const classMap = new Map(allClasses.map((c) => [c.id, c]))
    const studentMap = new Map(allStudents.map((s) => [s.id, s]))
    const teacherMap = new Map(teachers.map((t) => [t.id, t]))

    const targetClasses = classId
      ? allClasses.filter((c) => c.id === classId)
      : allClasses.filter((c) => c.academicYearId === academicYearId)

    const targetClassIds = new Set(targetClasses.map((c) => c.id))

    // Filter notes by class, student active status, and academic year date bounds
    const notesFiltered = allNotes.filter((note) => {
      if (!targetClassIds.has(note.classId)) return false
      const student = studentMap.get(note.studentId)
      if (!student || student.status !== 'ACTIVE') return false

      // Check dates matching academic year
      const dateVal = note.date // YYYY-MM-DD
      const start = academicYear.startDate // YYYY-MM-DD
      const end = academicYear.endDate // YYYY-MM-DD
      return dateVal >= start && dateVal <= end
    })

    // Sort by date ascending
    notesFiltered.sort((a, b) => a.date.localeCompare(b.date))

    return notesFiltered.map((note, idx) => {
      const student = studentMap.get(note.studentId)
      const className = classMap.get(note.classId)?.name || 'N/A'
      const teacherName = teacherMap.get(note.teacherId)?.name || 'Administrator/Petugas'

      let kategoriIndo = 'CATATAN'
      if (note.type === 'VIOLATION') kategoriIndo = 'PELANGGARAN'
      else if (note.type === 'PRAISE') kategoriIndo = 'PUJIAN'

      return {
        no: idx + 1,
        date: note.date,
        nis: student?.nis || 'N/A',
        name: student?.name || 'N/A',
        className,
        category: kategoriIndo,
        point: note.point || 0,
        description: note.description || '',
        followup: note.followup || '-',
        officer: teacherName
      }
    })
  }

  /**
   * Aggregates Teacher Teaching Load
   */
  public async getTeacherTeachingLoadData(academicYearId: string, semester: SemesterType) {
    this.enforceAdmin()

    const teachers = await repositories.teachers.findAll()
    const teacherAssignments = await repositories.teacherAssignments.findAll()
    const schedules = await repositories.schedules.findAll()
    const journals = await repositories.journals.findAll()
    const subjects = await repositories.subjects.findAll()
    const classes = await repositories.classes.findAll()

    const subjectMap = new Map(subjects.map((s) => [s.id, s]))
    const classMap = new Map(classes.map((c) => [c.id, c]))

    // Filter assignments and schedules
    const assignmentsFiltered = teacherAssignments.filter(
      (asg) => asg.academicYearId === academicYearId && asg.semester === semester
    )

    const scheduleFiltered = schedules.filter((sch) => sch.academicYearId === academicYearId)

    const journalsFiltered = journals.filter(
      (j) => j.academicYearId === academicYearId && j.semester === semester
    )

    // Sort teachers by name
    const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name))

    return sortedTeachers.map((teacher, idx) => {
      // Get assignments
      const tAsgs = assignmentsFiltered.filter((a) => a.teacherId === teacher.id)
      const tAsgIds = new Set(tAsgs.map((a) => a.id))

      // Extract unique subject names
      const subjNames = Array.from(
        new Set(tAsgs.map((a) => subjectMap.get(a.subjectId)?.name).filter(Boolean))
      )

      // Extract unique classes taught via assignments or schedules
      const classIds = new Set<string>()
      for (const asg of tAsgs) {
        // Find schedules corresponding to this assignment
        const asgSchedules = scheduleFiltered.filter((s) => s.teacherAssignmentId === asg.id)
        for (const s of asgSchedules) {
          classIds.add(s.classId)
        }
      }
      const classNames = Array.from(classIds)
        .map((cid) => classMap.get(cid)?.name)
        .filter(Boolean)
        .sort()

      // Calculate total weekly hours
      const totalHours = tAsgs.reduce((sum, a) => sum + (a.hours || 0), 0)

      // Total scheduled sessions (schedules count)
      const scheduledSessions = scheduleFiltered.filter((sch) =>
        tAsgIds.has(sch.teacherAssignmentId)
      ).length

      // Total journals submitted
      const journalsSubmitted = journalsFiltered.filter((j) =>
        tAsgIds.has(j.teacherAssignmentId)
      ).length

      // Journal compliance rate
      const complianceRate =
        scheduledSessions > 0
          ? Number(((journalsSubmitted / scheduledSessions) * 100).toFixed(1))
          : 0

      return {
        no: idx + 1,
        code: teacher.nip || teacher.id.substring(0, 8).toUpperCase(),
        name: teacher.name,
        nip: teacher.nip || '-',
        subjects: subjNames.join(', ') || '-',
        classes: classNames.join(', ') || '-',
        totalHours,
        scheduledSessions,
        journalsSubmitted,
        complianceRate: `${complianceRate}%`
      }
    })
  }

  /**
   * Get preview ledger matching filters for view
   */
  public async getLedgerPreview(
    academicYearId: string,
    semester: SemesterType,
    classId?: string
  ): Promise<LedgerPreview> {
    const { subjects, rows } = await this.getGradeLedgerData(academicYearId, semester, classId)

    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas']
    for (const subject of subjects) {
      headers.push(subject.code)
    }
    headers.push('Rata-rata', 'Di Bawah KKM', 'Status')

    const tableRows = rows.map((r) => {
      const studentRow: any = {
        no: r.no,
        nis: r.nis,
        name: r.name,
        className: r.className
      }
      for (const subject of subjects) {
        studentRow[subject.code] = r.grades[subject.code] ?? '-'
      }
      studentRow['average'] = r.averageScore ?? '-'
      studentRow['belowKkm'] = r.belowKkmCount
      studentRow['status'] = r.status
      return studentRow
    })

    return {
      headers,
      rows: tableRows
    }
  }

  /**
   * Generates a comprehensive multi-sheet XLSX Workbook
   */
  public async generateLedgerXlsx(
    academicYearId: string,
    semester: SemesterType,
    classId?: string
  ): Promise<{ filename: string; mimeType: string; content: any }> {
    this.enforceAdmin()

    // A. Grade Ledger Sheet
    const gradeData = await this.getGradeLedgerData(academicYearId, semester, classId)
    const gradeHeaders = ['No', 'NIS', 'Nama Siswa', 'Kelas']
    for (const s of gradeData.subjects) {
      gradeHeaders.push(`${s.name} (${s.code})`)
    }
    gradeHeaders.push('Rata-rata', 'Di Bawah KKM', 'Status')

    const gradeRows = gradeData.rows.map((r) => {
      const rowArr: any[] = [r.no, r.nis, r.name, r.className]
      for (const s of gradeData.subjects) {
        rowArr.push(r.grades[s.code] ?? '-')
      }
      rowArr.push(r.averageScore ?? '-', r.belowKkmCount, r.status)
      return rowArr
    })
    const gradeSheetData = [gradeHeaders, ...gradeRows]

    // B. Attendance Ledger Sheet
    const attData = await this.getAttendanceLedgerData(academicYearId, semester, classId)
    const attHeaders = [
      'No',
      'NIS',
      'Nama Siswa',
      'Kelas',
      'Hadir (H)',
      'Izin (I)',
      'Sakit (S)',
      'Alpa (A)',
      'Terlambat (T)',
      'Dispensasi (D)',
      'Total Sesi',
      'Persentase Kehadiran (%)'
    ]
    const attRows = attData.map((r) => [
      r.no,
      r.nis,
      r.name,
      r.className,
      r.hadir,
      r.izin,
      r.sakit,
      r.alpa,
      r.terlambat,
      r.dispensasi,
      r.total,
      r.percentage
    ])
    const attSheetData = [attHeaders, ...attRows]

    // C. Discipline Ledger Sheet
    const discData = await this.getDisciplineLedgerData(academicYearId, classId)
    const discHeaders = [
      'No',
      'Tanggal',
      'NIS',
      'Nama Siswa',
      'Kelas',
      'Kategori',
      'Poin',
      'Deskripsi Kejadian',
      'Tindak Lanjut',
      'Petugas Pencatat'
    ]
    const discRows = discData.map((r) => [
      r.no,
      r.date,
      r.nis,
      r.name,
      r.className,
      r.category,
      r.point,
      r.description,
      r.followup,
      r.officer
    ])
    const discSheetData = [discHeaders, ...discRows]

    // D. Teacher Teaching Load Sheet
    const loadData = await this.getTeacherTeachingLoadData(academicYearId, semester)
    const loadHeaders = [
      'No',
      'Kode Guru / NIP',
      'Nama Guru',
      'NIP/NIK',
      'Mata Pelajaran Diampu',
      'Kelas Yang Diajar',
      'Alokasi Jam Mengajar (JP)',
      'Sesi Terjadwal',
      'Jurnal Mengajar Terisi',
      'Kepatuhan Jurnal (%)'
    ]
    const loadRows = loadData.map((r) => [
      r.no,
      r.code,
      r.name,
      r.nip,
      r.subjects,
      r.classes,
      r.totalHours,
      r.scheduledSessions,
      r.journalsSubmitted,
      r.complianceRate
    ])
    const loadSheetData = [loadHeaders, ...loadRows]

    // Build the Workbook
    const workbook = XLSX.utils.book_new()

    // Add sheets
    const gradeWS = XLSX.utils.aoa_to_sheet(gradeSheetData)
    XLSX.utils.book_append_sheet(workbook, gradeWS, 'Grade Ledger')

    const attWS = XLSX.utils.aoa_to_sheet(attSheetData)
    XLSX.utils.book_append_sheet(workbook, attWS, 'Attendance Ledger')

    const discWS = XLSX.utils.aoa_to_sheet(discSheetData)
    XLSX.utils.book_append_sheet(workbook, discWS, 'Discipline Ledger')

    const loadWS = XLSX.utils.aoa_to_sheet(loadSheetData)
    XLSX.utils.book_append_sheet(workbook, loadWS, 'Teacher Load')

    // Write file content buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

    const classNameClean = classId ? `_${classId}` : '_SEMUA_KELAS'
    const filename = `LEDGER_AKADEMIK_${semester}_${academicYearId}${classNameClean}.xlsx`

    return {
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: buffer
    }
  }
}

export const academicLedgerService = new AcademicLedgerService()
