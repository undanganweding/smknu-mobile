/**
 * Guru Offline - Application-Level Authorization Service
 * Enforces domain & use-case authorization checks independently from UI hiding
 * Source of Truth: MASTER_SPEC.md, ARCHITECTURE.md, AGENT_RULES.md
 */

import { authService } from './AuthService'
import type { SessionData, UserRole } from '../../types'

export class AuthorizationError extends Error {
  constructor(message = 'Akses Ditolak: Anda tidak memiliki wewenang untuk tindakan ini.') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class AuthorizationService {
  private static instance: AuthorizationService | null = null

  public static getInstance(): AuthorizationService {
    if (!AuthorizationService.instance) {
      AuthorizationService.instance = new AuthorizationService()
    }
    return AuthorizationService.instance
  }

  /**
   * Verify that an active session exists
   * Throws AuthorizationError if unauthenticated
   */
  public requireAuth(): SessionData {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new AuthorizationError('Sesi tidak ditemukan. Silakan login terlebih dahulu.')
    }
    return session
  }

  /**
   * Verify that active user has one of the allowed roles
   */
  public requireRole(allowedRoles: UserRole[]): SessionData {
    const session = this.requireAuth()
    if (!allowedRoles.includes(session.role)) {
      throw new AuthorizationError(
        `Akses Ditolak: Wewenang diperlukan (${allowedRoles.join(', ')}), wewenang saat ini: ${session.role}`
      )
    }
    return session
  }

  /**
   * Verify that active user is an ADMIN
   */
  public requireAdmin(): SessionData {
    return this.requireRole(['ADMIN'])
  }

  /**
   * Verify that active user is a GURU, optionally checking for a specific teacherId
   */
  public requireTeacher(expectedTeacherId?: string): SessionData {
    const session = this.requireRole(['GURU'])
    if (expectedTeacherId && session.teacherId !== expectedTeacherId) {
      throw new AuthorizationError('Akses Ditolak: Anda tidak berwenang mengelola data guru lain.')
    }
    return session
  }

  /**
   * Check if current user has the specified role
   */
  public hasRole(role: UserRole): boolean {
    const session = authService.getCurrentSession()
    return !!session && session.role === role
  }

  /**
   * Check if current user is an admin
   */
  public isAdmin(): boolean {
    return this.hasRole('ADMIN')
  }

  /**
   * Check if current user is a teacher
   */
  public isTeacher(): boolean {
    return this.hasRole('GURU')
  }

  /**
   * Get authorized teacher ID for the active session (if role is GURU)
   */
  public getAuthorizedTeacherId(): string | undefined {
    const session = authService.getCurrentSession()
    if (session && session.role === 'GURU') {
      return session.teacherId
    }
    return undefined
  }
}

export const authorizationService = AuthorizationService.getInstance()
