/**
 * Guru Offline - Academic Completeness Engine
 * Canonical Target: Evaluates teacher academic completeness before submission.
 * Presensi, Jurnal, Penilaian, Sikap, and Kedisiplinan validation.
 */

import { repositories } from '../../repositories'
import type { CompletenessReport, CompletenessItem } from '../../types/cloud'

export class CompletenessEngine {
  private static instance: CompletenessEngine

  public static getInstance(): CompletenessEngine {
    if (!CompletenessEngine.instance) {
      CompletenessEngine.instance = new CompletenessEngine()
    }
    return CompletenessEngine.instance
  }

  /**
   * Evaluate completeness for a teacher in a given academic period
   */
  public async evaluateTeacherCompleteness(
    teacherId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    academicPeriodId?: string
  ): Promise<CompletenessReport> {
    const activeYear = await repositories.academicYears.findActive()
    const academicYearId = activeYear?.id || ''

    // 1. Get assignments for this teacher
    const assignments = await repositories.teacherAssignments.findByTeacherId(teacherId)
    const activeAssignments = assignments.filter(
      (a) => !academicYearId || a.academicYearId === academicYearId
    )

    const assignmentIds = activeAssignments.map((a) => a.id)

    // Expected sessions: total teaching hours * target weeks (estimate 16 weeks / semester)
    const totalWeeklyHours = activeAssignments.reduce((sum, a) => sum + (a.hours || 2), 0)
    const expectedSessions = Math.max(totalWeeklyHours * 4, 1) // Monthly or period target

    // 2. Query journals completed
    const allJournals = await repositories.journals.findAll()
    const teacherJournals = allJournals.filter((j) => assignmentIds.includes(j.teacherAssignmentId))
    const journalCompleted = teacherJournals.length
    const journalPct = Math.min(Math.round((journalCompleted / expectedSessions) * 100), 100)

    // 3. Query attendances completed
    const allAttendances = await repositories.attendances.findAll()
    const teacherAttendances = allAttendances.filter((att) =>
      assignmentIds.includes(att.teacherAssignmentId)
    )
    const attendanceCompleted = teacherAttendances.length
    const attendancePct = Math.min(Math.round((attendanceCompleted / expectedSessions) * 100), 100)

    // 4. Query assessments recorded
    const allAssessments = await repositories.assessments.findAll()
    const teacherAssessments = allAssessments.filter((ass) =>
      assignmentIds.includes(ass.teacherAssignmentId)
    )
    // Expected: at least 3 assessments per assignment (Tugas, UH, UTS/UAS)
    const expectedAssessments = Math.max(activeAssignments.length * 3, 1)
    const assessmentPct = Math.min(
      Math.round((teacherAssessments.length / expectedAssessments) * 100),
      100
    )

    // 5. Query discipline notes / character notes
    const allDiscipline = await repositories.disciplineNotes.findAll()
    const teacherDiscipline = allDiscipline.filter((d) => d.teacherId === teacherId)
    const disciplinePct = teacherDiscipline.length > 0 ? 100 : 85 // non-blocking baseline

    const items: CompletenessItem[] = [
      {
        key: 'ATTENDANCE',
        label: 'Presensi Siswa',
        percentage: attendancePct,
        completedCount: attendanceCompleted,
        totalRequired: expectedSessions,
        status: attendancePct >= 80 ? 'COMPLETE' : 'INCOMPLETE',
        actionUrl: '/teacher/attendance',
        notes: `${attendanceCompleted} dari ${expectedSessions} sesi presensi terisi.`
      },
      {
        key: 'JOURNAL',
        label: 'Jurnal Mengajar',
        percentage: journalPct,
        completedCount: journalCompleted,
        totalRequired: expectedSessions,
        status: journalPct >= 80 ? 'COMPLETE' : 'INCOMPLETE',
        actionUrl: '/teacher/journal',
        notes: `${journalCompleted} dari ${expectedSessions} agenda jurnal terisi.`
      },
      {
        key: 'ASSESSMENT',
        label: 'Penilaian & Nilai Siswa',
        percentage: assessmentPct,
        completedCount: teacherAssessments.length,
        totalRequired: expectedAssessments,
        status: assessmentPct >= 75 ? 'COMPLETE' : 'INCOMPLETE',
        actionUrl: '/teacher/grade',
        notes: `${teacherAssessments.length} dari ${expectedAssessments} target evaluasi tersimpan.`
      },
      {
        key: 'DISCIPLINE',
        label: 'Buku Catatan Sikap & Kedisiplinan',
        percentage: disciplinePct,
        completedCount: teacherDiscipline.length,
        totalRequired: 1,
        status: disciplinePct >= 80 ? 'COMPLETE' : 'INCOMPLETE',
        actionUrl: '/teacher/discipline',
        notes: `${teacherDiscipline.length} catatan perilaku terdata.`
      }
    ]

    const overallPercentage = Math.round(
      items.reduce((sum, item) => sum + item.percentage, 0) / items.length
    )

    const isReadyToSubmit = overallPercentage >= 75 && items.every((i) => i.percentage >= 60)

    return {
      teacherId,
      overallPercentage,
      isReadyToSubmit,
      items,
      evaluatedAt: new Date().toISOString()
    }
  }

