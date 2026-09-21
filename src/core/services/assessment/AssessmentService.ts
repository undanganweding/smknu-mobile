/**
 * Guru Offline - Assessment Service (Phase 3C)
 * Source of Truth: MASTER_SPEC.md, ARCHITECTURE.md, DATABASE_SCHEMA.md
 *
 * Rules:
 * 1. 100% Offline IndexedDB architecture: View -> Service -> Repository -> IndexedDB.
 * 2. Teacher Authorization: A teacher can only access, create, update, score, or delete
 *    assessments linked to their own teacher assignments.
 * 3. Exact 1 active score per studentId + assessmentId (upsert / deduplication).
 * 4. Ungraded students are NOT counted as 0. Statistics (avg, min, max) only consider graded students.
 * 5. Decimal scores (e.g. 85.5, 87.25) are preserved with full precision (no silent rounding).
 * 6. Numeric validation: score must be >= 0 and <= maxScore. Reject NaN, Infinity, strings, and negatives.
 */

import { repositories } from '../../repositories'
import { authService } from '../auth/AuthService'
import { syncService } from '../sync/SyncService'
import { academicLockGuardService } from '../academic/AcademicLockGuardService'
import type {
  AssessmentEntity,
  AssessmentType,
  StudentAssessmentScore,
  SemesterType,
  TeacherAssignmentEntity
} from '../../types'

export interface CreateAssessmentDTO {
  teacherAssignmentId: string
  classId: string
  type: AssessmentType
  title: string
  date?: string
  maxScore?: number
}

export interface UpdateAssessmentDTO {
  title?: string
  type?: AssessmentType
  date?: string
  maxScore?: number
}

export interface StudentScoreInputDTO {
  studentId: string
  score?: number | null | string
  feedback?: string
}

export interface AssessmentStatistics {
  totalStudents: number
  gradedCount: number
  ungradedCount: number
  averageScore: number | null
  minScore: number | null
  maxScore: number | null
  passedKkmCount: number
  failedKkmCount: number
  kkm: number
}

export interface ResolvedAssessmentItem {
  id: string
  academicYearId: string
  academicYearName: string
  semester: SemesterType

  classId: string
  className: string
  classLevel: string
  rombel: number | string
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
  kkm: number

  type: AssessmentType
  title: string
  date: string
  maxScore: number

  statistics: AssessmentStatistics
  createdAt: string
  updatedAt: string
}

export interface AssessmentRosterStudentItem {
  studentId: string
  nis: string
  nisn?: string
  name: string
  gender: string
  score?: number
  feedback?: string
  isGraded: boolean
  isPassedKkm: boolean
}

export interface AssessmentDetailData {
  assessment: ResolvedAssessmentItem
  roster: AssessmentRosterStudentItem[]
  statistics: AssessmentStatistics
}

export interface TeacherAssignmentOption {
  assignmentId: string
  code: string
  subjectId: string
  subjectCode: string
  subjectName: string
  kkm: number
  classId: string
  className: string
  classLevel: string
  majorCode: string
  majorName: string
}

