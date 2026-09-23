/**
 * Guru Offline - Core Entity Types & Enums
 * Source of Truth: MASTER_SPEC.md, ARCHITECTURE.md, DATABASE_SCHEMA.md, PDF Reference
 */

export type UserRole = 'ADMIN' | 'GURU'
export type AccountStatus = 'ACTIVE' | 'INACTIVE'
export type SemesterType = 'GANJIL' | 'GENAP'
export type GenderType = 'L' | 'P'
export type ClassLevel = 'X' | 'XI' | 'XII'
export type SubjectCategory = 'UMUM' | 'KEJURUAN' | 'MUATAN_LOKAL' | 'PILIHAN'
export type RoomType = 'THEORY' | 'LAB' | 'WORKSHOP' | 'OTHER'
export type StudentStatus = 'ACTIVE' | 'MUTATION' | 'GRADUATED' | 'INACTIVE'
export type DayOfWeek = 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU'
export type AttendanceStatus = 'H' | 'I' | 'S' | 'A' | 'T' | 'D'
export type AssessmentType = 'HARIAN' | 'TUGAS' | 'KUIS' | 'STS' | 'SAS' | 'SIKAP' | 'KETERAMPILAN'
export type DisciplineType = 'VIOLATION' | 'PRAISE' | 'NOTE'
export type AnnouncementPriority = 'URGENT' | 'NORMAL'
export type AnnouncementTarget = 'ALL' | 'ADMIN' | 'GURU'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface UserEntity extends BaseEntity {
  username: string
  passwordHash: string
  role: UserRole
  teacherId?: string
  status: AccountStatus
  lastLoginAt?: string
}

export interface TeacherEntity extends BaseEntity {
  nip?: string
  nuptk?: string
  nik?: string
  name: string
  title?: string
  gender?: GenderType
  birthPlace?: string
  birthDate?: string
  employmentStatus?: string
  position?: string
  rankGroup?: string
  education?: string
  studyProgram?: string
  phone?: string
  email?: string
  address?: string
  photo?: string
  status: AccountStatus
}

export interface TeacherAssignmentEntity extends BaseEntity {
  teacherId: string
  code: string
  subjectId: string
  hours: number
  academicYearId: string
  semester: SemesterType
  status: AccountStatus
}

export interface AcademicYearEntity extends BaseEntity {
  name: string
  semester: SemesterType
  isActive: boolean
  startDate: string
  endDate: string
  isLocked?: boolean
  lockedAt?: string
}

export interface MajorEntity extends BaseEntity {
  code: string
  name: string
  status: AccountStatus
}

export interface ClassEntity extends BaseEntity {
  name: string
  level: ClassLevel
  rombel: number | string
  academicYearId: string
  majorId: string
  homeroomTeacherId?: string
  status: AccountStatus
}

export interface SubjectEntity extends BaseEntity {
  code: string
  name: string
  category?: SubjectCategory
  defaultKkm?: number
  status: AccountStatus
}

export interface RoomEntity extends BaseEntity {
  code: string
  name: string
  type: RoomType
  capacity?: number
  status: AccountStatus
}

export interface StudentEntity extends BaseEntity {
  nis: string
  nisn?: string
  name: string
  gender: GenderType
  birthPlace?: string
  birthDate?: string
  classId: string
  status: StudentStatus
  parentPhone?: string
  address?: string
}

export interface ScheduleEntity extends BaseEntity {
  academicYearId: string
  classId: string
  teacherAssignmentId: string
  dayOfWeek: DayOfWeek
  periodStart: number
  periodEnd: number
  timeStart: string
  timeEnd: string
  roomId: string
  status: AccountStatus
}

export type TimeSlotType = 'TEACHING' | 'BREAK' | 'DHUHA' | 'DHUHUR' | 'MUJAHADAH' | 'OTHER'

export interface TimeSlotEntity extends BaseEntity {
  slotNumber: number
  startTime: string
  endTime: string
  label: string
  type: TimeSlotType
  dayOfWeek?: DayOfWeek
  description?: string
  status: AccountStatus
}

export interface StudentAttendanceRecord {
  studentId: string
  status: AttendanceStatus
  note?: string
}

