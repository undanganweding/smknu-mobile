/**
 * Guru Offline - Concrete IndexedDB Repositories
 * Source of Truth: ARCHITECTURE.md, DATABASE_SCHEMA.md
 */

import { BaseIndexedDbRepository } from './BaseIndexedDbRepository'
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
  AuditLogEntity
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
  IAuditLogRepository
} from '../interfaces/IRepository'

export class IndexedDbUserRepository
  extends BaseIndexedDbRepository<UserEntity>
  implements IUserRepository
{
  constructor() {
    super('users')
  }

  public async findByUsername(username: string): Promise<UserEntity | null> {
    return this.findOneByIndex('username', username)
  }

  public async findByTeacherId(teacherId: string): Promise<UserEntity | null> {
    return this.findOneByIndex('teacherId', teacherId)
  }
}

export class IndexedDbTeacherRepository
  extends BaseIndexedDbRepository<TeacherEntity>
  implements ITeacherRepository
{
  constructor() {
    super('teachers')
  }

  public async findByNip(nip: string): Promise<TeacherEntity | null> {
    return this.findOneByIndex('nip', nip)
  }

  public async findByNuptk(nuptk: string): Promise<TeacherEntity | null> {
    return this.findOneByIndex('nuptk', nuptk)
  }
}

export class IndexedDbTeacherAssignmentRepository
  extends BaseIndexedDbRepository<TeacherAssignmentEntity>
  implements ITeacherAssignmentRepository
{
  constructor() {
    super('teacher_assignments')
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

export class IndexedDbAcademicYearRepository
  extends BaseIndexedDbRepository<AcademicYearEntity>
  implements IAcademicYearRepository
{
  constructor() {
    super('academic_years')
  }

  public async findActive(): Promise<AcademicYearEntity | null> {
    const active = await this.findAll({ where: { isActive: true } })
    return active[0] || null
  }
}

export class IndexedDbMajorRepository
  extends BaseIndexedDbRepository<MajorEntity>
  implements IMajorRepository
{
  constructor() {
    super('majors')
  }

  public async findByCode(code: string): Promise<MajorEntity | null> {
    return this.findOneByIndex('code', code)
  }
}

export class IndexedDbClassRepository
  extends BaseIndexedDbRepository<ClassEntity>
  implements IClassRepository
{
  constructor() {
    super('classes')
  }

  public async findByAcademicYear(academicYearId: string): Promise<ClassEntity[]> {
    return this.findByIndex('academicYearId', academicYearId)
  }

  public async findByMajor(majorId: string): Promise<ClassEntity[]> {
    return this.findByIndex('majorId', majorId)
  }
}

export class IndexedDbSubjectRepository
  extends BaseIndexedDbRepository<SubjectEntity>
  implements ISubjectRepository
{
  constructor() {
    super('subjects')
  }

  public async findByCode(code: string): Promise<SubjectEntity | null> {
    return this.findOneByIndex('code', code)
  }
}

export class IndexedDbRoomRepository
  extends BaseIndexedDbRepository<RoomEntity>
  implements IRoomRepository
{
  constructor() {
    super('rooms')
  }

  public async findByCode(code: string): Promise<RoomEntity | null> {
    return this.findOneByIndex('code', code)
  }
}

export class IndexedDbStudentRepository
  extends BaseIndexedDbRepository<StudentEntity>
  implements IStudentRepository
{
  constructor() {
    super('students')
  }

  public async findByNis(nis: string): Promise<StudentEntity | null> {
    return this.findOneByIndex('nis', nis)
  }

  public async findByClassId(classId: string): Promise<StudentEntity[]> {
    return this.findByIndex('classId', classId)
  }
}

export class IndexedDbScheduleRepository
  extends BaseIndexedDbRepository<ScheduleEntity>
  implements IScheduleRepository
{
  constructor() {
    super('schedules')
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

export class IndexedDbAttendanceRepository
  extends BaseIndexedDbRepository<AttendanceEntity>
  implements IAttendanceRepository
{
  constructor() {
    super('attendances')
  }

  public async findByScheduleAndDate(
    scheduleId: string,
    date: string
  ): Promise<AttendanceEntity | null> {
    const list = await this.findAll({ where: { scheduleId, date } })
    return list[0] || null
  }

  public async findByClassAndDate(classId: string, date: string): Promise<AttendanceEntity[]> {
    return this.findAll({ where: { classId, date } })
  }
}

export class IndexedDbJournalRepository
  extends BaseIndexedDbRepository<JournalEntity>
  implements IJournalRepository
{
  constructor() {
    super('journals')
  }

  public async findByScheduleAndDate(
    scheduleId: string,
    date: string
  ): Promise<JournalEntity | null> {
    const list = await this.findAll({ where: { scheduleId, date } })
    return list[0] || null
  }

  public async findByTeacherAndDate(
    teacherAssignmentId: string,
    date: string
  ): Promise<JournalEntity[]> {
    return this.findAll({ where: { teacherAssignmentId, date } })
  }
}

export class IndexedDbAssessmentRepository
  extends BaseIndexedDbRepository<AssessmentEntity>
  implements IAssessmentRepository
{
  constructor() {
    super('assessments')
  }

  public async findByClassAndSubject(
    classId: string,
    subjectId: string
  ): Promise<AssessmentEntity[]> {
    return this.findAll({ where: { classId, subjectId } })
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

export class IndexedDbDisciplineRepository
  extends BaseIndexedDbRepository<DisciplineNoteEntity>
  implements IDisciplineRepository
{
  constructor() {
    super('discipline_notes')
  }

  public async findByStudentId(studentId: string): Promise<DisciplineNoteEntity[]> {
    return this.findByIndex('studentId', studentId)
  }

  public async findByClassId(classId: string): Promise<DisciplineNoteEntity[]> {
    return this.findByIndex('classId', classId)
  }
}

export class IndexedDbAnnouncementRepository
  extends BaseIndexedDbRepository<AnnouncementEntity>
  implements IAnnouncementRepository
{
  constructor() {
    super('announcements')
  }

  public async findPublished(targetRole?: string): Promise<AnnouncementEntity[]> {
    const list = await this.findAll({ where: { published: true } })
    if (targetRole && targetRole !== 'ALL') {
      return list.filter((a) => a.targetRole === 'ALL' || a.targetRole === targetRole)
    }
    return list
  }

  public async findPinned(): Promise<AnnouncementEntity[]> {
    return this.findAll({ where: { published: true, pinned: true } })
  }
}

export class IndexedDbSchoolIdentityRepository
  extends BaseIndexedDbRepository<SchoolIdentityEntity>
  implements ISchoolIdentityRepository
{
  constructor() {
    super('school_identity')
  }

  public async getIdentity(): Promise<SchoolIdentityEntity | null> {
    const list = await this.findAll()
    return list[0] || null
  }
}

export class IndexedDbSyncQueueRepository
  extends BaseIndexedDbRepository<SyncQueueEntity>
  implements ISyncQueueRepository
{
  constructor() {
    super('sync_queue')
  }

  public async findPending(): Promise<SyncQueueEntity[]> {
    return this.findByIndex('status', 'PENDING')
  }

  public async findByEntity(entityType: string, entityId: string): Promise<SyncQueueEntity[]> {
    const items = await this.findByIndex('entityType', entityType)
    return items.filter((item) => item.entityId === entityId)
  }
}

export class IndexedDbImportHistoryRepository
  extends BaseIndexedDbRepository<ImportHistoryEntity>
  implements IImportHistoryRepository
{
  constructor() {
    super('import_history')
  }

  public async findByEntityType(entityType: string): Promise<ImportHistoryEntity[]> {
    return this.findByIndex('entityType', entityType)
  }
}

export class IndexedDbAuditLogRepository
  extends BaseIndexedDbRepository<AuditLogEntity>
  implements IAuditLogRepository
{
  constructor() {
    super('audit_logs')
  }

  public async findByAction(action: string): Promise<AuditLogEntity[]> {
    return this.findByIndex('action', action)
  }

  public async findByActor(actor: string): Promise<AuditLogEntity[]> {
    return this.findByIndex('actor', actor)
  }
}
