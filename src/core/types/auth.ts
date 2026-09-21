/**
 * Guru Offline - Authentication & Session Types
 * Source of Truth: MASTER_SPEC.md, ARCHITECTURE.md
 */

import type { UserRole, AccountStatus, UserEntity, TeacherEntity } from './index'

export interface SessionData {
  sessionId: string
  userId: string
  username: string
  role: UserRole
  teacherId?: string
  teacherName?: string
  authenticatedAt: string
}

export interface AuthResult {
  success: boolean
  message: string
  session?: SessionData
  user?: UserEntity
  teacher?: TeacherEntity
}

export interface AuthOperationResult {
  success: boolean
  message: string
  data?: any
}

export interface CreateUserParams {
  username: string
  password: string
  role: UserRole
  teacherId?: string
  status?: AccountStatus
}

export interface ChangePasswordParams {
  userId: string
  currentPassword?: string
  newPassword: string
  confirmPassword?: string
}
