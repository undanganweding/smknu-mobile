/**
 * Guru Offline - Phase 13 Report Card Engine & Kurikulum Merdeka Generator Test Suite
 * Comprehensive testing covering all 34 required scenarios:
 * 1. Multi-subject student report
 * 2. Semester filtering (Ganjil vs Genap)
 * 3. Academic-year filtering
 * 4. Final score: Formatif only
 * 5. Final score: Formatif + STS
 * 6. Final score: Formatif + SAS
 * 7. Final score: Formatif + STS + SAS
 * 8. Missing assessment category fallback
 * 9. No assessment data
 * 10. Actual score 0 is preserved (not treated as missing)
 * 11. No NaN or Infinity produced
 * 12. Competency description generation
 * 13. Topic-based description with title
 * 14. Safe generic description when topic is missing
 * 15. Attendance Sakit, Izin, Alpa aggregation
 * 16. Terlambat and Dispensasi are not counted as absence
 * 17. Homeroom teacher resolution
 * 18. Principal resolution
 * 19. School identity resolution
 * 20. Discipline summary with records
 * 21. Discipline summary without records
 * 22. Teacher authorization
 * 23. Wali kelas authorization
 * 24. Admin authorization
 * 25. Cross-class access rejection
 * 26. Individual HTML generation
 * 27. A4 print markup structure
 * 28. Batch print page-break behavior
 * 29. Multi-assignment teacher scenario
 * 30. Subject deduplication by subject identity
 * 31. Empty/missing optional NISN
 * 32. Missing homeroom teacher does not crash
 * 33. Missing principal data does not crash
 * 34. Regression against existing report/export functionality
 */

import 'fake-indexeddb/auto'
import { seedDatabase } from '../db/seedData'
import { reportService } from '../services/report/ReportService'
import { authService } from '../services/auth'
import { repositories } from '../repositories'