export class AssessmentService {
  /**
   * Helper to get and validate current authenticated session.
   */
  private getAuthenticatedSession() {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new Error('Sesi autentikasi tidak valid atau telah berakhir. Silakan login kembali.')
    }
    return session
  }

  /**
   * Validate that the active user has authority over a teacherAssignment.
   */
  private async validateAssignmentAccess(
    teacherAssignmentId: string
  ): Promise<TeacherAssignmentEntity> {
    const session = this.getAuthenticatedSession()
    const assignment = await repositories.teacherAssignments.findById(teacherAssignmentId)
    if (!assignment) {
      throw new Error('Penugasan guru tidak ditemukan.')
    }

    if (session.role === 'GURU') {
      if (!session.teacherId || assignment.teacherId !== session.teacherId) {
        throw new Error('Anda tidak memiliki akses ke penugasan ini.')
      }
    }

    return assignment
  }

  /**
   * Validate that the active user has authority over an existing assessment.
   */
  private async validateAssessmentAccess(assessmentId: string): Promise<{
    assessment: AssessmentEntity
    assignment: TeacherAssignmentEntity
  }> {
    const session = this.getAuthenticatedSession()
    const assessment = await repositories.assessments.findById(assessmentId)
    if (!assessment) {
      throw new Error('Data penilaian (assessment) tidak ditemukan.')
    }

    const assignment = await repositories.teacherAssignments.findById(
      assessment.teacherAssignmentId
    )
    if (!assignment) {
      throw new Error('Penugasan guru untuk penilaian ini tidak ditemukan.')
    }

    if (session.role === 'GURU') {
      if (!session.teacherId || assignment.teacherId !== session.teacherId) {
        throw new Error('Anda tidak memiliki akses ke data penilaian ini.')
      }
    }

    return { assessment, assignment }
  }

  /**
   * Get teacher's accessible assignments and classes for assessment creation and filtering.
   */
  public async getTeacherAssignmentOptions(teacherId?: string): Promise<TeacherAssignmentOption[]> {
    const session = this.getAuthenticatedSession()
    const effectiveTeacherId = session.role === 'GURU' ? session.teacherId : teacherId

    const [allAssignments, allSchedules, classes, subjects, majors] = await Promise.all([
      repositories.teacherAssignments.findAll(),
      repositories.schedules.findAll(),
      repositories.classes.findAll(),
      repositories.subjects.findAll(),
      repositories.majors.findAll()
    ])

    const classMap = new Map(classes.map((c) => [c.id, c]))
    const subjectMap = new Map(subjects.map((s) => [s.id, s]))
    const majorMap = new Map(majors.map((m) => [m.id, m]))

    let filteredAssignments = allAssignments
    if (effectiveTeacherId) {
      filteredAssignments = allAssignments.filter((a) => a.teacherId === effectiveTeacherId)
    }

    const assignmentIdSet = new Set(filteredAssignments.map((a) => a.id))
    const relevantSchedules = allSchedules.filter((s) => assignmentIdSet.has(s.teacherAssignmentId))

    const options: TeacherAssignmentOption[] = []
    const seen = new Set<string>()

    // First map from schedules (which bind teacherAssignment to specific classes)
    for (const s of relevantSchedules) {
      const asg = filteredAssignments.find((a) => a.id === s.teacherAssignmentId)
      if (!asg) continue
      const cls = classMap.get(s.classId)
      const sbj = subjectMap.get(asg.subjectId)
      const major = cls ? majorMap.get(cls.majorId) : undefined
      const key = `${asg.id}_${s.classId}`

      if (!seen.has(key) && cls && sbj) {
        seen.add(key)
        options.push({
          assignmentId: asg.id,
          code: asg.code || '-',
          subjectId: asg.subjectId,
          subjectCode: sbj.code || '-',
          subjectName: sbj.name || 'Mata Pelajaran',
          kkm: Number(sbj.defaultKkm || 75),
          classId: s.classId,
          className: cls.name || 'Kelas',
          classLevel: cls.level || '-',
          majorCode: major?.code || '-',
          majorName: major?.name || 'Program Keahlian'
        })
      }
    }

    // If an assignment has no schedule yet, allow pairing with active classes
    for (const asg of filteredAssignments) {
      const hasAnySchedule = relevantSchedules.some((s) => s.teacherAssignmentId === asg.id)
      if (!hasAnySchedule) {
        const sbj = subjectMap.get(asg.subjectId)
        for (const cls of classes) {
          if (cls.status !== 'ACTIVE') continue
          const major = majorMap.get(cls.majorId)
          options.push({
            assignmentId: asg.id,
            code: asg.code || '-',
            subjectId: asg.subjectId,
            subjectCode: sbj?.code || '-',
            subjectName: sbj?.name || 'Mata Pelajaran',
            kkm: Number(sbj?.defaultKkm || 75),
            classId: cls.id,
            className: cls.name || 'Kelas',
            classLevel: cls.level || '-',
            majorCode: major?.code || '-',
            majorName: major?.name || 'Program Keahlian'
          })
        }
      }
    }

    return options
  }

  /**
   * Calculate statistics for a given assessment and roster.
   */
  public calculateStatistics(
    scores: StudentAssessmentScore[],
    totalRosterCount: number,
    kkm: number = 75
  ): AssessmentStatistics {
    const validScores: number[] = []
    let passedKkmCount = 0
    let failedKkmCount = 0

    for (const item of scores) {
      if (
        item.score !== undefined &&
        item.score !== null &&
        typeof item.score === 'number' &&
        !isNaN(item.score) &&
        isFinite(item.score)
      ) {
        validScores.push(item.score)
        if (item.score >= kkm) {
          passedKkmCount++
        } else {
          failedKkmCount++
        }
      }
    }

    const gradedCount = validScores.length
    const ungradedCount = Math.max(0, totalRosterCount - gradedCount)

    let averageScore: number | null = null
    let minScore: number | null = null
    let maxScore: number | null = null

    if (gradedCount > 0) {
      const sum = validScores.reduce((acc, curr) => acc + curr, 0)
      averageScore = Math.round((sum / gradedCount) * 100) / 100
      minScore = Math.min(...validScores)
      maxScore = Math.max(...validScores)
    }

    return {
      totalStudents: totalRosterCount,
      gradedCount,
      ungradedCount,
      averageScore,
      minScore,
      maxScore,
      passedKkmCount,
      failedKkmCount,
      kkm
    }
  }

  /**
   * List assessments with resolved relations and statistics.
   */
  public async getAssessments(filter?: {
    classId?: string
    subjectId?: string
    type?: AssessmentType
    academicYearId?: string
    semester?: SemesterType
    search?: string
  }): Promise<ResolvedAssessmentItem[]> {
    const session = this.getAuthenticatedSession()

    // 1. Load active academic year
    const activeAcademicYear = await repositories.academicYears.findActive()

    // 2. Fetch master relationships
    const [
      allAssessments,
      assignments,
      teachers,
      classes,
      subjects,
      majors,
      allStudents,
      academicYears
    ] = await Promise.all([
      repositories.assessments.findAll(),
      repositories.teacherAssignments.findAll(),
      repositories.teachers.findAll(),
      repositories.classes.findAll(),
      repositories.subjects.findAll(),
      repositories.majors.findAll(),
      repositories.students.findAll(),
      repositories.academicYears.findAll()
    ])

    const assignmentMap = new Map(assignments.map((a) => [a.id, a]))
    const teacherMap = new Map(teachers.map((t) => [t.id, t]))
    const classMap = new Map(classes.map((c) => [c.id, c]))
    const subjectMap = new Map(subjects.map((s) => [s.id, s]))
    const majorMap = new Map(majors.map((m) => [m.id, m]))
    const academicYearMap = new Map(academicYears.map((ay) => [ay.id, ay]))

    // Count active students per class
    const classStudentCountMap = new Map<string, number>()
    for (const st of allStudents) {
      if (st.status === 'ACTIVE') {
        const count = classStudentCountMap.get(st.classId) || 0
        classStudentCountMap.set(st.classId, count + 1)
      }
    }

    // Filter by teacher authority if role is GURU
    let accessibleAssessments = allAssessments
    if (session.role === 'GURU') {
      const teacherAssignmentIds = new Set(
        assignments.filter((a) => a.teacherId === session.teacherId).map((a) => a.id)
      )
      accessibleAssessments = allAssessments.filter((ass) =>
        teacherAssignmentIds.has(ass.teacherAssignmentId)
      )
    }

    // Apply filters
    if (filter?.classId) {
      accessibleAssessments = accessibleAssessments.filter((a) => a.classId === filter.classId)
    }
    if (filter?.subjectId) {
      accessibleAssessments = accessibleAssessments.filter((a) => a.subjectId === filter.subjectId)
    }
    if (filter?.type) {
      accessibleAssessments = accessibleAssessments.filter((a) => a.type === filter.type)
    }
    if (filter?.academicYearId) {
      accessibleAssessments = accessibleAssessments.filter(
        (a) => a.academicYearId === filter.academicYearId
      )
    }
    if (filter?.semester) {
      accessibleAssessments = accessibleAssessments.filter((a) => a.semester === filter.semester)
    }

    const resolved: ResolvedAssessmentItem[] = []

    for (const a of accessibleAssessments) {
      const asg = assignmentMap.get(a.teacherAssignmentId)
      const teacher = asg ? teacherMap.get(asg.teacherId) : undefined
      const cls = classMap.get(a.classId)
      const sbj = subjectMap.get(a.subjectId)
      const major = cls ? majorMap.get(cls.majorId) : undefined
      const ay = academicYearMap.get(a.academicYearId) || activeAcademicYear

      const totalStudents = classStudentCountMap.get(a.classId) || 0
      const kkm = Number(sbj?.defaultKkm || 75)
      const statistics = this.calculateStatistics(a.scores || [], totalStudents, kkm)

      const item: ResolvedAssessmentItem = {
        id: a.id,
        academicYearId: a.academicYearId,
        academicYearName: ay?.name || 'Tahun Pelajaran',
        semester: a.semester || ay?.semester || 'GANJIL',

        classId: a.classId,
        className: cls?.name || 'Kelas',
        classLevel: cls?.level || '-',
        rombel: cls?.rombel || 1,
        majorCode: major?.code || '-',
        majorName: major?.name || 'Program Keahlian',

        teacherAssignmentId: a.teacherAssignmentId,
        teacherAssignmentCode: asg?.code || '-',
        teacherId: teacher?.id || '',
        teacherName: teacher?.name || 'Guru',

        subjectId: a.subjectId,
        subjectCode: sbj?.code || '-',
        subjectName: sbj?.name || 'Mata Pelajaran',
        subjectCategory: sbj?.category,
        kkm,

        type: a.type,
        title: a.title,
        date: a.date || a.createdAt.split('T')[0],
        maxScore: a.maxScore || 100,

        statistics,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      }

      // Search keyword filter
      if (filter?.search) {
        const kw = filter.search.toLowerCase().trim()
        const matches =
          item.title.toLowerCase().includes(kw) ||
          item.className.toLowerCase().includes(kw) ||
          item.subjectName.toLowerCase().includes(kw) ||
          item.type.toLowerCase().includes(kw)
        if (!matches) continue
      }

      resolved.push(item)
    }

    // Sort by Date DESC, CreatedAt DESC
    resolved.sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date)
      if (dateDiff !== 0) return dateDiff
      return b.createdAt.localeCompare(a.createdAt)
    })

    return resolved
  }

  /**
   * Get single assessment with full student roster for scoring.
   */
  public async getAssessmentDetail(assessmentId: string): Promise<AssessmentDetailData> {
    const { assessment, assignment } = await this.validateAssessmentAccess(assessmentId)

    const [teacher, cls, sbj, major, ay, students] = await Promise.all([
      repositories.teachers.findById(assignment.teacherId),
      repositories.classes.findById(assessment.classId),
      repositories.subjects.findById(assessment.subjectId),
      clsResolver(assessment.classId),
      repositories.academicYears.findById(assessment.academicYearId),
      repositories.students.findByClassId(assessment.classId)
    ])

    async function clsResolver(classId: string) {
      const c = await repositories.classes.findById(classId)
      if (!c) return null
      return repositories.majors.findById(c.majorId)
    }

    // Filter active students and sort by NIS/name
    const activeStudents = students
      .filter((s) => s.status === 'ACTIVE')
      .sort((a, b) =>
        (a.nis || a.name).localeCompare(b.nis || b.name, undefined, { numeric: true })
      )

    // Map existing scores
    const scoreMap = new Map<string, StudentAssessmentScore>()
    for (const sc of assessment.scores || []) {
      scoreMap.set(sc.studentId, sc)
    }

    const kkm = Number(sbj?.defaultKkm || 75)
    const roster: AssessmentRosterStudentItem[] = activeStudents.map((st) => {
      const scoreEntry = scoreMap.get(st.id)
      const hasScore =
        scoreEntry?.score !== undefined &&
        scoreEntry?.score !== null &&
        typeof scoreEntry.score === 'number' &&
        !isNaN(scoreEntry.score)

      return {
        studentId: st.id,
        nis: st.nis,
        nisn: st.nisn,
        name: st.name,
        gender: st.gender,
        score: hasScore ? scoreEntry!.score : undefined,
        feedback: scoreEntry?.feedback,
        isGraded: hasScore,
        isPassedKkm: hasScore ? scoreEntry!.score! >= kkm : false
      }
    })

    const statistics = this.calculateStatistics(assessment.scores || [], activeStudents.length, kkm)

    const resolvedAssessment: ResolvedAssessmentItem = {
      id: assessment.id,
      academicYearId: assessment.academicYearId,
      academicYearName: ay?.name || 'Tahun Pelajaran',
      semester: assessment.semester,

      classId: assessment.classId,
      className: cls?.name || 'Kelas',
      classLevel: cls?.level || '-',
      rombel: cls?.rombel || 1,
      majorCode: major?.code || '-',
      majorName: major?.name || 'Program Keahlian',

      teacherAssignmentId: assessment.teacherAssignmentId,
      teacherAssignmentCode: assignment.code || '-',
      teacherId: teacher?.id || '',
      teacherName: teacher?.name || 'Guru',

      subjectId: assessment.subjectId,
      subjectCode: sbj?.code || '-',
      subjectName: sbj?.name || 'Mata Pelajaran',
      subjectCategory: sbj?.category,
      kkm,

      type: assessment.type,
      title: assessment.title,
      date: assessment.date || assessment.createdAt.split('T')[0],
      maxScore: assessment.maxScore || 100,

      statistics,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt
    }

    return {
      assessment: resolvedAssessment,
      roster,
      statistics
    }
  }

  /**
   * Create a new Assessment entity.
   */
  public async createAssessment(dto: CreateAssessmentDTO): Promise<AssessmentEntity> {
    const session = this.getAuthenticatedSession()

    // 1. Validate Assignment Authority
    const assignment = await this.validateAssignmentAccess(dto.teacherAssignmentId)

    // 2. Validate Class
    const cls = await repositories.classes.findById(dto.classId)
    if (!cls) {
      throw new Error('Kelas rombel tidak ditemukan.')
    }

    // 3. Validate Subject
    const sbj = await repositories.subjects.findById(assignment.subjectId)
    if (!sbj) {
      throw new Error('Mata pelajaran tidak ditemukan.')
    }

    // 4. Validate Title
    if (!dto.title || dto.title.trim().length === 0) {
      throw new Error('Judul / nama penilaian wajib diisi.')
    }
    if (dto.title.trim().length < 3) {
      throw new Error('Judul penilaian minimal 3 karakter.')
    }

    // 5. Validate Type
    const validTypes: AssessmentType[] = [
      'HARIAN',
      'TUGAS',
      'KUIS',
      'STS',
      'SAS',
      'SIKAP',
      'KETERAMPILAN'
    ]
    if (!dto.type || !validTypes.includes(dto.type)) {
      throw new Error('Jenis penilaian tidak valid.')
    }

    // 6. Validate Max Score
    const maxScore = dto.maxScore !== undefined ? Number(dto.maxScore) : 100
    if (isNaN(maxScore) || maxScore <= 0 || maxScore > 1000) {
      throw new Error('Batas nilai maksimum harus berupa angka positif (contoh: 100).')
    }

    // 7. Resolve Academic Year
    const activeAcademicYear = await repositories.academicYears.findActive()
    const academicYearId = assignment.academicYearId || activeAcademicYear?.id
    if (!academicYearId) {
      throw new Error('Tahun pelajaran aktif tidak ditemukan.')
    }
    await academicLockGuardService.enforceLock(academicYearId)
    const semester = activeAcademicYear?.semester || 'GANJIL'

    // 8. Resolve Date
    let dateStr = dto.date
    if (!dateStr) {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      dateStr = `${y}-${m}-${d}`
    }

    const id = `asm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const newAssessment: AssessmentEntity = {
      id,
      academicYearId,
      semester,
      classId: dto.classId,
      subjectId: assignment.subjectId,
      teacherAssignmentId: dto.teacherAssignmentId,
      type: dto.type,
      title: dto.title.trim(),
      date: dateStr,
      maxScore,
      scores: [],
      createdBy: session.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const created = await repositories.assessments.create(newAssessment)
    await syncService.enqueue('ASSESSMENT', created.id, 'CREATE', created)
    return created
  }

  /**
   * Update assessment metadata (title, type, date, maxScore).
   * classId and teacherAssignmentId remain immutable to preserve student score relations.
   */
  public async updateAssessment(
    assessmentId: string,
    dto: UpdateAssessmentDTO
  ): Promise<AssessmentEntity> {
    const session = this.getAuthenticatedSession()
    const { assessment } = await this.validateAssessmentAccess(assessmentId)
    await academicLockGuardService.enforceLock(assessment.academicYearId)

    if (dto.title !== undefined) {
      if (!dto.title || dto.title.trim().length === 0) {
        throw new Error('Judul penilaian tidak boleh kosong.')
      }
      assessment.title = dto.title.trim()
    }

    if (dto.type !== undefined) {
      const validTypes: AssessmentType[] = [
        'HARIAN',
        'TUGAS',
        'KUIS',
        'STS',
        'SAS',
        'SIKAP',
        'KETERAMPILAN'
      ]
      if (!validTypes.includes(dto.type)) {
        throw new Error('Jenis penilaian tidak valid.')
      }
      assessment.type = dto.type
    }

    if (dto.date !== undefined && dto.date.trim() !== '') {
      assessment.date = dto.date.trim()
    }

    if (dto.maxScore !== undefined) {
      const maxScore = Number(dto.maxScore)
      if (isNaN(maxScore) || maxScore <= 0) {
        throw new Error('Batas nilai maksimum harus angka positif.')
      }
      assessment.maxScore = maxScore
    }

    assessment.updatedAt = new Date().toISOString()
    assessment.updatedBy = session.username

    const updated = await repositories.assessments.update(assessment.id, assessment)
    await syncService.enqueue('ASSESSMENT', updated.id, 'UPDATE', updated)
    return updated
  }

  /**
   * Save or update student scores for an assessment.
   * Enforces in-place upsert (1 score record per studentId), validation range [0, maxScore],
   * decimal preservation, and strict class enrollment checking.
   */
  public async saveAssessmentScores(
    assessmentId: string,
    scoreInputs: StudentScoreInputDTO[]
  ): Promise<AssessmentEntity> {
    const session = this.getAuthenticatedSession()
    const { assessment } = await this.validateAssessmentAccess(assessmentId)
    await academicLockGuardService.enforceLock(assessment.academicYearId)

    // Verify class roster
    const classStudents = await repositories.students.findByClassId(assessment.classId)
    const validStudentIds = new Set(classStudents.map((s) => s.id))

    // Build map from existing scores for in-place upsert
    const scoreMap = new Map<string, StudentAssessmentScore>()
    for (const sc of assessment.scores || []) {
      scoreMap.set(sc.studentId, { ...sc })
    }

    const maxScore = assessment.maxScore || 100

    for (const input of scoreInputs) {
      if (!input.studentId) {
        throw new Error('ID Siswa wajib disertakan.')
      }

      if (!validStudentIds.has(input.studentId)) {
        throw new Error(`Siswa dengan ID "${input.studentId}" tidak terdaftar di kelas rombel ini.`)
      }

      // Check score value
      if (input.score === undefined || input.score === null || input.score === '') {
        // Ungraded / cleared
        scoreMap.delete(input.studentId)
      } else {
        const parsed = Number(input.score)
        if (isNaN(parsed) || !isFinite(parsed)) {
          throw new Error(
            `Nilai untuk siswa harus berupa angka yang valid. Nilai diterima: ${input.score}`
          )
        }

        if (parsed < 0) {
          throw new Error(`Nilai tidak boleh bernilai negatif (minimal 0). Diterima: ${parsed}`)
        }

        if (parsed > maxScore) {
          throw new Error(
            `Nilai tidak boleh melebihi batas maksimum (${maxScore}). Diterima: ${parsed}`
          )
        }

        scoreMap.set(input.studentId, {
          studentId: input.studentId,
          score: parsed,
          feedback: input.feedback?.trim() || undefined
        })
      }
    }

    assessment.scores = Array.from(scoreMap.values())
    assessment.updatedAt = new Date().toISOString()
    assessment.updatedBy = session.username

    const updated = await repositories.assessments.update(assessment.id, assessment)
    await syncService.enqueue('ASSESSMENT', updated.id, 'UPDATE', updated)
    return updated
  }

  /**
   * Delete an assessment entity.
   */
  public async deleteAssessment(assessmentId: string): Promise<boolean> {
    const { assessment } = await this.validateAssessmentAccess(assessmentId)
    await academicLockGuardService.enforceLock(assessment.academicYearId)

    const success = await repositories.assessments.delete(assessment.id)
    if (success) {
      await syncService.enqueue('ASSESSMENT', assessment.id, 'DELETE', { id: assessment.id })
    }
    return success
  }
}

export const assessmentService = new AssessmentService()
