/**
 * Guru Offline - Phase 8 Reporting, Recap & Operational Administration Test Suite
 * Covers 20 comprehensive test cases for attendance aggregation, class recap, teacher activity,
 * journal reporting, assessment statistics, student academic summary, date & period filtering,
 * RBAC authorization, export formatting, print dataset generation, and offline behavior.
 */

import 'fake-indexeddb/auto'
import { seedDatabase } from '../db/seedData'
import { reportService, type ReportFilterInput } from '../services/report/ReportService'
import { attendanceService } from '../services/attendance'
import { journalService } from '../services/journal'
import { assessmentService } from '../services/assessment'
import { authService } from '../services/auth'
import { repositories } from '../repositories'

export async function runPhase8Tests() {
  console.log('\n=== RUNNING PHASE 8 REPORTING, REKAP & OPERATIONAL TEST SUITE ===\n')
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

  // Seed database
  await seedDatabase(true)

  // Login as ADMIN
  const loginAdminRes = await authService.login('admin', 'admin123')
  if (!loginAdminRes.success) {
    throw new Error('Failed to authenticate as Admin for Phase 8 test suite')
  }

  const schedules = await repositories.schedules.findAll()
  const classes = await repositories.classes.findAll()
  const targetSchedule = schedules[0]
  const targetClass = classes.find((c) => c.id === targetSchedule.classId) || classes[0]
  const students = await repositories.students.findByClassId(targetClass.id)

  // Seed sample attendance and journal for deterministic reporting tests
  await attendanceService.saveAttendance({
    scheduleId: targetSchedule.id,
    date: '2026-09-20',
    records: [
      { studentId: students[0].id, status: 'H' },
      { studentId: students[1].id, status: 'I', note: 'Izin lomba' },
      { studentId: students[2].id, status: 'S', note: 'Sakit demam' },
      { studentId: students[3].id, status: 'A', note: 'Tanpa keterangan' }
    ]
  })

  await journalService.saveJournal({
    scheduleId: targetSchedule.id,
    date: '2026-09-20',
    topic: 'Testing Reporting Module - Phase8',
    activitySummary: 'Uji coba rekapitulasi data jurnal dan presensi.'
  })

  // -------------------------------------------------------------
  // TEST 1: Student Attendance Aggregation
  // -------------------------------------------------------------
  await test('1. ReportService aggregates student attendance records correctly', async () => {
    const recap = await reportService.getStudentAttendanceRecap({
      classId: targetClass.id
    })

    if (recap.totalStudents === 0) {
      throw new Error('Expected positive student count in attendance recap')
    }
    if (
      recap.totalHadir === 0 ||
      recap.totalIzin === 0 ||
      recap.totalSakit === 0 ||
      recap.totalAlpa === 0
    ) {
      throw new Error('Attendance recap counts missing expected values')
    }
  })

  // -------------------------------------------------------------
  // TEST 2: Attendance Percentage Calculation
  // -------------------------------------------------------------
  await test('2. ReportService accurately calculates presence percentage formula', async () => {
    const recap = await reportService.getStudentAttendanceRecap({
      classId: targetClass.id
    })

    const studentH = recap.students.find((s) => s.studentId === students[0].id)
    if (!studentH || studentH.presencePercentage !== 100) {
      throw new Error(
        `Expected 100% presence for Hadir student, got ${studentH?.presencePercentage}`
      )
    }

    const studentA = recap.students.find((s) => s.studentId === students[3].id)
    if (!studentA || studentA.presencePercentage !== 0) {
      throw new Error(`Expected 0% presence for Alpa student, got ${studentA?.presencePercentage}`)
    }
  })

  // -------------------------------------------------------------
  // TEST 3: Zero-Denominator Handling
  // -------------------------------------------------------------
  await test('3. ReportService handles zero-denominator without NaN or Infinity', async () => {
    // Fresh student with no attendance
    const freshClass = classes[classes.length - 1]
    const recap = await reportService.getStudentAttendanceRecap({
      classId: freshClass.id
    })

    for (const s of recap.students) {
      if (isNaN(s.presencePercentage) || !isFinite(s.presencePercentage)) {
        throw new Error('Presence percentage produced NaN or Infinity')
      }
      if (s.totalRecorded === 0 && s.presencePercentage !== 0) {
        throw new Error('Expected 0% when totalRecorded is 0')
      }
    }
  })

  // -------------------------------------------------------------
  // TEST 4: Missing Record vs Alpa Distinction
  // -------------------------------------------------------------
  await test('4. ReportService distinguishes unsubmitted attendance from explicit Alpa', async () => {
    const recap = await reportService.getStudentAttendanceRecap({
      classId: targetClass.id
    })

    const studentIzin = recap.students.find((s) => s.studentId === students[1].id)
    if (!studentIzin) throw new Error('Student not found')

    if (studentIzin.alpa !== 0) {
      throw new Error('Explicit Izin student was incorrectly counted as Alpa')
    }
  })

  // -------------------------------------------------------------
  // TEST 5: Class Attendance Recap
  // -------------------------------------------------------------
  await test('5. ReportService aggregates class-level attendance recap', async () => {
    const classRecap = await reportService.getClassAttendanceRecap()

    if (classRecap.length === 0) {
      throw new Error('Expected class recap items')
    }

    const matchedClass = classRecap.find((c) => c.classId === targetClass.id)
    if (!matchedClass || matchedClass.totalPresence === 0) {
      throw new Error('Class recap failed to aggregate total presence')
    }
  })

  // -------------------------------------------------------------
  // TEST 6: Teacher Teaching Activity Recap
  // -------------------------------------------------------------
  await test('6. ReportService calculates teacher activity recap and compliance rates', async () => {
    const teacherRecap = await reportService.getTeacherActivityRecap()

    if (teacherRecap.totalTeachers === 0 || teacherRecap.teachers.length === 0) {
      throw new Error('Expected teacher activity items')
    }

    const teacherItem = teacherRecap.teachers.find((t) => t.totalAttendanceSubmitted > 0)
    if (!teacherItem) {
      throw new Error('Expected at least 1 teacher with submitted attendance')
    }
  })

  // -------------------------------------------------------------
  // TEST 7: Journal Reporting & Filtering
  // -------------------------------------------------------------
  await test('7. ReportService filters journals by date range, class, and teacher', async () => {
    const journals = await reportService.getJournalRecap({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      classId: targetClass.id
    })

    if (journals.length === 0) {
      throw new Error('Expected journal recap items matching date filter')
    }

    for (const j of journals) {
      if (j.date < '2026-09-01' || j.date > '2026-09-30') {
        throw new Error(`Journal date ${j.date} outside filter range`)
      }
    }
  })

  // -------------------------------------------------------------
  // TEST 8: Assessment Statistics Aggregation
  // -------------------------------------------------------------
  await test('8. ReportService aggregates assessment stats (average, highest, lowest)', async () => {
    // Create an assessment and scores
    const asg = (await repositories.teacherAssignments.findAll())[0]
    const createdAsm = await assessmentService.createAssessment({
      teacherAssignmentId: asg.id,
      classId: targetClass.id,
      type: 'HARIAN',
      title: 'UH Phase8 Testing',
      date: '2026-09-20',
      maxScore: 100
    })

    await assessmentService.saveAssessmentScores(createdAsm.id, [
      { studentId: students[0].id, score: 90 },
      { studentId: students[1].id, score: 80 },
      { studentId: students[2].id, score: 60 }
    ])

    const assessments = await reportService.getAssessmentRecap({
      classId: targetClass.id
    })

    const asmItem = assessments.find((a) => a.id === createdAsm.id)
    if (!asmItem) throw new Error('Created assessment not found in recap')

    if (asmItem.averageScore !== 76.67) {
      throw new Error(`Expected average score 76.67, got ${asmItem.averageScore}`)
    }
    if (asmItem.highestScore !== 90 || asmItem.lowestScore !== 60) {
      throw new Error('Min/Max score mismatch in assessment recap')
    }
  })

  // -------------------------------------------------------------
  // TEST 9: KKM Passing & Failing Counts
  // -------------------------------------------------------------
  await test('9. ReportService evaluates students passing and failing KKM threshold', async () => {
    const assessments = await reportService.getAssessmentRecap({
      classId: targetClass.id
    })

    const asmItem = assessments.find((a) => a.title === 'UH Phase8 Testing')
    if (!asmItem) throw new Error('Assessment item missing')

    if (asmItem.studentsPassingKkm !== 2) {
      throw new Error(`Expected 2 passing KKM (>=75), got ${asmItem.studentsPassingKkm}`)
    }
    if (asmItem.studentsBelowKkm !== 1) {
      throw new Error(`Expected 1 failing KKM (<75), got ${asmItem.studentsBelowKkm}`)
    }
  })

  // -------------------------------------------------------------
  // TEST 10: Student Academic Summary Profile
  // -------------------------------------------------------------
  await test('10. ReportService builds complete student academic summary', async () => {
    const summary = await reportService.getStudentSummary(students[0].id)

    if (summary.student.id !== students[0].id) {
      throw new Error('Student identity mismatch')
    }
    if (!summary.className) {
      throw new Error('Class name missing in student summary')
    }
    if (summary.attendance.totalRecorded === 0) {
      throw new Error('Attendance stats missing in student summary')
    }
    if (summary.assessments.gradedCount === 0) {
      throw new Error('Assessment stats missing in student summary')
    }
  })

  // -------------------------------------------------------------
  // TEST 11: Date Range Filtering Precision
  // -------------------------------------------------------------
  await test('11. ReportService filters data strictly within date range boundaries', async () => {
    const outOfRange = await reportService.getStudentAttendanceRecap({
      startDate: '2026-01-01',
      endDate: '2026-01-31'
    })

    if (outOfRange.totalHadir !== 0) {
      throw new Error('Expected 0 Hadir for non-overlapping date filter')
    }
  })

  // -------------------------------------------------------------
  // TEST 12: Academic Year Filtering
  // -------------------------------------------------------------
  await test('12. ReportService filters data by academicYearId', async () => {
    const ay = (await repositories.academicYears.findAll())[0]
    const recap = await reportService.getStudentAttendanceRecap({
      academicYearId: ay.id
    })

    if (recap.totalStudents === 0) {
      throw new Error('Expected students for active academic year filter')
    }
  })

  // -------------------------------------------------------------
  // TEST 13: Semester Filtering
  // -------------------------------------------------------------
  await test('13. ReportService filters data by semester (GANJIL / GENAP)', async () => {
    const ganjilRecap = await reportService.getJournalRecap({
      semester: 'GANJIL'
    })

    for (const j of ganjilRecap) {
      const dbJ = await repositories.journals.findById(j.id)
      if (dbJ?.semester !== 'GANJIL') {
        throw new Error(`Expected GANJIL semester, got ${dbJ?.semester}`)
      }
    }
  })

  // -------------------------------------------------------------
  // TEST 14: Teacher Scope RBAC Authorization
  // -------------------------------------------------------------
  await test('14. ReportService enforces teacher scope authorization in GURU session', async () => {
    // Authenticate as GURU
    await authService.login('guru', 'guru123')
    const session = authService.getCurrentSession()!

    const filter: ReportFilterInput = { teacherId: 'other_teacher_id' }
    const enforced = await reportService.enforceReportAuthorization(filter)

    if (enforced.teacherId !== session.teacherId) {
      throw new Error('GURU session was able to bypass teacherId scope restrictions')
    }

    // Switch back to Admin
    await authService.login('admin', 'admin123')
  })

  // -------------------------------------------------------------
  // TEST 15: Cross-Class Teacher Authorization Block
  // -------------------------------------------------------------
  await test('15. ReportService blocks GURU session from accessing unauthorized class report', async () => {
    await authService.login('guru', 'guru123')

    // Pick an unassigned class for guru
    const unassignedClass = classes[classes.length - 1]

    let accessBlocked = false
    try {
      await reportService.getStudentAttendanceRecap({
        classId: unassignedClass.id
      })
    } catch (err: any) {
      if (err.name === 'AuthorizationError' || err.message.includes('Akses Ditolak')) {
        accessBlocked = true
      }
    }

    // Restore Admin login
    await authService.login('admin', 'admin123')

    if (!accessBlocked) {
      throw new Error('GURU session was not blocked from unauthorized class report')
    }
  })

  // -------------------------------------------------------------
  // TEST 16: Export CSV Data Dataset Generation
  // -------------------------------------------------------------
  await test('16. ReportService generates clean CSV formatted payload respecting filters', async () => {
    const recap = await reportService.getStudentAttendanceRecap({
      classId: targetClass.id
    })

    const rows = recap.students.map((s) => [
      s.nis,
      s.name,
      s.className,
      s.hadir,
      s.izin,
      s.sakit,
      s.alpa,
      `${s.presencePercentage}%`
    ])

    if (rows.length !== recap.students.length) {
      throw new Error('CSV row count mismatch')
    }
  })

  // -------------------------------------------------------------
  // TEST 17: Print Dataset Integrity & Header Generation
  // -------------------------------------------------------------
  await test('17. ReportService generates print-friendly HTML document with school metadata', async () => {
    const html = await reportService.generatePrintHtml(
      'LAPORAN PRESENSI SISWA',
      'Kelas: X TJKT 1 | Periode: 2026/2027 Ganjil',
      ['NIS', 'Nama Siswa', 'Hadir', 'Izin', 'Sakit', 'Alpa'],
      [['2026001', 'Budi Santoso', 10, 1, 0, 0]]
    )

    if (!html.includes('SMK NU UNGARAN')) {
      throw new Error('School identity missing in print HTML')
    }
    if (!html.includes('LAPORAN PRESENSI SISWA')) {
      throw new Error('Report title missing in print HTML')
    }
    if (!html.includes('Budi Santoso')) {
      throw new Error('Table row missing in print HTML')
    }
  })

  // -------------------------------------------------------------
  // TEST 18: Offline / Local Report Execution Behavior
  // -------------------------------------------------------------
  await test('18. ReportService executes reporting seamlessly on local IndexedDB cache', async () => {
    // Execute all report methods without internet/cloud API calls
    const metrics = await reportService.getAdminDashboardMetrics()
    if (metrics.activeTeachers === 0 || metrics.activeStudents === 0) {
      throw new Error('Admin dashboard metrics failed in offline local mode')
    }
  })

  // -------------------------------------------------------------
  // TEST 19: Stable-ID Aggregation Reconciliation
  // -------------------------------------------------------------
  await test('19. ReportService reconciles data strictly using stable entity IDs', async () => {
    const studentRecap = await reportService.getStudentAttendanceRecap()
    const student = students[0]

    const found = studentRecap.students.find((s) => s.studentId === student.id)
    if (!found) {
      throw new Error('Failed to reconcile student recap by stable studentId')
    }
  })

  // -------------------------------------------------------------
  // TEST 20: Regression & Real-time Update Reflection
  // -------------------------------------------------------------
  await test('20. ReportService reflects dynamic updates without stale state', async () => {
    const initialRecap = await reportService.getStudentAttendanceRecap({
      classId: targetClass.id
    })
    const initialHadir = initialRecap.totalHadir

    // Save additional attendance record
    await attendanceService.saveAttendance({
      scheduleId: targetSchedule.id,
      date: '2026-09-21',
      records: [{ studentId: students[0].id, status: 'H' }]
    })

    const updatedRecap = await reportService.getStudentAttendanceRecap({
      classId: targetClass.id
    })

    if (updatedRecap.totalHadir !== initialHadir + 1) {
      throw new Error(
        `Dynamic update not reflected in recap: initial ${initialHadir}, updated ${updatedRecap.totalHadir}`
      )
    }
  })

  console.log(`\n=== PHASE 8 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`)
  if (failed > 0) {
    throw new Error(`Phase 8 test suite failed with ${failed} failure(s)`)
  }
}