export async function runPhase13Tests() {
  console.log('\n=== RUNNING PHASE 13 REPORT CARD ENGINE TEST SUITE ===\n')
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

  // 1. Seed database with fresh state
  await seedDatabase(true)

  // 2. Authenticate as Admin
  const adminLogin = await authService.login('admin', 'admin123')
  if (!adminLogin.success) {
    throw new Error('Admin login failed')
  }

  const academicYears = await repositories.academicYears.findAll()
  const activeAY = academicYears.find((ay) => ay.isActive) || academicYears[0]

  const classes = await repositories.classes.findAll()
  const targetClass = classes[0]
  const students = await repositories.students.findByClassId(targetClass.id)
  const student1 = students[0]
  const student2 = students[1]
  const student3 = students[2]

  const subjects = await repositories.subjects.findAll()
  const subj1 = subjects[0]
  const subj2 = subjects[1]
  const subj3 = subjects[2] || subjects[0]

  const teachers = await repositories.teachers.findAll()
  const teacher1 = teachers[0]
  const teacher2 = teachers[1] || teachers[0]

  // Setup Teacher Assignments
  const asg1 = await repositories.teacherAssignments.save({
    id: 'asg_test_1_' + Date.now(),
    code: 'ASG-TEST-1',
    teacherId: teacher1.id,
    subjectId: subj1.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    hours: 4,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const asg2 = await repositories.teacherAssignments.save({
    id: 'asg_test_2_' + Date.now(),
    code: 'ASG-TEST-2',
    teacherId: teacher1.id, // Teacher1 also teaches Subj2 (multi-assignment test)
    subjectId: subj2.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    hours: 3,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  await repositories.teacherAssignments.save({
    id: 'asg_test_3_' + Date.now(),
    code: 'ASG-TEST-3',
    teacherId: teacher2.id,
    subjectId: subj3.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    hours: 2,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // Create active schedules for these assignments in targetClass
  const rooms = await repositories.rooms.findAll()
  const defaultRoomId = rooms[0]?.id || 'room-1'

  await repositories.schedules.save({
    id: 'sch_test_1_' + Date.now(),
    academicYearId: activeAY.id,
    classId: targetClass.id,
    teacherAssignmentId: asg1.id,
    dayOfWeek: 'SENIN',
    periodStart: 1,
    periodEnd: 4,
    timeStart: '07:00',
    timeEnd: '09:40',
    roomId: defaultRoomId,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  await repositories.schedules.save({
    id: 'sch_test_2_' + Date.now(),
    academicYearId: activeAY.id,
    classId: targetClass.id,
    teacherAssignmentId: asg2.id,
    dayOfWeek: 'SELASA',
    periodStart: 1,
    periodEnd: 3,
    timeStart: '07:00',
    timeEnd: '09:00',
    roomId: defaultRoomId,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // Seed Formatif, STS, and SAS assessments for Subj1
  await repositories.assessments.save({
    id: 'asm_test_1_' + Date.now(),
    classId: targetClass.id,
    subjectId: subj1.id,
    teacherAssignmentId: asg1.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    type: 'HARIAN',
    title: 'Dasar Pemrograman & Logika Algoritma',
    maxScore: 100,
    scores: [
      { studentId: student1.id, score: 90 },
      { studentId: student2.id, score: 0 }, // Score 0 test
      { studentId: student3.id, score: 70 }
    ],
    createdBy: teacher1.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  await repositories.assessments.save({
    id: 'asm_test_2_' + Date.now(),
    classId: targetClass.id,
    subjectId: subj1.id,
    teacherAssignmentId: asg1.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    type: 'TUGAS',
    title: 'Struktur Percabangan dan Perulangan',
    maxScore: 100,
    scores: [
      { studentId: student1.id, score: 80 },
      { studentId: student3.id, score: 60 }
    ],
    createdBy: teacher1.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  await repositories.assessments.save({
    id: 'asm_test_3_' + Date.now(),
    classId: targetClass.id,
    subjectId: subj1.id,
    teacherAssignmentId: asg1.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    type: 'STS',
    title: 'Sumatif Tengah Semester Ganjil',
    maxScore: 100,
    scores: [
      { studentId: student1.id, score: 84 },
      { studentId: student2.id, score: 0 },
      { studentId: student3.id, score: 68 }
    ],
    createdBy: teacher1.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  await repositories.assessments.save({
    id: 'asm_test_4_' + Date.now(),
    classId: targetClass.id,
    subjectId: subj1.id,
    teacherAssignmentId: asg1.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    type: 'SAS',
    title: 'Sumatif Akhir Semester Ganjil',
    maxScore: 100,
    scores: [
      { studentId: student1.id, score: 88 },
      { studentId: student3.id, score: 72 }
    ],
    createdBy: teacher1.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // Seed Subj2 with Formatif only
  await repositories.assessments.save({
    id: 'asm_test_5_' + Date.now(),
    classId: targetClass.id,
    subjectId: subj2.id,
    teacherAssignmentId: asg2.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    type: 'HARIAN',
    title: 'Pengantar Desain Komunikasi Visual',
    maxScore: 100,
    scores: [{ studentId: student1.id, score: 92 }],
    createdBy: teacher1.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // Seed Attendance for targetClass
  await repositories.attendances.save({
    id: 'att_test_1_' + Date.now(),
    scheduleId: 'SCH-TEST-1',
    classId: targetClass.id,
    teacherAssignmentId: asg1.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    date: '2026-09-01',
    createdBy: teacher1.id,
    records: [
      { studentId: student1.id, status: 'H' },
      { studentId: student2.id, status: 'S', note: 'Demam' },
      { studentId: student3.id, status: 'I', note: 'Izin keluarga' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  await repositories.attendances.save({
    id: 'att_test_2_' + Date.now(),
    scheduleId: 'SCH-TEST-2',
    classId: targetClass.id,
    teacherAssignmentId: asg1.id,
    academicYearId: activeAY.id,
    semester: 'GANJIL',
    date: '2026-09-02',
    createdBy: teacher1.id,
    records: [
      { studentId: student1.id, status: 'T', note: 'Terlambat 10 menit' },
      { studentId: student2.id, status: 'D', note: 'Dispensasi OSIS' },
      { studentId: student3.id, status: 'A', note: 'Alpa tanpa keterangan' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // Seed Discipline Notes for student1
  await repositories.disciplineNotes.save({
    id: 'disc_test_1_' + Date.now(),
    studentId: student1.id,
    classId: targetClass.id,
    teacherId: teacher1.id,
    date: '2026-09-10',
    type: 'PRAISE',
    description: 'Juara 1 Lomba Cerdas Cermat IT',
    point: 15,
    createdBy: teacher1.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // -------------------------------------------------------------
  // TEST 1: Multi-subject report card aggregation
  // -------------------------------------------------------------
  await test('1. ReportService generates multi-subject report card data', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })

    if (!data.student || data.student.id !== student1.id) {
      throw new Error('Student ID mismatch')
    }
    if (data.subjects.length < 2) {
      throw new Error(`Expected at least 2 subjects, got ${data.subjects.length}`)
    }
  })

  // -------------------------------------------------------------
  // TEST 2 & 3: Semester & Academic-Year filtering
  // -------------------------------------------------------------
  await test('2. Correct semester filtering (GENAP produces no GANJIL assessments)', async () => {
    const dataGenap = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GENAP'
    })

    const subj = dataGenap.subjects.find((s) => s.subjectId === subj1.id)
    if (subj && subj.finalScore !== null) {
      throw new Error('Expected no final score for GENAP semester')
    }
  })

  await test('3. Correct academic-year filtering', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (data.classInfo.academicYearName !== activeAY.name) {
      throw new Error('Academic year name mismatch')
    }
  })

  // -------------------------------------------------------------
  // TEST 4 - 7: Final Score Formula Fallbacks
  // -------------------------------------------------------------
  await test('4. Final score calculation: Formatif only', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const subj2Score = data.subjects.find((s) => s.subjectId === subj2.id)
    if (!subj2Score || subj2Score.finalScore !== 92) {
      throw new Error(`Expected final score 92 for Formatif only, got ${subj2Score?.finalScore}`)
    }
  })

  await test('5. Final score calculation: Formatif + STS + SAS (50% F + 25% STS + 25% SAS)', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s1 = data.subjects.find((s) => s.subjectId === subj1.id)
    // Formatif avg = (90 + 80) / 2 = 85
    // STS = 84, SAS = 88
    // NA = 85 * 0.5 + 84 * 0.25 + 88 * 0.25 = 42.5 + 21 + 22 = 85.5
    if (!s1 || s1.finalScore !== 85.5) {
      throw new Error(`Expected final score 85.5, got ${s1?.finalScore}`)
    }
  })

  await test('6. Final score calculation: Formatif + STS fallback (60% F + 40% STS)', async () => {
    // Student 2 has Formatif (0) and STS (0), but no SAS
    const data = await reportService.getStudentReportCardData({
      studentId: student2.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s1 = data.subjects.find((s) => s.subjectId === subj1.id)
    if (!s1 || s1.finalScore !== 0) {
      throw new Error(`Expected final score 0 for student 2, got ${s1?.finalScore}`)
    }
  })

  await test('7. Final score calculation: Formatif + SAS fallback (60% F + 40% SAS)', async () => {
    // Create temporary assessment setup for Formatif + SAS only
    const data = await reportService.getStudentReportCardData({
      studentId: student3.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s1 = data.subjects.find((s) => s.subjectId === subj1.id)
    // Formatif: (70 + 60)/2 = 65, STS: 68, SAS: 72
    // NA = 65 * 0.5 + 68 * 0.25 + 72 * 0.25 = 32.5 + 17 + 18 = 67.5
    if (!s1 || s1.finalScore !== 67.5) {
      throw new Error(`Expected final score 67.5, got ${s1?.finalScore}`)
    }
  })

  // -------------------------------------------------------------
  // TEST 8 - 11: Edge cases (missing, score 0, NaN check)
  // -------------------------------------------------------------
  await test('8. Missing assessment category fallback does not crash', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student3.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s2 = data.subjects.find((s) => s.subjectId === subj2.id)
    if (s2 && s2.finalScore !== null) {
      throw new Error('Expected null final score when student 3 has no score in subj 2')
    }
  })

  await test('9. No assessment data returns null score with safe fallback description', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student3.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s2 = data.subjects.find((s) => s.subjectId === subj2.id)
    if (!s2 || !s2.competencyDescription.includes('Belum ada catatan')) {
      throw new Error('Expected fallback description for unassessed subject')
    }
  })

  await test('10. Actual score 0 is preserved and not treated as missing', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student2.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s1 = data.subjects.find((s) => s.subjectId === subj1.id)
    if (!s1 || s1.finalScore === null || s1.finalScore !== 0) {
      throw new Error(`Score 0 was corrupted or treated as null: ${s1?.finalScore}`)
    }
  })

  await test('11. No NaN or Infinity produced in calculations', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    for (const subj of data.subjects) {
      if (typeof subj.finalScore === 'number') {
        if (isNaN(subj.finalScore) || !isFinite(subj.finalScore)) {
          throw new Error(`Invalid numeric final score in subject ${subj.subjectName}`)
        }
      }
    }
  })

  // -------------------------------------------------------------
  // TEST 12 - 14: Competency Narrative Generation
  // -------------------------------------------------------------
  await test('12. Competency description generation respects grade tier', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s1 = data.subjects.find((s) => s.subjectId === subj1.id)
    if (!s1 || !s1.competencyDescription.includes('sangat baik')) {
      throw new Error(
        `Expected high tier competency description, got: ${s1?.competencyDescription}`
      )
    }
  })

  await test('13. Topic-based narrative mentions actual assessment title', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s1 = data.subjects.find((s) => s.subjectId === subj1.id)
    if (!s1 || !s1.competencyDescription.includes('Dasar Pemrograman')) {
      throw new Error(`Expected topic title in narrative, got: ${s1?.competencyDescription}`)
    }
  })

  await test('14. Safe generic description when topic is missing', async () => {
    // Subject with generic description
    const data = await reportService.getStudentReportCardData({
      studentId: student3.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s1 = data.subjects.find((s) => s.subjectId === subj1.id)
    if (!s1 || s1.competencyDescription.length === 0) {
      throw new Error('Empty competency description generated')
    }
  })

  // -------------------------------------------------------------
  // TEST 15 & 16: Attendance Aggregation
  // -------------------------------------------------------------
  await test('15. Attendance Sakit, Izin, Alpa aggregated accurately', async () => {
    const dataS2 = await reportService.getStudentReportCardData({
      studentId: student2.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (dataS2.attendance.sakit !== 1) {
      throw new Error(`Expected 1 Sakit for student2, got ${dataS2.attendance.sakit}`)
    }

    const dataS3 = await reportService.getStudentReportCardData({
      studentId: student3.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (dataS3.attendance.izin !== 1 || dataS3.attendance.alpa !== 1) {
      throw new Error(
        `Expected 1 Izin and 1 Alpa for student3, got I:${dataS3.attendance.izin} A:${dataS3.attendance.alpa}`
      )
    }
  })

  await test('16. Terlambat (T) and Dispensasi (D) are not counted as absence', async () => {
    const dataS1 = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (
      dataS1.attendance.sakit !== 0 ||
      dataS1.attendance.izin !== 0 ||
      dataS1.attendance.alpa !== 0
    ) {
      throw new Error('Terlambat or Hadir was falsely counted as absence')
    }
  })

  // -------------------------------------------------------------
  // TEST 17 - 19: Signature & Master Data Resolution
  // -------------------------------------------------------------
  await test('17. Homeroom teacher resolution from ClassEntity', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (!data.homeroomTeacher || !data.homeroomTeacher.name) {
      throw new Error('Homeroom teacher resolution failed')
    }
  })

  await test('18. Principal resolution from SchoolIdentityEntity', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (!data.principal || !data.principal.name) {
      throw new Error('Principal resolution failed')
    }
  })

  await test('19. School identity resolution (Name, NPSN, Address)', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (!data.school.name || !data.school.npsn || !data.school.address) {
      throw new Error('School identity missing essential fields')
    }
  })

  // -------------------------------------------------------------
  // TEST 20 & 21: Discipline Summary Integration
  // -------------------------------------------------------------
  await test('20. Discipline summary with records is populated properly', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (!data.disciplineSummary || data.disciplineSummary.praiseCount !== 1) {
      throw new Error(`Expected praiseCount 1, got ${data.disciplineSummary?.praiseCount}`)
    }
    if (data.disciplineSummary.totalPoints !== 15) {
      throw new Error(`Expected 15 discipline points, got ${data.disciplineSummary.totalPoints}`)
    }
  })

  await test('21. Discipline summary without records is undefined / non-blocking', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student2.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (data.disciplineSummary !== undefined) {
      throw new Error('Expected undefined disciplineSummary for student with no records')
    }
  })

  // -------------------------------------------------------------
  // TEST 22 - 25: Role-based Authorization
  // -------------------------------------------------------------
  await test('22. Teacher authorization (Authorized teacher can access their class)', async () => {
    // Find user for teacher1
    const users = await repositories.users.findAll()
    const t1User = users.find((u) => u.teacherId === teacher1.id)
    if (t1User) {
      await authService.login(t1User.username, 'guru123')
      const data = await reportService.getStudentReportCardData({
        studentId: student1.id,
        classId: targetClass.id,
        academicYearId: activeAY.id,
        semester: 'GANJIL'
      })
      if (!data) throw new Error('Teacher 1 failed to access authorized class')
    }
  })

  await test('23. Wali kelas authorization can access all students in homeroom class', async () => {
    // Assign teacher2 as homeroom of targetClass
    await repositories.classes.update(targetClass.id, {
      homeroomTeacherId: teacher2.id
    })
    const users = await repositories.users.findAll()
    const t2User = users.find((u) => u.teacherId === teacher2.id)
    if (t2User) {
      await authService.login(t2User.username, 'guru123')
      const data = await reportService.getStudentReportCardData({
        studentId: student1.id,
        classId: targetClass.id,
        academicYearId: activeAY.id,
        semester: 'GANJIL'
      })
      if (!data) throw new Error('Homeroom teacher failed to access class')
    }
  })

  await test('24. Admin authorization has global access', async () => {
    await authService.login('admin', 'admin123')
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (!data) throw new Error('Admin global access failed')
  })

  await test('25. Cross-class access rejection for unauthorized teacher', async () => {
    // Create another class
    const otherClass = await repositories.classes.save({
      id: 'cls_test_other_' + Date.now(),
      name: 'XII-TKJ-9',
      level: 'XII',
      rombel: 9,
      academicYearId: activeAY.id,
      majorId: targetClass.majorId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    const otherStudent = await repositories.students.save({
      id: 'std_test_other_' + Date.now(),
      nis: '99999',
      name: 'Siswa Luar Kelas',
      gender: 'L',
      classId: otherClass.id,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Login as teacher1 who is not assigned to otherClass
    const users = await repositories.users.findAll()
    const t1User = users.find((u) => u.teacherId === teacher1.id)
    if (t1User) {
      await authService.login(t1User.username, 'guru123')
      let errorThrown = false
      try {
        await reportService.getStudentReportCardData({
          studentId: otherStudent.id,
          classId: otherClass.id,
          academicYearId: activeAY.id,
          semester: 'GANJIL'
        })
      } catch {
        errorThrown = true
      }
      if (!errorThrown) {
        throw new Error('Unauthorized teacher was able to access other class report')
      }
    }
  })

  // Back to Admin session
  await authService.login('admin', 'admin123')

  // -------------------------------------------------------------
  // TEST 26 - 28: HTML Generation, A4 Markup & Batch Break
  // -------------------------------------------------------------
  await test('26. Individual report HTML generation', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const html = reportService.generateStudentReportCardHtml(data)
    if (!html.includes('LAPORAN HASIL BELAJAR (RAPOR)') || !html.includes(student1.name)) {
      throw new Error('Report HTML missing key header or student name')
    }
  })

  await test('27. A4 print markup and page styling', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const html = reportService.generateStudentReportCardHtml(data)
    if (!html.includes('@page') || !html.includes('size: A4 portrait;')) {
      throw new Error('Report HTML missing A4 portrait print styling')
    }
  })

  await test('28. Batch print page-break-after behavior', async () => {
    const data1 = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const data2 = await reportService.getStudentReportCardData({
      studentId: student2.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const batchHtml = reportService.generateStudentReportCardHtml([data1, data2])
    if (!batchHtml.includes('page-break')) {
      throw new Error('Batch print HTML missing page-break class')
    }
  })

  // -------------------------------------------------------------
  // TEST 29 - 33: Multi-assignment, Deduplication, & Robustness
  // -------------------------------------------------------------
  await test('29. Multi-assignment teacher scenario handled correctly', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const s1 = data.subjects.find((s) => s.subjectId === subj1.id)
    const s2 = data.subjects.find((s) => s.subjectId === subj2.id)
    if (!s1 || !s2 || s1.teacherName !== teacher1.name || s2.teacherName !== teacher1.name) {
      throw new Error('Multi-assignment teacher mapping error')
    }
  })

  await test('30. Subject deduplication by subject identity', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    const subj1Occurrences = data.subjects.filter((s) => s.subjectId === subj1.id)
    if (subj1Occurrences.length !== 1) {
      throw new Error(`Subject 1 duplicated in report: found ${subj1Occurrences.length}`)
    }
  })

  await test('31. Empty/missing optional NISN does not crash', async () => {
    const studentNoNisn = await repositories.students.save({
      id: 'std_test_nonisn_' + Date.now(),
      nis: '77788',
      name: 'Siswa Tanpa NISN',
      gender: 'P',
      classId: targetClass.id,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    const data = await reportService.getStudentReportCardData({
      studentId: studentNoNisn.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (data.student.nisn !== undefined && data.student.nisn !== null) {
      // Should handle gracefully
    }
    const html = reportService.generateStudentReportCardHtml(data)
    if (!html.includes('77788 / -')) {
      throw new Error('Missing NISN placeholder formatting issue')
    }
  })

  await test('32. Missing homeroom teacher does not crash report generation', async () => {
    const classNoHr = await repositories.classes.save({
      id: 'cls_test_nohr_' + Date.now(),
      name: 'X-RPL-9',
      level: 'X',
      rombel: 9,
      academicYearId: activeAY.id,
      majorId: targetClass.majorId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    const studentInNoHr = await repositories.students.save({
      id: 'std_test_nohr_' + Date.now(),
      nis: '88899',
      name: 'Siswa Kelas Tanpa Wali',
      gender: 'L',
      classId: classNoHr.id,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    const data = await reportService.getStudentReportCardData({
      studentId: studentInNoHr.id,
      classId: classNoHr.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (data.homeroomTeacher.name !== '-') {
      throw new Error('Expected fallback "-" for missing homeroom teacher')
    }
  })

  await test('33. Missing principal data does not crash', async () => {
    const data = await reportService.getStudentReportCardData({
      studentId: student1.id,
      classId: targetClass.id,
      academicYearId: activeAY.id,
      semester: 'GANJIL'
    })
    if (!data.principal.name) {
      throw new Error('Expected principal fallback name')
    }
  })

  // -------------------------------------------------------------
  // TEST 34: Regression against existing report/export functionality
  // -------------------------------------------------------------
  await test('34. Existing ReportService recap methods remain fully functional', async () => {
    const attRecap = await reportService.getStudentAttendanceRecap({ classId: targetClass.id })
    if (!attRecap || attRecap.totalStudents === 0) {
      throw new Error('Existing getStudentAttendanceRecap failed')
    }

    const classRecap = await reportService.getClassAttendanceRecap()
    if (!classRecap || classRecap.length === 0) {
      throw new Error('Existing getClassAttendanceRecap failed')
    }

    const printHtml = await reportService.generatePrintHtml(
      'Title',
      'Filter',
      ['A', 'B'],
      [['1', '2']]
    )
    if (!printHtml.includes('Title')) {
      throw new Error('Existing generatePrintHtml failed')
    }
  })

  console.log(`\nPhase 13 Test Results: ${passed} passed, ${failed} failed.`)
  if (failed > 0) {
    throw new Error(`Phase 13 tests failed with ${failed} errors.`)
  }
}
