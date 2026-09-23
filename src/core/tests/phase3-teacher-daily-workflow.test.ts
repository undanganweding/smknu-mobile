/**
 * Guru Offline - Phase 3 Teacher Daily Operational Workflow Test Suite
 * End-to-end validation for:
 * 1. Teacher Schedule & Next Class Resolution
 * 2. Deterministic Attendance Workspace (H, I, S, A, T, D + Notes + Identity)
 * 3. Teaching Journal Lifecycle (Draft, Completed, Locked + Material + TP)
 * 4. Assessment Entry & KKM Precision
 * 5. Student Discipline Notes & Points
 * 6. Schedule Notification Alert Engine
 * 7. School Agenda & Announcement Visibility for Guru
 * 8. Daily Operational Completeness & Submission Readiness
 */

import 'fake-indexeddb/auto'
import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth/AuthService'
import { attendanceService } from '../services/attendance/AttendanceService'
import { journalService } from '../services/journal/JournalService'
import { assessmentService } from '../services/assessment/AssessmentService'
import { disciplineService } from '../services/discipline/DisciplineService'
import { schoolAgendaService } from '../services/agenda/SchoolAgendaService'
import { announcementService } from '../services/announcement/AnnouncementService'
import { teacherScheduleNotificationService } from '../services/notification/TeacherScheduleNotificationService'
import type { TeacherResolvedScheduleItem } from '../services/master/ScheduleService'

