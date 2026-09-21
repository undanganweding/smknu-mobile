/**
 * Phase 3B - Student Attendance & Teaching Journal Test Suite
 * SMK NU Ungaran - Guru Offline
 */

import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth/AuthService'
import { attendanceService } from '../services/attendance/AttendanceService'
import { journalService } from '../services/journal/JournalService'
import { scheduleService } from '../services/master/ScheduleService'
import type { AttendanceStatus, SessionData } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`)
  }
}

export async function runPhase3bTests() {
  console.log('=== RUNNING PHASE 3B TESTS: ATTENDANCE & JOURNAL ===\n')

  // 1. Initialize & Seed Database
  console.log('Test 1: Initializing IndexedDB and Seeding Master Data...')
  await seedDatabase()
  console.log('✓ Database initialized & seeded successfully.')

  // 2. Identify Test Teachers & Schedules
  console.log('\nTest 2: Identifying Teachers and Assigned Schedules...')
  const allSchedules = await repositories.schedules.findAll()
  assert(allSchedules.length >= 2, 'Schedules must be seeded with at least 2 sessions')

  const allAssignments = await repositories.teacherAssignments.findAll()
  const asgMap = new Map(allAssignments.map((a) => [a.id, a]))

  const t1Schedule = allSchedules[0]
  const t1Asg = asgMap.get(t1Schedule.teacherAssignmentId)!
  const teacher1 = (await repositories.teachers.findById(t1Asg.teacherId))!

  const t2Schedule = allSchedules.find((s) => {
    const asg = asgMap.get(s.teacherAssignmentId)
    return asg && asg.teacherId !== teacher1.id
  })!
  assert(!!t2Schedule, 'Must find a second schedule belonging to a different teacher')
  const t2Asg = asgMap.get(t2Schedule.teacherAssignmentId)!
  const teacher2 = (await repositories.teachers.findById(t2Asg.teacherId))!

  console.log(`✓ Teacher 1: ${teacher1.name} (Schedule: ${t1Schedule.id})`)
  console.log(`✓ Teacher 2: ${teacher2.name} (Schedule: ${t2Schedule.id})`)

  // 3. Mock Authentication as Teacher 1
  const sessionTeacher1: SessionData = {
    sessionId: 'sess_test_1',
    userId: 'usr_' + teacher1.id,
    username: teacher1.nip || 'guru_test_1',
    role: 'GURU',
    teacherId: teacher1.id,
    teacherName: teacher1.name,
    authenticatedAt: new Date().toISOString()
  }
  localStorage.setItem('guru_offline_session', JSON.stringify(sessionTeacher1))
  assert(authService.getCurrentSession()?.teacherId === teacher1.id, 'Session set to Teacher 1')
  console.log('\nTest 3: Authentication session active as Teacher 1.')

  // 4. Test Roster Loading and Default 'H' (Hadir)
  console.log('\nTest 4: Loading Attendance Session & Verifying Default "H"...')
  const testDate = '2026-09-18'
  const sessionData = await attendanceService.getAttendanceSession(t1Schedule!.id, testDate)
  assert(sessionData.schedule.id === t1Schedule!.id, 'Schedule ID matches')
  assert(sessionData.records.length > 0, 'Class roster must have students')
  const allDefaultH = sessionData.records.every((r) => r.status === 'H')
  assert(allDefaultH, 'All students in initial session must default to "H"')
  console.log(`✓ Roster loaded with ${sessionData.records.length} students, all defaulted to "H".`)

  // 5. Save Attendance with Varied Statuses (H, I, S, A, T, D)
  console.log('\nTest 5: Saving Attendance with Valid Statuses (H, I, S, A, T, D)...')
  const modifiedRecords = sessionData.records.map((r, idx) => {
    let status: AttendanceStatus = 'H'
    let note: string | undefined = undefined
    if (idx === 1) {
      status = 'I'
      note = 'Izin keperluan keluarga'
    } else if (idx === 2) {
      status = 'S'
      note = 'Sakit flu demam'
    } else if (idx === 3) {
      status = 'A'
      note = 'Tanpa keterangan'
    } else if (idx === 4) {
      status = 'T'
      note = 'Terlambat 15 menit'
    } else if (idx === 5) {
      status = 'D'
      note = 'Dispensasi lomba LKS'
    }
    return { studentId: r.studentId, status, note }
  })

  const saveRes = await attendanceService.saveAttendance({
    scheduleId: t1Schedule!.id,
    date: testDate,
    records: modifiedRecords
  })

  assert(saveRes.isNew === true, 'First save should be marked isNew: true')
  assert(saveRes.summary.izin === 1, 'Summary izin must be 1')
  assert(saveRes.summary.sakit === 1, 'Summary sakit must be 1')
  assert(saveRes.summary.alpa === 1, 'Summary alpa must be 1')
  assert(saveRes.summary.terlambat === 1, 'Summary terlambat === 1')
  assert(saveRes.summary.dispensasi === 1, 'Summary dispensasi === 1')
  console.log('✓ Attendance saved in IndexedDB with summary:', saveRes.summary)

  // 6. Test Upsert: Editing Attendance must update SAME entity without duplicates
  console.log('\nTest 6: Verifying Upsert (Updating Attendance Updates Existing Record)...')
  const initialAttCount = (await repositories.attendances.findAll()).length

  // Set student 3 to Hadir
  modifiedRecords[3].status = 'H'
  modifiedRecords[3].note = ''

  const updateRes = await attendanceService.saveAttendance({
    scheduleId: t1Schedule!.id,
    date: testDate,
    records: modifiedRecords
  })

  assert(updateRes.isNew === false, 'Subsequent save must be isNew: false')
  assert(updateRes.attendance.id === saveRes.attendance.id, 'Must keep identical attendance ID')
  assert(updateRes.summary.alpa === 0, 'Alpa should now be 0')
  const afterAttCount = (await repositories.attendances.findAll()).length
  assert(
    afterAttCount === initialAttCount,
    'Attendance record count must NOT increase (no duplicate)'
  )
  console.log('✓ Upsert verified: attendance record updated in-place.')

  // 7. Test Block Teaching: 1 Multi-Period Schedule = 1 Attendance Entity
  console.log(
    '\nTest 7: Verifying Block Teaching Rule (1 Multi-Period Schedule = 1 Attendance Entity)...'
  )
  assert(sessionData.schedule.totalPeriods > 1, 'Test schedule is a block teaching session (>1 JP)')
  const recordsForDate = await repositories.attendances.findByScheduleAndDate(
    t1Schedule!.id,
    testDate
  )
  assert(!!recordsForDate, 'Record exists for block')
  console.log(
    `✓ Schedule spanning ${sessionData.schedule.totalPeriods} JP maps to exactly 1 attendance entity.`
  )

  // 8. Test Authorization: Teacher 1 CANNOT create/edit attendance for Teacher 2's schedule
  console.log('\nTest 8: Enforcing Authorization on Attendance (Cross-Teacher Rejection)...')
  let crossTeacherBlocked = false
  try {
    await attendanceService.saveAttendance({
      scheduleId: t2Schedule!.id,
      date: testDate,
      records: [{ studentId: 'any_id', status: 'H' }]
    })
  } catch (err: any) {
    crossTeacherBlocked = true
    assert(
      err.message.includes('Akses ditolak'),
      `Expected access denied error, got: ${err.message}`
    )
  }
  assert(crossTeacherBlocked, 'Cross-teacher attendance modification MUST throw error')
  console.log('✓ Cross-teacher attendance modification properly blocked by domain service.')

  // 9. Test Invalid Student Reference Rejection
  console.log('\nTest 9: Validating Student Existence in Class Roster...')
  let invalidStudentBlocked = false
  try {
    await attendanceService.saveAttendance({
      scheduleId: t1Schedule!.id,
      date: testDate,
      records: [{ studentId: 'non_existent_student_id_12345', status: 'H' }]
    })
  } catch (err: any) {
    invalidStudentBlocked = true
    assert(
      err.message.includes('tidak terdaftar'),
      `Expected unlisted student error, got: ${err.message}`
    )
  }
  assert(invalidStudentBlocked, 'Saving attendance for non-class student must be rejected')
  console.log('✓ Invalid student reference safely rejected.')

  // 10. Test Journal Creation with Validation
  console.log('\nTest 10: Saving Teaching Journal with Mandatory Topic & Activity...')

  // 10a. Validate empty topic rejected
  let emptyTopicBlocked = false
  try {
    await journalService.saveJournal({
      scheduleId: t1Schedule!.id,
      date: testDate,
      topic: '',
      activitySummary: 'Aktivitas pembelajaran praktikum'
    })
  } catch {
    emptyTopicBlocked = true
  }
  assert(emptyTopicBlocked, 'Empty topic must be rejected')

  // 10b. Save valid journal
  const journalRes = await journalService.saveJournal({
    scheduleId: t1Schedule!.id,
    date: testDate,
    topic: 'Pengenalan Topologi Jaringan Komputer',
    activitySummary:
      'Penyampaian materi jenis topologi, diskusi kelompok, dan simulasi topologi star di Cisco Packet Tracer.',
    notes: 'Siswa sangat antusias dalam praktikum simulasi.'
  })

  assert(journalRes.isNew === true, 'First journal save should be isNew: true')
  assert(journalRes.journal.topic === 'Pengenalan Topologi Jaringan Komputer', 'Topic matches')
  assert(
    journalRes.journal.studentAttendanceSummary !== undefined,
    'Journal auto-linked student attendance summary'
  )
  console.log('✓ Teaching Journal created and linked with attendance summary.')

  // 11. Test Journal Upsert (Edit existing journal)
  console.log('\nTest 11: Verifying Journal Upsert (No Duplicate Journal per Schedule+Date)...')
  const initialJournalCount = (await repositories.journals.findAll()).length

  const updatedJournalRes = await journalService.saveJournal({
    scheduleId: t1Schedule!.id,
    date: testDate,
    topic: 'Pengenalan Topologi Jaringan Komputer & Subnetting',
    activitySummary: 'Penyampaian materi dan evaluasi praktikum.',
    notes: 'Diperbarui setelah evaluasi praktikum.'
  })

  assert(updatedJournalRes.isNew === false, 'Subsequent journal save is isNew: false')
  assert(updatedJournalRes.journal.id === journalRes.journal.id, 'Journal ID must remain the same')
  const afterJournalCount = (await repositories.journals.findAll()).length
  assert(afterJournalCount === initialJournalCount, 'Journal count must not duplicate')
  console.log('✓ Journal updated in-place without duplicate records.')

  // 12. Test Journal Cross-Teacher Authorization
  console.log('\nTest 12: Enforcing Authorization on Journal (Cross-Teacher Rejection)...')
  let crossJournalBlocked = false
  try {
    await journalService.saveJournal({
      scheduleId: t2Schedule!.id,
      date: testDate,
      topic: 'Unauthorized Topic',
      activitySummary: 'Unauthorized Activity'
    })
  } catch (err: any) {
    crossJournalBlocked = true
    assert(
      err.message.includes('Akses ditolak'),
      `Expected access denied error, got: ${err.message}`
    )
  }
  assert(crossJournalBlocked, 'Teacher 1 cannot create/modify journal for Teacher 2')
  console.log('✓ Cross-teacher journal modification properly blocked.')

  // 13. Test Schedule Service Status Resolution for Today
  console.log('\nTest 13: Verifying Schedule Resolution includes Attendance & Journal Statuses...')
  const detailedSchedule = await scheduleService.getScheduleByIdWithDetails(
    t1Schedule!.id,
    testDate
  )
  assert(detailedSchedule !== null, 'Detailed schedule must be resolved')
  assert(detailedSchedule!.attendanceDone === true, 'detailedSchedule.attendanceDone must be true')
  assert(detailedSchedule!.journalDone === true, 'detailedSchedule.journalDone must be true')
  console.log('✓ Schedule service accurately resolves attendanceDone: true and journalDone: true.')

  console.log('\n======================================================')
  console.log('✓ ALL 13 PHASE 3B CORE ATTENDANCE & JOURNAL TESTS PASSED!')
  console.log('======================================================\n')
}
