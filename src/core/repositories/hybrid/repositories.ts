/**
 * Guru Offline - Concrete Hybrid Cloud/Local Repositories
 * Canonical Target: Supabase Source of Truth with IndexedDB Cache & Offline Mutation Queue
 */

import { HybridBaseRepository } from './HybridBaseRepository'
import type {
  UserEntity,
  TeacherEntity,
  TeacherAssignmentEntity,
  AcademicYearEntity,
  MajorEntity,
  ClassEntity,
  SubjectEntity,
  RoomEntity,
  StudentEntity,
  ScheduleEntity,
  AttendanceEntity,
  JournalEntity,
  AssessmentEntity,
  DisciplineNoteEntity,
  AnnouncementEntity,
  SchoolIdentityEntity,
  SyncQueueEntity,
  ImportHistoryEntity,
  AuditLogEntity,
  AcademicPeriodEntity,
  SchoolAgendaEntity
} from '../../types'
import type {
  IUserRepository,
  ITeacherRepository,
  ITeacherAssignmentRepository,
  IAcademicYearRepository,
  IMajorRepository,
  IClassRepository,
  ISubjectRepository,
  IRoomRepository,
  IStudentRepository,
  IScheduleRepository,
  IAttendanceRepository,
  IJournalRepository,
  IAssessmentRepository,
  IDisciplineRepository,
  IAnnouncementRepository,
  ISchoolIdentityRepository,
  ISyncQueueRepository,
  IImportHistoryRepository,
  IAuditLogRepository,
  IAcademicPeriodRepository,
  ISchoolAgendaRepository
} from '../interfaces/IRepository'

export class HybridUserRepository
  extends HybridBaseRepository<UserEntity>
  implements IUserRepository
{
  constructor() {
    super('users', 'user')
  }

  public async findByUsername(username: string): Promise<UserEntity | null> {
    return this.findOneByIndex('username', username)
  }

  public async findByTeacherId(teacherId: string): Promise<UserEntity | null> {
    const list = await this.findByIndex('teacherId', teacherId)
    return list.length > 0 ? list[0] : null
  }
}

export class HybridTeacherRepository
  extends HybridBaseRepository<TeacherEntity>
  implements ITeacherRepository
{
  constructor() {
    super('teachers', 'teacher')
  }

  public async findByNip(nip: string): Promise<TeacherEntity | null> {
    return this.findOneByIndex('nip', nip)
  }

  public async findByNuptk(nuptk: string): Promise<TeacherEntity | null> {
    return this.findOneByIndex('nuptk', nuptk)
  }
}

export class HybridTeacherAssignmentRepository
  extends HybridBaseRepository<TeacherAssignmentEntity>
  implements ITeacherAssignmentRepository
{
  constructor() {
    super('teacher_assignments', 'teacher_assignment')
  }

  public async findByTeacherId(teacherId: string): Promise<TeacherAssignmentEntity[]> {
    return this.findByIndex('teacherId', teacherId)
  }

  public async findByCode(code: string): Promise<TeacherAssignmentEntity[]> {
    return this.findByIndex('code', code)
  }

  public async findByAcademicYear(academicYearId: string): Promise<TeacherAssignmentEntity[]> {
    return this.findByIndex('academicYearId', academicYearId)
  }
}

export class HybridAcademicYearRepository
  extends HybridBaseRepository<AcademicYearEntity>
  implements IAcademicYearRepository
{
  constructor() {
    super('academic_years', 'academic_year')
  }

  public async findActive(): Promise<AcademicYearEntity | null> {
    const list = await this.findAll()
    return list.find((y) => y.isActive) || null
  }
}

export class HybridMajorRepository
  extends HybridBaseRepository<MajorEntity>
  implements IMajorRepository
{
  constructor() {
    super('majors', 'major')
  }

  public async findByCode(code: string): Promise<MajorEntity | null> {
    return this.findOneByIndex('code', code)
  }
}

export class HybridClassRepository
  extends HybridBaseRepository<ClassEntity>
  implements IClassRepository
{
  constructor() {
    super('classes', 'class')
  }

  public async findByAcademicYear(academicYearId: string): Promise<ClassEntity[]> {
    return this.findByIndex('academicYearId', academicYearId)
  }

  public async findByMajor(majorId: string): Promise<ClassEntity[]> {
    return this.findByIndex('majorId', majorId)
  }
}

