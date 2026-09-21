import { repositories } from '../../repositories'

export class SemesterLockedError extends Error {
  constructor(
    message: string = 'Akses Ditolak: Semester ini telah ditutup (Locked) oleh Administrator.'
  ) {
    super(message)
    this.name = 'SemesterLockedError'
  }
}

export class AcademicLockGuardService {
  /**
   * Checks if a semester is locked by its academicYearId
   */
  public async isSemesterLocked(academicYearId: string): Promise<boolean> {
    if (!academicYearId) return false
    const ay = await repositories.academicYears.findById(academicYearId)
    return !!ay?.isLocked
  }

  /**
   * Checks if a given date falls inside any locked academic year range
   */
  public async isDateLocked(dateStr: string): Promise<boolean> {
    if (!dateStr) return false
    const listAY = await repositories.academicYears.findAll()
    const matchingAY = listAY.find((ay) => dateStr >= ay.startDate && dateStr <= ay.endDate)
    return !!matchingAY?.isLocked
  }

  /**
   * Enforces semester lock by throwing SemesterLockedError if locked
   */
  public async enforceLock(academicYearId: string): Promise<void> {
    const locked = await this.isSemesterLocked(academicYearId)
    if (locked) {
      throw new SemesterLockedError()
    }
  }

  /**
   * Enforces semester lock by date range
   */
  public async enforceDateLock(dateStr: string): Promise<void> {
    const locked = await this.isDateLocked(dateStr)
    if (locked) {
      throw new SemesterLockedError()
    }
  }
}

export const academicLockGuardService = new AcademicLockGuardService()
