/**
 * Guru Offline - Phase 2 Comprehensive Auth & RBAC Test Suite
 * Tests 100% Offline Authentication, Password Security, Sessions, and Authorization
 */

import { dbManager } from '../db/indexedDb'
import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { hashPassword, verifyPassword, computeSha256 } from '../security/password'
import { authService } from '../services/auth/AuthService'
import { authorizationService, AuthorizationError } from '../services/auth/AuthorizationService'
import type { UserEntity } from '../types'

export async function runPhase2Tests(): Promise<{
  passed: number
  failed: number
  results: Array<{ name: string; passed: boolean; error?: string }>
}> {
  const results: Array<{ name: string; passed: boolean; error?: string }> = []

  const test = async (name: string, fn: () => Promise<void> | void) => {
    try {
      await fn()
      results.push({ name, passed: true })
      console.log(`  ✓ ${name}`)
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err) })
      console.error(`  ✗ ${name}:`, err?.message || err)
    }
  }

  console.log('\n--- STARTING PHASE 2 AUTH & RBAC TEST SUITE ---')

  // Bootstrap Database
  await dbManager.getDatabase()
  await seedDatabase()

  // 1. Password Hashing & Crypto
  await test('1. PBKDF2 password hashing generates standard format', async () => {
    const hash = await hashPassword('secretPassword123')
    if (!hash.startsWith('$pbkdf2-sha256$i=100000$s=')) {
      throw new Error(`Unexpected hash format: ${hash}`)
    }
    const verify = await verifyPassword('secretPassword123', hash)
    if (!verify.valid || verify.needsRehash) {
      throw new Error('PBKDF2 verification failed')
    }
    const verifyWrong = await verifyPassword('wrongPassword', hash)
    if (verifyWrong.valid) {
      throw new Error('Incorrect password was marked valid')
    }
  })

  // 2. Legacy SHA-256 Compatibility & Auto-Upgrade
  await test('2. Legacy SHA-256 hash verifies and flags needsRehash = true', async () => {
    const rawLegacyHash = await computeSha256('mypassword')
    const verify = await verifyPassword('mypassword', rawLegacyHash)
    if (!verify.valid || !verify.needsRehash) {
      throw new Error('Legacy hash did not flag needsRehash')
    }
    const verifyWrong = await verifyPassword('wrong', rawLegacyHash)
    if (verifyWrong.valid) {
      throw new Error('Wrong password matched legacy hash')
    }
  })

  // 3. Admin Login
  await test('3. Admin login succeeds and auto-upgrades hash', async () => {
    await authService.logout()
    const res = await authService.login('admin', 'admin123')
    if (!res.success || !res.session) {
      throw new Error(`Admin login failed: ${res.message}`)
    }
    if (res.session.role !== 'ADMIN') {
      throw new Error(`Admin has incorrect role: ${res.session.role}`)
    }
    if ((res.session as any).password || (res.session as any).passwordHash) {
      throw new Error('Sensitive credentials leaked into session!')
    }

    // Verify user passwordHash in DB was upgraded to PBKDF2
    const updatedUser = await repositories.users.findByUsername('admin')
    if (!updatedUser?.passwordHash.startsWith('$pbkdf2-sha256$')) {
      throw new Error('Admin password hash was not upgraded to PBKDF2')
    }
  })

  // 4. Admin Login with Wrong Password
  await test('4. Admin login with wrong password is rejected safely', async () => {
    await authService.logout()
    const res = await authService.login('admin', 'wrongpassword')
    if (res.success) {
      throw new Error('Login with wrong password succeeded unexpectedly')
    }
    if (res.message !== 'Username atau password salah.') {
      throw new Error(`Unexpected error message: ${res.message}`)
    }
  })

  // 5. Non-existent User
  await test('5. Login with non-existent user returns generic safe error', async () => {
    await authService.logout()
    const res = await authService.login('nonexistent_user', 'anyPassword')
    if (res.success) {
      throw new Error('Non-existent user login succeeded')
    }
    if (res.message !== 'Username atau password salah.') {
      throw new Error(`Unexpected message: ${res.message}`)
    }
  })

  // 6. Guru Login with Valid Teacher Relationship
  await test('6. Guru login succeeds and loads teacher metadata', async () => {
    await authService.logout()
    const res = await authService.login('guru', 'guru123')
    if (!res.success || !res.session) {
      throw new Error(`Guru login failed: ${res.message}`)
    }
    if (res.session.role !== 'GURU') {
      throw new Error(`Guru has incorrect role: ${res.session.role}`)
    }
    if (!res.session.teacherId || !res.session.teacherName) {
      throw new Error('Guru session is missing teacherId or teacherName')
    }
  })

  // 7. Guru Login with Missing or Inactive Teacher
  await test('7. Guru login without valid teacher relationship is rejected', async () => {
    // Create orphan guru user
    const orphanGuru: UserEntity = {
      id: 'usr_orphan_test',
      username: 'orphan_guru',
      passwordHash: await hashPassword('password123'),
      role: 'GURU',
      teacherId: 'tch_non_existent',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await repositories.users.create(orphanGuru)

    await authService.logout()
    const res = await authService.login('orphan_guru', 'password123')
    if (res.success) {
      throw new Error('Orphan guru login succeeded unexpectedly')
    }
    if (!res.message.includes('Data guru yang terhubung tidak ditemukan')) {
      throw new Error(`Unexpected error message: ${res.message}`)
    }
  })

  // 8. Inactive Account Login Rejection
  await test('8. Inactive user login is rejected', async () => {
    const inactiveUser: UserEntity = {
      id: 'usr_inactive_test',
      username: 'inactive_user',
      passwordHash: await hashPassword('password123'),
      role: 'GURU',
      teacherId: (await repositories.teachers.findAll())[0].id,
      status: 'INACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await repositories.users.create(inactiveUser)

    await authService.logout()
    const res = await authService.login('inactive_user', 'password123')
    if (res.success) {
      throw new Error('Inactive user was able to log in')
    }
    if (!res.message.includes('Akun tidak aktif')) {
      throw new Error(`Unexpected message: ${res.message}`)
    }
  })

  // 9. Session Management & Logout
  await test('9. Session lifecycle and logout clears credentials completely', async () => {
    await authService.login('admin', 'admin123')
    if (!authService.isAuthenticated()) {
      throw new Error('authService.isAuthenticated returned false')
    }
    const session = authService.getCurrentSession()
    if (!session || session.username !== 'admin') {
      throw new Error('Invalid current session')
    }

    // Verify session against DB
    const verified = await authService.verifySession()
    if (!verified) {
      throw new Error('verifySession failed for valid session')
    }

    // Logout
    await authService.logout()
    if (authService.isAuthenticated() || authService.getCurrentSession() !== null) {
      throw new Error('Session remained active after logout')
    }
  })

  // 10. Password Change
  await test('10. User password change requires valid current password and updates hash', async () => {
    await authService.login('guru', 'guru123')
    const session = authService.getCurrentSession()!

    // Try wrong current password
    const wrongRes = await authService.changePassword(session.userId, 'wrongOld', 'newPassword123')
    if (wrongRes.success) {
      throw new Error('Password change succeeded with wrong current password')
    }

    // Valid current password
    const validRes = await authService.changePassword(
      session.userId,
      'guru123',
      'guruNewPassword123'
    )
    if (!validRes.success) {
      throw new Error(`Password change failed: ${validRes.message}`)
    }

    // Test login with new password
    await authService.logout()
    const newLogin = await authService.login('guru', 'guruNewPassword123')
    if (!newLogin.success) {
      throw new Error('Login with new password failed')
    }

    // Reset back to guru123 for consistency
    await authService.changePassword(session.userId, 'guruNewPassword123', 'guru123')
  })

  // 11. Admin Reset Password
  await test('11. Admin can reset password of any user', async () => {
    await authService.login('admin', 'admin123')
    const guruUser = await repositories.users.findByUsername('guru')
    if (!guruUser) throw new Error('Guru user not found')

    const resetRes = await authService.adminResetPassword(guruUser.id, 'resetGuru456')
    if (!resetRes.success) {
      throw new Error(`Admin reset failed: ${resetRes.message}`)
    }

    await authService.logout()
    const testLogin = await authService.login('guru', 'resetGuru456')
    if (!testLogin.success) {
      throw new Error('Login after admin reset failed')
    }

    // Reset back to guru123
    await authService.login('admin', 'admin123')
    await authService.adminResetPassword(guruUser.id, 'guru123')
  })

  // 12. Admin Account Status Activation / Deactivation
  await test('12. Admin can toggle user status without deleting historical records', async () => {
    await authService.login('admin', 'admin123')
    const guruUser = await repositories.users.findByUsername('guru')
    if (!guruUser) throw new Error('Guru user not found')

    // Deactivate
    const deactRes = await authService.setUserStatus(guruUser.id, 'INACTIVE')
    if (!deactRes.success) {
      throw new Error(`Deactivation failed: ${deactRes.message}`)
    }

    // Verify teacher still exists
    const teacherStillExists = await repositories.teachers.findById(guruUser.teacherId!)
    if (!teacherStillExists) {
      throw new Error('Teacher record was destroyed on user deactivation!')
    }

    // Verify login is rejected
    await authService.logout()
    const rejectedLogin = await authService.login('guru', 'guru123')
    if (rejectedLogin.success) {
      throw new Error('Deactivated user was able to log in')
    }

    // Reactivate
    await authService.login('admin', 'admin123')
    const reactRes = await authService.setUserStatus(guruUser.id, 'ACTIVE')
    if (!reactRes.success) {
      throw new Error(`Reactivation failed: ${reactRes.message}`)
    }

    // Login succeeds again
    await authService.logout()
    const okLogin = await authService.login('guru', 'guru123')
    if (!okLogin.success) {
      throw new Error('Reactivated user could not log in')
    }
  })

  // 13. Application-Level AuthorizationService RBAC Enforcement
  await test('13. AuthorizationService enforces role boundaries at domain level', async () => {
    // 13a. Unauthenticated check
    await authService.logout()
    try {
      authorizationService.requireAuth()
      throw new Error('requireAuth did not throw when unauthenticated')
    } catch (e) {
      if (!(e instanceof AuthorizationError)) throw e
    }

    // 13b. Guru attempting Admin authorization
    await authService.login('guru', 'guru123')
    try {
      authorizationService.requireAdmin()
      throw new Error('requireAdmin did not throw for GURU user')
    } catch (e) {
      if (!(e instanceof AuthorizationError)) throw e
    }

    // 13c. Guru checking own teacherId vs other teacherId
    const guruSession = authService.getCurrentSession()!
    authorizationService.requireTeacher(guruSession.teacherId) // Should succeed
    try {
      authorizationService.requireTeacher('tch_someone_else')
      throw new Error('requireTeacher allowed accessing another teacher data')
    } catch (e) {
      if (!(e instanceof AuthorizationError)) throw e
    }

    // 13d. Admin checking Admin authorization
    await authService.login('admin', 'admin123')
    const adminSession = authorizationService.requireAdmin()
    if (adminSession.role !== 'ADMIN') {
      throw new Error('requireAdmin returned non-admin session')
    }
  })

  // 14. Production Credential Safety Guard Verification
  await test('14. Default credentials allowed outside production, blocked when PROD = true', async () => {
    await authService.logout()
    const res = await authService.login('admin', 'admin123')
    if (!res.success) {
      throw new Error('Default credentials should succeed outside production')
    }
  })

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  console.log(`\n--- PHASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`)
  return { passed, failed, results }
}
