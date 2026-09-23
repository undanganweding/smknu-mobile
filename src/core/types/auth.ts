/**
 * Guru Offline - Authentication & Session Types
 * Source of Truth: MASTER_SPEC.md, ARCHITECTURE.md
 */

import type { UserRole, AccountStatus, UserEntity, TeacherEntity } from './index'

export type AuthState =
  'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'expired' | 'offline' | 'error'

/**
 * Canonical Authenticated Identity Model
 * Single source of truth for the active user's identity, role, and capabilities
 */
export interface UserIdentity {
  userId: string
  username: string
  displayName: string
  email: string
  role: UserRole
  status: AccountStatus
  teacherId?: string
  teacherName?: string
  teacherNip?: string
  permissions: string[]
  sessionState: AuthState
  authenticatedAt: string
  lastActiveAt: string
  source: 'SUPABASE' | 'OFFLINE_CACHE'
}

export interface SessionData {
  sessionId: string
  userId: string
  username: string
  role: UserRole
  teacherId?: string
  teacherName?: string
  authenticatedAt: string
  identity?: UserIdentity
  expiresAt?: string
}

export interface AuthResult {
  success: boolean
  message: string
  session?: SessionData
  identity?: UserIdentity
  user?: UserEntity
  teacher?: TeacherEntity
  errorCode?:
    | 'INVALID_CREDENTIALS'
    | 'INACTIVE_ACCOUNT'
    | 'INACTIVE_TEACHER'
    | 'OFFLINE_FIRST_LOGIN_REQUIRED'
    | 'SESSION_EXPIRED'
    | 'NETWORK_ERROR'
    | 'UNKNOWN_ERROR'
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
