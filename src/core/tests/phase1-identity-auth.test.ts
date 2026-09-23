/**
 * Guru Offline - Phase 1 Comprehensive Identity, Authentication & Role Governance Test Suite
 * Source of Truth: PHASE 1 DIRECTIVE, MASTER_SPEC.md, ARCHITECTURE.md
 */

import { dbManager } from '../db/indexedDb'
import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { hashPassword, verifyPassword } from '../security/password'
import { authService } from '../services/auth/AuthService'
import { authorizationService, AuthorizationError } from '../services/auth/AuthorizationService'
import { connectivityManager } from '../services/sync/ConnectivityManager'

export async function runPhase1Tests(): Promise<{
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

  console.log('\n--- STARTING PHASE 1 IDENTITY, AUTH & GOVERNANCE TEST SUITE ---')

  // Bootstrap Database
  await dbManager.getDatabase()
  await seedDatabase()

  // 1. Password Security & PBKDF2 standard
  await test('1. PBKDF2 password hashing & verification', async () => {
    const raw = 'SMKnuUngaran2025!'
    const hash = await hashPassword(raw)
    if (!hash.startsWith('$pbkdf2-sha256$i=100000$s=')) {
      throw new Error(`Unexpected hash format: ${hash}`)
    }
    const check = await verifyPassword(raw, hash)
    if (!check.valid || check.needsRehash) {
      throw new Error('Valid password rejected or flagged as needing rehash')
    }
    const checkWrong = await verifyPassword('WrongPassword', hash)
    if (checkWrong.valid) {
      throw new Error('Wrong password was accepted')
    }
  })

  // 2. Admin Login & Canonical Identity
  await test('2. Admin login creates valid session and canonical UserIdentity', async () => {
    await authService.logout()
    const res = await authService.login('admin', 'admin123')
    if (!res.success || !res.session || !res.identity) {
      throw new Error(`Admin login failed: ${res.message}`)
    }
    if (res.session.role !== 'ADMIN') {
      throw new Error(`Admin has incorrect role: ${res.session.role}`)
    }
    if (res.identity.role !== 'ADMIN') {
      throw new Error(`Identity has incorrect role: ${res.identity.role}`)
    }
    if (!res.identity.permissions.includes('admin:all')) {
      throw new Error('Admin identity is missing admin:all permission')
    }
    if (res.identity.sessionState !== 'authenticated' && res.identity.sessionState !== 'offline') {
      throw new Error(`Unexpected session state: ${res.identity.sessionState}`)
    }
    // Verify no password in session
    if ((res.session as any).password || (res.session as any).passwordHash) {
      throw new Error('Sensitive credentials leaked into session object')
    }
  })

  // 3. Guru Login & Deterministic Teacher Identity Binding
  await test('3. Guru login deterministically binds to TeacherEntity', async () => {
    await authService.logout()
    const res = await authService.login('guru', 'guru123')
    if (!res.success || !res.session || !res.identity) {
      throw new Error(`Guru login failed: ${res.message}`)
    }
    if (res.session.role !== 'GURU') {
      throw new Error(`Guru has incorrect role: ${res.session.role}`)
    }
    if (!res.session.teacherId) {
      throw new Error('Guru session is missing teacherId binding')
    }

    const teacher = await repositories.teachers.findById(res.session.teacherId)
    if (!teacher) {
      throw new Error(`Linked TeacherEntity ${res.session.teacherId} not found in repository`)
    }
    if (res.identity.teacherName !== teacher.name) {
      throw new Error(
        `Identity teacherName '${res.identity.teacherName}' != teacher.name '${teacher.name}'`
      )
    }
    if (!res.identity.permissions.includes('teacher:operational:write')) {
      throw new Error('Guru identity is missing teacher:operational:write permission')
    }
  })

  // 4. Invalid Credentials Rejection
  await test('4. Invalid credentials rejected with clear feedback', async () => {
    await authService.logout()
    const res = await authService.login('guru', 'WrongPassword123')
    if (res.success) {
      throw new Error('Login with incorrect password succeeded')
    }
    if (res.errorCode !== 'INVALID_CREDENTIALS') {
      throw new Error(`Unexpected errorCode: ${res.errorCode}`)
    }
  })

  // 5. Account Lifecycle & Inactive Account Enforcement
  await test('5. Inactive account cannot log in', async () => {
    await authService.logout()
    // Inactivate guru account
    const guruUser = await repositories.users.findByUsername('guru')
    if (!guruUser) throw new Error('Guru user not found')

    await repositories.users.update(guruUser.id, { status: 'INACTIVE' })

    const res = await authService.login('guru', 'guru123')
    if (res.success) {
      throw new Error('Inactive account was allowed to log in')
    }
    if (res.errorCode !== 'INACTIVE_ACCOUNT') {
      throw new Error(`Expected errorCode INACTIVE_ACCOUNT, got ${res.errorCode}`)
    }

    // Restore active status
    await repositories.users.update(guruUser.id, { status: 'ACTIVE' })
  })

  // 6. Linked Teacher Inactive Status Enforcement
  await test('6. Guru with inactive Teacher profile is blocked', async () => {
    await authService.logout()
    const guruUser = await repositories.users.findByUsername('guru')
    if (!guruUser || !guruUser.teacherId) throw new Error('Guru user not configured')

    const teacher = await repositories.teachers.findById(guruUser.teacherId)
    if (!teacher) throw new Error('Teacher entity not found')

    // Mark teacher as INACTIVE
    await repositories.teachers.update(teacher.id, { status: 'INACTIVE' })

    const res = await authService.login('guru', 'guru123')
    if (res.success) {
      throw new Error('Login succeeded for user with inactive Teacher profile')
    }
    if (res.errorCode !== 'INACTIVE_TEACHER') {
      throw new Error(`Expected errorCode INACTIVE_TEACHER, got ${res.errorCode}`)
    }

    // Restore active status
    await repositories.teachers.update(teacher.id, { status: 'ACTIVE' })
  })

  // 7. Offline First-Time Login Guard
  await test('7. Unknown user attempting login when offline receives clear message', async () => {
    await authService.logout()
    connectivityManager.isOnline.value = false

    const res = await authService.login('new_unseeded_user', 'password123')
    if (res.success) {
      throw new Error('Login succeeded for unknown user while offline')
    }
    if (res.errorCode !== 'OFFLINE_FIRST_LOGIN_REQUIRED') {
      throw new Error(`Expected OFFLINE_FIRST_LOGIN_REQUIRED, got ${res.errorCode}`)
    }

    connectivityManager.isOnline.value = true
  })

  // 8. Session Restoration & Lifecycle
  await test('8. restoreSession recovers identity and role across reload', async () => {
    await authService.logout()
    await authService.login('guru', 'guru123')

    const restoredIdentity = await authService.restoreSession()
    if (!restoredIdentity) {
      throw new Error('restoreSession returned null for active session')
    }
    if (restoredIdentity.role !== 'GURU') {
      throw new Error(`Restored identity has wrong role: ${restoredIdentity.role}`)
    }
    if (!restoredIdentity.teacherId) {
      throw new Error('Restored identity missing teacherId')
    }
  })

  // 9. Inactivated Account Invalidates Existing Session on verifySession
  await test('9. verifySession logs out user if account was deactivated', async () => {
    await authService.login('guru', 'guru123')
    const guruUser = await repositories.users.findByUsername('guru')
    if (!guruUser) throw new Error('Guru user not found')

    // Admin deactivates user while session is active
    await repositories.users.update(guruUser.id, { status: 'INACTIVE' })

    const verified = await authService.verifySession()
    if (verified !== null) {
      throw new Error('verifySession did not invalidate deactivated user session')
    }
    if (authService.isAuthenticated()) {
      throw new Error('authService still marked authenticated after session invalidation')
    }

    // Restore active status
    await repositories.users.update(guruUser.id, { status: 'ACTIVE' })
  })

  // 10. Centralized Authorization Service (can, hasRole, canAccessRoute, canAccessResource)
  await test('10. Centralized Authorization checks (Admin & Guru roles)', async () => {
    // Authenticate as Admin
    await authService.login('admin', 'admin123')
    if (!authorizationService.isAdmin()) {
      throw new Error('authorizationService.isAdmin() returned false for Admin')
    }
    if (!authorizationService.hasRole('ADMIN')) {
      throw new Error('hasRole(ADMIN) returned false')
    }
    if (!authorizationService.can('admin:all')) {
      throw new Error('Admin can(admin:all) returned false')
    }
    if (!authorizationService.canAccessRoute('/admin/dashboard')) {
      throw new Error('Admin canAccessRoute(/admin/dashboard) returned false')
    }
    if (!authorizationService.canAccessResource('attendance', 'any_teacher_id')) {
      throw new Error('Admin canAccessResource returned false')
    }

    // Authenticate as Guru
    await authService.login('guru', 'guru123')
    const currentSession = authService.getCurrentSession()
    const guruTeacherId = currentSession?.teacherId || ''

    if (!authorizationService.isTeacher()) {
      throw new Error('authorizationService.isTeacher() returned false for Guru')
    }
    if (authorizationService.isAdmin()) {
      throw new Error('authorizationService.isAdmin() returned true for Guru')
    }
    if (authorizationService.can('admin:users:manage')) {
      throw new Error('Guru can(admin:users:manage) unexpectedly returned true')
    }
    if (!authorizationService.can('teacher:operational:write')) {
      throw new Error('Guru can(teacher:operational:write) returned false')
    }
    if (authorizationService.canAccessRoute('/admin/dashboard')) {
      throw new Error('Guru canAccessRoute(/admin/dashboard) unexpectedly returned true')
    }
    if (!authorizationService.canAccessRoute('/teacher/dashboard')) {
      throw new Error('Guru canAccessRoute(/teacher/dashboard) returned false')
    }
    if (!authorizationService.canAccessRoute('/guru/dashboard')) {
      throw new Error('Guru canAccessRoute(/guru/dashboard) returned false')
    }

    // Resource isolation: Guru can access own resources, but not another teacher's
    if (!authorizationService.canAccessResource('attendance', guruTeacherId)) {
      throw new Error('Guru cannot access own attendance resource')
    }
    if (authorizationService.canAccessResource('attendance', 'other_teacher_999')) {
      throw new Error('Guru was allowed to access another teacher resource')
    }
  })

  // 11. Route Protection & AuthorizationError
  await test('11. requireAdmin and requireTeacher throw AuthorizationError on violation', async () => {
    await authService.login('guru', 'guru123')
    try {
      authorizationService.requireAdmin()
      throw new Error('requireAdmin did not throw for Guru')
    } catch (err) {
      if (!(err instanceof AuthorizationError)) {
        throw new Error(`Expected AuthorizationError, got ${err}`)
      }
    }

    // requireTeacher with correct teacherId passes
    const session = authService.getCurrentSession()!
    authorizationService.requireTeacher(session.teacherId)

    // requireTeacher with wrong teacherId throws
    try {
      authorizationService.requireTeacher('wrong_teacher_id')
      throw new Error('requireTeacher did not throw for mismatched teacherId')
    } catch (err) {
      if (!(err instanceof AuthorizationError)) {
        throw new Error(`Expected AuthorizationError, got ${err}`)
      }
    }
  })

  // 12. Logout preserves operational IndexedDB data
  await test('12. Logout clears session but retains all operational data in IndexedDB', async () => {
    await authService.login('guru', 'guru123')
    const studentsBefore = await repositories.students.findAll()
    if (studentsBefore.length === 0) {
      throw new Error('No students found before logout')
    }

    await authService.logout()

    if (authService.isAuthenticated()) {
      throw new Error('User still marked authenticated after logout')
    }
    if (authService.getCurrentSession() !== null) {
      throw new Error('Session data still exists in memory after logout')
    }

    // Verify operational tables are intact
    const studentsAfter = await repositories.students.findAll()
    if (studentsAfter.length !== studentsBefore.length) {
      throw new Error('Operational data was deleted or altered on logout')
    }
  })

  // Summary
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  console.log(`\n--- PHASE 1 TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED ---`)

  return { passed, failed, results }
}
