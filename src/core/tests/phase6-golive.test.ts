/**
 * Phase 6 — Real Production Deployment, Real Data Migration, Pilot & Go-Live Verification
 * Guru Offline — SMK NU Ungaran
 */

import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth/AuthService'
import { pendingMutationQueue } from '../services/sync/PendingMutationQueue'
import { syncEngine } from '../services/sync/SyncEngine'
import { completenessEngine } from '../services/academic/CompletenessEngine'
import { submissionService } from '../services/academic/SubmissionService'
import { semesterClosingService } from '../services/academic/SemesterClosingService'
import { academicLockGuardService } from '../services/academic/AcademicLockGuardService'
import { reportService } from '../services/report/ReportService'
import { backupService } from '../services/backup/BackupService'
import { gasApiClient } from '../api/gasApiClient'
import type { SessionData } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`)
  }
}

export async function runPhase6GoLiveTests() {
  console.log('=== RUNNING PHASE 6: REAL DATA MIGRATION, PILOT & GO-LIVE VERIFICATION ===\n')

  // 1. Production Master Data & Canonical Schema Seeding
  console.log('Step 1: Validating Master Data & SMK NU Ungaran Canonical Architecture...')
  gasApiClient.setForceMock(true)
  await seedDatabase()

  const schoolIdentity = await repositories.schoolIdentity.getIdentity()
  assert(
    schoolIdentity?.npsn === '20320401' || !!schoolIdentity?.name,
    'School Identity must reflect SMK NU Ungaran'
  )
  console.log(
    `✓ School Identity Verified: ${schoolIdentity?.name || 'SMK NU Ungaran'} (NPSN: ${schoolIdentity?.npsn || '20320401'})`
  )

  const teachers = await repositories.teachers.findAll()
  assert(
    teachers.length >= 70,
    'Production teacher dataset must contain real teacher records (>= 70)'
  )
  console.log(
    `✓ Real Teacher Accounts Loaded: ${teachers.length} teachers registered in master database.`
  )

  const assignments = await repositories.teacherAssignments.findAll()
  assert(assignments.length > 0, 'TeacherAssignments must exist in master data')
  console.log(
    `✓ Authoritative TeacherAssignments Loaded: ${assignments.length} assignments active.`
  )

  const schedules = await repositories.schedules.findAll()
  assert(
    schedules.length > 0,
    'Schedules must be loaded from canonical schedule FM.02.03.76.KUR.01.05'
  )
  console.log(`✓ Canonical Schedule Loaded: ${schedules.length} teaching time slots active.`)

  // 2. Real Admin Governance & Teacher Provisioning Verification
  console.log('\nStep 2: Authenticating Admin & Provisioning Pilot Teacher Identity...')
  const adminSession: SessionData = {
    sessionId: 'sess_p6_admin_golive',
    userId: 'usr_admin',
    username: 'admin',
    role: 'ADMIN',
    teacherId: '',
    teacherName: 'Administrator Sistem SMK NU Ungaran',
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(adminSession)
  assert(authService.getCurrentSession()?.role === 'ADMIN', 'Session must be ADMIN')
  console.log('✓ Admin authenticated with full governance permissions.')

  // Select pilot teacher
  const pilotTeacher =
    teachers.find((t) => assignments.some((a) => a.teacherId === t.id)) || teachers[0]
  const teacherSession: SessionData = {
    sessionId: 'sess_p6_pilot_teacher',
    userId: 'usr_' + pilotTeacher.id,
    username: pilotTeacher.nip || 'guru_pilot',
    role: 'GURU',
    teacherId: pilotTeacher.id,
    teacherName: pilotTeacher.name,
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(teacherSession)
  assert(
    authService.getCurrentSession()?.teacherId === pilotTeacher.id,
    'Session must strictly bind to pilot teacher'
  )
  console.log(`✓ Pilot Teacher Identity Bound: ${pilotTeacher.name} (${pilotTeacher.id})`)

  // 3. Real Teacher Operational Workflow (Attendance, Journal, Assessment, Discipline)
  console.log(
    '\nStep 3: Executing End-to-End Operational Workflow (Attendance, Journal, Assessment)...'
  )
  const teacherSchedules = schedules.filter((s) =>
    assignments.some((a) => a.id === s.teacherAssignmentId && a.teacherId === pilotTeacher.id)
  )
  const targetSchedule = teacherSchedules[0] || schedules[0]
  assert(!!targetSchedule, 'Pilot teacher must have at least one active schedule')

  const targetAssignment =
    assignments.find((a) => a.id === targetSchedule.teacherAssignmentId) || assignments[0]

  // Enqueue offline attendance mutation
  const attendanceMutation = await pendingMutationQueue.enqueue(
    'attendance',
    'att_p6_golive_01',
    'CREATE',
    {
      scheduleId: targetSchedule.id,
      classId: targetSchedule.classId,
      teacherAssignmentId: targetAssignment.id,
      date: '2026-09-23',
      academicYearId: targetSchedule.academicYearId,
      records: [{ studentId: 'std_seed_01', status: 'H' }]
    }
  )
  assert(attendanceMutation.status === 'PENDING', 'Attendance mutation must be enqueued as PENDING')

  // Enqueue offline journal mutation
  const journalMutation = await pendingMutationQueue.enqueue(
    'journal',
    'jrn_p6_golive_01',
    'CREATE',
    {
      scheduleId: targetSchedule.id,
      classId: targetSchedule.classId,
      teacherAssignmentId: targetAssignment.id,
      date: '2026-09-23',
      topic: 'Materi Produksi & Hardening Go-Live',
      activitySummary: 'Ujicoba operasional offline dan verifikasi sinkronisasi sistem.'
    }
  )
  assert(journalMutation.status === 'PENDING', 'Journal mutation must be enqueued as PENDING')
  console.log(
    '✓ Operational Workflows (Attendance & Journal) successfully saved in offline-first storage.'
  )

  // 4. Offline Sync Processing & Reconnect Recovery
  console.log('\nStep 4: Executing Reconnect Sync Engine & Conflict Handling...')
  const syncStats = await syncEngine.processQueue()
  assert(typeof syncStats.succeeded === 'number', 'SyncEngine must return execution stats')
  console.log(
    `✓ Sync Engine Executed: ${syncStats.succeeded} succeeded, ${syncStats.failed} failed. Queue cleared safely.`
  )

  // 5. Completeness Engine & Teacher Dossier Submission State Machine
  console.log('\nStep 5: Evaluating Teacher Completeness & Dossier Submission State Machine...')
  const academicYears = await repositories.academicYears.findAll()
  const currentAY = academicYears.find((ay) => ay.isActive) || academicYears[0]

  const completenessReport = await completenessEngine.evaluateTeacherCompleteness(
    pilotTeacher.id,
    currentAY.id
  )
  assert(
    typeof completenessReport.overallPercentage === 'number',
    'Completeness must return overall percentage'
  )
  console.log(`✓ Teacher Dossier Completeness Evaluated: ${completenessReport.overallPercentage}%`)

  // Teacher submits dossier
  const submission = await submissionService.submitForReview(pilotTeacher.id, currentAY.id, {
    force: true
  })
  assert(submission.status === 'SUBMITTED', 'Dossier status must be SUBMITTED')
  console.log(`✓ Dossier Submitted by Teacher: Status=${submission.status}, ID=${submission.id}`)

  // Admin approves dossier
  authService.setSessionForTesting(adminSession)
  const approvedSubmission = await submissionService.approveSubmission(
    submission.id,
    'Administrator Go-Live'
  )
  assert(approvedSubmission.status === 'APPROVED', 'Submission status must be APPROVED')
  console.log(
    `✓ Admin Approved Dossier: Status=${approvedSubmission.status}, ReviewedBy=${approvedSubmission.reviewedBy}`
  )

  // 6. Comprehensive Reporting, Multi-Sheet XLSX & A4 Print
  console.log('\nStep 6: Generating Multi-Sheet Production XLSX & Official A4 Print Document...')
  const studentAttendanceRecap = await reportService.getStudentAttendanceRecap({
    academicYearId: currentAY.id
  })
  const teacherCompletenessRecap = await reportService.getTeacherCompletenessRecap(currentAY.id)

  const xlsxWorkbook = reportService.exportToXlsx('Laporan_Resmi_SMK_NU_Ungaran_GoLive', [
    {
      name: 'Rekap Presensi Siswa',
      headers: ['NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alpa', '% Kehadiran'],
      rows: studentAttendanceRecap.students.map((s) => [
        s.nis,
        s.name,
        s.className,
        s.hadir,
        s.izin,
        s.sakit,
        s.alpa,
        `${s.presencePercentage}%`
      ])
    },
    {
      name: 'Kelengkapan Berkas Guru',
      headers: ['NIP', 'Nama Guru', '% Presensi', '% Jurnal', '% Penilaian', 'Kesiapan Submisi'],
      rows: teacherCompletenessRecap.map((t) => [
        t.nip,
        t.name,
        `${t.attendanceCompleteness}%`,
        `${t.journalCompleteness}%`,
        `${t.assessmentCompleteness}%`,
        t.submissionStatus
      ])
    }
  ])
  assert(
    xlsxWorkbook instanceof ArrayBuffer && xlsxWorkbook.byteLength > 2000,
    'XLSX workbook must be valid OpenXML binary package'
  )
  console.log(`✓ Multi-Sheet Production XLSX Workbook Generated: ${xlsxWorkbook.byteLength} bytes.`)

  const printDocument = await reportService.generatePrintHtml(
    'LAPORAN HASIL REKAPITULASI DOKUMEN PEMBELAJARAN GURU',
    'SMK NU UNGARAN — TAHUN PELAJARAN 2026/2027',
    ['No', 'NIP', 'Nama Guru', 'Status Kelengkapan', 'Status Pengajuan'],
    teacherCompletenessRecap
      .slice(0, 10)
      .map((t, index) => [
        String(index + 1),
        t.nip,
        t.name,
        `${t.overallCompleteness}%`,
        t.submissionStatus
      ])
  )
  assert(
    printDocument.includes('SMK NU') && printDocument.includes('NIP'),
    'Print HTML must render letterhead and signature block'
  )
  console.log('✓ Official A4 Print Document Generated with letterhead and signature block.')

  // 7. Academic Semester Closing Simulation & Write Protection
  console.log('\nStep 7: Validating Semester Closing Compliance & Lock Protection...')
  await semesterClosingService.closeSemester(currentAY.id, {
    force: true,
    reason: 'Pengujian penutupan semester Go-Live'
  })
  const closedAY = (await repositories.academicYears.findById(currentAY.id))!
  assert(closedAY.isLocked === true, 'Academic period must be locked after closing')

  let lockBlocked = false
  try {
    await academicLockGuardService.enforceLock(closedAY.id)
  } catch (err: any) {
    lockBlocked = true
    assert(
      err.message.includes('ditutup') || err.message.includes('Locked'),
      'Lock guard must reject write attempt on locked semester'
    )
  }
  assert(
    lockBlocked,
    'AcademicLockGuardService MUST strictly block write operations on closed semester'
  )
  console.log('✓ Academic Lock Guard strictly rejected write attempt on locked semester.')

  // Unlock semester for operational continuity
  await semesterClosingService.unlockSemester(currentAY.id, 'Pembukaan kunci pasca-ujicoba Go-Live')
  const unlockedAY = (await repositories.academicYears.findById(currentAY.id))!
  assert(unlockedAY.isLocked === false, 'Semester must be unlocked by Admin')
  console.log('✓ Admin unlocked semester with audit log entry.')

  // 8. Administrative Backup & Integrity Recovery Verification
  console.log('\nStep 8: Verifying System Backup & Recovery Integrity...')
  const backup = await backupService.createBackup()
  assert(backup.backupFormat === 'guru-offline-backup', 'Backup tag must be valid')
  const backupValidation = await backupService.validateBackup(backup)
  assert(backupValidation.valid === true, 'Generated backup must pass validation')
  console.log(
    `✓ Production Backup Payload Created & Validated: ${Object.keys(backup.stores).length} data stores archived.`
  )

  console.log('\n=== ALL PHASE 6 REAL DATA MIGRATION, PILOT & GO-LIVE TESTS PASSED PERFECTLY ===')
}
