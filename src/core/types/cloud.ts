/**
 * Guru Offline - Production Cloud Architecture Types
 * Canonical Target: Online-First + Offline-Capable with Supabase & IndexedDB Cache
 */

import type { BaseEntity, SemesterType, AccountStatus } from './index'

export type GlobalSyncStatus =
  'ONLINE_SYNCED' | 'ONLINE_SYNCING' | 'OFFLINE_PENDING' | 'CONFLICT' | 'SYNC_ERROR'

export type MutationOperation = 'CREATE' | 'UPDATE' | 'DELETE'

export type MutationStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'CONFLICT'

export interface PendingMutationEntity extends BaseEntity {
  entity: string
  entityId: string
  operation: MutationOperation
  payload: any
  retryCount: number
  status: MutationStatus
  error?: string
  serverVersion?: number
  localVersion?: number
}

export type PeriodType = 'SEMESTER' | 'MONTHLY' | 'MID_SEMESTER' | 'FINAL_SUBMISSION'

export interface AcademicPeriodEntity extends BaseEntity {
  academicYearId: string
  name: string
  periodType: PeriodType
  semester: SemesterType
  month?: number
  year: number
  startDate: string
  endDate: string
  submissionDeadline: string
  isLocked: boolean
  lockedAt?: string
  lockedBy?: string
}

export type SubmissionStatus =
  'DRAFT' | 'READY_TO_SUBMIT' | 'SUBMITTED' | 'REVIEW' | 'RETURNED' | 'APPROVED' | 'LOCKED'

export interface CompletenessItem {
  key: string
  label: string
  percentage: number
  completedCount: number
  totalRequired: number
  status: 'COMPLETE' | 'INCOMPLETE'
  actionUrl?: string
  notes?: string
}

export interface CompletenessReport {
  teacherId?: string
  overallPercentage: number
  isReadyToSubmit: boolean
  items: CompletenessItem[]
  evaluatedAt: string
}

export interface SubmissionEntity extends BaseEntity {
  teacherId: string
  academicPeriodId: string
  status: SubmissionStatus
  submittedAt?: string
  reviewedAt?: string
  reviewedBy?: string
  feedback?: string
  version: number
  completeness: CompletenessReport
}

export interface SchoolAgendaEntity extends BaseEntity {
  title: string
  description?: string
  startDate: string
  endDate: string
  location?: string
  category: 'AKADEMIK' | 'UJIAN' | 'LIBUR' | 'RAPAT' | 'KEGIATAN'
  targetRole: 'ALL' | 'GURU' | 'ADMIN'
  isMandatory: boolean
  status: AccountStatus
}

export interface ConflictRecord {
  id: string
  mutationId: string
  entity: string
  entityId: string
  serverState: any
  localState: any
  detectedAt: string
  resolved: boolean
  resolutionStrategy?: 'CLIENT_WINS' | 'SERVER_WINS' | 'MANUAL_MERGE'
}
