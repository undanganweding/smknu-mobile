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
  blockers: string[]
}

export interface AcademicCorrectionRequest {
  id: string
  academicYearId: string
  entityType: string
  entityId: string
  teacherId: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED'
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
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

    // Build blocker list
    const blockers: string[] = []
    if (targetClasses.length === 0) {
      blockers.push('Tidak ada rombongan belajar (kelas) yang terdaftar pada tahun akademik ini.')
    }
    if (assessments.length === 0) {
      blockers.push('Belum ada instrumen penilaian tercatat pada semester ini.')
    }
    if (unsubmittedAttendanceCount > 0 && totalScheduled > 0 && attendanceComplianceRate < 50) {
      blockers.push(`Tingkat keterisian presensi terlalu rendah (${attendanceComplianceRate}%).`)
    }

    // Ready if no blockers
    const isReadyToClose = blockers.length === 0

    return {
      totalClasses: targetClasses.length,
      totalTeachers: activeTeachers.length,
      totalAssessments: assessments.length,
      totalJournals: journals.length,
      totalAttendances: attendances.length,
      attendanceComplianceRate,
      journalComplianceRate,
      isReadyToClose,
      unsubmittedAttendanceCount,
      blockers
    }
  }

  /**
   * Performs the immutable semester closure / locking
   */
  public async closeSemester(
    academicYearId: string,
    options?: { force?: boolean; reason?: string }
  ): Promise<void> {
    this.enforceAdmin()

    const ay = await repositories.academicYears.findById(academicYearId)
    if (!ay) {
      throw new Error('Tahun akademik tidak ditemukan.')
    }

    if (ay.isLocked) {
      throw new Error('Semester ini sudah ditutup sebelumnya.')
    }

    // Validate compliance blockers unless explicitly forced
    const compliance = await this.getSemesterCompliance(academicYearId)
    if (!compliance.isReadyToClose && !options?.force) {
      throw new Error(`Penutupan semester diblokir oleh sistem: ${compliance.blockers.join('; ')}`)
    }

    const session = authService.getCurrentSession()
    const nowStr = new Date().toISOString()

    // Mark as locked and inactive
    const updatedAy = {
      ...ay,
      isLocked: true,
      isActive: false,
      lockedAt: nowStr,
      updatedAt: nowStr
    }

    await repositories.academicYears.update(academicYearId, updatedAy)

    // Record system audit log with complete before/after state
    await auditLogService.log({
      action: 'CLOSE_SEMESTER',
      entityType: 'ACADEMIC_YEAR',
      affectedIds: [academicYearId],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'ADMIN_GOVERNANCE',
      details: {
        who: session?.username || 'admin',
        what: 'Penutupan dan pembekuan semester akademik',
        when: nowStr,
        entity: 'ACADEMIC_YEAR',
        entityId: academicYearId,
        before: { isLocked: false, isActive: ay.isActive },
        after: { isLocked: true, isActive: false },
        reason: options?.reason || 'Penutupan resmi semester akademik',
        academicYearId,
        semester: ay.semester,
        name: ay.name,
        timestamp: nowStr
      }
    })
  }

  /**
   * Admin unlocks semester with explicit reason for governance corrections
   */
  public async unlockSemester(academicYearId: string, reason: string): Promise<void> {
    this.enforceAdmin()

    if (!reason || reason.trim().length < 5) {
      throw new Error('Alasan pembukaan kunci semester wajib diisi minimal 5 karakter.')
    }

    const ay = await repositories.academicYears.findById(academicYearId)
    if (!ay) {
      throw new Error('Tahun akademik tidak ditemukan.')
    }

    if (!ay.isLocked) {
      throw new Error('Semester ini sedang tidak terkunci.')
    }

    const session = authService.getCurrentSession()
    const nowStr = new Date().toISOString()

    const updatedAy = {
      ...ay,
      isLocked: false,
      updatedAt: nowStr
    }

    await repositories.academicYears.update(academicYearId, updatedAy)

    await auditLogService.log({
      action: 'UNLOCK_SEMESTER',
      entityType: 'ACADEMIC_YEAR',
      affectedIds: [academicYearId],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'ADMIN_GOVERNANCE',
      details: {
        who: session?.username || 'admin',
        what: 'Pembukaan kunci semester untuk koreksi administratif',
        when: nowStr,
        entity: 'ACADEMIC_YEAR',
        entityId: academicYearId,
        before: { isLocked: true },
        after: { isLocked: false },
        reason,
        timestamp: nowStr
      }
    })
  }
}

export const semesterClosingService = new SemesterClosingService()
