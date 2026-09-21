/**
 * Guru Offline - Centralized Authentication Service
 * 100% Offline Local Authentication via IndexedDB Repositories
 * Source of Truth: MASTER_SPEC.md, ARCHITECTURE.md, AGENT_RULES.md
 */

import { repositories } from '../../repositories'
import { hashPassword, verifyPassword } from '../../security/password'
import type {
  UserEntity,
  TeacherEntity,
  AccountStatus,
  SessionData,
  AuthResult,
  AuthOperationResult,
  CreateUserParams
} from '../../types'

const SESSION_STORAGE_KEY = 'guru_offline_session'

export class AuthService {
  private static instance: AuthService | null = null
  private currentSession: SessionData | null = null

  private constructor() {
    this.loadSessionFromStorage()
  }

  /**
   * Singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Load active session metadata from localStorage on init
   */
  private loadSessionFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return
      }
      const raw = localStorage.getItem(SESSION_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SessionData
        if (parsed && parsed.sessionId && parsed.userId && parsed.role) {
          this.currentSession = parsed
        }
      }
    } catch {
      this.currentSession = null
    }
  }

  /**
   * Save session metadata to localStorage (NO password or hash)
   */
  private saveSessionToStorage(session: SessionData | null): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return
      }
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    } catch (error) {
      console.error('[AuthService] Failed to persist session:', error)
    }
  }

  /**
   * Get current in-memory / restored session
   */
  public getCurrentSession(): SessionData | null {
    if (!this.currentSession) {
      this.loadSessionFromStorage()
    }
    return this.currentSession
  }

  /**
   * Directly set active session (used for testing or session restore)
   */
  public setSessionForTesting(session: SessionData | null): void {
    this.currentSession = session
    this.saveSessionToStorage(session)
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.getCurrentSession()
  }

  /**
   * Verify session validity against IndexedDB
   * Re-checks user existence, active status, and teacher status
   */
  public async verifySession(): Promise<SessionData | null> {
    const session = this.getCurrentSession()
    if (!session) {
      return null
    }

    try {
      const user = await repositories.users.findById(session.userId)
      if (!user || user.status !== 'ACTIVE') {
        await this.logout()
        return null
      }

      if (user.role === 'GURU') {
        if (!user.teacherId) {
          await this.logout()
          return null
        }
        const teacher = await repositories.teachers.findById(user.teacherId)
        if (!teacher || teacher.status !== 'ACTIVE') {
          await this.logout()
          return null
        }
      }

      return session
    } catch (error) {
      console.error('[AuthService] verifySession error:', error)
      return null
    }
  }

  /**
   * Authenticate user with username and password
   */
  public async login(usernameInput: string, passwordInput: string): Promise<AuthResult> {
    const username = (usernameInput || '').trim()
    const password = passwordInput || ''

    if (!username || !password) {
      return {
        success: false,
        message: 'Username dan password wajib diisi.'
      }
    }

    try {
      // 1. Find user in UserRepository
      const user = await repositories.users.findByUsername(username)
      if (!user) {
        return {
          success: false,
          message: 'Username atau password salah.'
        }
      }

      // 2. Check account status
      if (user.status !== 'ACTIVE') {
        return {
          success: false,
          message: 'Akun tidak aktif. Silakan hubungi Administrator.'
        }
      }

      // 3. Verify password
      const { valid, needsRehash } = await verifyPassword(password, user.passwordHash)
      if (!valid) {
        return {
          success: false,
          message: 'Username atau password salah.'
        }
      }

      // 3b. Production Credential Safety Guard
      const isProd = typeof import.meta.env !== 'undefined' && import.meta.env.PROD === true
      if (isProd) {
        const isDefaultAdmin = username === 'admin' && password === 'admin123'
        const isDefaultGuru = username === 'guru' && password === 'guru123'
        if (isDefaultAdmin || isDefaultGuru) {
          return {
            success: false,
            message:
              'Demi alasan keamanan, kredensial default (admin123/guru123) diblokir di lingkungan Produksi. Silakan ubah password Anda di mode Development terlebih dahulu atau hubungi Administrator.'
          }
        }
      }

      // 4. Upgrade legacy SHA-256 hash if needed
      if (needsRehash) {
        try {
          const upgradedHash = await hashPassword(password)
          await repositories.users.update(user.id, {
            passwordHash: upgradedHash,
            updatedAt: new Date().toISOString()
          })
          user.passwordHash = upgradedHash
        } catch (upgradeErr) {
          console.warn('[AuthService] Password hash upgrade warning:', upgradeErr)
        }
      }

      // 5. Validate Role
      if (user.role !== 'ADMIN' && user.role !== 'GURU') {
        return {
          success: false,
          message: 'Role pengguna tidak valid.'
        }
      }

      // 6. Validate GURU teacher relationship
      let teacher: TeacherEntity | undefined
      if (user.role === 'GURU') {
        if (!user.teacherId) {
          return {
            success: false,
            message: 'Akun guru belum terhubung dengan data guru di sistem.'
          }
        }
        const teacherEntity = await repositories.teachers.findById(user.teacherId)
        if (!teacherEntity) {
          return {
            success: false,
            message: 'Data guru yang terhubung tidak ditemukan.'
          }
        }
        if (teacherEntity.status !== 'ACTIVE') {
          return {
            success: false,
            message: 'Status data guru yang terhubung tidak aktif.'
          }
        }
        teacher = teacherEntity
      }

      // 7. Update lastLoginAt
      const now = new Date().toISOString()
      await repositories.users.update(user.id, {
        lastLoginAt: now,
        updatedAt: now
      })

      // 8. Create Session
      const session: SessionData = {
        sessionId: `sess_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`,
        userId: user.id,
        username: user.username,
        role: user.role,
        teacherId: user.teacherId,
        teacherName: teacher?.name,
        authenticatedAt: now
      }

      this.currentSession = session
      this.saveSessionToStorage(session)

      return {
        success: true,
        message: 'Login berhasil.',
        session,
        user,
        teacher
      }
    } catch (error) {
      console.error('[AuthService] Login execution error:', error)
      return {
        success: false,
        message: 'Terjadi kesalahan sistem saat verifikasi akun.'
      }
    }
  }

  /**
   * Log out active session
   */
  public async logout(): Promise<void> {
    this.currentSession = null
    this.saveSessionToStorage(null)
  }

  /**
   * Change user password (User or Admin)
   */
  public async changePassword(
    userId: string,
    currentPassword?: string,
    newPassword?: string
  ): Promise<AuthOperationResult> {
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        message: 'Password baru minimal harus 6 karakter.'
      }
    }

    const session = this.getCurrentSession()
    if (!session) {
      return {
        success: false,
        message: 'Sesi tidak valid. Silakan login terlebih dahulu.'
      }
    }

    const isAdmin = session.role === 'ADMIN'
    const isSelf = session.userId === userId

    if (!isAdmin && !isSelf) {
      return {
        success: false,
        message: 'Anda tidak memiliki wewenang untuk mengubah password pengguna ini.'
      }
    }

    try {
      const user = await repositories.users.findById(userId)
      if (!user) {
        return {
          success: false,
          message: 'Pengguna tidak ditemukan.'
        }
      }

      // If user is changing their own password, verify current password
      if (isSelf && !isAdmin) {
        if (!currentPassword) {
          return {
            success: false,
            message: 'Password saat ini wajib diisi.'
          }
        }
        const { valid } = await verifyPassword(currentPassword, user.passwordHash)
        if (!valid) {
          return {
            success: false,
            message: 'Password saat ini tidak sesuai.'
          }
        }
      }

      // Hash new password with PBKDF2
      const newHash = await hashPassword(newPassword)
      const now = new Date().toISOString()
      await repositories.users.update(userId, {
        passwordHash: newHash,
        updatedAt: now
      })

      return {
        success: true,
        message: 'Password berhasil diperbarui.'
      }
    } catch (error) {
      console.error('[AuthService] changePassword error:', error)
      return {
        success: false,
        message: 'Gagal memperbarui password.'
      }
    }
  }

  /**
   * Admin resets user password directly
   */
  public async adminResetPassword(
    targetUserId: string,
    newPassword: string
  ): Promise<AuthOperationResult> {
    const session = this.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      return {
        success: false,
        message: 'Hanya Administrator yang dapat mereset password pengguna.'
      }
    }

    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        message: 'Password baru minimal harus 6 karakter.'
      }
    }

    try {
      const targetUser = await repositories.users.findById(targetUserId)
      if (!targetUser) {
        return {
          success: false,
          message: 'Pengguna target tidak ditemukan.'
        }
      }

      const newHash = await hashPassword(newPassword)
      const now = new Date().toISOString()
      await repositories.users.update(targetUserId, {
        passwordHash: newHash,
        updatedAt: now
      })

      return {
        success: true,
        message: `Password pengguna ${targetUser.username} berhasil direset.`
      }
    } catch (error) {
      console.error('[AuthService] adminResetPassword error:', error)
      return {
        success: false,
        message: 'Gagal mereset password pengguna.'
      }
    }
  }

  /**
   * Admin sets user account status (ACTIVE / INACTIVE)
   * Historical data is preserved
   */
  public async setUserStatus(
    targetUserId: string,
    status: AccountStatus
  ): Promise<AuthOperationResult> {
    const session = this.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      return {
        success: false,
        message: 'Hanya Administrator yang dapat mengubah status akun.'
      }
    }

    try {
      const targetUser = await repositories.users.findById(targetUserId)
      if (!targetUser) {
        return {
          success: false,
          message: 'Pengguna tidak ditemukan.'
        }
      }

      // If deactivating self, check if other active admins exist
      if (session.userId === targetUserId && status === 'INACTIVE') {
        const allUsers = await repositories.users.findAll()
        const otherActiveAdmins = allUsers.filter(
          (u) => u.id !== targetUserId && u.role === 'ADMIN' && u.status === 'ACTIVE'
        )
        if (otherActiveAdmins.length === 0) {
          return {
            success: false,
            message: 'Tidak dapat menonaktifkan satu-satunya akun Administrator yang aktif.'
          }
        }
      }

      const now = new Date().toISOString()
      await repositories.users.update(targetUserId, {
        status,
        updatedAt: now
      })

      return {
        success: true,
        message: `Status akun ${targetUser.username} berhasil diubah menjadi ${status}.`
      }
    } catch (error) {
      console.error('[AuthService] setUserStatus error:', error)
      return {
        success: false,
        message: 'Gagal mengubah status akun.'
      }
    }
  }

  /**
   * Admin creates a new user account
   */
  public async createUser(params: CreateUserParams): Promise<AuthOperationResult> {
    const session = this.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      return {
        success: false,
        message: 'Hanya Administrator yang dapat membuat akun baru.'
      }
    }

    const username = (params.username || '').trim()
    const password = params.password || ''
    const role = params.role
    const teacherId = params.teacherId
    const status = params.status || 'ACTIVE'

    if (!username || !password || !role) {
      return {
        success: false,
        message: 'Username, password, dan role wajib diisi.'
      }
    }

    if (password.length < 6) {
      return {
        success: false,
        message: 'Password minimal harus 6 karakter.'
      }
    }

    if (role !== 'ADMIN' && role !== 'GURU') {
      return {
        success: false,
        message: 'Role yang valid hanya ADMIN atau GURU.'
      }
    }

    try {
      // Check username uniqueness
      const existing = await repositories.users.findByUsername(username)
      if (existing) {
        return {
          success: false,
          message: `Username '${username}' sudah digunakan.`
        }
      }

      // If GURU, validate teacherId exists
      if (role === 'GURU') {
        if (!teacherId) {
          return {
            success: false,
            message: 'Akun GURU wajib memilih data guru.'
          }
        }
        const teacher = await repositories.teachers.findById(teacherId)
        if (!teacher) {
          return {
            success: false,
            message: 'Data guru yang dipilih tidak ditemukan.'
          }
        }
        // Check if teacher already has a user account
        const existingTeacherUser = await repositories.users.findByTeacherId(teacherId)
        if (existingTeacherUser) {
          return {
            success: false,
            message: `Guru ${teacher.name} sudah memiliki akun (${existingTeacherUser.username}).`
          }
        }
      }

      // Hash password
      const passwordHash = await hashPassword(password)
      const now = new Date().toISOString()
      const newUser: UserEntity = {
        id: `usr_${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
        username,
        passwordHash,
        role,
        teacherId: role === 'GURU' ? teacherId : undefined,
        status,
        createdAt: now,
        updatedAt: now
      }

      await repositories.users.create(newUser)

      return {
        success: true,
        message: `Akun ${username} berhasil dibuat.`,
        data: newUser
      }
    } catch (error) {
      console.error('[AuthService] createUser error:', error)
      return {
        success: false,
        message: 'Gagal membuat akun pengguna.'
      }
    }
  }

  /**
   * Admin gets all user accounts
   */
  public async getAllUsers(): Promise<UserEntity[]> {
    const session = this.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang.')
    }
    return repositories.users.findAll()
  }
}

export const authService = AuthService.getInstance()
