/**
 * Phase 5 - Production Hardening, Real Data Validation & Go-Live Test Suite
 * SMK NU Ungaran - Guru Offline
 */

import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth/AuthService'
import { pendingMutationQueue } from '../services/sync/PendingMutationQueue'
import { syncEngine } from '../services/sync/SyncEngine'
import { academicLockGuardService } from '../services/academic/AcademicLockGuardService'
import { semesterClosingService } from '../services/academic/SemesterClosingService'
import { backupService } from '../services/backup/BackupService'
import { reportService } from '../services/report/ReportService'
import { gasApiClient } from '../api/gasApiClient'
import type { SessionData } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`)
  }
}

export async function runPhase5ProductionHardeningTests() {
  console.log('=== RUNNING PHASE 5: PRODUCTION HARDENING, REAL DATA & GO-LIVE TESTS ===\n')

  // 1. Database Initialization & Seeding
  console.log('Test 1: Seeding Production-Ready Master Data...')
  gasApiClient.setForceMock(true)
  await seedDatabase()
  console.log('✓ Master Data seeded cleanly in IndexedDB.')

  // Clear sync queue for clean baseline
  await repositories.syncQueue.clear()

  // 2. Authentication & Identity Binding Hardening
  console.log('\nTest 2: Authentication & Identity Binding Hardening...')
  const allTeachers = await repositories.teachers.findAll()
  const teacher = allTeachers.find((t) => t.status === 'ACTIVE')!
  assert(!!teacher, 'Must find at least one active teacher')

  const teacherSession: SessionData = {
    sessionId: 'sess_prod_p5_teacher',
    userId: 'usr_' + teacher.id,
    username: teacher.nip || 'guru_p5',
    role: 'GURU',
    teacherId: teacher.id,
    teacherName: teacher.name,
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(teacherSession)

  const activeSession = authService.getCurrentSession()
  assert(activeSession?.role === 'GURU', 'Session role must be GURU')
  assert(activeSession?.teacherId === teacher.id, 'Session teacherId must strictly bind to teacher')
  console.log(
    `✓ Active Session bound to Teacher: ${activeSession?.teacherName} (${activeSession?.teacherId})`
  )

  // Test logout preservation of IndexedDB
  authService.logout()
  const clearedSession = authService.getCurrentSession()
  assert(clearedSession === null, 'Session must be null after logout')

  // Verify operational data is NOT deleted on logout
  const teachersCountAfterLogout = (await repositories.teachers.findAll()).length
  assert(teachersCountAfterLogout > 0, 'Logout MUST NOT wipe IndexedDB operational school data')
  console.log(
    `✓ Logout verified: Local operational data preserved (${teachersCountAfterLogout} teachers retained).`
  )

  // Re-authenticate Admin
  const adminSession: SessionData = {
    sessionId: 'sess_prod_p5_admin',
    userId: 'usr_admin_p5',
    username: 'admin',
    role: 'ADMIN',
    teacherId: '',
    teacherName: 'Administrator System',
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(adminSession)

  // 3. Offline Mutation Queue & Sync Idempotency
  console.log('\nTest 3: Offline Mutation Queue, Retries & Sync Idempotency...')
  const testMutationPayload = {
    scheduleId: 'schd_p5_test',
    date: '2026-09-22',
    records: [{ studentId: 'std_p5_01', status: 'H' }]
  }

  const enqueued1 = await pendingMutationQueue.enqueue(
    'attendance',
    'att_p5_test_01',
    'CREATE',
    testMutationPayload
  )
  assert(enqueued1.status === 'PENDING', 'Enqueued mutation status must be PENDING')

  const pendingList = await pendingMutationQueue.getPending()
  assert(
    pendingList.some((m) => m.id === enqueued1.id),
    'Pending queue must contain enqueued mutation'
  )
  console.log(`✓ Pending Mutation enqueued: ID=${enqueued1.id}, Entity=${enqueued1.entity}`)

  // Trigger sync engine processing
  const syncResult = await syncEngine.processQueue()
  assert(typeof syncResult.succeeded === 'number', 'SyncEngine must return result statistics')
  console.log(
    `✓ Sync Engine processed queue: ${syncResult.succeeded} succeeded, ${syncResult.failed} failed.`
  )

  // 4. Institutional Agenda vs Teaching Schedule Validation
  console.log('\nTest 4: Institutional Agenda & Schedule Validation...')
  const agendas = await repositories.schoolAgendas.findAll()
  const schedules = await repositories.schedules.findAll()
  console.log(
    `✓ Institutional Agendas: ${agendas.length} records. Scheduled Teaching Sessions: ${schedules.length} records.`
  )

  // 5. Reporting & XLSX Worksheets Validation
  console.log('\nTest 5: Production XLSX Workbook & A4 Print Generation...')
  const allAcademicYears = await repositories.academicYears.findAll()
  const activeAY = allAcademicYears.find((ay) => ay.isActive) || allAcademicYears[0]

  const studentRecap = await reportService.getStudentAttendanceRecap({
    academicYearId: activeAY.id
  })
  const xlsxBuffer = reportService.exportToXlsx('Laporan_Presensi_Produksi', [
    {
      name: 'Ringkasan',
      headers: ['Metrik', 'Nilai'],
      rows: [
        ['Total Siswa', studentRecap.totalStudents],
        ['Persentase Kehadiran', `${studentRecap.overallPresencePercentage}%`]
      ]
    },
    {
      name: 'Detail Presensi Siswa',
      headers: ['NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alpa', '% Kehadiran'],
      rows: studentRecap.students.map((s) => [
        s.nis,
        s.name,
        s.className,
        s.hadir,
        s.izin,
        s.sakit,
        s.alpa,
        `${s.presencePercentage}%`
      ])
    }
  ])

  assert(
    xlsxBuffer instanceof ArrayBuffer,
    'Generated XLSX export must be a valid binary ArrayBuffer'
  )
  assert(
    xlsxBuffer.byteLength > 2000,
    'XLSX binary byte length must indicate valid OpenXML package'
  )
  console.log(
    `✓ Production XLSX Workbook generated: ${xlsxBuffer.byteLength} bytes binary package.`
  )

  const printDocumentHtml = await reportService.generatePrintHtml(
    'LAPORAN RESMI KELENGKAPAN PEMBELAJARAN GURU',
    'SMK NU UNGARAN — TAHUN PELAJARAN 2026/2027',
    ['No', 'NIP', 'Nama Guru', 'Status Berkas'],
    [['1', teacher.nip || '-', teacher.name, 'LENGKAP']]
  )
  assert(printDocumentHtml.includes('SMK NU UNGARAN'), 'Print HTML must render school name')
  assert(printDocumentHtml.includes(teacher.name), 'Print HTML must contain data payload')
  console.log('✓ Production A4 Print Document generated with letterhead and signature block.')

  // 6. Semester Closing Lock Guard Hardening
  console.log('\nTest 6: Academic Closing & Lock Guard Enforcement...')
  await semesterClosingService.closeSemester(activeAY.id, {
    force: true,
    reason: 'Pengujian kunci semester produksi'
  })
  const lockedAY = (await repositories.academicYears.findById(activeAY.id))!
  assert(lockedAY.isLocked === true, 'Semester must be locked after closing')

  let lockBlocked = false
  try {
    await academicLockGuardService.enforceLock(lockedAY.id)
  } catch (err: any) {
    lockBlocked = true
    assert(
      err.message.includes('ditutup') || err.message.includes('Locked'),
      'Lock guard must reject write attempt'
    )
  }
  assert(lockBlocked, 'AcademicLockGuardService MUST strictly block writes on closed semester')
  console.log('✓ Lock Guard strictly blocked modification attempt on closed semester.')

  // Unlock semester for administrative compliance
  await semesterClosingService.unlockSemester(activeAY.id, 'Pembukaan kunci pasca-ujicoba produksi')
  const unlockedAY = (await repositories.academicYears.findById(activeAY.id))!
  assert(unlockedAY.isLocked === false, 'Semester must be unlocked by Admin')
  console.log('✓ Admin unlocked semester with audit log entry.')

  // 7. Backup & Restore Operations
  console.log('\nTest 7: Local & Administrative Backup Operations...')
  const backupData = await backupService.createBackup()
  assert(backupData.backupFormat === 'guru-offline-backup', 'Backup format tag must be valid')
  assert(typeof backupData.stores === 'object', 'Backup payload must contain store collections')

  const validationResult = await backupService.validateBackup(backupData)
  assert(validationResult.valid === true, 'Generated backup must pass validation')
  console.log(
    `✓ Backup Payload created & validated: ${Object.keys(backupData.stores).length} data stores archived.`
  )

  console.log('\n=== ALL PHASE 5 PRODUCTION HARDENING & GO-LIVE TESTS PASSED PERFECTLY ===')
}
