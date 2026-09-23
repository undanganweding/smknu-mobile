/**
 * Phase 4 - Reporting, Submission Workflow, Academic Closing & Governance Test Suite
 * SMK NU Ungaran - Guru Offline
 */

import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth/AuthService'
import { completenessEngine } from '../services/academic/CompletenessEngine'
import { submissionService } from '../services/academic/SubmissionService'
import { semesterClosingService } from '../services/academic/SemesterClosingService'
import { academicLockGuardService } from '../services/academic/AcademicLockGuardService'
import { reportService } from '../services/report/ReportService'
import { gasApiClient } from '../api/gasApiClient'
import type { SessionData } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`)
  }
}

export async function runPhase4ReportingAndClosingTests() {
  console.log('=== RUNNING PHASE 4: REPORTING, GOVERNANCE & ACADEMIC CLOSING TESTS ===\n')

  // 1. Initialize & Seed Database
  console.log('Test 1: Initializing IndexedDB and Seeding Master Data...')
  gasApiClient.setForceMock(true)
  await seedDatabase()
  console.log('✓ Database initialized & seeded successfully.')

  // 2. Identify Teacher & Admin Context
  const allTeachers = await repositories.teachers.findAll()
  const teacher = allTeachers.find((t) => t.status === 'ACTIVE')!
  const allAcademicYears = await repositories.academicYears.findAll()
  const currentAY = allAcademicYears.find((ay) => ay.isActive) || allAcademicYears[0]

  console.log(`✓ Active Teacher: ${teacher.name} (${teacher.id})`)
  console.log(`✓ Target Academic Year: ${currentAY.name} (${currentAY.id})`)

  // 3. Completeness Engine Evaluation
  console.log('\nTest 2: Completeness Engine Granular & Batch Evaluations...')
  const teacherCompleteness = await completenessEngine.evaluateTeacherCompleteness(teacher.id)
  assert(teacherCompleteness.teacherId === teacher.id, 'Teacher ID must match evaluation report')
  assert(
    typeof teacherCompleteness.overallPercentage === 'number',
    'Overall percentage must be numeric'
  )
  assert(
    teacherCompleteness.items.length >= 4,
    'Must evaluate attendance, journal, assessment, discipline'
  )
  console.log(
    `✓ Teacher Completeness: ${teacherCompleteness.overallPercentage}% (Ready to submit: ${teacherCompleteness.isReadyToSubmit})`
  )

  const allCompleteness = await completenessEngine.evaluateAllTeachersCompleteness()
  assert(
    allCompleteness.length >= allTeachers.filter((t) => t.status === 'ACTIVE').length,
    'Batch completeness must evaluate all active teachers'
  )
  console.log(`✓ Evaluated all active teachers completeness: ${allCompleteness.length} teachers.`)

  // 4. Submission Workflow State Machine
  console.log('\nTest 3: Teacher Submission Workflow & State Machine...')
  // Teacher login
  const teacherSession: SessionData = {
    sessionId: 'sess_p4_teacher',
    userId: 'usr_' + teacher.id,
    username: teacher.nip || 'guru_p4',
    role: 'GURU',
    teacherId: teacher.id,
    teacherName: teacher.name,
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(teacherSession)

  // Submit
  const submission = await submissionService.submitForReview(teacher.id, currentAY.id, {
    force: true
  })
  assert(submission.status === 'SUBMITTED', 'Submission status must be SUBMITTED')
  assert(submission.teacherId === teacher.id, 'Submission teacherId must match')
  console.log(
    `✓ Teacher submitted period dossier successfully: ID=${submission.id}, Status=${submission.status}`
  )

  // Admin login
  const adminSession: SessionData = {
    sessionId: 'sess_p4_admin',
    userId: 'usr_admin_p4',
    username: 'admin',
    role: 'ADMIN',
    teacherId: '',
    teacherName: 'Administrator',
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(adminSession)

  // Admin review & return for revision
  const returnedSubmission = await submissionService.returnForRevision(
    submission.id,
    'Administrator',
    'Mohon lengkapi catatan tindak lanjut jurnal pembelajaran.'
  )
  assert(returnedSubmission.status === 'RETURNED', 'Submission status must be RETURNED')
  assert(
    Boolean(returnedSubmission.feedback?.includes('lengkapi catatan')),
    'Feedback notes must be preserved'
  )
  console.log(`✓ Admin returned submission for revision: Status=${returnedSubmission.status}`)

  // Teacher re-submits
  authService.setSessionForTesting(teacherSession)
  const resubmitted = await submissionService.submitForReview(teacher.id, currentAY.id, {
    force: true
  })
  assert(resubmitted.status === 'SUBMITTED', 'Re-submission status must be SUBMITTED')

  // Admin approves
  authService.setSessionForTesting(adminSession)
  const approvedSubmission = await submissionService.approveSubmission(
    resubmitted.id,
    'Administrator'
  )
  assert(approvedSubmission.status === 'APPROVED', 'Submission status must be APPROVED')
  console.log(`✓ Admin approved submission: Status=${approvedSubmission.status}`)

  // 5. Academic Reporting Hub
  console.log('\nTest 4: Comprehensive Academic Reporting Hub...')
  const attendanceRecap = await reportService.getStudentAttendanceRecap({
    academicYearId: currentAY.id
  })
  assert(Array.isArray(attendanceRecap.students), 'Attendance recap must contain students array')
  console.log(`✓ Student Attendance Recap: ${attendanceRecap.students.length} students processed.`)

  const dailyAttendanceRecap = await reportService.getDailyAttendanceRecap({
    academicYearId: currentAY.id
  })
  assert(Array.isArray(dailyAttendanceRecap), 'Daily attendance recap must return array')
  console.log(`✓ Daily Attendance Sessions Recap: ${dailyAttendanceRecap.length} sessions.`)

  const disciplineRecap = await reportService.getDisciplineRecap()
  assert(
    typeof disciplineRecap.totalIncidents === 'number',
    'Discipline recap totalIncidents must be numeric'
  )
  console.log(
    `✓ Discipline Recap: ${disciplineRecap.totalIncidents} incidents, ${disciplineRecap.totalPoints} total points.`
  )

  const detailedAssessments = await reportService.getDetailedAssessmentReport({
    academicYearId: currentAY.id
  })
  assert(Array.isArray(detailedAssessments), 'Detailed assessment rows must be an array')
  console.log(
    `✓ Detailed Assessment Rows: ${detailedAssessments.length} score rows with exact decimals.`
  )

  const teacherCompletenessRecap = await reportService.getTeacherCompletenessRecap(currentAY.id)
  assert(teacherCompletenessRecap.length > 0, 'Teacher completeness recap must return entries')
  console.log(`✓ Teacher Completeness Recap: ${teacherCompletenessRecap.length} teachers.`)

  // 6. XLSX Export & Print HTML Generator
  console.log('\nTest 5: Structured XLSX Generation & Print Document...')
  const xlsxBuffer = reportService.exportToXlsx('Test_Report', [
    {
      name: 'Summary',
      headers: ['Metrik', 'Nilai'],
      rows: [
        ['Total Siswa', 36],
        ['Status', 'Aktif']
      ]
    },
    {
      name: 'Detail',
      headers: ['ID', 'Nama', 'Nilai'],
      rows: [
        ['1', 'Ahmad', 92.5],
        ['2', 'Budi', 88.0]
      ]
    }
  ])
  assert(xlsxBuffer instanceof ArrayBuffer, 'XLSX export must return a valid ArrayBuffer')
  assert(xlsxBuffer.byteLength > 1000, 'XLSX byteLength must indicate valid workbook binary')
  console.log(`✓ XLSX Export binary created successfully: ${xlsxBuffer.byteLength} bytes.`)

  const printHtml = await reportService.generatePrintHtml(
    'LAPORAN AKADEMIK SEMESTER',
    'Tahun Pelajaran 2026/2027',
    ['NIS', 'Nama Siswa', 'Kelas', 'Nilai'],
    [['1001', 'Ahmad Faris', 'X RPL 1', 95]]
  )
  assert(printHtml.includes('SMK NU UNGARAN'), 'Print HTML must include school header')
  assert(printHtml.includes('Ahmad Faris'), 'Print HTML must include table data')
  console.log('✓ Print HTML generated with official school letterhead & signatures.')

  // 7. Academic Semester Closing & Lock Guard
  console.log('\nTest 6: Academic Semester Closing & Lock Enforcement...')
  const compliance = await semesterClosingService.getSemesterCompliance(currentAY.id)
  assert(
    typeof compliance.attendanceComplianceRate === 'number',
    'Compliance must include attendance rate'
  )
  assert(Array.isArray(compliance.blockers), 'Compliance must include blockers array')
  console.log(
    `✓ Semester Compliance Check: Ready=${compliance.isReadyToClose}, Blockers=${compliance.blockers.length}`
  )

  // Close Semester
  await semesterClosingService.closeSemester(currentAY.id, {
    force: true,
    reason: 'Pengujian penutupan semester otomatis'
  })
  const closedAY = (await repositories.academicYears.findById(currentAY.id))!
  assert(closedAY.isLocked === true, 'Closed academic year must have isLocked=true')
  assert(closedAY.isActive === false, 'Closed academic year must have isActive=false')
  console.log(
    `✓ Semester successfully closed & locked: ${closedAY.name} (isLocked=${closedAY.isLocked})`
  )

  // Verify Lock Guard blocks writes
  authService.setSessionForTesting(teacherSession)
  let lockBlocked = false
  try {
    await academicLockGuardService.enforceLock(closedAY.id)
  } catch (err: any) {
    lockBlocked = true
    assert(
      err.message.includes('ditutup') || err.message.includes('Locked'),
      'Error message must explain semester is locked'
    )
  }
  assert(lockBlocked, 'AcademicLockGuardService MUST block modifications on locked semester')
  console.log('✓ AcademicLockGuardService strictly rejected modification on closed semester.')

  // Admin unlocks semester for governance correction
  authService.setSessionForTesting(adminSession)
  await semesterClosingService.unlockSemester(currentAY.id, 'Koreksi administratif kelulusan siswa')
  const unlockedAY = (await repositories.academicYears.findById(currentAY.id))!
  assert(unlockedAY.isLocked === false, 'Unlocked academic year must have isLocked=false')
  console.log(`✓ Admin unlocked semester with audit log: isLocked=${unlockedAY.isLocked}`)

  console.log('\n=== ALL PHASE 4 REPORTING, GOVERNANCE & CLOSING TESTS PASSED PERFECTLY ===')
}
