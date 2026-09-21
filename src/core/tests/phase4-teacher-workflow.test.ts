/**
 * Phase 4 - Teacher Operational Flow & End-to-End Integration Test Suite
 * SMK NU Ungaran - Guru Offline
 */

import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth/AuthService'
import { scheduleService } from '../services/master/ScheduleService'
import { attendanceService } from '../services/attendance/AttendanceService'
import { journalService } from '../services/journal/JournalService'
import { assessmentService } from '../services/assessment/AssessmentService'
import { syncService } from '../services/sync/SyncService'
import { gasApiClient } from '../api/gasApiClient'
import type { SessionData, AttendanceStatus } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`)
  }
}

export async function runPhase4Tests() {
  console.log('=== RUNNING PHASE 4 TESTS: TEACHER OPERATIONAL FLOW & SYNC INTEGRATION ===\n')

  // 1. Initialize & Seed Database
  console.log('Test 1: Initializing IndexedDB and Seeding Master Data...')
  gasApiClient.setForceMock(true)
  await seedDatabase()
  console.log('✓ Database initialized & seeded successfully.')

  // Clear sync queue for clean test start
  await repositories.syncQueue.clear()

  // 2. Identify Test Teachers & Schedule Context
  console.log('\nTest 2: Identifying Teachers and Resolved Schedules...')
  const allSchedules = await repositories.schedules.findAll()
  const allAssignments = await repositories.teacherAssignments.findAll()
  assert(allSchedules.length >= 2, 'Schedules must have at least 2 entries seeded')

  const sched1 = allSchedules[0]
  const asg1 = (await repositories.teacherAssignments.findById(sched1.teacherAssignmentId))!
  const teacher1 = (await repositories.teachers.findById(asg1.teacherId))!

  const sched2 = allSchedules.find((s) => {
    const a = allAssignments.find((as) => as.id === s.teacherAssignmentId)
    return a && a.teacherId !== teacher1.id
  })!
  assert(!!sched2, 'Must find a second schedule belonging to a different teacher')
  const asg2 = (await repositories.teacherAssignments.findById(sched2.teacherAssignmentId))!
  const teacher2 = (await repositories.teachers.findById(asg2.teacherId))!

  console.log(`✓ Teacher 1: ${teacher1.name} (ID: ${teacher1.id}, Schedule ID: ${sched1.id})`)
  console.log(`✓ Teacher 2: ${teacher2.name} (ID: ${teacher2.id}, Schedule ID: ${sched2.id})`)

  // 3. Set Active Session as Teacher 1
  console.log('\nTest 3: Authenticating Teacher 1 & Querying Teacher Dashboard Context...')
  const sessionTeacher1: SessionData = {
    sessionId: 'sess_test_p4_t1',
    userId: 'usr_' + teacher1.id,
    username: teacher1.nip || 'guru_test_1',
    role: 'GURU',
    teacherId: teacher1.id,
    teacherName: teacher1.name,
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(sessionTeacher1)

  const teacher1ScheduleData = await scheduleService.getTeacherSchedule(teacher1.id)
  assert(teacher1ScheduleData.teacher?.id === teacher1.id, 'Resolved teacher must match Teacher 1')
  assert(teacher1ScheduleData.schedules.length > 0, 'Teacher 1 must have active resolved schedules')
  console.log(`✓ Teacher 1 Total Resolved Schedules: ${teacher1ScheduleData.schedules.length}`)

  // 4. Quick Attendance Workflow
  console.log('\nTest 4: Executing Quick Attendance Workflow for Teacher 1...')
  const targetDate = '2026-09-18'
  const sessionAtt = await attendanceService.getAttendanceSession(sched1.id, targetDate)
  assert(sessionAtt.records.length > 0, 'Class roster for schedule 1 must contain students')
  console.log(
    `✓ Class Roster Loaded: ${sessionAtt.records.length} students. Default status: ${sessionAtt.records[0].status}`
  )

  // Mark 1st student as Hadir, 2nd as Sakit, 3rd as Izin
  const updatedRecords = sessionAtt.records.map((r, idx) => {
    let st: AttendanceStatus = 'H'
    if (idx === 1) st = 'S'
    if (idx === 2) st = 'I'
    return { ...r, status: st }
  })

  const savedAtt = await attendanceService.saveAttendance({
    scheduleId: sched1.id,
    date: targetDate,
    records: updatedRecords
  })

  assert(savedAtt.attendance.scheduleId === sched1.id, 'Saved attendance scheduleId must match')
  assert(savedAtt.summary.sakit === 1, 'Summary sakit count must be 1')
  assert(savedAtt.summary.izin === 1, 'Summary izin count must be 1')
  console.log(
    `✓ Attendance saved successfully to IndexedDB. Hadir: ${savedAtt.summary.hadir}, Sakit: ${savedAtt.summary.sakit}, Izin: ${savedAtt.summary.izin}`
  )

  // 5. Verify Offline Sync Queue Enqueuing for Attendance
  console.log('\nTest 5: Verifying Offline Sync Queue Enqueuing for Attendance...')
  const pendingSyncsAtt = await repositories.syncQueue.findByEntity(
    'ATTENDANCE',
    savedAtt.attendance.id
  )
  assert(
    pendingSyncsAtt.length === 1,
    'Must find exactly 1 pending sync queue record for attendance'
  )
  assert(pendingSyncsAtt[0].status === 'PENDING', 'Sync queue item status must be PENDING')
  console.log(
    `✓ Sync Queue Item Created: ID=${pendingSyncsAtt[0].id}, EntityType=${pendingSyncsAtt[0].entityType}, Status=${pendingSyncsAtt[0].status}`
  )

  // 6. Teaching Journal Workflow
  console.log('\nTest 6: Executing Teaching Journal Workflow for Teacher 1...')
  const sessionJrn = await journalService.getJournalSession(sched1.id, targetDate)
  assert(sessionJrn.schedule.id === sched1.id, 'Journal schedule must match sched1')

  const savedJrn = await journalService.saveJournal({
    scheduleId: sched1.id,
    date: targetDate,
    topic: 'Pemrograman Berorientasi Objek & Encapsulation Class',
    activitySummary:
      'Apersepsi konsep OOP, demonstrasi praktikum setter/getter di VS Code, dan evaluasi singkat.',
    notes: 'Siswa dapat mengikuti materi dengan baik.'
  })

  assert(
    savedJrn.journal.topic.includes('Pemrograman Berorientasi Objek'),
    'Journal topic must match input'
  )
  assert(
    savedJrn.journal.studentAttendanceSummary?.sakit === 1,
    'Journal auto-linked attendance summary must match attendance session'
  )
  console.log('✓ Teaching Journal saved successfully & auto-linked with Attendance summary.')

  // 7. Verify Offline Sync Queue Enqueuing for Journal
  console.log('\nTest 7: Verifying Offline Sync Queue Enqueuing for Journal...')
  const pendingSyncsJrn = await repositories.syncQueue.findByEntity('JOURNAL', savedJrn.journal.id)
  assert(pendingSyncsJrn.length === 1, 'Must find exactly 1 pending sync queue record for journal')
  assert(pendingSyncsJrn[0].status === 'PENDING', 'Journal sync status must be PENDING')
  console.log(
    `✓ Sync Queue Item Created for Journal: ID=${pendingSyncsJrn[0].id}, Status=${pendingSyncsJrn[0].status}`
  )

  // 8. Assessment Workflow & Sync Integration
  console.log('\nTest 8: Executing Assessment Creation & Scoring for Teacher 1...')
  const createdAsm = await assessmentService.createAssessment({
    teacherAssignmentId: asg1.id,
    classId: sched1.classId,
    type: 'HARIAN',
    title: 'Ulangan Harian 1 OOP',
    date: targetDate,
    maxScore: 100
  })

  const classStudents = await repositories.students.findByClassId(sched1.classId)
  assert(classStudents.length > 0, 'Class students must exist for scoring test')

  const scoreInputs = [
    { studentId: classStudents[0].id, score: 88.5, feedback: 'Sangat Baik' },
    { studentId: classStudents[1].id, score: 75, feedback: 'Cukup' }
  ]

  const scoredAsm = await assessmentService.saveAssessmentScores(createdAsm.id, scoreInputs)
  assert(scoredAsm.scores.length === 2, 'Scored assessment must contain 2 student scores')
  console.log('✓ Assessment created & scores saved with decimal precision (88.5, 75).')

  // 9. Verify Sync Engine Processing
  console.log('\nTest 9: Verifying Offline Sync Engine (syncService)...')
  const pendingCountBefore = await syncService.getPendingCount()
  assert(
    pendingCountBefore >= 3,
    `Pending sync items count must be at least 3 (Actual: ${pendingCountBefore})`
  )
  console.log(`✓ Total Pending Sync Queue Items Before Sync: ${pendingCountBefore}`)

  const syncResult = await syncService.syncAll()
  assert(syncResult.syncedCount >= 3, 'Synced count must match pending count')
  assert(syncResult.failedCount === 0, 'Failed count must be 0')

  const pendingCountAfter = await syncService.getPendingCount()
  assert(
    pendingCountAfter === 0,
    `Pending sync count after syncAll must be 0 (Actual: ${pendingCountAfter})`
  )

  const syncStatus = await syncService.getSyncStatus()
  assert(syncStatus.totalSynced >= 3, 'Sync status summary must reflect completed syncs')
  console.log(
    `✓ Sync Engine Executed: ${syncResult.syncedCount} items synced successfully. Remaining pending: ${pendingCountAfter}`
  )

  // 10. Strict Domain Authorization & Isolation Enforcement
  console.log('\nTest 10: Enforcing Strict Domain Authorization & Cross-Teacher Data Isolation...')
  // Switch active session to Teacher 2
  const sessionTeacher2: SessionData = {
    sessionId: 'sess_test_p4_t2',
    userId: 'usr_' + teacher2.id,
    username: teacher2.nip || 'guru_test_2',
    role: 'GURU',
    teacherId: teacher2.id,
    teacherName: teacher2.name,
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(sessionTeacher2)

  // Teacher 2 attempts to save attendance for Teacher 1's schedule -> MUST FAIL
  let attAuthBlocked = false
  try {
    await attendanceService.saveAttendance({
      scheduleId: sched1.id,
      date: targetDate,
      records: [{ studentId: 'std_01', status: 'H' }]
    })
  } catch (err: any) {
    attAuthBlocked = true
    console.log(`✓ Attendance Authorization Blocked as expected: "${err.message}"`)
  }
  assert(attAuthBlocked, 'Teacher 2 must be blocked from saving attendance for Teacher 1 schedule')

  // Teacher 2 attempts to save journal for Teacher 1's schedule -> MUST FAIL
  let jrnAuthBlocked = false
  try {
    await journalService.saveJournal({
      scheduleId: sched1.id,
      date: targetDate,
      topic: 'Unallowed Topic',
      activitySummary: 'Unallowed Activity'
    })
  } catch (err: any) {
    jrnAuthBlocked = true
    console.log(`✓ Journal Authorization Blocked as expected: "${err.message}"`)
  }
  assert(jrnAuthBlocked, 'Teacher 2 must be blocked from saving journal for Teacher 1 schedule')

  // Teacher 2 attempts to save scores for Teacher 1's assessment -> MUST FAIL
  let asmAuthBlocked = false
  try {
    await assessmentService.saveAssessmentScores(createdAsm.id, [])
  } catch (err: any) {
    asmAuthBlocked = true
    console.log(`✓ Assessment Authorization Blocked as expected: "${err.message}"`)
  }
  assert(asmAuthBlocked, 'Teacher 2 must be blocked from modifying Teacher 1 assessment scores')

  console.log(
    '\n=== ALL PHASE 4 TEACHER OPERATIONAL WORKFLOW & INTEGRATION TESTS PASSED PERFECTLY ===\n'
  )
}
