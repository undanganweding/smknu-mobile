/**
 * Guru Offline - Repository Container & Factory
 * Centralized singleton access to all entity repositories
 */

import {
  HybridUserRepository,
  HybridTeacherRepository,
  HybridTeacherAssignmentRepository,
  HybridAcademicYearRepository,
  HybridMajorRepository,
  HybridClassRepository,
  HybridSubjectRepository,
  HybridRoomRepository,
  HybridStudentRepository,
  HybridScheduleRepository,
  HybridAttendanceRepository,
  HybridJournalRepository,
  HybridAssessmentRepository,
  HybridDisciplineRepository,
  HybridAnnouncementRepository,
  HybridSchoolIdentityRepository,
  HybridSyncQueueRepository,
  HybridImportHistoryRepository,
  HybridAuditLogRepository,
  HybridAcademicPeriodRepository,
  HybridSchoolAgendaRepository
} from './hybrid/repositories'

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
  public readonly academicPeriods: IAcademicPeriodRepository
  public readonly schoolAgendas: ISchoolAgendaRepository

  constructor() {
    this.users = new HybridUserRepository()
    this.teachers = new HybridTeacherRepository()
    this.teacherAssignments = new HybridTeacherAssignmentRepository()
    this.academicYears = new HybridAcademicYearRepository()
    this.majors = new HybridMajorRepository()
    this.classes = new HybridClassRepository()
    this.subjects = new HybridSubjectRepository()
    this.rooms = new HybridRoomRepository()
    this.students = new HybridStudentRepository()
    this.schedules = new HybridScheduleRepository()
    this.attendances = new HybridAttendanceRepository()
    this.journals = new HybridJournalRepository()
    this.assessments = new HybridAssessmentRepository()
    this.disciplineNotes = new HybridDisciplineRepository()
    this.announcements = new HybridAnnouncementRepository()
    this.schoolIdentity = new HybridSchoolIdentityRepository()
    this.syncQueue = new HybridSyncQueueRepository()
    this.importHistory = new HybridImportHistoryRepository()
    this.auditLogs = new HybridAuditLogRepository()
    this.academicPeriods = new HybridAcademicPeriodRepository()
    this.schoolAgendas = new HybridSchoolAgendaRepository()
  }
}

export const repositories = new RepositoryContainer()
export * from './interfaces/IRepository'