  /**
   * Evaluate completeness for a single teacher assignment
   */
  public async evaluateAssignmentCompleteness(teacherAssignmentId: string): Promise<{
    assignmentId: string
    attendancePercentage: number
    journalPercentage: number
    assessmentPercentage: number
    overallPercentage: number
    isReady: boolean
  }> {
    const assignment = await repositories.teacherAssignments.findById(teacherAssignmentId)
    if (!assignment) {
      throw new Error(`Assignment ${teacherAssignmentId} not found`)
    }
    const expectedSessions = Math.max((assignment.hours || 2) * 4, 1)
    const expectedAssessments = 3

    const allJournals = await repositories.journals.findAll()
    const journals = allJournals.filter((j) => j.teacherAssignmentId === teacherAssignmentId)
    const journalPct = Math.min(Math.round((journals.length / expectedSessions) * 100), 100)

    const allAttendances = await repositories.attendances.findAll()
    const attendances = allAttendances.filter((a) => a.teacherAssignmentId === teacherAssignmentId)
    const attendancePct = Math.min(Math.round((attendances.length / expectedSessions) * 100), 100)

    const allAssessments = await repositories.assessments.findAll()
    const assessments = allAssessments.filter((a) => a.teacherAssignmentId === teacherAssignmentId)
    const assessmentPct = Math.min(
      Math.round((assessments.length / expectedAssessments) * 100),
      100
    )

    const overallPercentage = Math.round((journalPct + attendancePct + assessmentPct) / 3)
    const isReady = overallPercentage >= 75 && journalPct >= 60 && attendancePct >= 60

    return {
      assignmentId: teacherAssignmentId,
      attendancePercentage: attendancePct,
      journalPercentage: journalPct,
      assessmentPercentage: assessmentPct,
      overallPercentage,
      isReady
    }
  }

  /**
   * Evaluate completeness for all active teachers in a period
   */
  public async evaluateAllTeachersCompleteness(academicPeriodId?: string): Promise<
    Array<{
      teacherId: string
      nip: string
      name: string
      report: CompletenessReport
    }>
  > {
    const teachers = await repositories.teachers.findAll()
    const activeTeachers = teachers.filter((t) => t.status === 'ACTIVE')

    const results = []
    for (const t of activeTeachers) {
      const rep = await this.evaluateTeacherCompleteness(t.id, academicPeriodId)
      results.push({
        teacherId: t.id,
        nip: t.nip || '',
        name: t.name,
        report: rep
      })
    }
    return results
  }
}

export const completenessEngine = CompletenessEngine.getInstance()