export interface AttendanceEntity extends BaseEntity {
  scheduleId: string
  classId: string
  teacherAssignmentId: string
  date: string
  academicYearId: string
  semester: SemesterType
  records: StudentAttendanceRecord[]
  createdBy: string
  updatedBy?: string
}

export interface AttendanceSummary {
  hadir: number
  izin: number
  sakit: number
  alpa: number
  terlambat: number
  dispensasi: number
}

export interface JournalEntity extends BaseEntity {
  scheduleId: string
  classId: string
  teacherAssignmentId: string
  date: string
  timeSlot: string
  academicYearId: string
  semester: SemesterType
  topic: string
  activitySummary: string
  studentAttendanceSummary?: AttendanceSummary
  notes?: string
  createdBy: string
  updatedBy?: string
  material?: string
  learningActivity?: string
  learningOutcome?: string
  journalStatus?: 'DRAFT' | 'COMPLETED' | 'LOCKED'
}

export interface StudentAssessmentScore {
  studentId: string
  score?: number
  feedback?: string
}

export interface AssessmentEntity extends BaseEntity {
  classId: string
  subjectId: string
  teacherAssignmentId: string
  academicYearId: string
  semester: SemesterType
  type: AssessmentType
  title: string
  date?: string
  maxScore: number
  scores: StudentAssessmentScore[]
  createdBy: string
  updatedBy?: string
}

export interface DisciplineNoteEntity extends BaseEntity {
  studentId: string
  teacherId: string
  classId: string
  date: string
  type: DisciplineType
  point?: number
  description: string
  followup?: string
  createdBy: string
  updatedBy?: string
}

export interface AnnouncementEntity extends BaseEntity {
  title: string
  content: string
  priority: AnnouncementPriority
  targetRole: AnnouncementTarget
  published: boolean
  pinned: boolean
  authorId: string
  publishedAt?: string
  expiresAt?: string
  isPinned?: boolean
  isPublished?: boolean
}

export interface SchoolIdentityEntity extends BaseEntity {
  npsn: string
  name: string
  address: string
  principalName: string
  principalNip?: string
  wks1Name: string
  wks1Nip?: string
  logoUrl?: string
  contact: string
  isoDocCode?: string
}

export type SyncItemStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED'
export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE'
export type SyncEntityType = 'ATTENDANCE' | 'JOURNAL' | 'ASSESSMENT' | 'DISCIPLINE' | 'MASTER'

export interface SyncQueueEntity extends BaseEntity {
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperation
  payload: any
  status: SyncItemStatus
  attempts: number
  lastError?: string
  queuedAt: string
  syncedAt?: string
}

export interface GasSyncRequestPayload {
  operationId: string
  operation: SyncOperation
  entityType: SyncEntityType
  entityId: string
  teacherId: string
  sessionToken?: string
  payload: any
  clientTimestamp: string
}

export interface GasSyncResponsePayload {
  success: boolean
  operationId: string
  entityId: string
  entityType: SyncEntityType
  message: string
  errorCode?:
    | 'UNAUTHORIZED'
    | 'INVALID_PAYLOAD'
    | 'DUPLICATE_OPERATION'
    | 'RELATIONSHIP_ERROR'
    | 'SERVER_ERROR'
    | 'CONFIG_ERROR'
  isRetryable?: boolean
  syncedAt: string
  details?: any
}

export type ImportStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED'
export type ImportCommitMode = 'STRICT' | 'VALID_ROWS_ONLY'
export type ImportDuplicateMode = 'CREATE_ONLY' | 'UPSERT' | 'UPDATE_EXISTING'

export interface ImportHistoryEntity extends BaseEntity {
  timestamp: string
  actor: string
  entityType: string
  filename: string
  commitMode: ImportCommitMode
  duplicateMode: ImportDuplicateMode
  totalRows: number
  createdCount: number
  updatedCount: number
  failedCount: number
  warningCount: number
  status: ImportStatus
  errorLogCsv?: string
}

export interface AuditLogEntity extends BaseEntity {
  timestamp: string
  actor: string
  role: UserRole
  action: string
  entityType: string
  affectedIds?: string[]
  operation: string
  result: 'SUCCESS' | 'FAILED'
  source: string
  details?: Record<string, any>
}

export * from './auth'
export * from './cloud'
