import { repositories } from '../../repositories'
import { authService, AuthorizationError } from '../auth'
import { academicLedgerService } from '../report/AcademicLedgerService'
import { reportService } from '../report/ReportService'
import type { AcademicYearEntity, SemesterType } from '../../types'

export class HistoricalReportService {
  /**
   * Fetches all academic years/semesters that have been closed and locked
   */
  public async getHistoricalSemesters(): Promise<AcademicYearEntity[]> {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new AuthorizationError('Sesi pengguna tidak ditemukan.')
    }
    const allAY = await repositories.academicYears.findAll()
    return allAY.filter((ay) => ay.isLocked).sort((a, b) => b.name.localeCompare(a.name))
  }

  /**
   * Retrieves read-only grade ledger preview for a historical locked semester
   */
  public async getHistoricalLedger(
    academicYearId: string,
    semester: SemesterType,
    classId?: string
  ) {
    const allAY = await repositories.academicYears.findById(academicYearId)
    if (!allAY || !allAY.isLocked) {
      throw new Error(
        'Akses Ditolak: Tahun akademik/semester ini bukan arsip sejarah yang terkunci.'
      )
    }
    return academicLedgerService.getLedgerPreview(academicYearId, semester, classId)
  }

  /**
   * Retrieves read-only student report card data for a historical locked semester
   */
  public async getHistoricalReportCard(params: {
    studentId: string
    academicYearId: string
    semester: SemesterType
  }) {
    const allAY = await repositories.academicYears.findById(params.academicYearId)
    if (!allAY || !allAY.isLocked) {
      throw new Error(
        'Akses Ditolak: Tahun akademik/semester ini bukan arsip sejarah yang terkunci.'
      )
    }
    const student = await repositories.students.findById(params.studentId)
    if (!student) {
      throw new Error('Data siswa tidak ditemukan.')
    }
    return reportService.getStudentReportCardData({
      ...params,
      classId: student.classId
    })
  }
}

export const historicalReportService = new HistoricalReportService()
