/**
 * Guru Offline - Generic Repository Interface
 * Source of Truth: ARCHITECTURE.md, AGENT_RULES.md
 */

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

export interface QueryFilter<T> {
  where?: Partial<T> | ((item: T) => boolean)
  orderBy?: keyof T
  orderDirection?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface IRepository<T extends { id: string }> {
  findById(id: string): Promise<T | null>
  findAll(filter?: QueryFilter<T>): Promise<T[]>
  findByIndex(indexName: string, value: IDBValidKey | IDBKeyRange): Promise<T[]>
  findOneByIndex(indexName: string, value: IDBValidKey): Promise<T | null>
  create(entity: T): Promise<T>
  createBatch(entities: T[]): Promise<T[]>
  update(id: string, updates: Partial<T>): Promise<T>
  updateBatch(updatesList: Array<{ id: string; updates: Partial<T> }>): Promise<T[]>
  save(entity: T): Promise<T>
  delete(id: string): Promise<boolean>
  count(filter?: QueryFilter<T>): Promise<number>
  clear(): Promise<void>
}

export type IUserRepository = IRepository<UserEntity> & {
  findByUsername(username: string): Promise<UserEntity | null>
  findByTeacherId(teacherId: string): Promise<UserEntity | null>
}

export type ITeacherRepository = IRepository<TeacherEntity> & {
  findByNip(nip: string): Promise<TeacherEntity | null>
  findByNuptk(nuptk: string): Promise<TeacherEntity | null>
}

export type ITeacherAssignmentRepository = IRepository<TeacherAssignmentEntity> & {
  findByTeacherId(teacherId: string): Promise<TeacherAssignmentEntity[]>
  findByCode(code: string): Promise<TeacherAssignmentEntity[]>
  findByAcademicYear(academicYearId: string): Promise<TeacherAssignmentEntity[]>
}

export type IAcademicYearRepository = IRepository<AcademicYearEntity> & {
  findActive(): Promise<AcademicYearEntity | null>
}

export type IMajorRepository = IRepository<MajorEntity> & {
  findByCode(code: string): Promise<MajorEntity | null>
}

export type IClassRepository = IRepository<ClassEntity> & {
  findByAcademicYear(academicYearId: string): Promise<ClassEntity[]>
  findByMajor(majorId: string): Promise<ClassEntity[]>
}

export type ISubjectRepository = IRepository<SubjectEntity> & {
  findByCode(code: string): Promise<SubjectEntity | null>
}

export type IRoomRepository = IRepository<RoomEntity> & {
  findByCode(code: string): Promise<RoomEntity | null>
}

export type IStudentRepository = IRepository<StudentEntity> & {
  findByNis(nis: string): Promise<StudentEntity | null>
  findByClassId(classId: string): Promise<StudentEntity[]>
}

export type IScheduleRepository = IRepository<ScheduleEntity> & {
  findByClass(classId: string, academicYearId?: string): Promise<ScheduleEntity[]>
  findByTeacherAssignment(teacherAssignmentId: string): Promise<ScheduleEntity[]>
  findByDay(dayOfWeek: string, academicYearId?: string): Promise<ScheduleEntity[]>
}

export type IAttendanceRepository = IRepository<AttendanceEntity> & {
  findByScheduleAndDate(scheduleId: string, date: string): Promise<AttendanceEntity | null>
  findByClassAndDate(classId: string, date: string): Promise<AttendanceEntity[]>
}

export type IJournalRepository = IRepository<JournalEntity> & {
  findByScheduleAndDate(scheduleId: string, date: string): Promise<JournalEntity | null>
  findByTeacherAndDate(teacherAssignmentId: string, date: string): Promise<JournalEntity[]>
}

export type IAssessmentRepository = IRepository<AssessmentEntity> & {
  findByClassAndSubject(classId: string, subjectId: string): Promise<AssessmentEntity[]>
  findByTeacherAssignment(teacherAssignmentId: string): Promise<AssessmentEntity[]>
  findByClass(classId: string): Promise<AssessmentEntity[]>
  findByAcademicYear(academicYearId: string): Promise<AssessmentEntity[]>
}

export type IDisciplineRepository = IRepository<DisciplineNoteEntity> & {
  findByStudentId(studentId: string): Promise<DisciplineNoteEntity[]>
  findByClassId(classId: string): Promise<DisciplineNoteEntity[]>
}

export type IAnnouncementRepository = IRepository<AnnouncementEntity> & {
  findPublished(targetRole?: string): Promise<AnnouncementEntity[]>
  findPinned(): Promise<AnnouncementEntity[]>
}

export type ISchoolIdentityRepository = IRepository<SchoolIdentityEntity> & {
  getIdentity(): Promise<SchoolIdentityEntity | null>
}

export type ISyncQueueRepository = IRepository<SyncQueueEntity> & {
  findPending(): Promise<SyncQueueEntity[]>
  findByEntity(entityType: string, entityId: string): Promise<SyncQueueEntity[]>
}

export type IImportHistoryRepository = IRepository<ImportHistoryEntity> & {
  findByEntityType(entityType: string): Promise<ImportHistoryEntity[]>
}

export type IAuditLogRepository = IRepository<AuditLogEntity> & {
  findByAction(action: string): Promise<AuditLogEntity[]>
  findByActor(actor: string): Promise<AuditLogEntity[]>
}

export type IAcademicPeriodRepository = IRepository<AcademicPeriodEntity> & {
  findByAcademicYear(academicYearId: string): Promise<AcademicPeriodEntity[]>
  findActive(): Promise<AcademicPeriodEntity | null>
}

export type ISchoolAgendaRepository = IRepository<SchoolAgendaEntity> & {
  findByCategory(category: string): Promise<SchoolAgendaEntity[]>
  findActive(targetRole?: string): Promise<SchoolAgendaEntity[]>
}