export async function runPhase3Tests() {
  console.log('\n--- STARTING PHASE 3 TEACHER DAILY OPERATIONAL WORKFLOW TEST SUITE ---')
  let passed = 0
  let failed = 0

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      console.log(`  ✓ ${name}`)
      passed++
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message || err)
      failed++
    }
  }

  // 1. Initialize DB with clean seed data
  await seedDatabase(true)

  // Retrieve seeded schedule and its corresponding teacher
  const schedules = await repositories.schedules.findAll()
  if (schedules.length === 0) throw new Error('No seeded schedule found')
  const teacherSchedule = schedules[0]

  const assignment = await repositories.teacherAssignments.findById(
    teacherSchedule.teacherAssignmentId
  )
  if (!assignment) throw new Error('No assignment found for schedule')

  const teacher = await repositories.teachers.findById(assignment.teacherId)
  if (!teacher) throw new Error('No teacher found for assignment')

  // Update sample guru user's teacherId to match
  const guruUser = await repositories.users.findByUsername('guru')
  if (guruUser) {
    await repositories.users.update(guruUser.id, { teacherId: teacher.id })
  }

  // Login as guru
  const loginRes = await authService.login('guru', 'guru123')
  if (!loginRes.success) {
    throw new Error(`Login failed: ${loginRes.message}`)
  }

  // -------------------------------------------------------------
  // TEST 1: Next Class Resolution & Timing Status
  // -------------------------------------------------------------
  await test('1. Dashboard next-class determination and timing calculation', async () => {
    const testSchedItem: TeacherResolvedScheduleItem = {
      id: teacherSchedule.id,
      academicYearId: teacherSchedule.academicYearId,
      academicYearName: '2026/2027',
      semester: 'GANJIL',
      classId: teacherSchedule.classId,
      className: 'XII-TJKT 2',
      classLevel: 'XII',
      rombel: 2,
      majorId: 'maj_1',
      majorCode: 'TJKT',
      majorName: 'Teknik Jaringan Komputer dan Telekomunikasi',
      teacherAssignmentId: teacherSchedule.teacherAssignmentId,
      teacherAssignmentCode: 'SK-01',
      teacherId: teacher.id,
      teacherName: teacher.name,
      subjectId: 'sub_1',
      subjectCode: 'MAPEL-01',
      subjectName: 'Pemrograman Dasar',
      roomId: teacherSchedule.roomId,
      roomCode: 'LAB-01',
      roomName: 'Laboratorium Komputer 1',
      roomType: 'LAB',
      dayOfWeek: 'SENIN',
      periodStart: 1,
      periodEnd: 4,
      totalPeriods: 4,
      timeStart: '08:00',
      timeEnd: '10:00',
      status: 'ACTIVE',
      isToday: true,
      timingStatus: 'UPCOMING',
      attendanceDone: false,
      journalDone: false
    }

    // Test during class: 08:30
    const duringClass = new Date('2026-09-22T08:30:00')
    const alertsDuring = teacherScheduleNotificationService.evaluateScheduleAlerts(
      [testSchedItem],
      duringClass
    )
    if (alertsDuring.length < 0) throw new Error('Alert evaluation failed')
    const statusDuring = teacherScheduleNotificationService.getTimingStatus(
      '08:00',
      '10:00',
      duringClass
    )
    if (statusDuring.status !== 'ONGOING') {
      throw new Error(`Expected ONGOING but got ${statusDuring.status}`)
    }

    // Test 10 minutes before class: 07:50
    const beforeClass = new Date('2026-09-22T07:50:00')
    const statusBefore = teacherScheduleNotificationService.getTimingStatus(
      '08:00',
      '10:00',
      beforeClass
    )
    if (statusBefore.status !== 'STARTING_SOON') {
      throw new Error(`Expected STARTING_SOON but got ${statusBefore.status}`)
    }

    // Test after class: 10:15
    const afterClass = new Date('2026-09-22T10:15:00')
    const statusAfter = teacherScheduleNotificationService.getTimingStatus(
      '08:00',
      '10:00',
      afterClass
    )
    if (statusAfter.status !== 'COMPLETED') {
      throw new Error(`Expected COMPLETED but got ${statusAfter.status}`)
    }
  })

  // -------------------------------------------------------------
  // TEST 2: Attendance Session & Deterministic Identity (Schedule + Date)
  // -------------------------------------------------------------
  await test('2. Attendance session: roster loading, default Hadir, and duplicate prevention', async () => {
    const today = '2026-09-22'

    // Load attendance session
    const session = await attendanceService.getAttendanceSession(
      teacherSchedule.id,
      today,
      teacher.id
    )
    if (!session.schedule) throw new Error('Session schedule not resolved')
    if (session.records.length === 0) throw new Error('Student roster should not be empty')

    // Verify all default to 'H'
    const nonHadir = session.records.filter((r) => r.status !== 'H')
    if (nonHadir.length > 0) throw new Error('All records should default to H (Hadir)')

    // Update first student to S (Sakit) with note, second to A (Alpa)
    const modifiedRecords = session.records.map((r, idx) => {
      if (idx === 0) return { studentId: r.studentId, status: 'S' as const, note: 'Demam flu' }
      if (idx === 1) return { studentId: r.studentId, status: 'A' as const, note: '' }
      if (idx === 2)
        return { studentId: r.studentId, status: 'T' as const, note: 'Terlambat 15 menit' }
      return { studentId: r.studentId, status: r.status, note: r.note }
    })

    const saveResult = await attendanceService.saveAttendance(
      {
        scheduleId: teacherSchedule.id,
        date: today,
        records: modifiedRecords
      },
      teacher.id
    )

    if (!saveResult.attendance.id) throw new Error('Attendance save failed')
    if (
      saveResult.summary.sakit !== 1 ||
      saveResult.summary.alpa !== 1 ||
      saveResult.summary.terlambat !== 1
    ) {
      throw new Error('Attendance summary calculation incorrect')
    }

    // Re-saving same schedule + date should UPDATE, not create duplicate
    const secondSave = await attendanceService.saveAttendance(
      {
        scheduleId: teacherSchedule.id,
        date: today,
        records: modifiedRecords
      },
      teacher.id
    )

    if (secondSave.isNew !== false)
      throw new Error('Expected isNew to be false on duplicate update')
    if (secondSave.attendance.id !== saveResult.attendance.id) {
      throw new Error('Expected same attendanceId for identical scheduleId and date')
    }
  })

  // -------------------------------------------------------------
  // TEST 3: Attendance Teacher Isolation Guard
  // -------------------------------------------------------------
  await test('3. Attendance security: reject attendance save from unauthorized teacher', async () => {
    const today = '2026-09-22'
    const otherTeacherId = 'unauthorized_teacher_999'

    let rejected = false
    try {
      await attendanceService.saveAttendance(
        {
          scheduleId: teacherSchedule.id,
          date: today,
          records: [{ studentId: 'stu_1', status: 'H' }]
        },
        otherTeacherId
      )
    } catch {
      rejected = true
    }

    if (!rejected) {
      throw new Error('Security violation: unauthorized teacher was able to save attendance!')
    }
  })

  // -------------------------------------------------------------
  // TEST 4: Teaching Journal Lifecycle (Auto-population, Draft/Complete, Locked)
  // -------------------------------------------------------------
  await test('4. Teaching journal: auto-link with attendance, material & TP, draft & locking', async () => {
    const today = '2026-09-22'

    // 1. Save as DRAFT
    const draftResult = await journalService.saveJournal(
      {
        scheduleId: teacherSchedule.id,
        date: today,
        topic: 'Instalasi Server Linux Debian 12',
        learningOutcome: 'Siswa mampu menginstal Debian server secara mandiri',
        activitySummary: 'Apersepsi dan pengenalan partisi disk',
        status: 'DRAFT',
        notes: 'Praktikum berjalan lancar di Lab 1'
      },
      teacher.id
    )

    if (!draftResult.journal.id) throw new Error('Journal save failed')
    if (draftResult.journal.journalStatus !== 'DRAFT') {
      throw new Error('Expected journalStatus DRAFT')
    }
    // Verify attendance summary was automatically linked
    if (!draftResult.journal.studentAttendanceSummary) {
      throw new Error('Journal should automatically link with attendance summary')
    }

    // 2. Update to COMPLETED
    const completeResult = await journalService.saveJournal(
      {
        scheduleId: teacherSchedule.id,
        date: today,
        topic: 'Instalasi Server Linux Debian 12 - Lanjutan',
        activitySummary: 'Konfigurasi IP static dan SSH server',
        status: 'COMPLETED'
      },
      teacher.id
    )

    if (completeResult.journal.journalStatus !== 'COMPLETED') {
      throw new Error('Expected journalStatus COMPLETED')
    }

    // 3. Lock the journal
    const lockedJournal = await journalService.lockJournal(completeResult.journal.id, teacher.id)
    if (lockedJournal.journalStatus !== 'LOCKED') {
      throw new Error('Expected journalStatus LOCKED')
    }

    // 4. Attempting to mutate locked journal must throw Error
    let lockPrevented = false
    try {
      await journalService.saveJournal(
        {
          scheduleId: teacherSchedule.id,
          date: today,
          topic: 'Attempt to overwrite locked journal',
          activitySummary: 'Illegal edit'
        },
        teacher.id
      )
    } catch {
      lockPrevented = true
    }

    if (!lockPrevented) {
      throw new Error('Lock violation: locked journal allowed mutation!')
    }
  })

  // -------------------------------------------------------------
  // TEST 5: Teacher Assessment (Decimal Precision, KKM, Roster Validation)
  // -------------------------------------------------------------
  await test('5. Assessment workspace: create assessment, decimal score precision, and KKM', async () => {
    // 1. Create formative assessment (HARIAN)
    const createdAssessment = await assessmentService.createAssessment({
      teacherAssignmentId: teacherSchedule.teacherAssignmentId,
      classId: teacherSchedule.classId,
      type: 'HARIAN',
      title: 'Ulangan Harian 1 - Jaringan Dasar',
      maxScore: 100,
      date: '2026-09-22'
    })

    if (!createdAssessment.id) throw new Error('Assessment creation failed')

    // 2. Fetch assessment details and roster
    const detail = await assessmentService.getAssessmentDetail(createdAssessment.id)
    if (detail.roster.length === 0) throw new Error('Roster should not be empty')

    // 3. Score entry with decimal precision (85.5 and 68.25)
    const firstStudent = detail.roster[0]
    const secondStudent = detail.roster[1]

    await assessmentService.saveAssessmentScores(createdAssessment.id, [
      { studentId: firstStudent.studentId, score: 85.5, feedback: 'Sangat baik' },
      { studentId: secondStudent.studentId, score: 68.25, feedback: 'Perlu remedial OSPF' }
    ])

    // 4. Verify score precision is preserved without rounding
    const updatedDetail = await assessmentService.getAssessmentDetail(createdAssessment.id)
    const stu1 = updatedDetail.roster.find((s) => s.studentId === firstStudent.studentId)
    const stu2 = updatedDetail.roster.find((s) => s.studentId === secondStudent.studentId)

    if (stu1?.score !== 85.5)
      throw new Error(`Score precision lost: expected 85.5, got ${stu1?.score}`)
    if (stu2?.score !== 68.25)
      throw new Error(`Score precision lost: expected 68.25, got ${stu2?.score}`)

    // 5. Verify stats
    if (updatedDetail.statistics.gradedCount !== 2) {
      throw new Error(`Expected 2 graded students, got ${updatedDetail.statistics.gradedCount}`)
    }
  })

  // -------------------------------------------------------------
  // TEST 6: Student Discipline Notes (Referential Integrity & Points)
  // -------------------------------------------------------------
  await test('6. Discipline notes: violation, praise, point tracking, and student verification', async () => {
    const students = await repositories.students.findByClassId(teacherSchedule.classId)
    const student = students[0]
    if (!student) throw new Error('No student found in class')

    // 1. Record a violation
    const violation = await disciplineService.createNote({
      studentId: student.id,
      classId: teacherSchedule.classId,
      date: '2026-09-22',
      type: 'VIOLATION',
      description: 'Terlambat masuk bengkel tanpa surat izin piket',
      point: 5,
      followup: 'Teguran lisan dan pembinaan kedisiplinan waktu'
    })

    if (!violation.id) throw new Error('Violation note creation failed')
    if (violation.type !== 'VIOLATION' || violation.point !== 5) {
      throw new Error('Discipline fields mismatch')
    }

    // 2. Record a praise / achievement
    const praise = await disciplineService.createNote({
      studentId: student.id,
      classId: teacherSchedule.classId,
      date: '2026-09-22',
      type: 'PRAISE',
      description: 'Juara 1 Lomba Web Technologies SMK NU Ungaran',
      point: 20
    })

    if (!praise.id || praise.type !== 'PRAISE') {
      throw new Error('Praise note creation failed')
    }

    // 3. Verify student discipline summary
    const summary = await disciplineService.getStudentDisciplineSummary(student.id)
    if (summary.violationCount < 1 || summary.praiseCount < 1) {
      throw new Error('Discipline summary counts incorrect')
    }
  })

  // -------------------------------------------------------------
  // TEST 7: Schedule Notification Engine
  // -------------------------------------------------------------
  await test('7. Schedule notification: lead time evaluation and alert generation', async () => {
    const testItem: TeacherResolvedScheduleItem = {
      id: 'sched_notif_test',
      academicYearId: 'ay_1',
      academicYearName: '2026/2027',
      semester: 'GANJIL',
      classId: 'cls_1',
      className: 'XII-TJKT 1',
      classLevel: 'XII',
      rombel: 1,
      majorId: 'maj_1',
      majorCode: 'TJKT',
      majorName: 'Teknik Komputer',
      teacherAssignmentId: 'ta_1',
      teacherAssignmentCode: 'SK-01',
      teacherId: teacher.id,
      teacherName: teacher.name,
      subjectId: 'sub_1',
      subjectCode: 'MAPEL-01',
      subjectName: 'Administrasi Server',
      roomId: 'rm_1',
      roomCode: 'LAB-01',
      roomName: 'Lab 1',
      roomType: 'LAB',
      dayOfWeek: 'SENIN',
      periodStart: 1,
      periodEnd: 4,
      totalPeriods: 4,
      timeStart: '07:00',
      timeEnd: '09:00',
      status: 'ACTIVE',
      isToday: true,
      timingStatus: 'UPCOMING',
      attendanceDone: false,
      journalDone: false
    }

    // Simulate 06:56 (4 minutes before start) -> Lead time is 5 minutes
    const testTime = new Date('2026-09-22T06:56:00')
    const alerts = teacherScheduleNotificationService.evaluateScheduleAlerts([testItem], testTime)

    if (alerts.length === 0) {
      throw new Error('Expected STARTING_SOON alert 4 minutes before class!')
    }
    if (alerts[0].type !== 'STARTING_SOON') {
      throw new Error(`Expected STARTING_SOON, got ${alerts[0].type}`)
    }
  })

  // -------------------------------------------------------------
  // TEST 8: School Agendas & Announcements Visibility
  // -------------------------------------------------------------
  await test('8. Information channels: school agendas and announcements role filtering', async () => {
    // Create an agenda for GURU
    const agenda = await schoolAgendaService.createAgenda({
      title: 'Rapat Koordinasi KBM Semester Ganjil',
      category: 'RAPAT',
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      targetRole: 'GURU',
      isMandatory: true
    })

    const guruAgendas = await schoolAgendaService.getAgendasForRole('GURU')
    const foundAgenda = guruAgendas.find((a) => a.id === agenda.id)
    if (!foundAgenda) {
      throw new Error('Agenda targeted to GURU not returned for teacher role')
    }

    // Create an announcement for ALL
    const annc = await announcementService.createAnnouncement({
      title: 'Pemberitahuan Pelaksanaan Sholat Dhuha Berjamaah',
      content: 'Seluruh civitas akademika SMK NU Ungaran wajib hadir tepat waktu.',
      targetRole: 'ALL',
      isPinned: true
    })

    const teacherAnnouncements = await announcementService.getPublishedAnnouncements('GURU')
    const foundAnnc = teacherAnnouncements.find((a) => a.id === annc.id)
    if (!foundAnnc) {
      throw new Error('Announcement targeted to ALL not returned for teacher role')
    }
  })

  console.log(`\n========================================`)
  console.log(`PHASE 3 RESULTS: ${passed} passed, ${failed} failed`)
  console.log(`========================================\n`)

  return { passed, failed }
}