export class HybridSubjectRepository
  extends HybridBaseRepository<SubjectEntity>
  implements ISubjectRepository
{
  constructor() {
    super('subjects', 'subject')
  }

  public async findByCode(code: string): Promise<SubjectEntity | null> {
    return this.findOneByIndex('code', code)
  }
}

export class HybridRoomRepository
  extends HybridBaseRepository<RoomEntity>
  implements IRoomRepository
{
  constructor() {
    super('rooms', 'room')
  }

  public async findByCode(code: string): Promise<RoomEntity | null> {
    return this.findOneByIndex('code', code)
  }
}

export class HybridStudentRepository
  extends HybridBaseRepository<StudentEntity>
  implements IStudentRepository
{
  constructor() {
    super('students', 'student')
  }

  public async findByNis(nis: string): Promise<StudentEntity | null> {
    return this.findOneByIndex('nis', nis)
  }

  public async findByClassId(classId: string): Promise<StudentEntity[]> {
    return this.findByIndex('classId', classId)
  }
}

export class HybridScheduleRepository
  extends HybridBaseRepository<ScheduleEntity>
  implements IScheduleRepository
{
  constructor() {
    super('schedules', 'schedule')
  }

  public async findByClass(classId: string, academicYearId?: string): Promise<ScheduleEntity[]> {
    const list = await this.findByIndex('classId', classId)
    if (academicYearId) {
      return list.filter((s) => s.academicYearId === academicYearId)
    }
    return list
  }

  public async findByTeacherAssignment(teacherAssignmentId: string): Promise<ScheduleEntity[]> {
    return this.findByIndex('teacherAssignmentId', teacherAssignmentId)
  }

  public async findByDay(dayOfWeek: string, academicYearId?: string): Promise<ScheduleEntity[]> {
    const list = await this.findByIndex('dayOfWeek', dayOfWeek)
    if (academicYearId) {
      return list.filter((s) => s.academicYearId === academicYearId)
    }
    return list
  }
}

export class HybridAttendanceRepository
  extends HybridBaseRepository<AttendanceEntity>
  implements IAttendanceRepository
{
  constructor() {
    super('attendances', 'attendance')
  }

  public async findByScheduleAndDate(
    scheduleId: string,
    date: string
  ): Promise<AttendanceEntity | null> {
    const list = await this.findByIndex('scheduleId', scheduleId)
    return list.find((a) => a.date === date) || null
  }

  public async findByClassAndDate(classId: string, date: string): Promise<AttendanceEntity[]> {
    const list = await this.findByIndex('classId', classId)
    return list.filter((a) => a.date === date)
  }
}

export class HybridJournalRepository
  extends HybridBaseRepository<JournalEntity>
  implements IJournalRepository
{
  constructor() {
    super('journals', 'journal')
  }

  public async findByScheduleAndDate(
    scheduleId: string,
    date: string
  ): Promise<JournalEntity | null> {
    const list = await this.findByIndex('scheduleId', scheduleId)
    return list.find((j) => j.date === date) || null
  }

  public async findByTeacherAndDate(
    teacherAssignmentId: string,
    date: string
  ): Promise<JournalEntity[]> {
    const list = await this.findByIndex('teacherAssignmentId', teacherAssignmentId)
    return list.filter((j) => j.date === date)
  }
}

export class HybridAssessmentRepository
  extends HybridBaseRepository<AssessmentEntity>
  implements IAssessmentRepository
{
  constructor() {
    super('assessments', 'assessment')
  }

  public async findByClassAndSubject(
    classId: string,
    subjectId: string
  ): Promise<AssessmentEntity[]> {
    const list = await this.findByIndex('classId', classId)
    return list.filter((a) => a.subjectId === subjectId)
  }

  public async findByTeacherAssignment(teacherAssignmentId: string): Promise<AssessmentEntity[]> {
    return this.findByIndex('teacherAssignmentId', teacherAssignmentId)
  }

  public async findByClass(classId: string): Promise<AssessmentEntity[]> {
    return this.findByIndex('classId', classId)
  }

  public async findByAcademicYear(academicYearId: string): Promise<AssessmentEntity[]> {
    return this.findByIndex('academicYearId', academicYearId)
  }
}

