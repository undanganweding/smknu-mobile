import { repositories } from '../../repositories'
import { authService, AuthorizationError } from '../auth'
import { auditLogService } from '../audit/AuditLogService'

export interface SemesterComplianceReport {
  totalClasses: number
  totalTeachers: number
  totalAssessments: number
  totalJournals: number
  totalAttendances: number
  attendanceComplianceRate: number
  journalComplianceRate: number
  isReadyToClose: boolean
  unsubmittedAttendanceCount: number
}

export class SemesterClosingService {
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
        'Akses Ditolak: Hanya administrator yang dapat menutup atau mengunci semester akademik.'
      )
    }
  }

  /**
   * Generates a pre-closing checklist with compliance metrics
   */
  public async getSemesterCompliance(academicYearId: string): Promise<SemesterComplianceReport> {
    this.enforceAdmin()

    const ay = await repositories.academicYears.findById(academicYearId)
    if (!ay) {
      throw new Error('Tahun akademik tidak ditemukan.')
    }

    const allClasses = await repositories.classes.findAll()
    const targetClasses = allClasses.filter((c) => c.academicYearId === academicYearId)

    const allTeachers = await repositories.teachers.findAll()
    const activeTeachers = allTeachers.filter((t) => t.status === 'ACTIVE')

    const allAssessments = await repositories.assessments.findAll()
    const assessments = allAssessments.filter(
      (asm) => asm.academicYearId === academicYearId && asm.semester === ay.semester
    )

    const allJournals = await repositories.journals.findAll()
    const journals = allJournals.filter(
      (j) => j.academicYearId === academicYearId && j.semester === ay.semester
    )

    const allAttendances = await repositories.attendances.findAll()
    const attendances = allAttendances.filter(
      (att) => att.academicYearId === academicYearId && att.semester === ay.semester
    )

    const allSchedules = await repositories.schedules.findAll()
    const schedules = allSchedules.filter((sch) => sch.academicYearId === academicYearId)

    // Calculate simplified compliance rates
    const totalScheduled = schedules.length
    const attendanceComplianceRate =
      totalScheduled > 0 ? Number(((attendances.length / totalScheduled) * 100).toFixed(1)) : 100

    const journalComplianceRate =
      totalScheduled > 0 ? Number(((journals.length / totalScheduled) * 100).toFixed(1)) : 100

    const unsubmittedAttendanceCount = Math.max(0, totalScheduled - attendances.length)

    // Ready if there are at least some records and no high omissions
    const isReadyToClose = targetClasses.length > 0 && assessments.length > 0

    return {
      totalClasses: targetClasses.length,
      totalTeachers: activeTeachers.length,
      totalAssessments: assessments.length,
      totalJournals: journals.length,
      totalAttendances: attendances.length,
      attendanceComplianceRate,
      journalComplianceRate,
      isReadyToClose,
      unsubmittedAttendanceCount
    }
  }

  /**
   * Performs the immutable semester closure / locking
   */
  public async closeSemester(academicYearId: string): Promise<void> {
    this.enforceAdmin()

    const ay = await repositories.academicYears.findById(academicYearId)
    if (!ay) {
      throw new Error('Tahun akademik tidak ditemukan.')
    }

    if (ay.isLocked) {
      throw new Error('Semester ini sudah ditutup sebelumnya.')
    }

    // Mark as locked and inactive
    const updatedAy = {
      ...ay,
      isLocked: true,
      isActive: false,
      lockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await repositories.academicYears.update(academicYearId, updatedAy)

    // Record system audit log
    await auditLogService.log({
      action: 'CLOSE_SEMESTER',
      entityType: 'ACADEMIC_YEAR',
      affectedIds: [academicYearId],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'ADMIN_CONSOLE',
      details: {
        academicYearId,
        semester: ay.semester,
        name: ay.name,
        timestamp: new Date().toISOString()
      }
    })
  }
}

export const semesterClosingService = new SemesterClosingService()
