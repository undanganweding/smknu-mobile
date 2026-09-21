/**
 * Guru Offline - Repository Container & Factory
 * Centralized singleton access to all entity repositories
 */

import {
  IndexedDbUserRepository,
  IndexedDbTeacherRepository,
  IndexedDbTeacherAssignmentRepository,
  IndexedDbAcademicYearRepository,
  IndexedDbMajorRepository,
  IndexedDbClassRepository,
  IndexedDbSubjectRepository,
  IndexedDbRoomRepository,
  IndexedDbStudentRepository,
  IndexedDbScheduleRepository,
  IndexedDbAttendanceRepository,
  IndexedDbJournalRepository,
  IndexedDbAssessmentRepository,
  IndexedDbDisciplineRepository,
  IndexedDbAnnouncementRepository,
  IndexedDbSchoolIdentityRepository,
  IndexedDbSyncQueueRepository,
  IndexedDbImportHistoryRepository,
  IndexedDbAuditLogRepository
} from './indexeddb/repositories'

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
} from './interfaces/IRepository'

export class RepositoryContainer {
  public readonly users: IUserRepository
  public readonly teachers: ITeacherRepository
  public readonly teacherAssignments: ITeacherAssignmentRepository
  public readonly academicYears: IAcademicYearRepository
  public readonly majors: IMajorRepository
  public readonly classes: IClassRepository
  public readonly subjects: ISubjectRepository
  public readonly rooms: IRoomRepository
  public readonly students: IStudentRepository
  public readonly schedules: IScheduleRepository
  public readonly attendances: IAttendanceRepository
  public readonly journals: IJournalRepository
  public readonly assessments: IAssessmentRepository
  public readonly disciplineNotes: IDisciplineRepository
  public readonly announcements: IAnnouncementRepository
  public readonly schoolIdentity: ISchoolIdentityRepository
  public readonly syncQueue: ISyncQueueRepository
  public readonly importHistory: IImportHistoryRepository
  public readonly auditLogs: IAuditLogRepository

  constructor() {
    this.users = new IndexedDbUserRepository()
    this.teachers = new IndexedDbTeacherRepository()
    this.teacherAssignments = new IndexedDbTeacherAssignmentRepository()
    this.academicYears = new IndexedDbAcademicYearRepository()
    this.majors = new IndexedDbMajorRepository()
    this.classes = new IndexedDbClassRepository()
    this.subjects = new IndexedDbSubjectRepository()
    this.rooms = new IndexedDbRoomRepository()
    this.students = new IndexedDbStudentRepository()
    this.schedules = new IndexedDbScheduleRepository()
    this.attendances = new IndexedDbAttendanceRepository()
    this.journals = new IndexedDbJournalRepository()
    this.assessments = new IndexedDbAssessmentRepository()
    this.disciplineNotes = new IndexedDbDisciplineRepository()
    this.announcements = new IndexedDbAnnouncementRepository()
    this.schoolIdentity = new IndexedDbSchoolIdentityRepository()
    this.syncQueue = new IndexedDbSyncQueueRepository()
    this.importHistory = new IndexedDbImportHistoryRepository()
    this.auditLogs = new IndexedDbAuditLogRepository()
  }
}

export const repositories = new RepositoryContainer()
export * from './interfaces/IRepository'