export class HybridDisciplineRepository
  extends HybridBaseRepository<DisciplineNoteEntity>
  implements IDisciplineRepository
{
  constructor() {
    super('discipline_notes', 'discipline')
  }

  public async findByStudentId(studentId: string): Promise<DisciplineNoteEntity[]> {
    return this.findByIndex('studentId', studentId)
  }

  public async findByClassId(classId: string): Promise<DisciplineNoteEntity[]> {
    return this.findByIndex('classId', classId)
  }
}

export class HybridAnnouncementRepository
  extends HybridBaseRepository<AnnouncementEntity>
  implements IAnnouncementRepository
{
  constructor() {
    super('announcements', 'announcement')
  }

  public async findPublished(targetRole?: string): Promise<AnnouncementEntity[]> {
    const list = await this.findAll()
    return list.filter((a) => {
      const isPub =
        (a as any).published !== undefined ? (a as any).published : (a as any).isPublished
      if (!isPub) return false
      if (!targetRole || a.targetRole === 'ALL') return true
      return a.targetRole === targetRole
    })
  }

  public async findPinned(): Promise<AnnouncementEntity[]> {
    const list = await this.findAll()
    return list.filter((a) => {
      const isPin = (a as any).pinned !== undefined ? (a as any).pinned : (a as any).isPinned
      const isPub =
        (a as any).published !== undefined ? (a as any).published : (a as any).isPublished
      return isPin && isPub
    })
  }
}

export class HybridSchoolIdentityRepository
  extends HybridBaseRepository<SchoolIdentityEntity>
  implements ISchoolIdentityRepository
{
  constructor() {
    super('school_identity', 'school')
  }

  public async getIdentity(): Promise<SchoolIdentityEntity | null> {
    const list = await this.findAll()
    return list.length > 0 ? list[0] : null
  }
}

export class HybridSyncQueueRepository
  extends HybridBaseRepository<SyncQueueEntity>
  implements ISyncQueueRepository
{
  constructor() {
    super('sync_queue', 'sync_queue')
  }

  public async findPending(): Promise<SyncQueueEntity[]> {
    return this.findByIndex('status', 'PENDING')
  }

  public async findByEntity(entityType: string, entityId: string): Promise<SyncQueueEntity[]> {
    const list = await this.findByIndex('entityType', entityType)
    return list.filter((i) => i.entityId === entityId)
  }
}

export class HybridImportHistoryRepository
  extends HybridBaseRepository<ImportHistoryEntity>
  implements IImportHistoryRepository
{
  constructor() {
    super('import_history', 'import_history')
  }

  public async findByEntityType(entityType: string): Promise<ImportHistoryEntity[]> {
    return this.findByIndex('entityType', entityType)
  }
}

export class HybridAuditLogRepository
  extends HybridBaseRepository<AuditLogEntity>
  implements IAuditLogRepository
{
  constructor() {
    super('audit_logs', 'audit_log')
  }

  public async findByAction(action: string): Promise<AuditLogEntity[]> {
    return this.findByIndex('action', action)
  }

  public async findByActor(actor: string): Promise<AuditLogEntity[]> {
    return this.findByIndex('actor', actor)
  }
}

export class HybridAcademicPeriodRepository
  extends HybridBaseRepository<AcademicPeriodEntity>
  implements IAcademicPeriodRepository
{
  constructor() {
    super('academic_periods', 'academic_period')
  }

  public async findByAcademicYear(academicYearId: string): Promise<AcademicPeriodEntity[]> {
    return this.findByIndex('academicYearId', academicYearId)
  }

  public async findActive(): Promise<AcademicPeriodEntity | null> {
    const all = await this.findAll()
    const active = all.find((p) => !p.isLocked)
    return active || null
  }
}

export class HybridSchoolAgendaRepository
  extends HybridBaseRepository<SchoolAgendaEntity>
  implements ISchoolAgendaRepository
{
  constructor() {
    super('school_agendas', 'school_agenda')
  }

  public async findByCategory(category: string): Promise<SchoolAgendaEntity[]> {
    return this.findByIndex('category', category)
  }

  public async findActive(targetRole?: string): Promise<SchoolAgendaEntity[]> {
    const all = await this.findAll()
    return all.filter((a) => {
      const roleMatch = !targetRole || a.targetRole === 'ALL' || a.targetRole === targetRole
      const statusMatch = a.status === 'ACTIVE'
      return roleMatch && statusMatch
    })
  }
}
